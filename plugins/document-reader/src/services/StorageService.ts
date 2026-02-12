import { Context } from '../types';
import { ExtractedDocument } from './extractors/types';
import { v4 as uuidv4 } from 'uuid';

export interface StoredDocument extends ExtractedDocument {
    id: string;
    ingestedAt: Date;
}

export class StorageService {
    private documents: StoredDocument[] = [];

    constructor(private context: Context) {}

    async init() {
        // Load existing documents from store
        if (!this.context.storage) {
            console.warn('[Document Reader] Storage service not available');
            return;
        }
        const storedDocs = await this.context.storage.get('documents');
        if (storedDocs && Array.isArray(storedDocs)) {
            this.documents = storedDocs;
        }
    }

    async saveDocument(doc: ExtractedDocument): Promise<StoredDocument> {
        const storedDoc: StoredDocument = {
            ...doc,
            id: uuidv4(),
            ingestedAt: new Date()
        };

        this.documents.push(storedDoc);
        if (this.context.storage) {
            await this.context.storage.set('documents', this.documents);
        }
        
        console.log(`[Document Reader] Saved document ${storedDoc.id}`);
        return storedDoc;
    }

    getDocuments(): StoredDocument[] {
        return this.documents;
    }

    getDocument(id: string): StoredDocument | undefined {
        return this.documents.find(d => d.id === id);
    }
    
    async deleteDocument(id: string): Promise<void> {
        this.documents = this.documents.filter(d => d.id !== id);
        await this.context.storage.set('documents', this.documents);
    }
}
