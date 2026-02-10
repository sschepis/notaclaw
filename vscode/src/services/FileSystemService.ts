/**
 * File System Service for Agent Control
 * Handles file and directory operations
 */

import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as path from 'path';
import {
  ReadFileParams,
  WriteFileParams,
  AppendFileParams,
  DeleteFileParams,
  RenameParams,
  CopyParams,
  CreateDirectoryParams,
  DeleteDirectoryParams,
  ListDirectoryParams,
  ExistsParams,
  StatParams,
  ReadFileResult,
  ListDirectoryResult,
  ExistsResult,
  StatResult,
  SuccessResult,
  FileEntry,
  ErrorCode,
} from '../protocol/types';
import { ProtocolError } from '../protocol/errors';
import { logger } from '../utils/logger';
import { isPathRestricted, getConfig } from '../utils/config';

export class FileSystemService {
  /**
   * Resolve a path to an absolute path
   */
  private resolvePath(filePath: string): string {
    if (path.isAbsolute(filePath)) {
      return filePath;
    }
    
    // Resolve relative to workspace
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (workspaceFolder) {
      return path.join(workspaceFolder.uri.fsPath, filePath);
    }
    
    return path.resolve(filePath);
  }

  /**
   * Check if file system access is allowed
   */
  private checkAccess(filePath: string): void {
    const config = getConfig();
    
    if (!config.security.allowFileSystemAccess) {
      throw new ProtocolError(
        ErrorCode.FeatureDisabled,
        'File system access is disabled',
        { path: filePath }
      );
    }
    
    if (isPathRestricted(filePath)) {
      throw new ProtocolError(
        ErrorCode.PathRestricted,
        `Access to this path is restricted: ${filePath}`,
        { path: filePath }
      );
    }
  }

  /**
   * Read file content
   */
  async readFile(params: ReadFileParams): Promise<ReadFileResult> {
    const absolutePath = this.resolvePath(params.path);
    this.checkAccess(absolutePath);
    
    try {
      const encoding = (params.encoding as BufferEncoding) || 'utf-8';
      const content = await fs.readFile(absolutePath, { encoding });
      
      logger.debug(`Read file: ${absolutePath}`);
      return { content };
    } catch (error: unknown) {
      const err = error as NodeJS.ErrnoException;
      if (err.code === 'ENOENT') {
        throw new ProtocolError(
          ErrorCode.FileNotFound,
          `File not found: ${params.path}`,
          { path: params.path }
        );
      }
      if (err.code === 'EACCES') {
        throw new ProtocolError(
          ErrorCode.FileAccessDenied,
          `Access denied: ${params.path}`,
          { path: params.path }
        );
      }
      throw new ProtocolError(
        ErrorCode.InternalError,
        `Failed to read file: ${String(error)}`,
        { path: params.path }
      );
    }
  }

  /**
   * Write content to a file
   */
  async writeFile(params: WriteFileParams): Promise<SuccessResult> {
    const absolutePath = this.resolvePath(params.path);
    this.checkAccess(absolutePath);
    
    try {
      // Ensure directory exists
      const dir = path.dirname(absolutePath);
      await fs.mkdir(dir, { recursive: true });
      
      await fs.writeFile(absolutePath, params.content, 'utf-8');
      
      logger.debug(`Wrote file: ${absolutePath}`);
      return { success: true };
    } catch (error: unknown) {
      const err = error as NodeJS.ErrnoException;
      if (err.code === 'EACCES') {
        throw new ProtocolError(
          ErrorCode.FileAccessDenied,
          `Access denied: ${params.path}`,
          { path: params.path }
        );
      }
      throw new ProtocolError(
        ErrorCode.InternalError,
        `Failed to write file: ${String(error)}`,
        { path: params.path }
      );
    }
  }

  /**
   * Append content to a file
   */
  async appendFile(params: AppendFileParams): Promise<SuccessResult> {
    const absolutePath = this.resolvePath(params.path);
    this.checkAccess(absolutePath);
    
    try {
      await fs.appendFile(absolutePath, params.content, 'utf-8');
      
      logger.debug(`Appended to file: ${absolutePath}`);
      return { success: true };
    } catch (error: unknown) {
      const err = error as NodeJS.ErrnoException;
      if (err.code === 'ENOENT') {
        throw new ProtocolError(
          ErrorCode.FileNotFound,
          `File not found: ${params.path}`,
          { path: params.path }
        );
      }
      throw new ProtocolError(
        ErrorCode.InternalError,
        `Failed to append to file: ${String(error)}`,
        { path: params.path }
      );
    }
  }

  /**
   * Delete a file
   */
  async deleteFile(params: DeleteFileParams): Promise<SuccessResult> {
    const absolutePath = this.resolvePath(params.path);
    this.checkAccess(absolutePath);
    
    try {
      await fs.unlink(absolutePath);
      
      logger.debug(`Deleted file: ${absolutePath}`);
      return { success: true };
    } catch (error: unknown) {
      const err = error as NodeJS.ErrnoException;
      if (err.code === 'ENOENT') {
        throw new ProtocolError(
          ErrorCode.FileNotFound,
          `File not found: ${params.path}`,
          { path: params.path }
        );
      }
      throw new ProtocolError(
        ErrorCode.InternalError,
        `Failed to delete file: ${String(error)}`,
        { path: params.path }
      );
    }
  }

  /**
   * Rename or move a file
   */
  async rename(params: RenameParams): Promise<SuccessResult> {
    const oldAbsPath = this.resolvePath(params.oldPath);
    const newAbsPath = this.resolvePath(params.newPath);
    
    this.checkAccess(oldAbsPath);
    this.checkAccess(newAbsPath);
    
    try {
      // Ensure destination directory exists
      const dir = path.dirname(newAbsPath);
      await fs.mkdir(dir, { recursive: true });
      
      await fs.rename(oldAbsPath, newAbsPath);
      
      logger.debug(`Renamed: ${oldAbsPath} -> ${newAbsPath}`);
      return { success: true };
    } catch (error: unknown) {
      const err = error as NodeJS.ErrnoException;
      if (err.code === 'ENOENT') {
        throw new ProtocolError(
          ErrorCode.FileNotFound,
          `File not found: ${params.oldPath}`,
          { path: params.oldPath }
        );
      }
      throw new ProtocolError(
        ErrorCode.InternalError,
        `Failed to rename file: ${String(error)}`,
        { oldPath: params.oldPath, newPath: params.newPath }
      );
    }
  }

  /**
   * Copy a file
   */
  async copy(params: CopyParams): Promise<SuccessResult> {
    const sourceAbsPath = this.resolvePath(params.source);
    const destAbsPath = this.resolvePath(params.destination);
    
    this.checkAccess(sourceAbsPath);
    this.checkAccess(destAbsPath);
    
    try {
      // Ensure destination directory exists
      const dir = path.dirname(destAbsPath);
      await fs.mkdir(dir, { recursive: true });
      
      await fs.copyFile(sourceAbsPath, destAbsPath);
      
      logger.debug(`Copied: ${sourceAbsPath} -> ${destAbsPath}`);
      return { success: true };
    } catch (error: unknown) {
      const err = error as NodeJS.ErrnoException;
      if (err.code === 'ENOENT') {
        throw new ProtocolError(
          ErrorCode.FileNotFound,
          `File not found: ${params.source}`,
          { path: params.source }
        );
      }
      throw new ProtocolError(
        ErrorCode.InternalError,
        `Failed to copy file: ${String(error)}`,
        { source: params.source, destination: params.destination }
      );
    }
  }

  /**
   * Create a directory
   */
  async createDirectory(params: CreateDirectoryParams): Promise<SuccessResult> {
    const absolutePath = this.resolvePath(params.path);
    this.checkAccess(absolutePath);
    
    try {
      await fs.mkdir(absolutePath, { recursive: true });
      
      logger.debug(`Created directory: ${absolutePath}`);
      return { success: true };
    } catch (error) {
      throw new ProtocolError(
        ErrorCode.InternalError,
        `Failed to create directory: ${String(error)}`,
        { path: params.path }
      );
    }
  }

  /**
   * Delete a directory
   */
  async deleteDirectory(params: DeleteDirectoryParams): Promise<SuccessResult> {
    const absolutePath = this.resolvePath(params.path);
    this.checkAccess(absolutePath);
    
    try {
      if (params.recursive) {
        await fs.rm(absolutePath, { recursive: true, force: true });
      } else {
        await fs.rmdir(absolutePath);
      }
      
      logger.debug(`Deleted directory: ${absolutePath}`);
      return { success: true };
    } catch (error: unknown) {
      const err = error as NodeJS.ErrnoException;
      if (err.code === 'ENOENT') {
        throw new ProtocolError(
          ErrorCode.FileNotFound,
          `Directory not found: ${params.path}`,
          { path: params.path }
        );
      }
      if (err.code === 'ENOTEMPTY') {
        throw new ProtocolError(
          ErrorCode.InternalError,
          `Directory not empty: ${params.path}. Use recursive=true to delete.`,
          { path: params.path }
        );
      }
      throw new ProtocolError(
        ErrorCode.InternalError,
        `Failed to delete directory: ${String(error)}`,
        { path: params.path }
      );
    }
  }

  /**
   * List directory contents
   */
  async listDirectory(params: ListDirectoryParams): Promise<ListDirectoryResult> {
    const absolutePath = this.resolvePath(params.path);
    this.checkAccess(absolutePath);
    
    try {
      const entries: FileEntry[] = [];
      
      if (params.recursive) {
        await this.listRecursive(absolutePath, absolutePath, entries);
      } else {
        const dirEntries = await fs.readdir(absolutePath, { withFileTypes: true });
        
        for (const entry of dirEntries) {
          const entryPath = path.join(absolutePath, entry.name);
          const stat = await fs.stat(entryPath);
          
          entries.push({
            name: entry.name,
            path: entryPath,
            type: entry.isDirectory() ? 'directory' : entry.isSymbolicLink() ? 'symlink' : 'file',
            size: stat.size,
            mtime: stat.mtimeMs,
          });
        }
      }
      
      logger.debug(`Listed directory: ${absolutePath} (${entries.length} entries)`);
      return { entries };
    } catch (error: unknown) {
      const err = error as NodeJS.ErrnoException;
      if (err.code === 'ENOENT') {
        throw new ProtocolError(
          ErrorCode.FileNotFound,
          `Directory not found: ${params.path}`,
          { path: params.path }
        );
      }
      throw new ProtocolError(
        ErrorCode.InternalError,
        `Failed to list directory: ${String(error)}`,
        { path: params.path }
      );
    }
  }

  /**
   * Recursively list directory contents
   */
  private async listRecursive(basePath: string, currentPath: string, entries: FileEntry[]): Promise<void> {
    const dirEntries = await fs.readdir(currentPath, { withFileTypes: true });
    
    for (const entry of dirEntries) {
      const entryPath = path.join(currentPath, entry.name);
      const stat = await fs.stat(entryPath);
      
      entries.push({
        name: entry.name,
        path: entryPath,
        type: entry.isDirectory() ? 'directory' : entry.isSymbolicLink() ? 'symlink' : 'file',
        size: stat.size,
        mtime: stat.mtimeMs,
      });
      
      if (entry.isDirectory()) {
        await this.listRecursive(basePath, entryPath, entries);
      }
    }
  }

  /**
   * Check if a path exists
   */
  async exists(params: ExistsParams): Promise<ExistsResult> {
    const absolutePath = this.resolvePath(params.path);
    this.checkAccess(absolutePath);
    
    try {
      const stat = await fs.stat(absolutePath);
      
      return {
        exists: true,
        isFile: stat.isFile(),
        isDirectory: stat.isDirectory(),
      };
    } catch (error: unknown) {
      const err = error as NodeJS.ErrnoException;
      if (err.code === 'ENOENT') {
        return {
          exists: false,
          isFile: false,
          isDirectory: false,
        };
      }
      throw new ProtocolError(
        ErrorCode.InternalError,
        `Failed to check path: ${String(error)}`,
        { path: params.path }
      );
    }
  }

  /**
   * Get file statistics
   */
  async stat(params: StatParams): Promise<StatResult> {
    const absolutePath = this.resolvePath(params.path);
    this.checkAccess(absolutePath);
    
    try {
      const stat = await fs.stat(absolutePath);
      
      return {
        size: stat.size,
        ctime: stat.ctimeMs,
        mtime: stat.mtimeMs,
        isFile: stat.isFile(),
        isDirectory: stat.isDirectory(),
        isSymbolicLink: stat.isSymbolicLink(),
      };
    } catch (error: unknown) {
      const err = error as NodeJS.ErrnoException;
      if (err.code === 'ENOENT') {
        throw new ProtocolError(
          ErrorCode.FileNotFound,
          `Path not found: ${params.path}`,
          { path: params.path }
        );
      }
      throw new ProtocolError(
        ErrorCode.InternalError,
        `Failed to stat path: ${String(error)}`,
        { path: params.path }
      );
    }
  }
}
