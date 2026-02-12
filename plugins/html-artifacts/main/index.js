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
                
                const artifactId = Date.now().toString();
                const artifact = {
                    id: artifactId,
                    ...args,
                    createdAt: Date.now()
                };

                // Save to storage
                await saveArtifact(context, artifact);

                // Send to renderer to display
                if (context.ipc) {
                    context.ipc.send('artifact-generated', artifact);
                }
                
                return { success: true, message: `Artifact ${args.title} generated and saved (ID: ${artifactId})` };
            });
        }

        // IPC Handlers for Renderer
        if (context.ipc) {
            context.ipc.on('load-artifacts', async () => {
                const artifacts = await loadArtifacts(context);
                // Sort by createdAt desc
                artifacts.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
                context.ipc.send('artifacts-loaded', artifacts);
            });

            context.ipc.on('save-artifact', async (artifact) => {
                await saveArtifact(context, { ...artifact, updatedAt: Date.now() });
                context.ipc.send('artifact-saved', artifact);
            });
        }
    });
  },
  
  deactivate: () => {
    console.log('[@alephnet/html-artifacts] Deactivated');
  }
};

async function loadArtifacts(context) {
    if (!context.storage) return [];
    try {
        const all = await context.storage.get('artifacts');
        return all ? Object.values(all) : [];
    } catch (e) {
        console.error('Failed to load artifacts:', e);
        return [];
    }
}

async function saveArtifact(context, artifact) {
    if (!context.storage) return;
    try {
        const all = await context.storage.get('artifacts') || {};
        all[artifact.id] = artifact;
        await context.storage.set('artifacts', all);
    } catch (e) {
        console.error('Failed to save artifact:', e);
    }
}
