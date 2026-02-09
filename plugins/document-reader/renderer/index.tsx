import React, { useState, useCallback } from 'react';

export const activate = (context: any) => {
    console.log('[Document Reader] Renderer activated');

    const DocumentPanel = () => {
        const [files, setFiles] = useState<any[]>([]);
        const [dragging, setDragging] = useState(false);

        const handleDrop = useCallback(async (e: any) => {
            e.preventDefault();
            setDragging(false);
            
            const droppedFiles = Array.from(e.dataTransfer.files);
            
            for (const file of droppedFiles as any[]) {
                const reader = new FileReader();
                reader.onload = async (ev) => {
                    const content = ev.target?.result as string;
                    
                    setFiles(prev => [...prev, {
                        name: file.name,
                        size: file.size,
                        type: file.type,
                        content: content.substring(0, 200) + '...', // Preview
                        summary: 'Summary generation requires server connection'
                    }]);
                };
                reader.readAsText(file);
            }
        }, []);

        return (
            <div className="h-full flex flex-col p-4 text-white">
                <h2 className="text-xl font-bold mb-4">Document Reader</h2>
                
                <div 
                    className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors mb-4 ${dragging ? 'border-blue-500 bg-blue-500/10' : 'border-gray-600 hover:border-gray-500'}`}
                    onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={handleDrop}
                >
                    <div className="text-4xl mb-2">📄</div>
                    <div className="text-sm text-gray-400">Drag and drop text files here</div>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2">
                    {files.map((file, i) => (
                        <div key={i} className="bg-white/5 p-3 rounded-lg">
                            <div className="flex justify-between items-start mb-2">
                                <div className="font-semibold text-sm truncate">{file.name}</div>
                                <div className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</div>
                            </div>
                            <div className="text-xs text-gray-400 font-mono bg-black/20 p-2 rounded mb-2">
                                {file.content}
                            </div>
                            {file.summary && (
                                <div className="text-xs text-blue-300 italic">
                                    {file.summary}
                                </div>
                            )}
                        </div>
                    ))}
                    {files.length === 0 && <div className="text-center text-gray-600 text-sm mt-8">No documents loaded</div>}
                </div>
            </div>
        );
    };

    const DocumentReaderButton = () => {
        const { activeSidebarView, setActiveSidebarView } = context.useAppStore();
        const isActive = activeSidebarView === 'document-reader';
        
        return (
            <button
                className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
                    isActive ? 'bg-blue-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                }`}
                onClick={() => setActiveSidebarView('document-reader')}
                title="Document Reader"
            >
                DR
            </button>
        );
    };

    context.registerComponent('sidebar:nav-item', {
        id: 'document-reader-nav',
        component: DocumentReaderButton
    });

    context.registerComponent('sidebar:view:document-reader', {
        id: 'document-reader-panel',
        component: DocumentPanel
    });
    
    // Register CLIENT tool
    if (context.dsn && context.dsn.registerTool) {
        context.dsn.registerTool({
          name: 'read_document',
          description: 'Request user to upload a document for reading',
          executionLocation: 'CLIENT',
          parameters: {
            type: 'object',
            properties: {
              prompt: { type: 'string', description: 'Message to show to user' }
            },
            required: ['prompt']
          },
          semanticDomain: 'perceptual',
          primeDomain: [13],
          smfAxes: [0.6, 0.4],
          requiredTier: 'Neophyte',
          version: '1.0.0'
        }, async ({ prompt }: any) => {
            // Switch to document reader view
            const { setActiveSidebarView } = context.useAppStore.getState();
            setActiveSidebarView('document-reader');
            return { message: `Switched to Document Reader. Prompt: ${prompt}` };
        });
    }
};
