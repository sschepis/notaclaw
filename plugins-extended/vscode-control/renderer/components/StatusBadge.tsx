import React from 'react';

interface StatusBadgeProps {
    connected: boolean;
    authenticated: boolean;
    paired: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ connected, authenticated, paired }) => {
    let status = 'Disconnected';
    let color = 'bg-red-500';

    if (connected) {
        if (authenticated) {
            status = 'Connected';
            color = 'bg-green-500';
        } else {
            status = 'Authenticating...';
            color = 'bg-yellow-500';
        }
    }

    if (!paired && connected) {
        status = 'Unpaired';
        color = 'bg-orange-500';
    }

    return (
        <div className="flex items-center gap-2 px-3 py-1 bg-gray-800 rounded-full border border-gray-700">
            <div className={`w-2 h-2 rounded-full ${color} animate-pulse`} />
            <span className="text-xs font-medium text-gray-300">{status}</span>
        </div>
    );
};
