import React, { useState } from 'react';
import { Hand } from 'lucide-react';

export const activate = (context: any) => {
    console.log('[Hello World] Renderer activated');
    const { ui } = context;

    const HelloPanel = () => {
        const [name, setName] = useState('');
        const [message, setMessage] = useState('');

        const sayHello = () => {
            setMessage(`Hello, ${name || 'World'}!`);
        };

        return (
            <div className="h-full flex flex-col p-8 items-center justify-center text-white">
                <div className="bg-white/5 p-8 rounded-2xl border border-white/10 w-full max-w-sm text-center">
                    <div className="text-4xl mb-4">👋</div>
                    <h2 className="text-2xl font-bold mb-2">Hello World</h2>
                    <p className="text-gray-400 mb-6 text-sm">Welcome to your first AlephNet plugin.</p>
                    
                    <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Enter your name..."
                        className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 mb-4 text-center focus:outline-none focus:border-blue-500/50"
                    />
                    
                    <button
                        onClick={sayHello}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2 rounded-lg transition-colors mb-6"
                    >
                        Say Hello
                    </button>
                    
                    {message && (
                        <div className="p-3 bg-green-500/20 text-green-400 rounded-lg font-medium animate-in fade-in slide-in-from-bottom-2">
                            {message}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    // Register Navigation
    const cleanupNav = ui.registerNavigation({
        id: 'hello-world-nav',
        label: 'Hello World',
        icon: Hand,
        view: {
            id: 'hello-world-panel',
            name: 'Hello World',
            icon: Hand,
            component: HelloPanel
        },
        order: 500
    });

    context._cleanups = [cleanupNav];
    
    // Register tool
    if (context.dsn && context.dsn.registerTool) {
        context.dsn.registerTool({
          name: 'say_hello',
          description: 'Says hello to the user',
          executionLocation: 'CLIENT',
          parameters: { type: 'object', properties: { name: { type: 'string' } } }
        }, async ({ name }: any) => {
            const { setActiveSidebarView } = context.useAppStore.getState();
            setActiveSidebarView('hello-world');
            return `Hello, ${name}! (Check the panel)`;
        });
    }
};

export const deactivate = (context: any) => {
    console.log('[Hello World] Renderer deactivated');
    if (context._cleanups) {
        context._cleanups.forEach((cleanup: any) => cleanup());
    }
};

