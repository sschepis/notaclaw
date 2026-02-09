import React, { useCallback, useState } from 'react';
import { Tldraw } from 'tldraw';
import 'tldraw/tldraw.css';

export const activate = (context) => {
    console.log('[Semantic Whiteboard] Renderer activated');

    const WhiteboardView = () => {
        const [editor, setEditor] = useState<any>(null);

        const handleMount = useCallback((editorInstance) => {
            setEditor(editorInstance);
            console.log('Whiteboard mounted', editorInstance);
        }, []);

        React.useEffect(() => {
            if (!editor) return;
            
            // Listen for IPC events to update the board
            context.ipc.on('whiteboard-update', (data: any) => {
                if (data.element) {
                    try {
                        editor.createShapes([data.element]);
                    } catch (e) {
                        console.error('Failed to create shape:', e);
                    }
                }
                console.log('Received whiteboard update', data);
            });
        }, [editor]);

        return (
            <div className="h-full w-full relative overflow-hidden bg-gray-100">
                <div style={{ position: 'fixed', inset: 0 }}>
                    <Tldraw 
                        persistenceKey="aleph-whiteboard"
                        onMount={handleMount}
                    />
                </div>
            </div>
        );
    };

    const WhiteboardButton = () => {
        const { activeSidebarView, setActiveSidebarView } = context.useAppStore();
        const isActive = activeSidebarView === 'whiteboard';
        
        return (
            <button
                className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
                    isActive ? 'bg-blue-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                }`}
                onClick={() => setActiveSidebarView('whiteboard')}
                title="Whiteboard"
            >
                🎨
            </button>
        );
    };

    context.registerComponent('sidebar:nav-item', {
        id: 'whiteboard-nav',
        component: WhiteboardButton
    });

    context.registerComponent('sidebar:view:whiteboard', {
        id: 'whiteboard-panel',
        component: WhiteboardView
    });
};
