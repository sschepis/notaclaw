import { createWorker } from 'tesseract.js';
import * as fs from 'fs/promises';
import { IExtractor, ExtractedDocument } from './types';

export class ImageExtractor implements IExtractor {
    supportedMimeTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];

    async extract(filePath: string): Promise<ExtractedDocument> {
        const worker = await createWorker('eng');
        const ret = await worker.recognize(filePath);
        await worker.terminate();

        const stats = await fs.stat(filePath);

        return {
            content: ret.data.text,
            metadata: {
                createdAt: stats.birthtime,
                title: filePath.split('/').pop()
            }
        };
    }
}
