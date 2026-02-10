import { useState, useCallback } from 'react';
import { ServiceDefinition } from '../../shared/service-types';

export function useMarketplace() {
    const [services, setServices] = useState<ServiceDefinition[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const listServices = useCallback(async (filter?: any) => {
        setIsLoading(true);
        setError(null);
        try {
            const result = await (window as any).aleph.marketplaceListServices(filter);
            setServices(result.services);
        } catch (err: any) {
            console.error('Failed to list services:', err);
            setError(err.message || 'Failed to list services');
        } finally {
            setIsLoading(false);
        }
    }, []);

    const publishService = useCallback(async (definition: ServiceDefinition) => {
        return (window as any).aleph.marketplacePublishService({ definition });
    }, []);

    const subscribe = useCallback(async (serviceId: string, tierName: string) => {
        return (window as any).aleph.marketplaceSubscribe({ serviceId, tierName });
    }, []);

    return {
        services,
        isLoading,
        error,
        listServices,
        publishService,
        subscribe
    };
}
