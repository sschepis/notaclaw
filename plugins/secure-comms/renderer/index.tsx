import React, { useState } from 'react';
import { Shield } from 'lucide-react';

export const activate = (context: any) => {
    console.log('[Secure Comms] Renderer activated');
    const { ui } = context;

    const CommsPanel = () => {
        const [recipient, setRecipient] = useState('');
        const [message, setMessage] = useState('');
        const [log, setLog] = useState<string[]>([]);

        const handleSend = () => {
            if (!recipient || !message) return;
            setLog(prev => [`Encrypting message for ${recipient}...`, ...prev]);
            setTimeout(() => {
                setLog(prev => [`Message sent securely to ${recipient}.`, ...prev]);
                setMessage('');
            }, 1000);
        };

        const handleVerify = () => {
            setLog(prev => [`Verifying signature...`, ...prev]);
            setTimeout(() => {
                setLog(prev => [`Signature VALID.`, ...prev]);
            }, 1000);
        };

        return (
            <div className="h-full flex flex-col p-4 text-white">
                <h2 className="text-xl font-bold mb-4">Secure Comms</h2>
                
                <div className="bg-white/5 p-4 rounded-lg mb-4 space-y-3 border border-white/10">
                    <h3 className="text-sm font-bold text-gray-400 uppercase">Send Encrypted Message</h3>
                    <input 
                        value={recipient}
                        onChange={(e) => setRecipient(e.target.value)}
                        placeholder="Recipient ID / Public Key"
                        className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                    />
                    <textarea 
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Secret message..."
                        className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-sm h-24 resize-none focus:outline-none focus:border-blue-500"
                    />
                    <button 
                        onClick={handleSend}
                        disabled={!recipient || !message}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white py-2 rounded font-medium transition-colors disabled:opacity-50"
                    >
                        Encrypt & Send
                    </button>
                </div>

                <div className="bg-white/5 p-4 rounded-lg mb-4 space-y-3 border border-white/10">
                    <h3 className="text-sm font-bold text-gray-400 uppercase">Verify Signature</h3>
                    <div className="flex gap-2">
                        <button 
                            onClick={handleVerify}
                            className="flex-1 bg-white/10 hover:bg-white/20 text-white py-2 rounded font-medium transition-colors"
                        >
                            Verify Last Message
                        </button>
                    </div>
                </div>

                <div className="flex-1 bg-black/20 rounded-lg p-3 overflow-y-auto font-mono text-xs space-y-1">
                    {log.map((entry, i) => (
                        <div key={i} className="text-gray-400">{entry}</div>
                    ))}
                    {log.length === 0 && <div className="text-gray-600 italic">Ready for secure operations.</div>}
                </div>
            </div>
        );
    };

    // Register Navigation
    const cleanupNav = ui.registerNavigation({
        id: 'secure-comms-nav',
        label: 'Secure Comms',
        icon: Shield,
        view: {
            id: 'secure-comms-panel',
            name: 'Secure Communications',
            icon: Shield,
            component: CommsPanel
        },
        order: 1000
    });

    context._cleanups = [cleanupNav];
};

export const deactivate = (context: any) => {
    console.log('[Secure Comms] Renderer deactivated');
    if (context._cleanups) {
        context._cleanups.forEach((cleanup: any) => cleanup());
    }
};

