import { Context } from './types';
import { ExtractionService } from './services/ExtractionService';
import { EnrichmentService } from './services/EnrichmentService';
import { StorageService } from './services/StorageService';

export const activate = async (context: Context) => {
  console.log('[Document Reader] Main process activated');

  const storageService = new StorageService(context);
  await storageService.init();

  const extractionService = new ExtractionService();
  const enrichmentService = new EnrichmentService(context);

  // Tool: Ingest Document
  context.dsn.registerTool({
    name: 'ingest_document',
    description: 'Ingest a document from a file path. Supports PDF, DOCX, XLSX, Images, Text.',
    executionLocation: 'SERVER',
    parameters: {
      type: 'object',
      properties: {
        filePath: { type: 'string', description: 'Absolute path to the file' }
      },
      required: ['filePath']
    },
    semanticDomain: 'cognitive',
    primeDomain: [13, 17],
    smfAxes: [0.6, 0.4],
    requiredTier: 'Neophyte',
    version: '1.1.0'
  }, async ({ filePath }: { filePath: string }) => {
    try {
      console.log(`[Document Reader] Ingesting: ${filePath}`);
      
      // 1. Extract
      const extracted = await extractionService.extract(filePath);
      
      // 2. Enrich
      const enriched = await enrichmentService.enrich(extracted);
      
      // 3. Store
      const stored = await storageService.saveDocument(enriched);
      
      return { success: true, document: stored };
    } catch (error: any) {
      console.error('[Document Reader] Ingestion failed:', error);
      return { success: false, error: error.message };
    }
  });

  // Tool: List Documents
  context.dsn.registerTool({
    name: 'list_documents',
    description: 'List all ingested documents',
    executionLocation: 'SERVER',
    parameters: {
      type: 'object',
      properties: {},
    },
    semanticDomain: 'memory',
    primeDomain: [13],
    smfAxes: [0.5, 0.5],
    requiredTier: 'Neophyte',
    version: '1.0.0'
  }, async () => {
    return storageService.getDocuments().map(d => ({
      id: d.id,
      title: d.metadata.title,
      type: d.metadata.createdAt,
      summary: d.metadata.summary
    }));
  });

  // Tool: Get Document Content
  context.dsn.registerTool({
    name: 'get_document_content',
    description: 'Get full content of a document by ID',
    executionLocation: 'SERVER',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Document ID' }
      },
      required: ['id']
    },
    semanticDomain: 'memory',
    primeDomain: [13],
    smfAxes: [0.5, 0.5],
    requiredTier: 'Neophyte',
    version: '1.0.0'
  }, async ({ id }: { id: string }) => {
    const doc = storageService.getDocument(id);
    if (!doc) throw new Error('Document not found');
    return doc;
  });

  // Legacy Summarize Tool (Updated to use EnrichmentService logic if needed, but keeping simple for now)
  context.dsn.registerTool({
    name: 'summarize_document',
    description: 'Generate a summary of a document\'s content',
    executionLocation: 'SERVER',
    parameters: {
      type: 'object',
      properties: {
        content: { type: 'string', description: 'The text content to summarize' },
        maxLength: { type: 'number', description: 'Approximate length of summary' }
      },
      required: ['content']
    },
    semanticDomain: 'cognitive',
    primeDomain: [13, 17],
    smfAxes: [0.6, 0.4],
    requiredTier: 'Neophyte',
    version: '1.0.0'
  }, async ({ content, maxLength = 200 }: { content: string, maxLength?: number }) => {
      console.log('[Document Reader] Summarizing content length:', content.length);
      const sentences = content.match(/[^.!?]+[.!?]+/g) || [content];
      const summary = sentences.slice(0, 3).join(' '); 
      
      const finalSummary = summary.length > maxLength ? summary.substring(0, maxLength) + '...' : summary;
      
      return { 
          summary: finalSummary,
          originalLength: content.length 
      };
  });

  context.on('ready', () => {
    console.log('[Document Reader] Ready');
  });
};

export const deactivate = () => {
  console.log('[Document Reader] Deactivated');
};
