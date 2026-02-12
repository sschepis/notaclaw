import { IExtractor, ExtractedDocument } from './extractors/types';
import { TextExtractor } from './extractors/TextExtractor';
import { DocxExtractor } from './extractors/DocxExtractor';
import { PdfExtractor } from './extractors/PdfExtractor';
import { XlsxExtractor } from './extractors/XlsxExtractor';
import { ImageExtractor } from './extractors/ImageExtractor';
import * as path from 'path';
import * as fs from 'fs/promises';

export class ExtractionService {
    private extractors: IExtractor[] = [];

    constructor() {
        this.extractors = [
            new TextExtractor(),
            new DocxExtractor(),
            new PdfExtractor(),
            new XlsxExtractor(),
            new ImageExtractor()
        ];
    }

    async extract(filePath: string): Promise<ExtractedDocument> {
        const mimeType = await this.getMimeType(filePath);
        const extractor = this.extractors.find(e => e.supportedMimeTypes.includes(mimeType));

        if (!extractor) {
            throw new Error(`Unsupported file type: ${mimeType}`);
        }

        console.log(`[Document Reader] Extracting ${filePath} using ${extractor.constructor.name}`);
        return extractor.extract(filePath);
    }

    private async getMimeType(filePath: string): Promise<string> {
        const ext = path.extname(filePath).toLowerCase();
        switch (ext) {
            case '.txt': return 'text/plain';
            case '.md': return 'text/markdown';
            case '.docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
            case '.pdf': return 'application/pdf';
            case '.xlsx': return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
            case '.xls': return 'application/vnd.ms-excel';
            case '.csv': return 'text/csv';
            case '.png': return 'image/png';
            case '.jpg':
            case '.jpeg': return 'image/jpeg';
            case '.webp': return 'image/webp';
            default: return 'application/octet-stream';
        }
    }
}
