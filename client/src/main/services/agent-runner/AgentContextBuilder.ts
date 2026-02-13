/**
 * AgentContextBuilder - Assembles the system prompt and conversation
 * context for each step of the agentic loop.
 * 
 * Responsibilities:
 * - Build the agentic system prompt (personality + agentic instructions)
 * - Maintain the conversation message history for multi-turn
 * - Inject scratchpad/tool results into the context
 */

import { AIMessage } from './types';
import { UIContextSnapshot } from '../../../shared/ui-context-types';

/** The agentic mode instructions appended to every personality prompt */
const AGENTIC_INSTRUCTIONS = `

## Agentic Mode

You are operating in agentic mode. You have the autonomy to work through multi-step tasks independently.

### Behavior Rules
- **Maintain Continuity**: You do NOT have prior conversation history in context. If the user's message references or continues anything from before this exchange, you MUST call \`get_conversation_history\` or \`search_conversation_history\` BEFORE responding. Never ask the user to repeat themselves or guess at prior context — look it up silently and seamlessly.
- **Communicate Frequently**: You must keep the user informed about your actions. Do not be silent for multiple steps.
- **Plan First**: Before executing a complex tool or operation, briefly explain what you are about to do.
- **Report Progress**: After each meaningful step, report the result using text or the 'send_update' tool.
- **Use Tools**: Execute tools as needed without asking for permission unless the action is destructive or irreversible.
- **Ask When Stuck**: If you need information from the user, use the \`ask_user\` tool. Do not guess.
- **Completion**: When your task is fully complete, you MUST call the \`task_complete\` tool with a summary.
- **Error Handling**: If you encounter an error, explain it and attempt to recover. Only give up if the error is truly unrecoverable.

### Available Control Tools
- **task_complete**: Call this when the task is finished. Include a summary of what was accomplished.
- **ask_user**: Call this when you need input from the user. Include a clear question. The conversation will pause until they respond.
- **send_update**: Call this to send a progress message without stopping your work.

### Memory Capabilities
- **Long-term Memory**: Use \`memory_search_*\` and \`memory_store\` tools to access and save persistent information.
- **Immediate Memory**: Use \`set_immediate_memory\` to store a thought or context for the *very next step only*. This is useful for chain-of-thought reasoning or carrying over critical details to the next action without cluttering the permanent conversation history.

### Conversation History (CRITICAL)
You do NOT have the prior conversation history in your context by default. You MUST proactively retrieve it when needed.

**Automatic Lookup Rule**: If the user's message references, continues, or builds upon ANYTHING not present in your current context — a prior discussion, a decision made earlier, a file or topic mentioned before, or any implicit continuity — you MUST immediately call \`get_conversation_history\` or \`search_conversation_history\` BEFORE responding. Do NOT ask the user to repeat themselves. Do NOT guess or fabricate prior context. Look it up.

**Available Tools**:
- **get_conversation_history**: Retrieves recent verbatim messages (user and assistant turns). Default: last 20 messages. Supports \`limit\`, \`before\`, and \`after\` (epoch ms) parameters for paging.
- **search_conversation_history**: Searches all messages for keywords/phrases. Use when the user refers to a specific topic. Returns matches with surrounding context.

**When to use these tools (non-exhaustive)**:
- The user says "like we discussed", "as I mentioned", "earlier", "before", "that thing", "the one we talked about", etc.
- The user's request seems to continue a thread you have no context for
- The user references a decision, file, concept, or name you don't recognize from the current exchange
- You feel uncertain about what the user is referring to

**These are different from memory tools**: Conversation history returns the raw transcript. Memory tools (\`memory_search_*\`) return semantic fragments stored at varying significance levels. Use conversation history for exact quotes, recent decisions, and conversational continuity. Use memory for thematic/conceptual recall across sessions.
`;

/**
 * Build the system prompt combining personality and agentic instructions.
 */
export function buildAgenticSystemPrompt(personalityPrompt: string): string {
  return personalityPrompt + AGENTIC_INSTRUCTIONS;
}

/**
 * Build the initial message history for the agentic loop.
 * 
 * @param systemPrompt - The full system prompt (personality + agentic instructions)
 * @param userMessage - The original user request
 * @param situationalContext - Optional memory/context from conversation
 */
export function buildInitialMessages(
  systemPrompt: string,
  userMessage: string,
  situationalContext?: string
): AIMessage[] {
  const messages: AIMessage[] = [
    { role: 'system', content: systemPrompt },
  ];

  // Add situational context if available
  if (situationalContext && situationalContext.trim()) {
    messages.push({
      role: 'system',
      content: `Relevant context from previous interactions:\n${situationalContext}`,
    });
  }

  messages.push({ role: 'user', content: userMessage });

  return messages;
}

/**
 * Append an assistant message (agent's response) to the history.
 */
export function appendAssistantMessage(
  messages: AIMessage[],
  content: string
): AIMessage[] {
  return [...messages, { role: 'assistant', content }];
}

/**
 * Append a tool result message to the history.
 */
export function appendToolResult(
  messages: AIMessage[],
  toolCallId: string,
  toolName: string,
  result: any
): AIMessage[] {
  return [
    ...messages,
    {
      role: 'tool',
      content: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
      toolCallId,
      toolName,
    },
  ];
}

/**
 * Append a user response (to an ask_user question) to the history.
 */
export function appendUserResponse(
  messages: AIMessage[],
  response: string
): AIMessage[] {
  return [...messages, { role: 'user', content: response }];
}

/**
 * Build a human-readable section describing the current UI state
 * for injection into the agent's context.
 */
export function buildUIContextSection(snapshot: UIContextSnapshot): string {
  const parts: string[] = ['## Current Application State'];

  // Active view
  if (snapshot.activeView.tabType) {
    parts.push(
      `The user is viewing a **${snapshot.activeView.tabType}** tab: "${snapshot.activeView.tabTitle}".`
    );
  }

  // Conversation context
  if (snapshot.conversation) {
    parts.push(
      `Active conversation: "${snapshot.conversation.title}" with ${snapshot.conversation.messageCount} messages.`
    );
    if (snapshot.conversation.personalityId) {
      parts.push(`Personality: ${snapshot.conversation.personalityId}`);
    }
  }

  // Editor context
  if (snapshot.editor) {
    parts.push(`\nThe text editor is open with file: \`${snapshot.editor.filePath}\``);
    parts.push(
      `Language: ${snapshot.editor.language}, ${snapshot.editor.lineCount} lines` +
        (snapshot.editor.isDirty ? ', **UNSAVED CHANGES**' : '')
    );
    parts.push(
      `Cursor at line ${snapshot.editor.cursorPosition.line}, col ${snapshot.editor.cursorPosition.col}`
    );
    if (snapshot.editor.selection) {
      parts.push(`Selected text:\n\`\`\`\n${snapshot.editor.selection}\n\`\`\``);
    }
    if (snapshot.editor.contentPreview) {
      parts.push(
        `\nEditor content preview:\n\`\`\`${snapshot.editor.language}\n${snapshot.editor.contentPreview}\n\`\`\``
      );
    }
  }

  // Sidebar
  parts.push(`\nSidebar panel: ${snapshot.sidebar.activeView}`);

  // Prompt templates
  if (snapshot.promptTemplates.length > 0) {
    parts.push(
      `\nAvailable prompt templates: ${snapshot.promptTemplates.join(', ')}`
    );
  }

  return parts.join('\n');
}
