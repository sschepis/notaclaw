import * as fs from 'fs/promises';
import { IExtractor, ExtractedDocument } from './types';

export class TextExtractor implements IExtractor {
    supportedMimeTypes = ['text/plain', 'text/markdown'];

    async extract(filePath: string): Promise<ExtractedDocument> {
        const content = await fs.readFile(filePath, 'utf-8');
        const stats = await fs.stat(filePath);

        return {
            content,
            metadata: {
                createdAt: stats.birthtime,
                title: filePath.split('/').pop() // Simple filename as title
            }
        };
    }
}
