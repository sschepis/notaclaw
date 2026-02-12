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

/** The agentic mode instructions appended to every personality prompt */
const AGENTIC_INSTRUCTIONS = `

## Agentic Mode

You are operating in agentic mode. You have the autonomy to work through multi-step tasks independently.

### Behavior Rules
- **Communicate Frequently**: You must keep the user informed about your actions. Do not be silent for multiple steps.
- **Plan First**: Before executing a complex tool or operation, briefly explain what you are about to do.
- **Report Progress**: After each meaningful step, report the result using text or \`send_update\`.
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
