import React from 'react';

export const IPCTab: React.FC<{ pluginId: string }> = ({ pluginId }) => {
    return (
        <div className="flex items-center justify-center h-full text-muted-foreground">
            IPC for {pluginId} (Not Implemented)
        </div>
    );
};
