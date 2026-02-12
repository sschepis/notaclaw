# Document Reader — Enhancements

## Critical Issues

### 1. Limited File Format Support
- **Current**: Likely supports text and maybe PDF.
- **Enhancement**: Add support for DOCX, PPTX, XLSX, EPUB, and Markdown. Use robust libraries (like Apache Tika or specialized parsers) for text extraction.
- **Priority**: Critical

### 2. Basic Text Extraction
- **Current**: Extracts raw text.
- **Enhancement**: Implement structure-aware extraction (headings, paragraphs, tables) to preserve the document's semantic structure.
- **Priority**: High

### 3. No OCR Support
- **Current**: Cannot read scanned PDFs or images.
- **Enhancement**: Integrate Tesseract or a cloud-based OCR service to extract text from images and scanned documents.
- **Priority**: High

---

## Functional Enhancements

### 4. Automatic Summarization
- Automatically generate summaries for ingested documents using an LLM.

### 5. Semantic Indexing
- Automatically index ingested documents into the Semantic Search engine for easy retrieval.

### 6. Metadata Extraction
- Extract metadata (author, date, keywords) from document properties and content.

### 7. Entity Recognition
- Identify entities (people, organizations, locations) mentioned in the document and link them to the Knowledge Graph.

---

## UI/UX Enhancements

### 8. Document Viewer
- Embed a document viewer (PDF.js for PDFs) to view documents directly within the plugin.

### 9. Annotation Tools
- Allow users to highlight text and add notes to documents.

### 10. Library Management
- Provide a library interface to organize, tag, and search ingested documents.

---

## Testing Enhancements

### 11. Format Compatibility Tests
- Create a test suite with sample files for all supported formats to ensure correct text extraction.

### 12. OCR Tests
- Verify OCR accuracy with sample images.

---

## Architecture Enhancements

### 13. Pipeline Architecture
- Implement a processing pipeline (ingest -> extract -> enrich -> index) to allow for modular processing steps.

### 14. Background Processing
- Process large documents in the background to avoid blocking the UI.
