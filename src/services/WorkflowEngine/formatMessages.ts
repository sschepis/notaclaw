import { WorkflowConfig } from './types';
import { interpolate } from './utils';

export function formatMessages(runner: any, prompt: WorkflowConfig['prompts'][0], args: Record<string, any>): any[] {
    const combinedArgs = { ...args, state: runner.state };

    // runner.logger.debug('formatMessages input', { 
    //     args,
    //     runnerState: runner.state,
    //     combinedArgs,
    //     systemPrompt: prompt.system,
    //     userPrompt: prompt.user
    // });

    if (!combinedArgs.state || !combinedArgs.state.primaryTask) {
        runner.logger.warn('state.primaryTask is missing or empty', { state: combinedArgs.state });
    } else {
        runner.logger.debug('state.primaryTask', { primaryTask: combinedArgs.state.primaryTask });
    }

    let system: string, user: string;

    try {
        system = interpolate(prompt.system, combinedArgs);
        user = interpolate(prompt.user, combinedArgs);
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        runner.logger.error('Interpolation error', { error: errorMessage, args: combinedArgs });
        throw new Error(`Interpolation failed: ${errorMessage}`);
    }

    const responseFormatInstruction = `\n\nRESPONSE FORMAT: Respond to this request using a raw JSON object with format ${JSON.stringify(prompt.responseFormat)}. Do NOT surround your JSON with codeblocks. You MUST respond using the provided format.`;
    
    runner.logger.debug('Formatted messages', { 
        system: system.substring(0, 100) + '...', 
        user: user.substring(0, 100) + '...',
        responseFormatInstruction: responseFormatInstruction.substring(0, 100) + '...'
    });
    
    return [
        { role: 'system', content: system + responseFormatInstruction },
        { role: 'user', content: user }
    ];
}
