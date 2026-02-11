import React from 'react';
import { Network } from 'lucide-react';
import { GatewayPanel } from './GatewayPanel';
import { RendererPluginContext } from '../../../client/src/shared/plugin-types';

export const activate = (context: RendererPluginContext) => {
    console.log('[API Gateway] Renderer activated');

    // Register Stage View & Navigation
    if (context.ui.registerStageView && context.ui.registerNavigation) {
        context.ui.registerStageView({
            id: 'api-gateway-panel',
            name: 'API Gateway',
            icon: Network,
            component: () => <GatewayPanel context={context} />
        });

        context.ui.registerNavigation({
            id: 'api-gateway-nav',
            label: 'Gateway',
            icon: Network,
            view: {
                id: 'api-gateway-panel',
                name: 'API Gateway',
                icon: Network,
                component: () => <GatewayPanel context={context} />
            },
            order: 25
        });
    } else {
        console.warn('[API Gateway] New UI API not available');
    }
};
