import { AIError } from './AIError';

/**
 * Cache compiled script functions to avoid re-compiling on every call.
 * Key: the raw script string, Value: the compiled async function.
 */
const compiledScriptCache = new Map<string, (parameters: any, context: any) => Promise<any>>();

/**
 * Compile a string-form script (from JSON chain definitions) into a callable function.
 * 
 * Scripts in JSON chains are stored as strings like:
 *   "async ({ command }, context) => { ... }"
 * 
 * This function wraps them in a `new Function()` call that returns the arrow function,
 * then caches the result for subsequent calls.
 */
function compileScript(scriptSource: string): (parameters: any, context: any) => Promise<any> {
    const cached = compiledScriptCache.get(scriptSource);
    if (cached) return cached;

    try {
        // The script string is an arrow function expression, e.g.:
        //   "async ({ command }, context) => { ... }"
        // We wrap it in `return (...)` so `new Function` can return it as a value.
        const factory = new Function('require', `"use strict"; return (${scriptSource});`);
        const compiled = factory(require);

        if (typeof compiled !== 'function') {
            throw new Error(`Compiled script is not a function (got ${typeof compiled})`);
        }

        compiledScriptCache.set(scriptSource, compiled);
        return compiled;
    } catch (error) {
        throw new AIError(
            `Failed to compile tool script: ${(error as Error).message}\n` +
            `Script preview: ${scriptSource.substring(0, 200)}...`
        );
    }
}

/**
 * Resolve a tool's script to a callable function, whether it's already
 * a native function or a string that needs compilation.
 */
function resolveScript(script: ((parameters: any, context: any) => Promise<any>) | string): (parameters: any, context: any) => Promise<any> {
    if (typeof script === 'function') {
        return script;
    }
    if (typeof script === 'string') {
        return compileScript(script);
    }
    throw new AIError(`Tool script is neither a function nor a string (got ${typeof script})`);
}

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

            // Resolve script — compile from string if needed, or use as-is if already a function
            const scriptFn = resolveScript(tool.function.script);

            const result = await scriptFn(parsedArgs, { 
                ...runner.context, 
                runner, // Pass the runner instance to allow recursive calls (e.g. callStructuredPrompt)
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
