/**
 * UITools — Re-exports from the split modules for backward compatibility.
 *
 * The actual implementations are in:
 *  - UIContextTools.ts  (renderer-bridged UI query/navigation tools)
 *  - PromptTemplateTools.ts  (filesystem-based prompt template tools)
 */

export { buildUITools } from './UIContextTools';
export { buildPromptTemplateTools, listPromptTemplateFiles } from './PromptTemplateTools';
