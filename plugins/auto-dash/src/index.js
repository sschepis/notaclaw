"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const os = __importStar(require("os"));
const activate = async (context) => {
    console.log('[AutoDash] Backend activated');
    let currentContext = [];
    let updateInterval;
    let customLayout = null;
    // Real System Data Collector
    const collectSystemData = async () => {
        const load = os.loadavg();
        const freeMem = os.freemem();
        const totalMem = os.totalmem();
        return {
            source: 'system',
            timestamp: Date.now(),
            data: {
                cpu_load_1m: load[0].toFixed(2),
                mem_usage_percent: Math.round(((totalMem - freeMem) / totalMem) * 100),
                uptime_hours: (os.uptime() / 3600).toFixed(1),
                platform: os.platform()
            }
        };
    };
    // Real Identity Data
    const collectIdentityData = async () => {
        try {
            const identity = await context.dsn.getIdentity();
            return {
                source: 'identity',
                timestamp: Date.now(),
                data: {
                    peerId: identity.peerId || 'Unknown',
                    shortKey: identity.publicKey ? identity.publicKey.substring(0, 8) + '...' : 'N/A'
                }
            };
        }
        catch (e) {
            // Identity might not be ready
            return null;
        }
    };
    // Collect system data and send fallback schema (no AI calls)
    const updateLoop = async () => {
        try {
            const sysData = await collectSystemData();
            const idData = await collectIdentityData();
            currentContext.push(sysData);
            if (idData)
                currentContext.push(idData);
            // Prune old context to keep size manageable
            const windowSize = 15;
            if (currentContext.length > windowSize) {
                currentContext = currentContext.slice(-windowSize);
            }
            if (customLayout) {
                const latestSys = currentContext.filter(c => c.source === 'system').slice(-1)[0];
                const cpuHistory = currentContext.filter(c => c.source === 'system').map(c => parseFloat(c.data?.cpu_load_1m || 0));
                const updatedWidgets = customLayout.widgets.map((w) => {
                    if (w.id === 'cpu-metric')
                        return { ...w, data: { value: latestSys?.data?.cpu_load_1m || 'N/A', unit: '' } };
                    if (w.id === 'mem-metric')
                        return { ...w, data: { value: latestSys?.data?.mem_usage_percent || 'N/A', unit: '%' } };
                    if (w.id === 'cpu-chart')
                        return { ...w, data: { points: cpuHistory } };
                    if (w.id === 'event-log')
                        return { ...w, data: currentContext.slice(-5) };
                    return w;
                });
                context.ipc.send('autodash:update', { ...customLayout, widgets: updatedWidgets });
                return;
            }
            // Send fallback schema directly (no AI call - saves API costs)
            const schema = createFallbackSchema();
            context.ipc.send('autodash:update', schema);
        }
        catch (error) {
            console.error('[AutoDash] Update loop error:', error);
        }
    };
    // Run every 5 seconds for real-time system metrics (no AI calls)
    updateInterval = setInterval(updateLoop, 5000);
    const extractJSON = (text) => {
        // Try to find JSON object in the response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return jsonMatch[0];
        }
        return null;
    };
    const triggerUpdate = async () => {
        try {
            console.log('[AutoDash] Generating new schema...');
            const prompt = `You are the AutoDash Layout Engine. Generate a dashboard JSON schema based on this data stream.

Data Stream: ${JSON.stringify(currentContext)}

RESPOND WITH ONLY A VALID JSON OBJECT matching this exact structure (no explanation, no markdown):
{
  "layout": "grid",
  "widgets": [
    {
      "id": "cpu-metric",
      "type": "metric",
      "title": "CPU Load",
      "data": { "value": 0.5, "unit": "%" }
    },
    {
      "id": "mem-metric",
      "type": "metric",
      "title": "Memory Usage",
      "data": { "value": 65, "unit": "%" }
    },
    {
      "id": "event-log",
      "type": "log",
      "title": "Recent Events",
      "data": []
    }
  ]
}

Rules:
- Use "metric" type for CPU Load and Memory Usage values from the data
- Use "log" type for recent events
- Use "chart" type with data.points array for CPU history
- Add "actions" array with {label, intent, context} if CPU > 2.0 or Memory > 80%
- Output ONLY the JSON object, nothing else`;
            const response = await context.ai.complete({
                userPrompt: prompt,
                temperature: 0.1
            });
            let jsonStr = response.text.trim();
            // Remove markdown code blocks if present
            jsonStr = jsonStr.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
            // Try to extract JSON object if response contains extra text
            const extracted = extractJSON(jsonStr);
            if (!extracted) {
                console.warn('[AutoDash] No JSON found in response, using fallback schema');
                const fallbackSchema = createFallbackSchema();
                context.ipc.send('autodash:update', fallbackSchema);
                return;
            }
            // Try to parse the extracted JSON
            let schema;
            try {
                schema = JSON.parse(extracted);
            }
            catch (parseError) {
                console.warn('[AutoDash] Invalid JSON from AI, using fallback schema');
                const fallbackSchema = createFallbackSchema();
                context.ipc.send('autodash:update', fallbackSchema);
                return;
            }
            // Validate schema structure
            if (!schema.layout || !Array.isArray(schema.widgets)) {
                console.warn('[AutoDash] Invalid schema structure, using fallback');
                const fallbackSchema = createFallbackSchema();
                context.ipc.send('autodash:update', fallbackSchema);
                return;
            }
            console.log('[AutoDash] Schema generated successfully with', schema.widgets.length, 'widgets');
            context.ipc.send('autodash:update', schema);
        }
        catch (error) {
            console.error('[AutoDash] Failed to generate schema:', error);
            // Send fallback schema on error
            const fallbackSchema = createFallbackSchema();
            context.ipc.send('autodash:update', fallbackSchema);
        }
    };
    const createFallbackSchema = () => {
        const latestData = currentContext.filter(c => c.source === 'system').slice(-1)[0];
        const cpuHistory = currentContext
            .filter(c => c.source === 'system')
            .map(c => parseFloat(c.data?.cpu_load_1m || 0));
        return {
            layout: 'grid',
            widgets: [
                {
                    id: 'cpu-metric',
                    type: 'metric',
                    title: 'CPU Load (1m)',
                    data: { value: latestData?.data?.cpu_load_1m || 'N/A', unit: '' }
                },
                {
                    id: 'mem-metric',
                    type: 'metric',
                    title: 'Memory Usage',
                    data: { value: latestData?.data?.mem_usage_percent || 'N/A', unit: '%' }
                },
                {
                    id: 'cpu-chart',
                    type: 'chart',
                    title: 'CPU History',
                    data: { points: cpuHistory }
                },
                {
                    id: 'event-log',
                    type: 'log',
                    title: 'Recent Events',
                    data: currentContext.slice(-5)
                }
            ]
        };
    };
    // Handle request for AI-generated schema (on-demand only)
    context.ipc.handle('autodash:generate', async () => {
        console.log('[AutoDash] AI generation requested by user');
        await triggerUpdate();
        return { success: true };
    });
    // Handle Actions
    context.ipc.handle('autodash:action', async (event) => {
        const { intent, context: actionContext } = event;
        console.log(`[AutoDash] Executing intent: ${intent}`, actionContext);
        try {
            // Ask AI to formulate a plan
            const prompt = `
        User Intent: "${intent}"
        Context: ${JSON.stringify(actionContext)}
        
        Available Tools:
        - shell: Execute a shell command
        - log: Log a message
        
        Determine the best course of action.
        Return JSON: { "type": "shell" | "log", "payload": "string" }
      `;
            const response = await context.ai.complete({ userPrompt: prompt });
            let plan;
            try {
                let jsonStr = response.text.trim();
                if (jsonStr.startsWith('```json'))
                    jsonStr = jsonStr.replace(/^```json/, '').replace(/```$/, '');
                else if (jsonStr.startsWith('```'))
                    jsonStr = jsonStr.replace(/^```/, '').replace(/```$/, '');
                plan = JSON.parse(jsonStr);
            }
            catch (e) {
                // Fallback
                plan = { type: 'log', payload: `Could not parse plan for ${intent}` };
            }
            if (plan.type === 'shell' && context.services.sandbox) {
                const session = await context.services.sandbox.createSession('bash');
                const result = await session.exec(plan.payload);
                await session.close();
                currentContext.push({ source: 'action:result', timestamp: Date.now(), data: result });
                return { success: true, result };
            }
            else {
                // Log it
                currentContext.push({ source: 'action:log', timestamp: Date.now(), data: plan.payload });
                return { success: true, message: plan.payload };
            }
        }
        catch (error) {
            console.error('[AutoDash] Action failed:', error);
            return { success: false, error: error.message };
        }
    });
    context.ipc.handle('autodash:save-layout', async (schema) => {
        console.log('[AutoDash] Saving custom layout', schema?.widgets?.length);
        customLayout = schema;
        return { success: true };
    });
    // Initial update
    updateLoop();
    // Return cleanup function
    return () => {
        clearInterval(updateInterval);
    };
};
exports.activate = activate;
const deactivate = async () => {
    console.log('[AutoDash] Deactivated');
};
exports.deactivate = deactivate;
