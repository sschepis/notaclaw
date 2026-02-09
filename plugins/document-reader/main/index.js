
module.exports = {
  activate: (context) => {
    console.log('[Document Reader] Main process activated');
    
    // Register Summarize Document Tool
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
    }, async ({ content, maxLength = 200 }) => {
        // Mock summary for now, or use a heuristic
        console.log('[Document Reader] Summarizing content length:', content.length);
        const sentences = content.match(/[^.!?]+[.!?]+/g) || [content];
        const summary = sentences.slice(0, 3).join(' '); // First 3 sentences
        return { 
            summary: summary.length > maxLength ? summary.substring(0, maxLength) + '...' : summary,
            originalLength: content.length 
        };
    });

    context.on('ready', () => {
      console.log('[Document Reader] Ready');
    });
  },
  
  deactivate: () => {
    console.log('[Document Reader] Deactivated');
  }
};
