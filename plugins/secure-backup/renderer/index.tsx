import React, { useState } from 'react';

export const activate = (context: any) => {
    console.log('[Secure Backup] Renderer activated');

    const BackupPanel = () => {
        const [status, setStatus] = useState('');
        const [lastBackup, setLastBackup] = useState<string | null>(null);

        const handleBackup = async () => {
            setStatus('Creating backup...');
            try {
                // Simulate backup creation
                await new Promise(resolve => setTimeout(resolve, 2000));
                const timestamp = new Date().toISOString();
                
                // Create a blob
                const data = { timestamp, version: '1.0.0', content: 'Encrypted Data' };
                const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                
                // Trigger download
                const a = document.createElement('a');
                a.href = url;
                a.download = `aleph-backup-${Date.now()}.json`;
                a.click();
                
                setLastBackup(timestamp);
                setStatus('Backup downloaded successfully');
            } catch (e) {
                setStatus('Backup failed');
            }
        };

        const handleRestore = async () => {
            setStatus('Waiting for file...');
            
            try {
                // Use native dialog if available
                const api = (window as any).electronAPI;
                if (api && api.dialogOpenFile) {
                    const filePath = await api.dialogOpenFile({
                        title: 'Select Backup File',
                        filters: [{ name: 'JSON Files', extensions: ['json'] }]
                    });
                    
                    if (filePath) {
                        setStatus(`Restoring from ${filePath}...`);
                        // In a real app, we would read the file content here using fsRead
                        // const content = await api.fsRead(filePath);
                        setTimeout(() => setStatus('Restore complete'), 2000);
                    } else {
                        setStatus('Restore cancelled');
                    }
                } else {
                    // Fallback to HTML input
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = '.json';
                    input.onchange = (e: any) => {
                        const file = e.target.files[0];
                        if (file) {
                            setStatus(`Restoring from ${file.name}...`);
                            setTimeout(() => setStatus('Restore complete'), 2000);
                        }
                    };
                    input.click();
                }
            } catch (e) {
                console.error(e);
                setStatus('Restore failed');
            }
        };

        return (
            <div className="h-full flex flex-col p-4 text-white">
                <h2 className="text-xl font-bold mb-4">Secure Backup</h2>
                
                <div className="bg-white/5 p-6 rounded-lg mb-6 border border-white/10">
                    <div className="text-center mb-6">
                        <div className="text-4xl mb-2">🛡️</div>
                        <h3 className="text-lg font-medium">Data Protection</h3>
                        <p className="text-sm text-gray-400">Encrypt and save your local data.</p>
                    </div>

                    <div className="space-y-3">
                        <button 
                            onClick={handleBackup}
                            className="w-full bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-lg font-medium transition-colors"
                        >
                            Create New Backup
                        </button>
                        <button 
                            onClick={handleRestore}
                            className="w-full bg-white/10 hover:bg-white/20 text-white py-2 rounded-lg font-medium transition-colors"
                        >
                            Restore from File
                        </button>
                    </div>
                </div>

                {status && (
                    <div className="p-3 bg-gray-800 rounded-lg text-sm text-center text-gray-300">
                        {status}
                    </div>
                )}
                
                {lastBackup && (
                    <div className="mt-4 text-center text-xs text-gray-500">
                        Last backup: {new Date(lastBackup).toLocaleString()}
                    </div>
                )}
            </div>
        );
    };

    const SecureBackupButton = () => {
        const { activeSidebarView, setActiveSidebarView } = context.useAppStore();
        const isActive = activeSidebarView === 'secure-backup';
        
        return (
            <button
                className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
                    isActive ? 'bg-blue-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                }`}
                onClick={() => setActiveSidebarView('secure-backup')}
                title="Secure Backup"
            >
                SB
            </button>
        );
    };

    context.registerComponent('sidebar:nav-item', {
        id: 'secure-backup-nav',
        component: SecureBackupButton
    });

    context.registerComponent('sidebar:view:secure-backup', {
        id: 'secure-backup-panel',
        component: BackupPanel
    });
};
