import * as xlsx from 'xlsx';
import * as fs from 'fs/promises';
import { IExtractor, ExtractedDocument } from './types';

export class XlsxExtractor implements IExtractor {
    supportedMimeTypes = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel', 'text/csv'];

    async extract(filePath: string): Promise<ExtractedDocument> {
        const buffer = await fs.readFile(filePath);
        const workbook = xlsx.read(buffer, { type: 'buffer' });
        
        let content = '';
        workbook.SheetNames.forEach(sheetName => {
            const sheet = workbook.Sheets[sheetName];
            content += `\n# Sheet: ${sheetName}\n\n`;
            content += xlsx.utils.sheet_to_csv(sheet);
        });

        const stats = await fs.stat(filePath);

        return {
            content,
            metadata: {
                createdAt: stats.birthtime,
                title: filePath.split('/').pop()
            }
        };
    }
}
