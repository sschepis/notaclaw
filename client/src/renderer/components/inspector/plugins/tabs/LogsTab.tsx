import React from 'react';

export const LogsTab: React.FC<{ pluginId: string }> = ({ pluginId }) => {
    return (
        <div className="flex items-center justify-center h-full text-muted-foreground">
            Logs for {pluginId} (Not Implemented)
        </div>
    );
};
