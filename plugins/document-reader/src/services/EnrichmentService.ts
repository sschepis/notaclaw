import { ExtractedDocument } from './extractors/types';
import { Context } from '../types';

export class EnrichmentService {
    constructor(private context: Context) {}

    async enrich(document: ExtractedDocument): Promise<ExtractedDocument> {
        console.log('[Document Reader] Enriching document...');
        
        // 1. Generate Summary
        const summary = await this.generateSummary(document.content);
        
        // 2. Extract Entities (Mock for now)
        const entities = this.extractEntities(document.content);

        return {
            ...document,
            metadata: {
                ...document.metadata,
                summary,
                entities
            }
        };
    }

    private async generateSummary(content: string): Promise<string> {
        // TODO: Use context.ai.generate() if available
        // Fallback to simple extraction
        const sentences = content.match(/[^.!?]+[.!?]+/g) || [content];
        return sentences.slice(0, 5).join(' ');
    }

    private extractEntities(content: string): string[] {
        // Very basic mock entity extraction (capitalized words)
        const words = content.split(/\s+/);
        const entities = words.filter(w => /^[A-Z][a-z]+$/.test(w) && w.length > 3);
        return [...new Set(entities)].slice(0, 10);
    }
}
