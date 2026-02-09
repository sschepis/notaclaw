import { KnowledgeGraph, AIChaperone, Fact } from './core/SemanticEngine';
import { PluginContext } from './types';

export class ResonantAgentPlugin {
    private kg: KnowledgeGraph;
    private chaperone: AIChaperone;

    constructor(private context: PluginContext) {
        this.kg = new KnowledgeGraph();
        this.chaperone = new AIChaperone(this.kg, this.context.ai);
        
        // Seed initial knowledge
        this.kg.add(new Fact('SELF', 'is', 'Resonance_Engine'));
    }

    async activate() {
        console.log('[ResonantAgent] Activating Semantic Core...');
        
        this.context.dsn.registerTool({
            name: 'consultResonanceEngine',
            description: 'Query the semantic resonance engine for insights.',
            executionLocation: 'SERVER',
            parameters: {
                type: 'object',
                properties: {
                    query: { type: 'string' }
                },
                required: ['query']
            },
            semanticDomain: 'cognitive',
            primeDomain: [5, 7], // Creativity & Meaning
            smfAxes: [],
            requiredTier: 'Adept',
            version: '1.0.0'
        } as any, async (args: any) => {
            const query = args.query;
            console.log(`[ResonantAgent] Processing query: ${query}`);
            return await this.chaperone.query(query);
        });

        console.log('[ResonantAgent] Active.');
    }
}

export async function activate(context: PluginContext) {
    const agent = new ResonantAgentPlugin(context);
    await agent.activate();
}
