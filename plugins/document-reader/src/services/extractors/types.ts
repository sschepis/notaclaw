export interface DocumentMetadata {
    title?: string;
    author?: string;
    pageCount?: number;
    createdAt?: Date;
    keywords?: string[];
    summary?: string;
    entities?: string[];
}

export interface DocumentStructure {
    sections: {
        title: string;
        content: string;
        level: number;
    }[];
}

export interface ExtractedDocument {
    content: string; // Markdown or plain text
    metadata: DocumentMetadata;
    structure?: DocumentStructure;
}

export interface IExtractor {
    supportedMimeTypes: string[];
    extract(filePath: string): Promise<ExtractedDocument>;
}
