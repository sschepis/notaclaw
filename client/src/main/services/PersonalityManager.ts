import { AIProviderManager } from './AIProviderManager';
import { AlephNetClient } from './AlephNetClient';
import { ConversationManager } from './ConversationManager';
import { ServiceRegistry } from './ServiceRegistry';
import { SessionManager } from './SessionManager';
import { DesktopAccessibilityLearner } from './desktop-learner';
import { TraitRegistry } from './TraitRegistry';
import { MomentaryContextService } from './MomentaryContextService';
import { AIResponse } from '../../shared/ai-types';
import { MemoryField, MemoryFragment } from '../../shared/alephnet-types';
import { PromptEngine } from './prompt-engine/PromptEngine';
import { promptRegistry } from './prompt-engine/PromptRegistry';
import { AIProviderManagerAdapter } from './prompt-engine/adapters/AIProviderManagerAdapter';
import { ToolDefinition } from './prompt-engine/types';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { exec } from 'child_process';
import { configManager } from './ConfigManager';

export interface Personality {
    id: string;
    name: string;
    description: string;
    systemPrompt: string;
    traits: string[];
    capabilities: string[];
    contextScope: string;
    intentKeywords?: string[];
}

export interface CommandInterface {
    list: () => Promise<any[]>;
    execute: (id: string) => Promise<void>;
    help: (id: string) => Promise<any>;
    openFile: (path: string) => Promise<void>;
}

export class PersonalityManager {
    private aiManager: AIProviderManager;
    private alephNetClient: AlephNetClient | null = null;
    private conversationManager: ConversationManager | null = null;
    private serviceRegistry: ServiceRegistry | null = null;
    private sessionManager: SessionManager | null = null;
    private desktopLearner: DesktopAccessibilityLearner | null = null;
    private momentaryContextService: MomentaryContextService | null = null;
    private traitRegistry: TraitRegistry;
    private commandInterface: CommandInterface | null = null;
    // private corePersonalityId: string | null = null;
    private personalities: Map<string, Personality> = new Map();

    constructor(aiManager: AIProviderManager) {
        this.aiManager = aiManager;
        this.traitRegistry = new TraitRegistry();
        this.loadPersonalities();
    }

    public getTraitRegistry(): TraitRegistry {
        return this.traitRegistry;
    }

    public registerTrait(trait: import('../../shared/trait-types').TraitDefinition): void {
        this.traitRegistry.register(trait);
    }

    public unregisterTrait(traitId: string): void {
        this.traitRegistry.unregister(traitId);
    }

    public setServiceRegistry(registry: ServiceRegistry) {
        this.serviceRegistry = registry;
    }

    public setCommandInterface(iface: CommandInterface) {
        this.commandInterface = iface;
    }

    public async loadPersonalities() {
        // Assuming process.cwd() is the project root in dev, or we might need a better strategy for prod
        const personalitiesDir = path.join(process.cwd(), 'personalities');
        
        if (!fs.existsSync(personalitiesDir)) {
            console.warn(`Personalities directory not found at ${personalitiesDir}`);
            return;
        }

        const files = fs.readdirSync(personalitiesDir);
        for (const file of files) {
            if (file.endsWith('.json')) {
                try {
                    const content = fs.readFileSync(path.join(personalitiesDir, file), 'utf-8');
                    const personality = JSON.parse(content) as Personality;
                    this.personalities.set(personality.id, personality);
                    console.log(`Loaded personality: ${personality.name} (${personality.id})`);
                } catch (err) {
                    console.error(`Failed to load personality ${file}:`, err);
                }
            }
        }
    }

    public getPersonality(id: string): Personality | undefined {
        return this.personalities.get(id);
    }

    public getAllPersonalities(): Personality[] {
        return Array.from(this.personalities.values());
    }

    public suggestPersonality(content: string): Personality | undefined {
        const lowerContent = content.toLowerCase();
        let bestMatch: Personality | undefined;
        let maxMatches = 0;

        for (const personality of this.personalities.values()) {
            if (!personality.intentKeywords) continue;
            
            let matches = 0;
            for (const keyword of personality.intentKeywords) {
                if (lowerContent.includes(keyword.toLowerCase())) {
                    matches++;
                }
            }
            
            if (matches > maxMatches) {
                maxMatches = matches;
                bestMatch = personality;
            }
        }
        
        // Simple threshold: at least 1 keyword match
        return maxMatches > 0 ? bestMatch : undefined;
    }

    public setAlephNetClient(client: AlephNetClient) {
        this.alephNetClient = client;
    }

    public setConversationManager(manager: ConversationManager) {
        this.conversationManager = manager;
    }

    public setSessionManager(manager: SessionManager) {
        this.sessionManager = manager;
    }

    public setDesktopLearner(learner: DesktopAccessibilityLearner) {
        this.desktopLearner = learner;
    }

    public setMomentaryContextService(service: MomentaryContextService) {
        this.momentaryContextService = service;
    }

    /**
     * Retrieves or creates the Core Personality MemoryField.
     * Scope: 'user'
     * Name: 'Core Personality'
     */
    async getCorePersonality(): Promise<MemoryField> {
        if (!this.alephNetClient) throw new Error('AlephNetClient not initialized in PersonalityManager');

        // Try to find existing core personality field
        const fields = await this.alephNetClient.memoryList({ scope: 'user' });
        const existing = fields.find(f => f.name === 'Core Personality');

        if (existing) {
            // this.corePersonalityId = existing.id;
            return existing;
        }

        // Create if not exists
        const newField = await this.alephNetClient.memoryCreate({
            name: 'Core Personality',
            scope: 'user',
            description: 'The core persona definition for the AI agent.',
            visibility: 'private'
        });

        // this.corePersonalityId = newField.id;
        
        // Initialize with a default system prompt fragment if empty
        await this.alephNetClient.memoryStore({
            fieldId: newField.id,
            content: "You are a helpful, intelligent, and secure AI assistant within the AlephNet ecosystem. You value privacy, security, and user autonomy.",
            significance: 1.0,
            metadata: { type: 'system_prompt', default: true }
        });

        return newField;
    }

    /**
     * Retrieves relevant fragments from the conversation's memory field to build context.
     */
    async getSituationalContext(conversationId: string, query: string): Promise<string> {
        if (!this.alephNetClient || !this.conversationManager) return '';

        try {
            // Get conversation to find its memory field
            const conversation = await this.conversationManager.getConversation(conversationId);
            // The conversation object from ConversationManager might not have memoryFieldId typed in the interface yet
            // but we saw in the code it's stored. We'll cast to any or check property.
            const memoryFieldId = (conversation as any).memoryFieldId;

            if (!memoryFieldId) return '';

            // Query the memory field for relevant fragments
            const result = await this.alephNetClient.memoryQuery({
                fieldId: memoryFieldId,
                query: query,
                limit: 10,
                threshold: 0.5
            });

            // Sort by timestamp (ascending) to maintain chronological order in context
            const fragments = result.fragments.sort((a, b) => a.timestamp - b.timestamp);

            if (fragments.length === 0) return '';

            return `\n\nRelevant Context:\n${fragments.map(f => `- ${f.content}`).join('\n')}`;
        } catch (error) {
            console.warn(`Failed to get situational context for conversation ${conversationId}:`, error);
            return '';
        }
    }

    /**
     * Handles the interaction flow:
     * 1. Get Core Personality (System Prompt)
     * 2. Get Situational Context
     * 3. Construct Prompt
     * 4. Call AI
     * 5. Store Interaction
     */
    async handleInteraction(content: string, metadata: any): Promise<AIResponse> {
        if (!this.alephNetClient) throw new Error('AlephNetClient not initialized');

        const conversationId = metadata.conversationId || metadata.id;
        let personalityId = metadata.personalityId;

        // Extract image attachments for multimodal support and text attachments for context
        const imageAttachments: Array<{ mimeType: string; data: string }> = [];
        const textAttachmentParts: string[] = [];
        if (metadata.attachments && Array.isArray(metadata.attachments)) {
            for (const att of metadata.attachments) {
                if (att.type === 'image' && att.dataUrl) {
                    // dataUrl format: "data:image/png;base64,iVBOR..."
                    const match = att.dataUrl.match(/^data:(image\/[^;]+);base64,(.+)$/);
                    if (match) {
                        imageAttachments.push({
                            mimeType: match[1],
                            data: match[2]
                        });
                    }
                } else if (att.content) {
                    // Text/document/file attachments — include their content in the prompt
                    textAttachmentParts.push(
                        `--- Attached file: ${att.name} ---\n${att.content}\n--- End of ${att.name} ---`
                    );
                }
            }
        }

        // Append text attachment contents to the user message so the AI can see them
        if (textAttachmentParts.length > 0) {
            content = content + '\n\n' + textAttachmentParts.join('\n\n');
        }

        // If personalityId not provided in metadata, try to fetch from conversation
        if (!personalityId && conversationId && this.conversationManager) {
            try {
                const conversation = await this.conversationManager.getConversation(conversationId);
                if (conversation && conversation.personalityId) {
                    personalityId = conversation.personalityId;
                }
            } catch (err) {
                // Ignore error if conversation not found (might be a new one or stateless)
            }
        }

        // 1. Get Core Personality
        let systemPrompt = '';

        if (personalityId) {
            const personality = this.getPersonality(personalityId);
            if (personality) {
                systemPrompt = personality.systemPrompt;
            }
        } else {
            // Try to suggest a personality based on content if none is explicitly set
            const suggestion = this.suggestPersonality(content);
            if (suggestion) {
                systemPrompt = suggestion.systemPrompt;
                // Optional: We could log this or add a meta-header
                // console.log(`Auto-switching to ${suggestion.name} for query: "${content.substring(0, 50)}..."`);
            }
        }

        if (!systemPrompt) {
            const coreField = await this.getCorePersonality();
            
            // Fetch all fragments from core personality to build the system prompt
            // We use an empty query with zero threshold to retrieve all fragments (up to limit)
            // ensuring we get the complete personality definition without semantic bias.
            const coreFragmentsResult = await this.alephNetClient.memoryQuery({
                fieldId: coreField.id,
                query: '', 
                limit: 50, // Sufficient for a complex personality
                threshold: 0.0
            });
            
            systemPrompt = coreFragmentsResult.fragments
                .sort((a, b) => (b.significance || 0) - (a.significance || 0))
                .map(f => f.content)
                .join('\n\n');
        }

        if (!systemPrompt) {
            systemPrompt = "You are a helpful AI assistant.";
        }

        // 1.5. Inject Traits (Capabilities)
        const relevantTraits = this.traitRegistry.resolveTraits(content);
        if (relevantTraits.length > 0) {
            systemPrompt += "\n\n### Active Capabilities\n";
            for (const trait of relevantTraits) {
                systemPrompt += `\n**${trait.name}**: ${trait.instruction}`;
            }
        }

        // 2. Get Situational Context + Momentary Context
        let situationalContext = conversationId 
            ? await this.getSituationalContext(conversationId, content) 
            : '';

        // Inject momentary context (compressed summary of the conversation state)
        if (conversationId && this.momentaryContextService) {
            const momentaryCtx = this.momentaryContextService.formatForPrompt(conversationId);
            if (momentaryCtx) {
                situationalContext = momentaryCtx + situationalContext;
            }
        }

        // 3. Construct Prompt & Call AI using PromptEngine
        const promptName = `personality-chat-${Date.now()}`;
        promptRegistry.register({
            name: promptName,
            system: '{corePersonality}\n\n{situationalContext}',
            user: '{userMessage}',
            requestFormat: { corePersonality: 'string', situationalContext: 'string', userMessage: 'string' },
            responseFormat: 'text'
        });

        const tools: ToolDefinition[] = [
            {
                type: 'function',
                function: {
                    name: 'list_personalities',
                    description: 'List all available personalities/mentors with their descriptions.',
                    parameters: { type: 'object', properties: {}, required: [] },
                    script: async () => {
                        return this.getAllPersonalities().map(p => ({ id: p.id, name: p.name, description: p.description }));
                    }
                }
            },
            {
                type: 'function',
                function: {
                    name: 'switch_personality',
                    description: 'Switch the current conversation to a different personality/mentor.',
                    parameters: {
                        type: 'object',
                        properties: {
                            personalityId: { type: 'string', description: 'The ID of the personality to switch to' }
                        },
                        required: ['personalityId']
                    },
                    script: async ({ personalityId }: { personalityId: string }) => {
                        const p = this.getPersonality(personalityId);
                        if (!p) return { error: `Personality ${personalityId} not found` };
                        
                        if (conversationId && this.conversationManager) {
                            await this.conversationManager.setPersonality(conversationId, personalityId);
                            return { success: true, message: `Switched conversation to ${p.name}. Future responses will come from ${p.name}.` };
                        }
                        return { error: 'No active conversation to switch' };
                    }
                }
            },
            {
                type: 'function',
                function: {
                    name: 'open_file',
                    description: 'Open a file in the text editor panel. Use this to show code or text content to the user.',
                    parameters: {
                        type: 'object',
                        properties: {
                            filePath: { type: 'string', description: configManager.isSandboxed() ? 'Path to the file to open (relative to workspace root)' : 'Path to the file to open (absolute or relative path)' }
                        },
                        required: ['filePath']
                    },
                    script: async ({ filePath }: { filePath: string }) => {
                        if (!this.commandInterface) return { error: 'Command interface not available' };
                        await this.commandInterface.openFile(filePath);
                        return { success: true, message: `Opened ${filePath}` };
                    }
                }
            },
            // --- Desktop Control Tools ---
            {
                type: 'function',
                function: {
                    name: 'get_screen_targets',
                    description: 'Get list of interactive elements on screen. Returns text list, not an image. AUTOMATICALLY uses AI vision if accessibility fails. Use forceVision=true if you cannot find an element or for non-native apps (games, remote desktops).',
                    parameters: {
                        type: 'object',
                        properties: {
                            appFilter: { type: 'string', description: 'Filter by app name (optional)' },
                            roleFilter: { type: 'string', enum: ['button', 'input', 'link', 'menu', 'all'] },
                            forceVision: { type: 'boolean', description: 'Force AI vision analysis. Use if elements are missing from the list.' }
                        },
                        required: []
                    },
                    script: async ({ appFilter, roleFilter, forceVision }: { appFilter?: string, roleFilter?: string, forceVision?: boolean }) => {
                        if (!this.desktopLearner) return { error: 'Desktop Learner not available' };
                        
                        const context = await this.desktopLearner.getScreenContext({
                            appFilter,
                            roleFilter: roleFilter as any,
                            forceVision
                        });
                        
                        let targets = context.targets;
                        
                        // Return text representation
                        return {
                            app: context.activeApp.name,
                            window: context.activeApp.windowTitle,
                            elementCount: targets.length,
                            elements: targets.slice(0, 30).map(t => ({
                                id: t.id,
                                type: t.role,
                                label: t.label,
                                position: `(${t.clickPoint.x}, ${t.clickPoint.y})`,
                                confidence: t.confidence.toFixed(2),
                                learned: t.hitCount > 0
                            }))
                        };
                    }
                }
            },
            {
                type: 'function',
                function: {
                    name: 'click_element',
                    description: 'Click a screen element by its ID (from get_screen_targets)',
                    parameters: {
                        type: 'object',
                        properties: {
                            elementId: { type: 'string', description: 'Element ID from get_screen_targets' }
                        },
                        required: ['elementId']
                    },
                    script: async ({ elementId }: { elementId: string }) => {
                        if (!this.desktopLearner || !this.sessionManager) {
                            return { error: 'Desktop control not available' };
                        }

                        const target = this.desktopLearner.getTarget(elementId);
                        if (!target) {
                            return { error: `Element ${elementId} not found. Try get_screen_targets again.` };
                        }
                        
                        // Execute click via SessionManager
                        await this.sessionManager.executeAction({ type: 'MOUSE_MOVE', x: target.clickPoint.x, y: target.clickPoint.y });
                        const success = await this.sessionManager.executeAction({ type: 'CLICK' });
                        
                        // Record result for learning
                        await this.desktopLearner.recordActionResult(elementId, success);
                        
                        return { 
                            success, 
                            clicked: target.label,
                            position: target.clickPoint,
                            confidence: target.confidence
                        };
                    }
                }
            },
            {
                type: 'function',
                function: {
                    name: 'type_in_element',
                    description: 'Type text into an input field by its ID',
                    parameters: {
                        type: 'object',
                        properties: {
                            elementId: { type: 'string' },
                            text: { type: 'string' }
                        },
                        required: ['elementId', 'text']
                    },
                    script: async ({ elementId, text }: { elementId: string, text: string }) => {
                        if (!this.desktopLearner || !this.sessionManager) {
                            return { error: 'Desktop control not available' };
                        }

                        const target = this.desktopLearner.getTarget(elementId);
                        if (!target) {
                            return { error: `Element ${elementId} not found` };
                        }
                        
                        // Click to focus first
                        await this.sessionManager.executeAction({ type: 'MOUSE_MOVE', x: target.clickPoint.x, y: target.clickPoint.y });
                        await this.sessionManager.executeAction({ type: 'CLICK' });
                        
                        // Small delay for focus
                        await new Promise(r => setTimeout(r, 100));
                        
                        // Type
                        await this.sessionManager.executeAction({ type: 'TYPE', text });
                        
                        await this.desktopLearner.recordActionResult(elementId, true);
                        
                        return { success: true, typed: text, in: target.label };
                    }
                }
            },
            {
                type: 'function',
                function: {
                    name: 'teach_element',
                    description: 'Teach the AI about a UI element at specific coordinates',
                    parameters: {
                        type: 'object',
                        properties: {
                            label: { type: 'string', description: 'What this element is (e.g., "Submit button")' },
                            x: { type: 'number', description: 'X coordinate' },
                            y: { type: 'number', description: 'Y coordinate' }
                        },
                        required: ['label', 'x', 'y']
                    },
                    script: async ({ label, x, y }: { label: string, x: number, y: number }) => {
                        if (!this.desktopLearner) return { error: 'Desktop Learner not available' };
                        
                        const target = await this.desktopLearner.teachTarget(label, x, y);
                        return { 
                            success: true, 
                            message: `Learned "${label}" at (${x}, ${y}). I'll remember this for future sessions.`,
                            targetId: target.id
                        };
                    }
                }
            },
            // --- Command System Tools ---
            {
                type: 'function',
                function: {
                    name: 'list_commands',
                    description: 'List all available system commands (from Command Palette).',
                    parameters: { type: 'object', properties: {}, required: [] },
                    script: async () => {
                        if (!this.commandInterface) return { error: 'Command interface not available' };
                        return await this.commandInterface.list();
                    }
                }
            },
            {
                type: 'function',
                function: {
                    name: 'command_help',
                    description: 'Get help/details for a specific command.',
                    parameters: {
                        type: 'object',
                        properties: { id: { type: 'string' } },
                        required: ['id']
                    },
                    script: async ({ id }: { id: string }) => {
                        if (!this.commandInterface) return { error: 'Command interface not available' };
                        return await this.commandInterface.help(id);
                    }
                }
            },
            {
                type: 'function',
                function: {
                    name: 'execute_command',
                    description: 'Execute a system command by ID.',
                    parameters: {
                        type: 'object',
                        properties: { id: { type: 'string' } },
                        required: ['id']
                    },
                    script: async ({ id }: { id: string }) => {
                        if (!this.commandInterface) return { error: 'Command interface not available' };
                        await this.commandInterface.execute(id);
                        return { success: true, message: `Command ${id} executed` };
                    }
                }
            },
            // --- Skills System Tools ---
            {
                type: 'function',
                function: {
                    name: 'skills',
                    description: 'Manage and execute skills (registered tools). Usage: skills <action> [params]',
                    parameters: {
                        type: 'object',
                        properties: {
                            action: { type: 'string', enum: ['list', 'help', 'exec', 'find'] },
                            skillName: { type: 'string', description: 'Name of the skill (for help/exec)' },
                            params: { type: 'object', description: 'Parameters for the skill (for exec)' },
                            query: { type: 'string', description: 'Search query (for find)' }
                        },
                        required: ['action']
                    },
                    script: async ({ action, skillName, params, query }: { action: string, skillName?: string, params?: any, query?: string }) => {
                        if (!this.serviceRegistry) return { error: 'Service Registry not available' };

                        switch (action) {
                            case 'list':
                                return { skills: this.serviceRegistry.getRegisteredTools() };
                            case 'help':
                                if (!skillName) return { error: 'skillName required for help' };
                                // In a real system, we'd fetch the schema. For now, we just confirm existence.
                                const exists = this.serviceRegistry.getRegisteredTools().includes(skillName);
                                return exists ? { skill: skillName, status: 'available' } : { error: 'Skill not found' };
                            case 'exec':
                                if (!skillName) return { error: 'skillName required for exec' };
                                try {
                                    const result = await this.serviceRegistry.invokeTool(skillName, params || {});
                                    return { result };
                                } catch (e: any) {
                                    return { error: e.message };
                                }
                            case 'find':
                                if (!query) return { error: 'query required for find' };
                                // Simple filter for now
                                const matches = this.serviceRegistry.getRegisteredTools().filter(t => t.includes(query));
                                return { matches };
                            default:
                                return { error: 'Invalid action' };
                        }
                    }
                }
            },
            // --- Shell Tool ---
            {
                type: 'function',
                function: {
                    name: 'shell',
                    description: 'Execute a shell command.',
                    parameters: {
                        type: 'object',
                        properties: {
                            command: { type: 'string' },
                            args: { type: 'array', items: { type: 'string' } },
                            cwd: { type: 'string', description: 'Working directory for the command (optional)' }
                        },
                        required: ['command']
                    },
                    script: async ({ command, args, cwd }: { command: string, args?: string[], cwd?: string }) => {
                        const cmd = args ? `${command} ${args.join(' ')}` : command;
                        const sandboxed = configManager.isSandboxed();
                        let execCwd: string;
                        if (cwd && !sandboxed) {
                            // When unsandboxed, allow custom cwd
                            execCwd = path.isAbsolute(cwd) ? cwd : path.resolve(os.homedir(), cwd);
                        } else if (!sandboxed) {
                            // When unsandboxed with no cwd, default to home directory
                            execCwd = os.homedir();
                        } else {
                            // When sandboxed, always use process.cwd() (workspace)
                            execCwd = process.cwd();
                        }
                        return new Promise((resolve) => {
                            exec(cmd, { cwd: execCwd }, (error, stdout, stderr) => {
                                resolve({
                                    stdout,
                                    stderr,
                                    exitCode: error ? error.code : 0,
                                    error: error ? error.message : null
                                });
                            });
                        });
                    }
                }
            }
        ];

        // Inject Plugin Tools
        if (this.serviceRegistry) {
            const pluginTools = this.serviceRegistry.getAllToolDefinitions().map(def => ({
                type: 'function' as const,
                function: {
                    name: def.name,
                    description: def.description,
                    parameters: def.parameters || { type: 'object', properties: {} },
                    script: async (args: any) => {
                        try {
                            return await this.serviceRegistry!.invokeTool(def.name, args);
                        } catch (e: any) {
                            return { error: e.message };
                        }
                    }
                }
            }));
            tools.push(...pluginTools);
        }

        const engine = new PromptEngine({
            providers: [new AIProviderManagerAdapter(this.aiManager, metadata.providerId)],
            tools: tools,
            prompts: []
        });

        console.log('[PersonalityManager] Calling PromptEngine.execute with providerId:', metadata.providerId, 'imageAttachments:', imageAttachments.length);
        let engineResult = await engine.execute(promptName, {
            corePersonality: systemPrompt,
            situationalContext: situationalContext,
            userMessage: content
        }, {
            defaultProvider: metadata.providerId,
            state: { ...metadata },
            imageAttachments: imageAttachments.length > 0 ? imageAttachments : undefined
        });
        console.log('[PersonalityManager] PromptEngine result:', JSON.stringify(engineResult)?.substring(0, 500));

        // Handle tool results by re-prompting the AI with tool output in context
        const MAX_LOOPS = 5;
        let loopCount = 0;
        let toolCallHistory = '';

        while (engineResult.toolResult && loopCount < MAX_LOOPS) {
            // Check for direct markdown return (bypass AI re-prompt)
            if (engineResult.toolResult && typeof engineResult.toolResult === 'object' && '__directMarkdown' in engineResult.toolResult) {
                console.log('[PersonalityManager] Tool returned direct markdown, bypassing re-prompt.');
                engineResult.text = (engineResult.toolResult as any).__directMarkdown;
                engineResult.toolResult = undefined; // Clear tool result so we don't loop or append fallback
                break;
            }

            loopCount++;
            const toolName = engineResult.toolName || 'unknown';
            const toolOutput = JSON.stringify(engineResult.toolResult, null, 2);
            console.log(`[PersonalityManager] Tool loop ${loopCount}: ${toolName} returned:`, toolOutput?.substring(0, 300));
            
            // Build tool history - this is appended to the user message so the model sees it clearly
            toolCallHistory += `\n\n[Previous Tool Call]\nYou called "${toolName}" and received this result:\n\`\`\`json\n${toolOutput}\n\`\`\`\n`;
            
            // Create a new message that includes the original request plus the tool results
            // This helps the model understand it already called the tool
            const enhancedUserMessage = `${content}\n\n---\n${toolCallHistory}\nNow please provide a natural language response to the user's original request based on these tool results. Do not call the same tool again.`;
            
            // Re-execute prompt with the tool result included in the user message
            engineResult = await engine.execute(promptName, {
                corePersonality: systemPrompt,
                situationalContext: situationalContext,
                userMessage: enhancedUserMessage
            }, {
                defaultProvider: metadata.providerId,
                state: { ...metadata }
            });
        }

        // If we hit the loop limit and still have a tool result, provide fallback text
        if (engineResult.toolResult && loopCount >= MAX_LOOPS) {
            const toolOutput = JSON.stringify(engineResult.toolResult, null, 2);
            engineResult.text = `I executed the tool and here's the result:\n\`\`\`json\n${toolOutput}\n\`\`\``;
        }

        // Ensure we have text content - if text is empty, format tool result if available
        if (!engineResult.text && engineResult.toolResult) {
            const toolOutput = JSON.stringify(engineResult.toolResult, null, 2);
            engineResult.text = `Tool executed successfully:\n\`\`\`json\n${toolOutput}\n\`\`\``;
            console.log('[PersonalityManager] Fallback: formatted tool result as text');
        }

        // Final safety net: if text is STILL empty after all tool loops and fallbacks,
        // retry once without tools to prevent the AI from silently returning nothing
        // (this can happen when the model tries to call a tool instead of answering,
        //  then the re-prompt also yields empty text)
        if (!engineResult.text || engineResult.text.trim() === '') {
            console.warn('[PersonalityManager] Response text is empty after all loops. Retrying without tools...');
            try {
                const fallbackEngine = new PromptEngine({
                    providers: [new AIProviderManagerAdapter(this.aiManager, metadata.providerId)],
                    tools: [], // No tools — forces a pure text response
                    prompts: []
                });
                const fallbackResult = await fallbackEngine.execute(promptName, {
                    corePersonality: systemPrompt,
                    situationalContext: situationalContext,
                    userMessage: content
                }, {
                    defaultProvider: metadata.providerId,
                    state: { ...metadata },
                    imageAttachments: imageAttachments.length > 0 ? imageAttachments : undefined
                });
                if (fallbackResult.text && fallbackResult.text.trim() !== '') {
                    engineResult.text = fallbackResult.text;
                    console.log('[PersonalityManager] Fallback (no-tools) succeeded:', engineResult.text?.substring(0, 200));
                } else {
                    engineResult.text = '[The AI returned an empty response. This may be due to content filtering or an issue with the model. Please try again or rephrase your request.]';
                    console.error('[PersonalityManager] Fallback (no-tools) also returned empty. Raw:', JSON.stringify(fallbackResult.raw)?.substring(0, 500));
                }
            } catch (fallbackErr) {
                console.error('[PersonalityManager] Fallback retry failed:', fallbackErr);
                engineResult.text = `[Error: The AI failed to generate a response. ${fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr)}]`;
            }
        }

        console.log('[PersonalityManager] Final text response:', engineResult.text?.substring(0, 200));

        const response: AIResponse = {
            content: engineResult.text || '',
            model: metadata.model, // Ideally get from engineResult.raw
            providerId: metadata.providerId,
            usage: engineResult.raw?.usage
        };

        // 5. Store Interaction (if conversation exists)
        if (conversationId && this.conversationManager) {
            try {
                const conversation = await this.conversationManager.getConversation(conversationId);
                const memoryFieldId = (conversation as any).memoryFieldId;

                if (memoryFieldId) {
                    // Store User Input
                    await this.alephNetClient.memoryStore({
                        fieldId: memoryFieldId,
                        content: `User: ${content}`,
                        significance: 0.3, // Lower significance for raw chat logs
                        metadata: { role: 'user', timestamp: Date.now() }
                    });

                    // Store AI Response
                    await this.alephNetClient.memoryStore({
                        fieldId: memoryFieldId,
                        content: `Assistant: ${response.content}`,
                        significance: 0.3,
                        metadata: { role: 'assistant', timestamp: Date.now(), model: response.model }
                    });
                }
            } catch (err) {
                console.warn('Failed to store interaction in memory:', err);
            }
        }

        return response;
    }

    /**
     * Updates the Core Personality by adding a new fragment (defining a trait or instruction).
     */
    async addCoreTrait(trait: string): Promise<MemoryFragment> {
        const field = await this.getCorePersonality();
        if (field.locked) {
            throw new Error('Core Personality is locked. Unlock it to make changes.');
        }

        if (!this.alephNetClient) throw new Error('AlephNetClient not initialized');

        return this.alephNetClient.memoryStore({
            fieldId: field.id,
            content: trait,
            significance: 1.0,
            metadata: { type: 'trait', addedAt: Date.now() }
        });
    }

    /**
     * Locks or unlocks the Core Personality field.
     */
    async setCorePersonalityLock(locked: boolean): Promise<boolean> {
        const field = await this.getCorePersonality();
        
        if (!this.alephNetClient) throw new Error('AlephNetClient not initialized');
        
        await this.alephNetClient.memoryUpdate({ fieldId: field.id, updates: { locked } });
        
        return true; 
    }
}
