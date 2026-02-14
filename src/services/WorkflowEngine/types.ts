import { AIProviderManager } from '../AIProviderManager';
import { DSNNode } from '../DSNNode';
import { PersonalityManager } from '../PersonalityManager';

export type WorkflowConfig = {
    prompts: Array<{
        name: string;
        system: string;
        user: string;
        requestFormat: Record<string, string>;
        responseFormat: Record<string, any>;
        tools?: Array<string | { funcName: (parameters: any, context: any) => any }>;
        then: Record<string, {
            prompt?: string;
            function?: string;
            arguments: any;
        }>;
    }>;
    tools: Array<{
        type: string;
        function: {
            name: string;
            description?: string;
            parameters: any;
            /** Tool implementation — either a live function or a string to be compiled at runtime (from JSON chains) */
            script: ((parameters: any, context: any) => Promise<any>) | string;
        };
    }>;
};

export interface RunnerOptions {
    maxDepth?: number;
    timeout?: number;
    retryAttempts?: number;
    retryDelay?: number;
    defaultProvider?: string;
    cycleProviders?: boolean;
    state?: Record<string, any>;
    sessionId?: string; // For MemoryField persistence
    workflowName?: string; // Name for new MemoryField if sessionId not provided
}

export interface WorkflowContext {
    aiManager: AIProviderManager;
    dsnNode: DSNNode;
    personalityManager?: PersonalityManager;
}
