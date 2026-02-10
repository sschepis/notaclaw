import { AlephGunBridge } from '@sschepis/alephnet-node';
import { ServiceDefinition, ServiceSubscription } from '../../shared/service-types';
import { DSNNode } from './DSNNode';

export class MarketplaceService {
    private bridge: AlephGunBridge;

    constructor(dsnNode: DSNNode) {
        this.bridge = dsnNode.getBridge();
    }

    async publishService(definition: ServiceDefinition): Promise<{ success: boolean; serviceId: string }> {
        if (!this.bridge) {
            throw new Error('DSN Bridge not initialized');
        }

        const gun = this.bridge.getGun();
        const serviceId = definition.id;

        // 1. Write Service Definition
        // services/{serviceId}
        gun.get('services').get(serviceId).put(definition);

        // 2. Index by Category
        // indexes/services/categories/{category}/{serviceId}
        if (definition.category) {
            gun.get('indexes').get('services').get('categories').get(definition.category).get(serviceId).put({ id: serviceId, name: definition.name });
        }

        // 3. Index by Tags
        // indexes/services/tags/{tag}/{serviceId}
        if (definition.tags && Array.isArray(definition.tags)) {
            definition.tags.forEach(tag => {
                gun.get('indexes').get('services').get('tags').get(tag).get(serviceId).put({ id: serviceId, name: definition.name });
            });
        }

        // 4. Index by Provider
        // indexes/services/providers/{providerId}/{serviceId}
        if (definition.providerUserId) {
            gun.get('indexes').get('services').get('providers').get(definition.providerUserId).get(serviceId).put({ id: serviceId, name: definition.name });
        }
        
        // 5. Index by Recent
        gun.get('indexes').get('services').get('recent').get(serviceId).put({ id: serviceId, name: definition.name, timestamp: Date.now() });

        return { success: true, serviceId };
    }

    async listServices(filter: { category?: string; tags?: string[]; query?: string; limit?: number; offset?: number } = {}): Promise<{ services: ServiceDefinition[]; total: number }> {
        if (!this.bridge) {
            throw new Error('DSN Bridge not initialized');
        }

        const gun = this.bridge.getGun();
        const services: ServiceDefinition[] = [];
        
        let queryNode: any;

        if (filter.category) {
            queryNode = gun.get('indexes').get('services').get('categories').get(filter.category);
        } else if (filter.tags && filter.tags.length > 0) {
            // Just use first tag for now
            queryNode = gun.get('indexes').get('services').get('tags').get(filter.tags[0]);
        } else {
             // Fallback: list recent
             queryNode = gun.get('indexes').get('services').get('recent');
        }

        // We need to promisify the Gun map/once
        const serviceIds = await new Promise<string[]>((resolve) => {
            const ids: string[] = [];
            let count = 0;
            // Limit to 50 for now
            const MAX_ITEMS = 50;
            
            const timer = setTimeout(() => {
                resolve(ids);
            }, 500);

            queryNode.map().once((data: any, _key: string) => {
                if (data && data.id) {
                    ids.push(data.id);
                    count++;
                    if (count >= MAX_ITEMS) {
                        clearTimeout(timer);
                        resolve(ids);
                    }
                }
            });
        });

        // Now fetch details
        for (const id of serviceIds) {
            const def = await new Promise<ServiceDefinition | null>((resolve) => {
                gun.get('services').get(id).once((data: any) => {
                    resolve(data as ServiceDefinition);
                });
            });
            
            if (def && def.id) {
                 // Client-side filtering for other tags or query text
                 if (filter.query) {
                     const q = filter.query.toLowerCase();
                     if (!def.name.toLowerCase().includes(q) && 
                         !def.description.toLowerCase().includes(q)) {
                         continue;
                     }
                 }
                 services.push(def);
            }
        }

        return { services, total: services.length };
    }

    async getService(serviceId: string): Promise<ServiceDefinition | null> {
         if (!this.bridge) {
            throw new Error('DSN Bridge not initialized');
        }
        const gun = this.bridge.getGun();
        return new Promise((resolve) => {
            gun.get('services').get(serviceId).once((data: any) => {
                resolve(data as ServiceDefinition);
            });
        });
    }

    async subscribe(serviceId: string, tierName: string): Promise<{ subscription: ServiceSubscription }> {
        // Placeholder
        return {
            subscription: {
                id: `sub_${Date.now()}`,
                serviceId,
                subscriberId: 'me', // TODO: Get actual user ID
                tierName,
                status: 'ACTIVE',
                billing: {
                    periodStart: Date.now(),
                    periodEnd: Date.now() + 30 * 24 * 60 * 60 * 1000,
                    amount: 0,
                    currency: 'ALEPH',
                    autoRenew: true
                },
                usage: {
                    requestsUsed: 0,
                    requestsLimit: 1000,
                    resetAt: Date.now() + 30 * 24 * 60 * 60 * 1000
                },
                apiKey: 'sk_test_' + Math.random().toString(36).substring(7),
                createdAt: Date.now()
            }
        };
    }
}
