import { ServiceRegistry } from './ServiceRegistry';
import { IdentityManager } from './IdentityManager';
import { AlephGunBridge } from '@sschepis/alephnet-node';
import { ServiceDefinition } from '../../shared/service-types';
import crypto from 'crypto';

export class ServiceClient {
    private registry: ServiceRegistry;
    private identityManager: IdentityManager;
    private bridge?: AlephGunBridge;

    constructor(registry: ServiceRegistry, identityManager: IdentityManager, bridge?: AlephGunBridge) {
        this.registry = registry;
        this.identityManager = identityManager;
        this.bridge = bridge;
    }

    async call<T>(serviceId: string, endpoint: string, params: any): Promise<T> {
        // 1. Get Definition
        const service = await this.registry.getService(serviceId);
        if (!service) throw new Error(`Service ${serviceId} not found`);

        // 2. Resolve Endpoint
        const endpointDef = service.interface.endpoints.find(e => e.name === endpoint);
        if (!endpointDef) throw new Error(`Endpoint ${endpoint} not found on service ${serviceId}`);

        // 3. Check Auth
        const identity = await this.identityManager.getPublicIdentity();
        if (service.interface.authentication === 'KEYTRIPLET' && !identity) {
            throw new Error('Authentication required: No active identity');
        }

        // 4. Calculate Cost
        const cost = (service.pricing.perCallCost || 0) * endpointDef.costMultiplier;
        console.log(`[ServiceClient] Calling ${serviceId}:${endpoint} (Est. Cost: ${cost} ALEPH)`);

        // 5. Execute Call based on protocol
        if (service.interface.protocol === 'REST' && service.interface.baseUrl) {
            return await this.executeRESTCall<T>(service, endpointDef, params, identity);
        }

        if (service.interface.protocol === 'GUN_SYNC') {
            return await this.executeGunSyncCall<T>(service, endpointDef, params);
        }

        if (service.interface.protocol === 'WEBSOCKET') {
            return await this.executeWebSocketCall<T>(service, endpointDef, params);
        }

        throw new Error(`Protocol ${service.interface.protocol} not supported in this client version`);
    }

    private async executeRESTCall<T>(
        service: ServiceDefinition, 
        endpointDef: any, 
        params: any,
        identity: any
    ): Promise<T> {
        const url = `${service.interface.baseUrl}${endpointDef.path || ''}`;
        console.log(`[ServiceClient] Executing REST request to ${url}`);
        
        const headers: Record<string, string> = {
            'Content-Type': 'application/json'
        };

        // Add authentication if required
        if (service.interface.authentication === 'KEYTRIPLET' && identity) {
            const timestamp = Date.now();
            const signature = this.signRequest(params, timestamp);
            headers['X-AlephNet-Pub'] = identity.pub;
            headers['X-AlephNet-Timestamp'] = timestamp.toString();
            headers['X-AlephNet-Signature'] = signature;
        }

        const method = endpointDef.method || 'POST';
        const fetchOptions: RequestInit = {
            method,
            headers,
        };

        if (method !== 'GET' && method !== 'HEAD') {
            fetchOptions.body = JSON.stringify(params);
        }

        const response = await fetch(url, fetchOptions);
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Service call failed: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        return data as T;
    }

    private async executeGunSyncCall<T>(
        service: ServiceDefinition,
        endpointDef: any,
        params: any
    ): Promise<T> {
        if (!this.bridge) {
            throw new Error('GUN_SYNC protocol requires AlephGunBridge');
        }

        const path = `services/${service.id}/calls/${endpointDef.name}`;
        const callId = crypto.randomUUID();
        
        // Write the request to Gun
        await this.bridge.put(`${path}/requests/${callId}`, {
            params,
            timestamp: Date.now(),
            status: 'PENDING'
        });

        // Wait for response with timeout
        return new Promise<T>((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('GUN_SYNC call timed out'));
            }, 30000);

            const unsubscribe = this.bridge!.subscribe(`${path}/responses/${callId}`, (data: any) => {
                if (data && data.status === 'COMPLETED') {
                    clearTimeout(timeout);
                    unsubscribe();
                    resolve(data.result as T);
                } else if (data && data.status === 'FAILED') {
                    clearTimeout(timeout);
                    unsubscribe();
                    reject(new Error(data.error || 'GUN_SYNC call failed'));
                }
            });
        });
    }

    private async executeWebSocketCall<T>(
        service: ServiceDefinition,
        endpointDef: any,
        params: any
    ): Promise<T> {
        const wsUrl = service.interface.baseUrl?.replace(/^http/, 'ws');
        if (!wsUrl) {
            throw new Error('WebSocket URL not configured for service');
        }

        return new Promise<T>((resolve, reject) => {
            const ws = new WebSocket(wsUrl);
            const callId = crypto.randomUUID();
            
            const timeout = setTimeout(() => {
                ws.close();
                reject(new Error('WebSocket call timed out'));
            }, 30000);

            ws.onopen = () => {
                ws.send(JSON.stringify({
                    type: 'call',
                    callId,
                    endpoint: endpointDef.name,
                    params
                }));
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.callId === callId) {
                        clearTimeout(timeout);
                        ws.close();
                        if (data.error) {
                            reject(new Error(data.error));
                        } else {
                            resolve(data.result as T);
                        }
                    }
                } catch (e) {
                    // Ignore non-JSON messages
                }
            };

            ws.onerror = (_error) => {
                clearTimeout(timeout);
                reject(new Error('WebSocket error'));
            };
        });
    }

    private signRequest(params: any, timestamp: number): string {
        // Create a simple signature for request authentication
        // In production, this would use the private key from IdentityManager
        const payload = JSON.stringify(params) + timestamp.toString();
        return crypto.createHash('sha256').update(payload).digest('hex');
    }
}
