import React, { useState, useEffect, useCallback } from 'react';

// Types for the renderer
interface Document {
    id: string;
    title?: string;
    type?: string;
    summary?: string;
    content?: string;
    metadata?: any;
}

export const activate = (context: any) => {
    console.log('[Document Reader] Renderer activated');

    const DocumentPanel = () => {
        const [documents, setDocuments] = useState<Document[]>([]);
        const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
        const [selectedDocContent, setSelectedDocContent] = useState<any | null>(null);
        const [dragging, setDragging] = useState(false);
        const [loading, setLoading] = useState(false);
        const [error, setError] = useState<string | null>(null);

        // Fetch documents on mount
        useEffect(() => {
            fetchDocuments();
        }, []);

        // Fetch content when a document is selected
        useEffect(() => {
            if (selectedDocId) {
                fetchDocumentContent(selectedDocId);
            } else {
                setSelectedDocContent(null);
            }
        }, [selectedDocId]);

        const fetchDocuments = async () => {
            try {
                setLoading(true);
                const docs = await context.dsn.request('document-reader', 'list_documents', {});
                setDocuments(docs || []);
            } catch (err: any) {
                console.error('Failed to list documents:', err);
                setError('Failed to load documents');
            } finally {
                setLoading(false);
            }
        };

        const fetchDocumentContent = async (id: string) => {
            try {
                setLoading(true);
                const doc = await context.dsn.request('document-reader', 'get_document_content', { id });
                setSelectedDocContent(doc);
            } catch (err: any) {
                console.error('Failed to get document content:', err);
                setError('Failed to load document content');
            } finally {
                setLoading(false);
            }
        };

        const handleDrop = useCallback(async (e: any) => {
            e.preventDefault();
            setDragging(false);
            
            const droppedFiles = Array.from(e.dataTransfer.files);
            if (droppedFiles.length === 0) return;

            setLoading(true);
            setError(null);

            for (const file of droppedFiles as any[]) {
                try {
                    // We need the absolute path. In Electron, File object usually exposes 'path' property.
                    const filePath = file.path; 
                    if (!filePath) {
                        setError('Cannot determine file path. Please use the desktop app.');
                        continue;
                    }

                    await context.dsn.request('document-reader', 'ingest_document', { filePath });
                } catch (err: any) {
                    console.error('Ingestion failed:', err);
                    setError(`Failed to ingest ${file.name}: ${err.message}`);
                }
            }
            
            await fetchDocuments();
            setLoading(false);
        }, []);

        return (
            <div className="h-full flex flex-col text-white bg-gray-900">
                <div className="p-4 border-b border-gray-800 flex justify-between items-center">
                    <h2 className="text-xl font-bold">Document Reader</h2>
                    <button 
                        onClick={fetchDocuments} 
                        className="text-sm bg-gray-800 hover:bg-gray-700 px-3 py-1 rounded"
                    >
                        Refresh
                    </button>
                </div>

                <div className="flex-1 flex overflow-hidden">
                    {/* Sidebar / List */}
                    <div className="w-1/3 border-r border-gray-800 flex flex-col">
                        <div 
                            className={`p-4 border-b border-gray-800 text-center transition-colors cursor-pointer ${dragging ? 'bg-blue-900/50 border-blue-500' : 'hover:bg-gray-800'}`}
                            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                            onDragLeave={() => setDragging(false)}
                            onDrop={handleDrop}
                        >
                            <div className="text-2xl mb-1">📥</div>
                            <div className="text-xs text-gray-400">Drag & Drop files to ingest</div>
                        </div>

                        <div className="flex-1 overflow-y-auto">
                            {documents.map(doc => (
                                <div 
                                    key={doc.id}
                                    onClick={() => setSelectedDocId(doc.id)}
                                    className={`p-3 border-b border-gray-800 cursor-pointer hover:bg-gray-800 ${selectedDocId === doc.id ? 'bg-blue-900/30 border-l-4 border-l-blue-500' : ''}`}
                                >
                                    <div className="font-semibold text-sm truncate">{doc.title || 'Untitled'}</div>
                                    <div className="text-xs text-gray-500 mt-1">{new Date(doc.type || '').toLocaleDateString()}</div>
                                    {doc.summary && (
                                        <div className="text-xs text-gray-400 mt-1 line-clamp-2 italic">
                                            {doc.summary}
                                        </div>
                                    )}
                                </div>
                            ))}
                            {documents.length === 0 && !loading && (
                                <div className="p-4 text-center text-gray-500 text-sm">No documents found</div>
                            )}
                        </div>
                    </div>

                    {/* Main Content / Viewer */}
                    <div className="flex-1 flex flex-col overflow-hidden bg-gray-950">
                        {selectedDocContent ? (
                            <div className="flex-1 overflow-y-auto p-8">
                                <div className="max-w-3xl mx-auto">
                                    <h1 className="text-2xl font-bold mb-2">{selectedDocContent.metadata.title}</h1>
                                    
                                    <div className="flex gap-4 text-sm text-gray-500 mb-6 pb-4 border-b border-gray-800">
                                        <span>{selectedDocContent.metadata.author || 'Unknown Author'}</span>
                                        <span>•</span>
                                        <span>{new Date(selectedDocContent.metadata.createdAt).toLocaleString()}</span>
                                        {selectedDocContent.metadata.pageCount && (
                                            <>
                                                <span>•</span>
                                                <span>{selectedDocContent.metadata.pageCount} pages</span>
                                            </>
                                        )}
                                    </div>

                                    {selectedDocContent.metadata.summary && (
                                        <div className="bg-blue-900/20 border border-blue-900/50 p-4 rounded-lg mb-8">
                                            <h3 className="text-blue-300 font-semibold mb-2 text-sm uppercase tracking-wider">Summary</h3>
                                            <p className="text-gray-300 leading-relaxed">{selectedDocContent.metadata.summary}</p>
                                        </div>
                                    )}

                                    {selectedDocContent.metadata.entities && selectedDocContent.metadata.entities.length > 0 && (
                                        <div className="mb-8 flex flex-wrap gap-2">
                                            {selectedDocContent.metadata.entities.map((entity: string, i: number) => (
                                                <span key={i} className="px-2 py-1 bg-gray-800 rounded text-xs text-gray-300">
                                                    {entity}
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    <div className="prose prose-invert max-w-none">
                                        <pre className="whitespace-pre-wrap font-sans text-gray-300 leading-relaxed">
                                            {selectedDocContent.content}
                                        </pre>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 flex items-center justify-center text-gray-600">
                                {loading ? 'Loading...' : 'Select a document to view'}
                            </div>
                        )}
                    </div>
                </div>

                {error && (
                    <div className="absolute bottom-4 right-4 bg-red-900/90 text-white px-4 py-2 rounded shadow-lg max-w-md">
                        {error}
                        <button onClick={() => setError(null)} className="ml-2 text-red-300 hover:text-white">✕</button>
                    </div>
                )}
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
