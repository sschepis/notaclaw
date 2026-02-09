import React from 'react';
import { GatewayPanel } from './GatewayPanel';

export const activate = (context: any) => {
    console.log('[API Gateway] Renderer activated');

    const ApiGatewayButton = () => {
        const { activeSidebarView, setActiveSidebarView } = context.useAppStore();
        const isActive = activeSidebarView === 'api-gateway';
        
        return (
            <button
                className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
                    isActive ? 'bg-blue-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                }`}
                onClick={() => setActiveSidebarView('api-gateway')}
                title="API Gateway"
            >
                AG
            </button>
        );
    };

    context.registerComponent('sidebar:nav-item', {
        id: 'api-gateway-nav',
        component: ApiGatewayButton
    });

    context.registerComponent('sidebar:view:api-gateway', {
        id: 'api-gateway-panel',
        component: () => <GatewayPanel context={context} />
    });
};
