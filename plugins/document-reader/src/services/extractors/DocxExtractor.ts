import * as mammoth from 'mammoth';
import * as fs from 'fs/promises';
import { IExtractor, ExtractedDocument } from './types';

export class DocxExtractor implements IExtractor {
    supportedMimeTypes = ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

    async extract(filePath: string): Promise<ExtractedDocument> {
        const buffer = await fs.readFile(filePath);
        const result = await mammoth.extractRawText({ buffer });
        const stats = await fs.stat(filePath);

        return {
            content: result.value,
            metadata: {
                createdAt: stats.birthtime,
                title: filePath.split('/').pop()
            }
        };
    }
}
