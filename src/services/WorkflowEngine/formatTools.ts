import { WorkflowConfig } from './types';

export function formatTools(runner: any, tools: WorkflowConfig['prompts'][0]['tools'] | undefined): any[] {
    if (!tools) return [];

    const formattedTools = tools.map(tool => {
        if (typeof tool === 'string') {
            const configTool = runner.config.tools.find((t: any) => t.function.name === tool);
            return configTool;
        } else {
            return {
                type: 'function',
                function: {
                    name: tool.funcName.name,
                    description: 'Dynamically defined function',
                    parameters: { type: 'object', properties: {}, required: [] },
                    script: tool.funcName
                }
            };
        }
    }).filter(Boolean);

    runner.logger.debug('Formatted tools', { toolNames: formattedTools.map((t: any) => t.function.name) });
    return formattedTools;
}
