import React from 'react';

export const StateTab: React.FC<{ pluginId: string }> = ({ pluginId }) => {
    return (
        <div className="flex items-center justify-center h-full text-muted-foreground">
            State management for {pluginId} (Not Implemented)
        </div>
    );
};
