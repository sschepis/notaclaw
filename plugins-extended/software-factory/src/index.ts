import { AssistantRunner } from './engine';
import { tools } from './skills/raw_tools';
import { prompts } from './workflows/raw_prompts';
import { providers } from './ai/providers';
import { Config, PluginDSN, IAlephAI } from './types';
import { createLogger } from './engine/simpleLogger';

declare const require: any;

// Create a basic logger since AssistantRunner expects one
const logger = createLogger();

export class SoftwareFactoryPlugin {
  private runner: any;

  constructor(private node: PluginDSN, private ai: IAlephAI) {}

  public async activate() {
    console.log('[SoftwareFactory] Activating...');

    // 1. Prepare Configuration
    const config: Config = {
        tools: tools,
        prompts: prompts,
        providers: [
            // Inject virtual provider that routes to AlephAI
            {
                name: "aleph-ai",
                url: "aleph-ai://complete",
                headers: {},
                requestObject: {
                    getMessage: (message: any) => ({ role: message.role, content: message.content }),
                    getOptions: (options: any) => ({ model: 'gemini-2.5-flash-preview-09-2025' }),
                },
                request: (request: any) => {
                    request.response_format = { type: "json_object" }; // Default to JSON for structured output
                    return request;
                },
                toolFormat: {
                    formatTools: (tools: any) => tools // Pass through for now
                },
                responseFormat: {
                    getContent: (response: any) => response.choices[0].message.content,
                    getToolCall: (response: any) => response.choices[0].message.function_call,
                }
            },
            ...providers // Fallbacks
        ]
    };

    // 2. Initialize Engine (The "Brain")
    // We bind the runner to a persistent state object (could be GMF later)
    const initialState = {
        primaryTask: 'Idle',
        taskCompleted: false
    };

    this.runner = AssistantRunner.createAIAssistantRunner(
        config,
        {
            state: initialState,
            defaultProvider: 'aleph-ai' // Use our injected provider
        },
        logger,
        this.ai // Pass the AI service to the runner
    );

    // 3. Register Skills (The "Hands")
    for (const tool of tools) {
        if (tool.type !== 'function') continue;
        
        const def = tool.function;
        
        // Use registerTool instead of registerSkill
        this.node.registerTool({
            name: def.name,
            description: def.description,
            executionLocation: 'SERVER',
            parameters: def.parameters,
            semanticDomain: 'cognitive',
            primeDomain: [2, 3], // Logic & Structure
            smfAxes: [], // Default
            requiredTier: 'Adept',
            version: '1.0.0'
        }, async (params: any) => {
            console.log(`[SoftwareFactory] Executing skill: ${def.name}`);
            
            // Construct the context expected by the tool script
            const toolContext = {
                runner: this.runner,
                tools: {
                    // Minimal subset of tool helpers if needed
                    setState: async (p: any) => { this.runner.state[p.key] = p.value; }
                },
                state: this.runner.state,
                // require is deprecated, we used import, but for compatibility:
                require: (mod: string) => require(mod)
            };

            return await def.script(params, toolContext);
        });
    }

    console.log('[SoftwareFactory] Activated. Listening for tasks...');
  }
}

export async function activate(context: { dsn: PluginDSN, ai: IAlephAI }) {
  const factory = new SoftwareFactoryPlugin(context.dsn, context.ai);
  await factory.activate();
}
