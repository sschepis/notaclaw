import { Context } from './types';

interface SummaryResult {
  summary: string;
  originalLength: number;
}

export const activate = (context: Context) => {
  console.log('[Document Reader] Main process activated');

  context.dsn.registerTool({
    name: 'summarize_document',
    description: 'Generate a summary of a document\'s content',
    executionLocation: 'SERVER',
    parameters: {
      type: 'object',
      properties: {
        content: { type: 'string', description: 'The text content to summarize' },
        maxLength: { type: 'number', description: 'Approximate length of summary' }
      },
      required: ['content']
    },
    semanticDomain: 'cognitive',
    primeDomain: [13, 17],
    smfAxes: [0.6, 0.4],
    requiredTier: 'Neophyte',
    version: '1.0.0'
  }, async ({ content, maxLength = 200 }: { content: string, maxLength?: number }): Promise<SummaryResult> => {
      console.log('[Document Reader] Summarizing content length:', content.length);
      const sentences = content.match(/[^.!?]+[.!?]+/g) || [content];
      const summary = sentences.slice(0, 3).join(' '); 
      
      const finalSummary = summary.length > maxLength ? summary.substring(0, maxLength) + '...' : summary;
      
      return { 
          summary: finalSummary,
          originalLength: content.length 
      };
  });

  context.on('ready', () => {
    console.log('[Document Reader] Ready');
  });
};

export const deactivate = () => {
  console.log('[Document Reader] Deactivated');
};
