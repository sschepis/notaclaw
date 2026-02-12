# Semantic Search — Enhancements

## Critical Issues

### 1. Main Process is a Stub — No Search Engine
- **Current**: `main/index.ts` only registers a `ping` handler and logs readiness. There is zero search, indexing, or embedding logic despite the manifest declaring `dsn:register-tool`, `store:read`, and `store:write` permissions.
- **Enhancement**: Implement a real vector store (in-memory HNSW index, or integrate with a lightweight embedding library). Register IPC handlers for `search:query`, `search:index`, and `search:status`.
- **Priority**: Critical

### 2. DSN Skills Declared but Not Registered
- **Current**: `aleph.json` declares three skills (`semantic_search`, `index_content`, `find_similar_content`) but the main process never calls `context.dsn.registerTool()`.
- **Enhancement**: Register all declared skills with proper handlers so agents can search and index content programmatically.
- **Priority**: Critical

### 3. Indexing is Fake in Renderer
- **Current**: The "Index Content" button in `renderer/index.tsx` calls `setTimeout` and `alert()` — no content is actually indexed. The search calls `queryGlobalMemory()` from the app store, bypassing the plugin's own backend entirely.
- **Enhancement**: Route indexing through the main process via IPC. The main process should generate embeddings (via `context.ai.complete()` or a local embedding model) and store them in a vector index.
- **Priority**: Critical

### 4. Settings Declared but Not Consumed
- **Current**: `aleph.json` defines 5 configurable settings (`vectorDimension`, `defaultThreshold`, `maxResults`, `autoIndex`, `persistIndex`) but the main process ignores them all.
- **Enhancement**: Read settings from `context.storage` or the plugin config on activation. Apply them to the search engine configuration.
- **Priority**: High

---

## Functional Enhancements

### 5. Real Embedding Generation
- Implement embedding generation using either: (a) the host's AI provider via `context.ai.complete()` with an embedding model, (b) a lightweight local model (e.g., ONNX-based sentence transformer), or (c) TF-IDF/BM25 as a fallback for offline use.

### 6. Auto-Indexing of Conversations
- The `autoIndex` setting is declared but not implemented. When enabled, automatically index all new conversation messages as they arrive by subscribing to conversation events.

### 7. Content Chunking
- For large documents, implement automatic chunking (by paragraph, sentence, or token window) before embedding. Maintain chunk-to-document mapping for context retrieval.

### 8. Index Persistence
- The `persistIndex` setting is declared but not implemented. Serialize the vector index to `context.storage` between sessions. Implement lazy loading and warm-up on activation.

### 9. Faceted Search
- Support metadata filtering alongside semantic similarity (e.g., search within a date range, by content type, by source plugin).

### 10. Hybrid Search
- Combine semantic similarity with keyword matching (BM25) for better recall. Allow configurable weighting between the two approaches.

### 11. Search Result Snippets with Highlighting
- Return highlighted text snippets showing which parts of the content matched, rather than the full raw content.

### 12. Relevance Feedback
- Allow users to mark results as relevant/irrelevant. Use this feedback to fine-tune ranking (e.g., adjust similarity thresholds per user preference).

---

## UI/UX Enhancements

### 13. Search-as-You-Type / Debounced Search
- Add debounced search that triggers as the user types, showing results in real-time with a short delay.

### 14. Search History
- Maintain a list of recent searches for quick re-execution.

### 15. Index Statistics Dashboard
- Display the number of indexed documents, total vectors, index size, last indexing time, and index health metrics.

### 16. Bulk Import
- Allow importing files (txt, md, pdf) for batch indexing via a drag-and-drop zone or file picker.

### 17. Use Proper Icon
- The nav button displays text "SS" instead of an icon. Use a lucide-react icon (e.g., `Search`, `Brain`, `Sparkles`).

### 18. Result Detail View
- Clicking a search result should expand to show the full content, metadata, and a link to the source (conversation, document, etc.).

---

## Testing Enhancements

### 19. Expand Test Coverage
- Current tests only cover ping/pong — identical to the secure-backup stub. Add tests for: indexing content, querying with similarity, result ranking, settings application, auto-indexing lifecycle, and index persistence roundtrip.

### 20. Renderer Component Tests
- Test search flow: query input → search trigger → results display. Test indexing flow: content input → index trigger → success feedback.

---

## Architecture Enhancements

### 21. Pluggable Embedding Backend
- Abstract the embedding generation behind an interface so different backends (OpenAI embeddings, local ONNX, TF-IDF) can be swapped without changing the search engine logic.

### 22. Index Events
- Emit events (`search:indexed`, `search:query-completed`) so other plugins can react (e.g., coherence monitor tracking knowledge growth).

### 23. Cross-Plugin Search Integration
- Allow other plugins to register searchable content sources. For example, the reputation manager could make feedback searchable, or temporal-voyager could make historical events searchable.

### 24. Vector Dimension Optimization
- Implement dimension reduction (PCA/random projection) for high-dimensional embeddings to balance accuracy vs. memory usage per the `vectorDimension` setting.
