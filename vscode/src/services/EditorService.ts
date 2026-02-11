/**
 * Editor Service for Agent Control
 * Handles file opening, editing, and navigation
 */

import * as vscode from 'vscode';
import {
  Position,
  Range,
  OpenFileParams,
  CloseFileParams,
  GetContentParams,
  SetContentParams,
  InsertTextParams,
  ReplaceRangeParams,
  DeleteRangeParams,
  SetSelectionParams,
  RevealLineParams,
  SaveParams,
  OpenFileResult,
  GetContentResult,
  GetActiveFileResult,
  GetOpenFilesResult,
  GetSelectionResult,
  SuccessResult,
  DocumentInfo,
  ErrorCode,
} from '../protocol/types';
import { ProtocolError } from '../protocol/errors';
import { logger } from '../utils/logger';

// ============================================================================
// Parameter types for new methods
// ============================================================================

export interface GetDocumentInfoParams {
  path: string;
}

export interface ApplyEditsParams {
  path: string;
  edits: Array<{
    range: Range;
    text: string;
  }>;
}

export interface ApplyEditsResult {
  applied: number;
}

export interface GetCompletionsParams {
  path: string;
  position: Position;
  triggerCharacter?: string;
}

export interface CompletionItem {
  label: string;
  kind: string;
  detail?: string;
  insertText?: string;
  sortText?: string;
}

export interface GetCompletionsResult {
  items: CompletionItem[];
  isIncomplete: boolean;
}

export class EditorService {
  /**
   * Convert protocol Position to VS Code Position
   */
  private toVSCodePosition(pos: Position): vscode.Position {
    return new vscode.Position(pos.line, pos.character);
  }

  /**
   * Convert protocol Range to VS Code Range
   */
  private toVSCodeRange(range: Range): vscode.Range {
    return new vscode.Range(
      this.toVSCodePosition(range.start),
      this.toVSCodePosition(range.end)
    );
  }

  /**
   * Convert VS Code Position to protocol Position
   */
  private fromVSCodePosition(pos: vscode.Position): Position {
    return { line: pos.line, character: pos.character };
  }

  /**
   * Convert VS Code Range to protocol Range
   */
  private fromVSCodeRange(range: vscode.Range): Range {
    return {
      start: this.fromVSCodePosition(range.start),
      end: this.fromVSCodePosition(range.end),
    };
  }

  /**
   * Get document by path
   */
  private getDocument(path: string): vscode.TextDocument | undefined {
    const uri = vscode.Uri.file(path);
    return vscode.workspace.textDocuments.find(
      doc => doc.uri.fsPath === uri.fsPath
    );
  }

  /**
   * Get editor for a document
   */
  private getEditorForDocument(document: vscode.TextDocument): vscode.TextEditor | undefined {
    return vscode.window.visibleTextEditors.find(
      editor => editor.document.uri.fsPath === document.uri.fsPath
    );
  }

  /**
   * Open a file in the editor
   */
  async openFile(params: OpenFileParams): Promise<OpenFileResult> {
    const uri = vscode.Uri.file(params.path);
    
    try {
      const document = await vscode.workspace.openTextDocument(uri);
      
      const viewColumn = params.viewColumn !== undefined
        ? params.viewColumn as vscode.ViewColumn
        : vscode.ViewColumn.Active;
      
      await vscode.window.showTextDocument(document, {
        preview: params.preview ?? true,
        viewColumn,
      });
      
      logger.debug(`Opened file: ${params.path}`);
      
      return { documentUri: document.uri.toString() };
    } catch (error) {
      logger.error(`Failed to open file: ${params.path}`, error);
      throw new ProtocolError(
        ErrorCode.FileNotFound,
        `Failed to open file: ${params.path}`,
        { path: params.path, error: String(error) }
      );
    }
  }

  /**
   * Close a file tab
   */
  async closeFile(params: CloseFileParams): Promise<SuccessResult> {
    const uri = vscode.Uri.file(params.path);
    
    // Find the tab with this file
    for (const tabGroup of vscode.window.tabGroups.all) {
      for (const tab of tabGroup.tabs) {
        if (tab.input instanceof vscode.TabInputText) {
          if (tab.input.uri.fsPath === uri.fsPath) {
            await vscode.window.tabGroups.close(tab);
            logger.debug(`Closed file: ${params.path}`);
            return { success: true };
          }
        }
      }
    }
    
    return { success: false };
  }

  /**
   * Get the content of a file
   */
  async getContent(params: GetContentParams): Promise<GetContentResult> {
    const uri = vscode.Uri.file(params.path);
    
    try {
      const document = await vscode.workspace.openTextDocument(uri);
      
      return {
        content: document.getText(),
        languageId: document.languageId,
      };
    } catch (error) {
      logger.error(`Failed to get content: ${params.path}`, error);
      throw new ProtocolError(
        ErrorCode.FileNotFound,
        `Failed to read file: ${params.path}`,
        { path: params.path }
      );
    }
  }

  /**
   * Get document metadata without full content
   */
  async getDocumentInfo(params: GetDocumentInfoParams): Promise<DocumentInfo> {
    const uri = vscode.Uri.file(params.path);

    try {
      const document = await vscode.workspace.openTextDocument(uri);

      return {
        uri: document.uri.toString(),
        languageId: document.languageId,
        version: document.version,
        lineCount: document.lineCount,
        isDirty: document.isDirty,
      };
    } catch (error) {
      logger.error(`Failed to get document info: ${params.path}`, error);
      throw new ProtocolError(
        ErrorCode.FileNotFound,
        `Failed to get document info: ${params.path}`,
        { path: params.path }
      );
    }
  }

  /**
   * Apply multiple edits to a single file atomically
   */
  async applyEdits(params: ApplyEditsParams): Promise<ApplyEditsResult> {
    const uri = vscode.Uri.file(params.path);

    try {
      const document = await vscode.workspace.openTextDocument(uri);
      const edit = new vscode.WorkspaceEdit();

      for (const e of params.edits) {
        const range = this.toVSCodeRange(e.range);
        edit.replace(uri, range, e.text);
      }

      const applied = await vscode.workspace.applyEdit(edit);

      if (!applied) {
        throw new ProtocolError(
          ErrorCode.InternalError,
          `Failed to apply edits to: ${params.path}`,
          { path: params.path }
        );
      }

      logger.debug(`Applied ${params.edits.length} edits to ${params.path}`);
      return { applied: params.edits.length };
    } catch (error) {
      if (error instanceof ProtocolError) {
        throw error;
      }
      logger.error(`Failed to apply edits: ${params.path}`, error);
      throw new ProtocolError(
        ErrorCode.InternalError,
        `Failed to apply edits: ${String(error)}`,
        { path: params.path }
      );
    }
  }

  /**
   * Set the content of a file (replace entire content)
   */
  async setContent(params: SetContentParams): Promise<SuccessResult> {
    const uri = vscode.Uri.file(params.path);
    
    try {
      const document = await vscode.workspace.openTextDocument(uri);
      const editor = await vscode.window.showTextDocument(document);
      
      const fullRange = new vscode.Range(
        document.positionAt(0),
        document.positionAt(document.getText().length)
      );
      
      await editor.edit(editBuilder => {
        editBuilder.replace(fullRange, params.content);
      });
      
      logger.debug(`Set content for: ${params.path}`);
      return { success: true };
    } catch (error) {
      logger.error(`Failed to set content: ${params.path}`, error);
      throw new ProtocolError(
        ErrorCode.InternalError,
        `Failed to write to file: ${params.path}`,
        { path: params.path, error: String(error) }
      );
    }
  }

  /**
   * Insert text at a specific position
   */
  async insertText(params: InsertTextParams): Promise<SuccessResult> {
    const uri = vscode.Uri.file(params.path);
    
    try {
      const document = await vscode.workspace.openTextDocument(uri);
      const editor = await vscode.window.showTextDocument(document);
      
      const position = this.toVSCodePosition(params.position);
      
      await editor.edit(editBuilder => {
        editBuilder.insert(position, params.text);
      });
      
      logger.debug(`Inserted text at ${params.position.line}:${params.position.character} in ${params.path}`);
      return { success: true };
    } catch (error) {
      logger.error(`Failed to insert text: ${params.path}`, error);
      throw new ProtocolError(
        ErrorCode.InternalError,
        `Failed to insert text: ${String(error)}`,
        { path: params.path }
      );
    }
  }

  /**
   * Replace text in a range
   */
  async replaceRange(params: ReplaceRangeParams): Promise<SuccessResult> {
    const uri = vscode.Uri.file(params.path);
    
    try {
      const document = await vscode.workspace.openTextDocument(uri);
      const editor = await vscode.window.showTextDocument(document);
      
      const range = this.toVSCodeRange(params.range);
      
      await editor.edit(editBuilder => {
        editBuilder.replace(range, params.text);
      });
      
      logger.debug(`Replaced range in ${params.path}`);
      return { success: true };
    } catch (error) {
      logger.error(`Failed to replace range: ${params.path}`, error);
      throw new ProtocolError(
        ErrorCode.InternalError,
        `Failed to replace text: ${String(error)}`,
        { path: params.path }
      );
    }
  }

  /**
   * Delete text in a range
   */
  async deleteRange(params: DeleteRangeParams): Promise<SuccessResult> {
    const uri = vscode.Uri.file(params.path);
    
    try {
      const document = await vscode.workspace.openTextDocument(uri);
      const editor = await vscode.window.showTextDocument(document);
      
      const range = this.toVSCodeRange(params.range);
      
      await editor.edit(editBuilder => {
        editBuilder.delete(range);
      });
      
      logger.debug(`Deleted range in ${params.path}`);
      return { success: true };
    } catch (error) {
      logger.error(`Failed to delete range: ${params.path}`, error);
      throw new ProtocolError(
        ErrorCode.InternalError,
        `Failed to delete text: ${String(error)}`,
        { path: params.path }
      );
    }
  }

  /**
   * Set the selection in an editor
   */
  async setSelection(params: SetSelectionParams): Promise<SuccessResult> {
    const uri = vscode.Uri.file(params.path);
    
    try {
      const document = await vscode.workspace.openTextDocument(uri);
      const editor = await vscode.window.showTextDocument(document);
      
      const selection = new vscode.Selection(
        this.toVSCodePosition(params.range.start),
        this.toVSCodePosition(params.range.end)
      );
      
      editor.selection = selection;
      
      logger.debug(`Set selection in ${params.path}`);
      return { success: true };
    } catch (error) {
      logger.error(`Failed to set selection: ${params.path}`, error);
      throw new ProtocolError(
        ErrorCode.InternalError,
        `Failed to set selection: ${String(error)}`,
        { path: params.path }
      );
    }
  }

  /**
   * Reveal a line in the editor
   */
  async revealLine(params: RevealLineParams): Promise<SuccessResult> {
    const uri = vscode.Uri.file(params.path);
    
    try {
      const document = await vscode.workspace.openTextDocument(uri);
      const editor = await vscode.window.showTextDocument(document);
      
      let revealType: vscode.TextEditorRevealType;
      switch (params.at) {
        case 'top':
          revealType = vscode.TextEditorRevealType.AtTop;
          break;
        case 'bottom':
          // VS Code doesn't have AtBottom, use InCenter
          revealType = vscode.TextEditorRevealType.InCenter;
          break;
        case 'center':
        default:
          revealType = vscode.TextEditorRevealType.InCenter;
          break;
      }
      
      const position = new vscode.Position(params.line, 0);
      editor.revealRange(new vscode.Range(position, position), revealType);
      
      logger.debug(`Revealed line ${params.line} in ${params.path}`);
      return { success: true };
    } catch (error) {
      logger.error(`Failed to reveal line: ${params.path}`, error);
      throw new ProtocolError(
        ErrorCode.InternalError,
        `Failed to reveal line: ${String(error)}`,
        { path: params.path }
      );
    }
  }

  /**
   * Get the current selection
   */
  async getSelection(): Promise<GetSelectionResult> {
    const editor = vscode.window.activeTextEditor;
    
    if (!editor) {
      throw new ProtocolError(ErrorCode.EditorNotActive, 'No active editor');
    }
    
    const selection = editor.selection;
    const text = editor.document.getText(selection);
    
    return {
      range: this.fromVSCodeRange(selection),
      text,
    };
  }

  /**
   * Get info about the active file
   */
  async getActiveFile(): Promise<GetActiveFileResult> {
    const editor = vscode.window.activeTextEditor;
    
    if (!editor) {
      throw new ProtocolError(ErrorCode.EditorNotActive, 'No active editor');
    }
    
    return {
      path: editor.document.uri.fsPath,
      languageId: editor.document.languageId,
    };
  }

  /**
   * Get list of all open files
   */
  async getOpenFiles(): Promise<GetOpenFilesResult> {
    const files: string[] = [];
    
    for (const tabGroup of vscode.window.tabGroups.all) {
      for (const tab of tabGroup.tabs) {
        if (tab.input instanceof vscode.TabInputText) {
          files.push(tab.input.uri.fsPath);
        }
      }
    }
    
    return { files };
  }

  /**
   * Save a specific file or the active file
   */
  async save(params: SaveParams): Promise<SuccessResult> {
    if (params.path) {
      const document = this.getDocument(params.path);
      
      if (document) {
        await document.save();
        logger.debug(`Saved file: ${params.path}`);
        return { success: true };
      } else {
        throw new ProtocolError(
          ErrorCode.FileNotFound,
          `File is not open: ${params.path}`,
          { path: params.path }
        );
      }
    } else {
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        await editor.document.save();
        logger.debug(`Saved active file: ${editor.document.uri.fsPath}`);
        return { success: true };
      } else {
        throw new ProtocolError(ErrorCode.EditorNotActive, 'No active editor');
      }
    }
  }

  /**
   * Get completion items at a position in a document
   */
  async getCompletions(params: GetCompletionsParams): Promise<GetCompletionsResult> {
    const uri = vscode.Uri.file(params.path);

    try {
      const document = await vscode.workspace.openTextDocument(uri);
      const position = this.toVSCodePosition(params.position);

      const completionList = await vscode.commands.executeCommand<vscode.CompletionList>(
        'vscode.executeCompletionItemProvider',
        document.uri,
        position,
        params.triggerCharacter
      );

      if (!completionList) {
        return { items: [], isIncomplete: false };
      }

      const items: CompletionItem[] = completionList.items.slice(0, 100).map(item => {
        const label = typeof item.label === 'string' ? item.label : item.label.label;
        const kindName = item.kind !== undefined
          ? vscode.CompletionItemKind[item.kind] ?? 'Unknown'
          : 'Unknown';

        return {
          label,
          kind: kindName,
          detail: item.detail,
          insertText: typeof item.insertText === 'string'
            ? item.insertText
            : item.insertText?.value,
          sortText: item.sortText,
        };
      });

      return {
        items,
        isIncomplete: completionList.isIncomplete ?? false,
      };
    } catch (error) {
      logger.error(`Failed to get completions: ${params.path}`, error);
      throw new ProtocolError(
        ErrorCode.InternalError,
        `Failed to get completions: ${String(error)}`,
        { path: params.path }
      );
    }
  }

  /**
   * Save all open files
   */
  async saveAll(): Promise<SuccessResult> {
    await vscode.workspace.saveAll();
    logger.debug('Saved all files');
    return { success: true };
  }

  /**
   * Format a document
   */
  async formatDocument(path?: string): Promise<SuccessResult> {
    let document: vscode.TextDocument | undefined;
    
    if (path) {
      const uri = vscode.Uri.file(path);
      document = await vscode.workspace.openTextDocument(uri);
    } else {
      document = vscode.window.activeTextEditor?.document;
    }
    
    if (!document) {
      throw new ProtocolError(ErrorCode.EditorNotActive, 'No document to format');
    }
    
    await vscode.commands.executeCommand('editor.action.formatDocument');
    logger.debug(`Formatted document: ${document.uri.fsPath}`);
    
    return { success: true };
  }
}
