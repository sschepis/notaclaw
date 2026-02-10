import React from 'react';

export const ServicesTab: React.FC<{ pluginId: string }> = ({ pluginId }) => {
    return (
        <div className="flex items-center justify-center h-full text-muted-foreground">
            Services for {pluginId} (Not Implemented)
        </div>
    );
};
