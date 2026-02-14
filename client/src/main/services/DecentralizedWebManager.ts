import { AlephGunBridge } from '@sschepis/alephnet-node';
import { DomainManager } from './DomainManager';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';

export interface ManifestEntry {
  cid: string;
  size: number;
  mimeType: string;
  lastModified: number;
}

export interface WebManifest {
  version: string;
  entries: Record<string, ManifestEntry>; // path -> entry
  index: string; // default entry point
  timestamp: number;
}

export class DecentralizedWebManager {
  constructor(
    private bridge: AlephGunBridge,
    private domainManager: DomainManager
  ) {}

  /**
   * Publish a local directory to the decentralized web.
   * @param directoryPath Local path to the directory to publish
   * @param domainHandle The domain handle (e.g. '@my-app') to link to this content
   * @param entryPoint The default file to serve (default: 'index.html')
   * @returns The CID of the root manifest
   */
  async publish(directoryPath: string, domainHandle: string, entryPoint = 'index.html'): Promise<string> {
    const entries: Record<string, ManifestEntry> = {};
    const baseDir = path.resolve(directoryPath);
    
    // Collect all files first
    const fileList: string[] = [];
    const collectFiles = async (dir: string) => {
      const files = await fs.readdir(dir);
      for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = await fs.stat(fullPath);
        if (stat.isDirectory()) {
          await collectFiles(fullPath);
        } else {
          fileList.push(fullPath);
        }
      }
    };
    await collectFiles(baseDir);

    // Process files in chunks to limit concurrency
    const CONCURRENCY = 5;
    for (let i = 0; i < fileList.length; i += CONCURRENCY) {
      const chunk = fileList.slice(i, i + CONCURRENCY);
      await Promise.all(chunk.map(async (fullPath) => {
        const content = await fs.readFile(fullPath);
        const stat = await fs.stat(fullPath);
        const cid = await this.uploadContent(content);
        const relativePath = path.relative(baseDir, fullPath).replace(/\\/g, '/');
        
        entries[relativePath] = {
          cid,
          size: stat.size,
          mimeType: this.getMimeType(relativePath),
          lastModified: stat.mtimeMs
        };
      }));
    }

    // Create and upload manifest
    const manifest: WebManifest = {
      version: '1.0.0',
      entries,
      index: entryPoint,
      timestamp: Date.now()
    };
    
    const manifestCid = await this.uploadContent(Buffer.from(JSON.stringify(manifest)));

    // Update domain record
    const domain = await this.domainManager.getDomainByHandle(domainHandle);
    if (!domain) {
      throw new Error(`Domain ${domainHandle} not found`);
    }

    await this.domainManager.updateDomainMetadata(domain.id, {
      webRoot: manifestCid,
      lastPublished: Date.now()
    });

    return manifestCid;
  }

  /**
   * Resolve a domain to its web root CID.
   */
  async resolve(domainHandle: string): Promise<string | null> {
    try {
      const domain = await this.domainManager.getDomainByHandle(domainHandle);
      if (!domain || !domain.metadata?.webRoot) {
        return null;
      }
      return domain.metadata.webRoot as string;
    } catch (error) {
      console.error(`[DecentralizedWebManager] Resolve error for ${domainHandle}:`, error);
      return null;
    }
  }

  /**
   * Fetch content by CID.
   */
  async fetch(cid: string): Promise<Buffer | null> {
    try {
      const data = await this.bridge.get(`content/${cid}`);
      if (!data) return null;
      
      const buffer = Buffer.from(data, 'base64');
      
      // Verify integrity
      if (!this.verifyContent(buffer, cid)) {
        console.error(`[DecentralizedWebManager] Integrity check failed for CID ${cid}`);
        return null;
      }
      
      return buffer;
    } catch (error) {
      console.error(`[DecentralizedWebManager] Fetch error for CID ${cid}:`, error);
      return null;
    }
  }

  /**
   * Fetch a specific file from a domain.
   */
  async fetchFile(domainHandle: string, filePath: string): Promise<{ content: Buffer; mimeType: string } | null> {
    const rootCid = await this.resolve(domainHandle);
    if (!rootCid) return null;

    const manifestData = await this.fetch(rootCid);
    if (!manifestData) return null;

    let manifest: WebManifest;
    try {
      manifest = JSON.parse(manifestData.toString()) as WebManifest;
    } catch (e) {
      console.error(`[DecentralizedWebManager] Invalid manifest for ${domainHandle}`);
      return null;
    }
    
    const normalizedPath = filePath.replace(/^\/+/, '');
    const targetPath = normalizedPath || manifest.index;
    
    // Check direct match
    let entry = manifest.entries[targetPath];
    
    // If not found, try index.html in directory
    if (!entry) {
        const potentialIndex = path.join(targetPath, 'index.html').replace(/\\/g, '/');
        entry = manifest.entries[potentialIndex];
    }

    if (!entry) return null;
    
    const content = await this.fetch(entry.cid);
    if (!content) return null;

    return {
        content,
        mimeType: entry.mimeType || this.getMimeType(targetPath)
    };
  }

  private async uploadContent(content: Buffer): Promise<string> {
    const hash = crypto.createHash('sha256').update(content).digest('hex');
    await this.bridge.put(`content/${hash}`, content.toString('base64'));
    return hash;
  }

  private verifyContent(content: Buffer, cid: string): boolean {
    const hash = crypto.createHash('sha256').update(content).digest('hex');
    return hash === cid;
  }

  private getMimeType(filename: string): string {
      const ext = path.extname(filename).toLowerCase();
      // Expanded MIME type list
      const map: Record<string, string> = {
          '.html': 'text/html',
          '.htm': 'text/html',
          '.css': 'text/css',
          '.js': 'application/javascript',
          '.mjs': 'application/javascript',
          '.json': 'application/json',
          '.map': 'application/json',
          '.png': 'image/png',
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.gif': 'image/gif',
          '.svg': 'image/svg+xml',
          '.ico': 'image/x-icon',
          '.webp': 'image/webp',
          '.txt': 'text/plain',
          '.md': 'text/markdown',
          '.xml': 'application/xml',
          '.pdf': 'application/pdf',
          '.zip': 'application/zip',
          '.mp3': 'audio/mpeg',
          '.wav': 'audio/wav',
          '.mp4': 'video/mp4',
          '.webm': 'video/webm',
          '.woff': 'font/woff',
          '.woff2': 'font/woff2',
          '.ttf': 'font/ttf',
          '.otf': 'font/otf',
          '.eot': 'application/vnd.ms-fontobject',
          '.wasm': 'application/wasm'
      };
      return map[ext] || 'application/octet-stream';
  }
}
