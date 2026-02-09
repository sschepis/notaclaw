import { createConnection, createLongLivedTokenAuth, subscribeEntities, callService } from 'home-assistant-js-websocket';
import WebSocket from 'ws';

// Polyfill WebSocket for Node.js environment if needed
if (!global.WebSocket) {
    global.WebSocket = WebSocket;
}

export class DeviceManager {
    constructor(context) {
        this.context = context;
        this.devices = new Map();
        this.connection = null;
        this.unsubscribeEntities = null;
        this.config = { url: '', token: '' };
        
        this.initializeMockDevices();
        this.loadConfig();
    }

    async loadConfig() {
        try {
            const config = await this.context.storage.get('iot-config');
            if (config && config.url) {
                this.config = config;
                const token = await this.context.secrets.get('ha-token');
                if (token) {
                    this.config.token = token;
                    this.connectToHomeAssistant();
                }
            }
        } catch (e) {
            console.error('[IoT Bridge] Failed to load config:', e);
        }
    }

    async connectToHomeAssistant() {
        if (!this.config.url || !this.config.token) return;

        console.log(`[IoT Bridge] Connecting to Home Assistant at ${this.config.url}...`);

        try {
            const auth = createLongLivedTokenAuth(
                this.config.url,
                this.config.token
            );

            this.connection = await createConnection({ auth });
            console.log('[IoT Bridge] Connected to Home Assistant!');

            this.unsubscribeEntities = subscribeEntities(
                this.connection,
                (entities) => this.handleEntityUpdates(entities)
            );

        } catch (err) {
            console.error('[IoT Bridge] Connection failed:', err);
            // Fallback to mock if connection fails? Or just show error state?
            // For now, we keep mock devices but maybe mark them as distinct
        }
    }

    handleEntityUpdates(entities) {
        // Convert HA entities to our device format
        Object.keys(entities).forEach(entityId => {
            const entity = entities[entityId];
            const domain = entityId.split('.')[0];
            
            let type = 'unknown';
            if (domain === 'light') type = 'light';
            if (domain === 'switch') type = 'switch';
            if (domain === 'lock') type = 'lock';
            if (domain === 'climate') type = 'thermostat';

            if (['light', 'switch', 'lock', 'climate'].includes(domain)) {
                const device = {
                    id: entityId,
                    name: entity.attributes.friendly_name || entityId,
                    type: type,
                    state: this.mapHAState(entity, type),
                    raw: entity
                };
                this.devices.set(entityId, device);
            }
        });

        // Emit update via IPC
        // We need to access the context to send IPC, but we passed it in constructor
        // However, we need to trigger the send. 
        // We'll emit an event or call a callback if we had one.
        // For now, let's assume the main loop polls or we have a way to notify.
        if (this.onDeviceUpdate) {
            this.onDeviceUpdate(Array.from(this.devices.values()));
        }
    }

    mapHAState(entity, type) {
        const state = {};
        if (type === 'light' || type === 'switch') {
            state.on = entity.state === 'on';
            if (entity.attributes.brightness) state.brightness = Math.round((entity.attributes.brightness / 255) * 100);
        }
        if (type === 'lock') {
            state.locked = entity.state === 'locked';
        }
        if (type === 'thermostat') {
            state.temperature = entity.attributes.current_temperature;
            state.mode = entity.state;
        }
        return state;
    }

    async controlDevice(deviceId, action, value) {
        if (this.connection) {
            const domain = deviceId.split('.')[0];
            let service = '';
            let data = { entity_id: deviceId };

            if (action === 'turn_on') service = 'turn_on';
            if (action === 'turn_off') service = 'turn_off';
            if (action === 'lock') service = 'lock';
            if (action === 'unlock') service = 'unlock';
            
            if (service) {
                await callService(this.connection, domain, service, data);
                return; // State update will come via subscription
            }
        }

        // Fallback to mock update if not connected or device is mock
        this.updateDeviceState(deviceId, this.mapActionToState(action, value));
    }

    mapActionToState(action, value) {
        let updates = {};
        if (action === 'turn_on') updates.on = true;
        if (action === 'turn_off') updates.on = false;
        if (action === 'set_level') updates.brightness = value;
        if (action === 'lock') updates.locked = true;
        if (action === 'unlock') updates.locked = false;
        if (action === 'set_temperature') updates.temperature = value;
        return updates;
    }

    initializeMockDevices() {
        this.addDevice({
            id: 'light_living_room',
            name: 'Living Room Light (Mock)',
            type: 'light',
            state: { on: true, brightness: 80 }
        });
        this.addDevice({
            id: 'thermostat_main',
            name: 'Main Thermostat (Mock)',
            type: 'thermostat',
            state: { temperature: 72, mode: 'cool' }
        });
        this.addDevice({
            id: 'lock_front_door',
            name: 'Front Door (Mock)',
            type: 'lock',
            state: { locked: true }
        });
    }

    addDevice(device) {
        this.devices.set(device.id, device);
    }

    getDevice(id) {
        return this.devices.get(id);
    }

    getAllDevices() {
        return Array.from(this.devices.values());
    }

    updateDeviceState(id, newState) {
        const device = this.devices.get(id);
        if (device) {
            device.state = { ...device.state, ...newState };
            this.devices.set(id, device);
            return device;
        }
        return null;
    }
}
