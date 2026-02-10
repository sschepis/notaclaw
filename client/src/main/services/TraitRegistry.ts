import { TraitDefinition } from '../../shared/trait-types';

export class TraitRegistry {
    private traits: Map<string, TraitDefinition> = new Map();

    constructor() {
        // Register some default system traits if needed
        this.register({
            id: 'system-core',
            name: 'System Core',
            description: 'Core system capabilities',
            instruction: 'You are part of the AlephNet ecosystem. You have access to tools and data.',
            activationMode: 'global',
            priority: 100,
            source: 'system'
        });
    }

    register(trait: TraitDefinition) {
        if (this.traits.has(trait.id)) {
            console.warn(`Overwriting trait ${trait.id}`);
        }
        this.traits.set(trait.id, trait);
        console.log(`Registered trait: ${trait.name} (${trait.id})`);
    }

    unregister(id: string) {
        if (this.traits.delete(id)) {
            console.log(`Unregistered trait: ${id}`);
        }
    }

    get(id: string): TraitDefinition | undefined {
        return this.traits.get(id);
    }

    getAll(): TraitDefinition[] {
        return Array.from(this.traits.values());
    }

    /**
     * Returns traits that match the given context/query based on activation rules.
     */
    resolveTraits(content: string): TraitDefinition[] {
        const active: TraitDefinition[] = [];
        const lowerContent = content.toLowerCase();
        
        for (const trait of this.traits.values()) {
            // 1. Global traits
            if (trait.activationMode === 'global') {
                active.push(trait);
                continue;
            }
            
            // 2. Dynamic traits (keyword match)
            if (trait.activationMode === 'dynamic' && trait.triggerKeywords) {
                if (trait.triggerKeywords.some(kw => lowerContent.includes(kw.toLowerCase()))) {
                    active.push(trait);
                }
            }
            
            // 3. Manual traits are ignored here, must be added explicitly by ID if needed
        }
        
        return active.sort((a, b) => (b.priority || 10) - (a.priority || 10));
    }
}
