import { PluginContext } from '../../../../client/src/shared/plugin-types';
import { SystemInfoService } from '../services/SystemInfoService';
import { ClipboardService } from '../services/ClipboardService';

export function registerSystemTools(context: PluginContext, systemService: SystemInfoService, clipboardService: ClipboardService) {
    context.dsn.registerTool({
        name: 'sys_get_info',
        description: 'Get detailed system information (CPU, Memory, Network)',
        executionLocation: 'SERVER',
        parameters: {
            type: 'object',
            properties: {},
            required: []
        },
        semanticDomain: 'meta',
        primeDomain: [5],
        smfAxes: [0.5, 0.5],
        requiredTier: 'Neophyte',
        version: '1.0.0'
    }, async () => {
        return systemService.getSystemInfo();
    });

    context.dsn.registerTool({
        name: 'sys_clipboard_read',
        description: 'Read from the system clipboard',
        executionLocation: 'SERVER',
        parameters: {
            type: 'object',
            properties: {},
            required: []
        },
        semanticDomain: 'perceptual',
        primeDomain: [5],
        smfAxes: [0.5, 0.5],
        requiredTier: 'Neophyte',
        version: '1.0.0'
    }, async () => {
        const content = await clipboardService.readClipboard();
        return { content };
    });

    context.dsn.registerTool({
        name: 'sys_clipboard_write',
        description: 'Write to the system clipboard',
        executionLocation: 'SERVER',
        parameters: {
            type: 'object',
            properties: {
                content: { type: 'string', description: 'Content to write' }
            },
            required: ['content']
        },
        semanticDomain: 'cognitive', // or meta? cognitive seems appropriate for writing data
        primeDomain: [5],
        smfAxes: [0.5, 0.5],
        requiredTier: 'Neophyte',
        version: '1.0.0'
    }, async ({ content }: { content: string }) => {
        await clipboardService.writeClipboard(content);
        return { success: true };
    });

    context.dsn.registerTool({
        name: 'sys_screenshot',
        description: 'Take a screenshot of the desktop',
        executionLocation: 'SERVER',
        parameters: {
            type: 'object',
            properties: {
                outputPath: { type: 'string', description: 'Optional path to save the screenshot' }
            },
            required: []
        },
        semanticDomain: 'perceptual',
        primeDomain: [5],
        smfAxes: [0.5, 0.5],
        requiredTier: 'Neophyte',
        version: '1.0.0'
    }, async ({ outputPath }: { outputPath?: string }) => {
        const result = await clipboardService.captureScreenshot(outputPath);
        return { result };
    });

    context.dsn.registerTool({
        name: 'sys_notify',
        description: 'Send a system notification',
        executionLocation: 'SERVER',
        parameters: {
            type: 'object',
            properties: {
                title: { type: 'string', description: 'Notification title' },
                message: { type: 'string', description: 'Notification message' }
            },
            required: ['title', 'message']
        },
        semanticDomain: 'meta',
        primeDomain: [5],
        smfAxes: [0.5, 0.5],
        requiredTier: 'Neophyte',
        version: '1.0.0'
    }, async ({ title, message }: { title: string, message: string }) => {
        await clipboardService.sendNotification(title, message);
        return { success: true };
    });
}
