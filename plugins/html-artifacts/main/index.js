module.exports = {
  activate: (context) => {
    console.log('[@alephnet/html-artifacts] Main process activated');

    context.on('ready', () => {
        // Register the tool
        if (context.dsn && context.dsn.registerTool) {
            context.dsn.registerTool({
                name: 'generate_artifact',
                description: 'Generates an HTML or React artifact. Use this to create web pages, dashboards, or UI components.',
                parameters: {
                    type: 'object',
                    properties: {
                        title: { type: 'string', description: 'Title of the artifact' },
                        type: { type: 'string', enum: ['html', 'react'], description: 'Type of artifact' },
                        content: { type: 'string', description: 'The HTML or React code' }
                    },
                    required: ['title', 'type', 'content']
                }
            }, async (args) => {
                console.log('Generating artifact:', args.title);
                
                // Save to plugin storage for persistence
                const artifactId = Date.now().toString();
                if (context.storage) {
                    await context.storage.set(`artifact:${artifactId}`, {
                        id: artifactId,
                        ...args,
                        createdAt: Date.now()
                    });
                }

                // Send to renderer to display
                context.ipc.send('artifact-generated', { id: artifactId, ...args });
                return { success: true, message: `Artifact ${args.title} generated and saved (ID: ${artifactId})` };
            });
        }
    });
  },
  
  deactivate: () => {
    console.log('[@alephnet/html-artifacts] Deactivated');
  }
};
