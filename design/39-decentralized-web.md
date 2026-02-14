# Decentralized Web Architecture

This document outlines the architecture for a decentralized web infrastructure built on top of AlephNet. This system allows users to publish applications and content to a decentralized storage network, addressed via human-readable domains.

## 1. Overview

The Decentralized Web (DWeb) system consists of three main layers:
1.  **Storage Layer**: Content-addressed storage for static assets (HTML, JS, CSS, Images).
2.  **Naming Layer**: Mapping human-readable domains to Content Identifiers (CIDs).
3.  **Gateway/Rendering Layer**: A mechanism to resolve, fetch, and render this content within the client.

## 2. Components

### 2.1 DecentralizedWebManager (Service)
The core service responsible for bridging domains, storage, and the client.

**Responsibilities:**
-   **Resolution**: Resolving `domain://<handle>` to a specific `rootCID`.
-   **Fetching**: Retrieving content from the storage network given a CID and path.
-   **Publishing**: Uploading local directories to the network and updating domain records.

### 2.2 Domain Extension
We extend the existing `DomainDefinition` metadata to support web hosting.

```typescript
interface DomainWebMetadata {
  /** The Content Identifier for the root of the website/application */
  webRoot?: string;
  
  /** The entry point file (default: 'index.html') */
  entryPoint?: string;
  
  /** Custom headers or configuration */
  config?: {
    [key: string]: any;
  };
}
```

### 2.3 Storage Protocol
We utilize the `SemanticContentStore` (or a lightweight wrapper around the underlying Gun/IPFS bridge) to store file trees.

**File Structure (Manifest):**
A "directory" in this system is a JSON object mapping paths to file CIDs.

```json
{
  "index.html": "QmHash1...",
  "styles/main.css": "QmHash2...",
  "scripts/app.js": "QmHash3..."
}
```

### 2.4 DWeb Renderer (Client)
A new UI component in the Electron client that acts as a browser.

-   **Address Bar**: Accepts `dweb://<handle>` or `<handle>.eth` (if bridged).
-   **Viewport**: An isolated environment (Sandbox/Iframe) to render the content.
-   **Interception**: Intercepts relative links and resource requests to fetch them from the `DecentralizedWebManager`.

## 3. Workflows

### 3.1 Publishing an App
1.  User selects a local folder (e.g., `./build`).
2.  `DecentralizedWebManager` walks the directory.
3.  For each file:
    -   Calculate Hash.
    -   Upload content to Storage Network (if not exists).
4.  Create a **Manifest** (directory listing) and upload it.
5.  Get the **Manifest CID**.
6.  User selects a target Domain they own (e.g., `@my-app`).
7.  `DecentralizedWebManager` updates the Domain's metadata: `webRoot = ManifestCID`.
8.  Transaction is signed and propagated via `DomainManager`.

### 3.2 Browsing an App
1.  User enters `dweb://@my-app` in the client.
2.  Client requests `DecentralizedWebManager.resolve('@my-app')`.
3.  Manager looks up `@my-app` in `DomainManager`.
4.  Manager retrieves `webRoot` CID from metadata.
5.  Client requests `DecentralizedWebManager.fetch(rootCID, 'index.html')`.
6.  Manager fetches the Manifest (at `rootCID`).
7.  Manager looks up `index.html` in the Manifest to get `fileCID`.
8.  Manager fetches content for `fileCID`.
9.  Content is returned to Client and rendered.

## 4. Security Considerations
-   **Sandboxing**: DApps must run in a sandboxed iframe with restricted access to the main Electron process.
-   **Permissions**: If the DApp needs access to AlephNet APIs (e.g., to sign messages), it must request permissions via a standard bridge (like `window.ethereum` but `window.aleph`).
-   **Content Verification**: Content is verified against its hash (CID) upon retrieval to ensure integrity.

## 5. Technical Stack
-   **Storage**: GunDB (metadata/small files) + IPFS (large blobs) via `AlephGunBridge`.
-   **Resolution**: GunDB (Domain Registry).
-   **Client**: React + Electron (Custom Protocol Handler or IPC).

