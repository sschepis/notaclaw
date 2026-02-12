import { AIError } from './AIError';

export async function executeFunction(runner: any, name: string, args: Record<string, any>): Promise<any> {
    const tool = runner.config.tools.find((tool: any) => tool.function.name === name);
    if (tool && tool.function.script) {
        runner.logger.info(`Executing function: ${name}`, { args });
        try {
            const toolFunctions = runner.config.tools.reduce((acc: any, t: any) => {
                acc[t.function.name] = async (params: any) => executeFunction(runner, t.function.name, params);
                return acc;
            }, {});

            // Parse stringified JSON arguments
            const parsedArgs = Object.entries(args).reduce((acc: Record<string, any>, [key, value]) => {
                if (typeof value === 'string') {
                    try {
                        acc[key] = JSON.parse(value);
                    } catch {
                        acc[key] = value;
                    }
                } else {
                    acc[key] = value;
                }
                return acc;
            }, {});

            const result = await tool.function.script(parsedArgs, { 
                ...runner.context, 
                runner, // Pass the runner instance to allow recursive calls
                state: runner.state, 
                tools: toolFunctions,
                require 
            });
            return result;
        } catch (error) {
            runner.logger.error(`Error executing function: ${name}`, { error: (error as Error).message, stack: (error as Error).stack });
            throw new AIError(`Error executing function "${name}": ${error}`);
        }
    }
    runner.logger.error(`Function not found: ${name}`);
    throw new AIError(`Function "${name}" not found`);
}
