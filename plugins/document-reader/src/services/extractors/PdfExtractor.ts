import * as fs from 'fs/promises';
import pdf from 'pdf-parse';
import { IExtractor, ExtractedDocument } from './types';

export class PdfExtractor implements IExtractor {
    supportedMimeTypes = ['application/pdf'];

    async extract(filePath: string): Promise<ExtractedDocument> {
        const buffer = await fs.readFile(filePath);
        const data = await pdf(buffer);
        const stats = await fs.stat(filePath);

        return {
            content: data.text,
            metadata: {
                createdAt: stats.birthtime,
                pageCount: data.numpages,
                title: data.info?.Title || filePath.split('/').pop(),
                author: data.info?.Author
            }
        };
    }
}
