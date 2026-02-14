/**
 * ConversationHistoryTools — Agent tools for querying raw conversation transcript.
 *
 * These tools provide the agent with direct access to the conversation's
 * message history via ConversationManager. They complement the semantic
 * memory tools (memory_search_*) by returning verbatim message content
 * rather than significance-ranked fragments.
 *
 * Tools:
 *  1. get_conversation_history — Retrieve recent messages (with pagination)
 *  2. search_conversation_history — Full-text search across all messages
 */

import { ToolDefinition } from '../prompt-engine/types';
import { ConversationManager } from '../ConversationManager';

/**
 * Build conversation history tools for the agent.
 *
 * @param conversationManager - The ConversationManager instance
 * @param conversationId - The active conversation ID
 */
export function buildConversationHistoryTools(
  conversationManager: ConversationManager,
  conversationId: string
): ToolDefinition[] {
  return [
    // ── get_conversation_history ──────────────────────────────────────
    {
      type: 'function',
      function: {
        name: 'get_conversation_history',
        description:
          'Retrieve recent messages from the current conversation. ' +
          'Returns verbatim user and assistant messages in chronological order. ' +
          'Use this when the user references prior discussion, or when you need ' +
          'context from earlier in the conversation. ' +
          'Supports pagination via before/after timestamps and limit.',
        parameters: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description:
                'Maximum number of messages to return (default: 20, max: 50)',
            },
            before: {
              type: 'number',
              description:
                'Return messages before this timestamp (epoch milliseconds). ' +
                'Use for backward pagination.',
            },
            after: {
              type: 'number',
              description:
                'Return messages after this timestamp (epoch milliseconds). ' +
                'Use for forward pagination.',
            },
          },
          required: [],
        },
        script: async ({
          limit,
          before,
          after,
        }: {
          limit?: number;
          before?: number;
          after?: number;
        }) => {
          try {
            const conversation =
              await conversationManager.getConversation(conversationId);
            let messages = conversation.messages || [];

            // Apply time filters
            if (before) {
              messages = messages.filter(
                (m) => (m.timestamp || 0) < before
              );
            }
            if (after) {
              messages = messages.filter(
                (m) => (m.timestamp || 0) > after
              );
            }

            // Sort chronologically (by sequence or timestamp)
            messages.sort(
              (a, b) =>
                (a.sequence || a.timestamp || 0) -
                (b.sequence || b.timestamp || 0)
            );

            // Apply limit (take the most recent N)
            const maxLimit = Math.min(Math.max(limit || 20, 1), 50);
            if (messages.length > maxLimit) {
              messages = messages.slice(-maxLimit);
            }

            return {
              conversationId,
              messageCount: messages.length,
              totalMessages: conversation.messageCount || conversation.messages?.length || 0,
              messages: messages.map((m) => ({
                role: m.role,
                content:
                  typeof m.content === 'string'
                    ? m.content.substring(0, 2000)
                    : String(m.content).substring(0, 2000),
                timestamp: m.timestamp,
                id: m.id,
              })),
            };
          } catch (err: any) {
            return {
              error: `Failed to retrieve conversation history: ${err.message}`,
            };
          }
        },
      },
    },

    // ── search_conversation_history ───────────────────────────────────
    {
      type: 'function',
      function: {
        name: 'search_conversation_history',
        description:
          'Search all messages in the current conversation for keywords or phrases. ' +
          'Returns matching messages with surrounding context. ' +
          'Use this when the user refers to a specific topic discussed earlier ' +
          'and you need to find the relevant exchange.',
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query — keywords or phrase to find',
            },
            limit: {
              type: 'number',
              description:
                'Maximum number of matching messages to return (default: 10, max: 30)',
            },
          },
          required: ['query'],
        },
        script: async ({
          query,
          limit,
        }: {
          query: string;
          limit?: number;
        }) => {
          try {
            const conversation =
              await conversationManager.getConversation(conversationId);
            const messages = conversation.messages || [];

            // Build search terms (case-insensitive)
            const terms = query
              .toLowerCase()
              .split(/\s+/)
              .filter((t) => t.length > 0);

            if (terms.length === 0) {
              return { error: 'Search query is empty.' };
            }

            // Score each message by how many terms match
            const scored = messages
              .map((m, idx) => {
                const content =
                  typeof m.content === 'string'
                    ? m.content.toLowerCase()
                    : '';
                const matchCount = terms.filter((t) =>
                  content.includes(t)
                ).length;
                return { message: m, index: idx, score: matchCount };
              })
              .filter((s) => s.score > 0)
              .sort((a, b) => b.score - a.score);

            const maxLimit = Math.min(Math.max(limit || 10, 1), 30);
            const topMatches = scored.slice(0, maxLimit);

            // For each match, include 1 message before and after for context
            const results = topMatches.map((match) => {
              const contextMessages: Array<{
                role: string;
                content: string;
                timestamp?: number;
                isMatch: boolean;
              }> = [];

              // Previous message (context)
              if (match.index > 0) {
                const prev = messages[match.index - 1];
                contextMessages.push({
                  role: prev.role,
                  content:
                    typeof prev.content === 'string'
                      ? prev.content.substring(0, 500)
                      : String(prev.content).substring(0, 500),
                  timestamp: prev.timestamp,
                  isMatch: false,
                });
              }

              // The matching message
              contextMessages.push({
                role: match.message.role,
                content:
                  typeof match.message.content === 'string'
                    ? match.message.content.substring(0, 2000)
                    : String(match.message.content).substring(0, 2000),
                timestamp: match.message.timestamp,
                isMatch: true,
              });

              // Next message (context)
              if (match.index < messages.length - 1) {
                const next = messages[match.index + 1];
                contextMessages.push({
                  role: next.role,
                  content:
                    typeof next.content === 'string'
                      ? next.content.substring(0, 500)
                      : String(next.content).substring(0, 500),
                  timestamp: next.timestamp,
                  isMatch: false,
                });
              }

              return {
                matchScore: match.score,
                termsMatched: terms.filter((t) =>
                  (typeof match.message.content === 'string'
                    ? match.message.content.toLowerCase()
                    : ''
                  ).includes(t)
                ),
                context: contextMessages,
              };
            });

            return {
              conversationId,
              query,
              totalMatches: scored.length,
              returnedMatches: results.length,
              matches: results,
            };
          } catch (err: any) {
            return {
              error: `Failed to search conversation history: ${err.message}`,
            };
          }
        },
      },
    },
  ];
}
