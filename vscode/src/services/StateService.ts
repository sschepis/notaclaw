/**
 * State Service for Agent Control
 * Handles workspace state queries, diagnostics, and language features
 */

import * as vscode from 'vscode';
import {
  Position,
  Range,
  Location,
  GetDiagnosticsParams,
  GetSymbolsParams,
  FindReferencesParams,
  GoToDefinitionParams,
  GetHoverParams,
  FindInFilesParams,
  FindAndReplaceParams,
  GetWorkspaceResult,
  GetDiagnosticsResult,
  GetSymbolsResult,
  FindReferencesResult,
  GetHoverResult,
  FindInFilesResult,
  FindAndReplaceResult,
  DocumentSymbol,
  Diagnostic,
  DiagnosticSeverity,
  SymbolKind,
  SearchResult,
  ErrorCode,
} from '../protocol/types';
import { ProtocolError } from '../protocol/errors';
import { logger } from '../utils/logger';

export class StateService {
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
   * Convert protocol Position to VS Code Position
   */
  private toVSCodePosition(pos: Position): vscode.Position {
    return new vscode.Position(pos.line, pos.character);
  }

  /**
   * Convert VS Code DiagnosticSeverity to string
   */
  private fromVSCodeSeverity(severity: vscode.DiagnosticSeverity): DiagnosticSeverity {
    switch (severity) {
      case vscode.DiagnosticSeverity.Error:
        return 'error';
      case vscode.DiagnosticSeverity.Warning:
        return 'warning';
      case vscode.DiagnosticSeverity.Information:
        return 'info';
      case vscode.DiagnosticSeverity.Hint:
        return 'hint';
      default:
        return 'info';
    }
  }

  /**
   * Convert VS Code SymbolKind to string
   */
  private fromVSCodeSymbolKind(kind: vscode.SymbolKind): SymbolKind {
    const kindMap: Record<number, SymbolKind> = {
      [vscode.SymbolKind.File]: 'file',
      [vscode.SymbolKind.Module]: 'module',
      [vscode.SymbolKind.Namespace]: 'namespace',
      [vscode.SymbolKind.Package]: 'package',
      [vscode.SymbolKind.Class]: 'class',
      [vscode.SymbolKind.Method]: 'method',
      [vscode.SymbolKind.Property]: 'property',
      [vscode.SymbolKind.Field]: 'field',
      [vscode.SymbolKind.Constructor]: 'constructor',
      [vscode.SymbolKind.Enum]: 'enum',
      [vscode.SymbolKind.Interface]: 'interface',
      [vscode.SymbolKind.Function]: 'function',
      [vscode.SymbolKind.Variable]: 'variable',
      [vscode.SymbolKind.Constant]: 'constant',
      [vscode.SymbolKind.String]: 'string',
      [vscode.SymbolKind.Number]: 'number',
      [vscode.SymbolKind.Boolean]: 'boolean',
      [vscode.SymbolKind.Array]: 'array',
      [vscode.SymbolKind.Object]: 'object',
      [vscode.SymbolKind.Key]: 'key',
      [vscode.SymbolKind.Null]: 'null',
      [vscode.SymbolKind.EnumMember]: 'enumMember',
      [vscode.SymbolKind.Struct]: 'struct',
      [vscode.SymbolKind.Event]: 'event',
      [vscode.SymbolKind.Operator]: 'operator',
      [vscode.SymbolKind.TypeParameter]: 'typeParameter',
    };
    return kindMap[kind] || 'variable';
  }

  /**
   * Convert VS Code DocumentSymbol to protocol DocumentSymbol
   */
  private fromVSCodeDocumentSymbol(symbol: vscode.DocumentSymbol): DocumentSymbol {
    return {
      name: symbol.name,
      detail: symbol.detail,
      kind: this.fromVSCodeSymbolKind(symbol.kind),
      range: this.fromVSCodeRange(symbol.range),
      selectionRange: this.fromVSCodeRange(symbol.selectionRange),
      children: symbol.children?.map((child: vscode.DocumentSymbol) => 
        this.fromVSCodeDocumentSymbol(child)
      ),
    };
  }

  /**
   * Get workspace information
   */
  async getWorkspace(): Promise<GetWorkspaceResult> {
    const folders = vscode.workspace.workspaceFolders?.map(
      (folder: vscode.WorkspaceFolder) => folder.uri.fsPath
    ) || [];
    
    const name = vscode.workspace.name || 'Untitled';
    
    return { folders, name };
  }

  /**
   * Get diagnostics (problems/errors)
   */
  async getDiagnostics(params: GetDiagnosticsParams): Promise<GetDiagnosticsResult> {
    const diagnostics: Array<Diagnostic & { uri: string }> = [];
    
    if (params.path) {
      // Get diagnostics for specific file
      const uri = vscode.Uri.file(params.path);
      const fileDiagnostics = vscode.languages.getDiagnostics(uri);
      
      for (const diag of fileDiagnostics) {
        diagnostics.push({
          uri: uri.toString(),
          range: this.fromVSCodeRange(diag.range),
          message: diag.message,
          severity: this.fromVSCodeSeverity(diag.severity),
          source: diag.source,
          code: typeof diag.code === 'object' ? String(diag.code.value) : diag.code?.toString(),
        });
      }
    } else {
      // Get all diagnostics
      const allDiagnostics = vscode.languages.getDiagnostics();
      
      for (const [uri, fileDiagnostics] of allDiagnostics) {
        for (const diag of fileDiagnostics) {
          diagnostics.push({
            uri: uri.toString(),
            range: this.fromVSCodeRange(diag.range),
            message: diag.message,
            severity: this.fromVSCodeSeverity(diag.severity),
            source: diag.source,
            code: typeof diag.code === 'object' ? String(diag.code.value) : diag.code?.toString(),
          });
        }
      }
    }
    
    logger.debug(`Got ${diagnostics.length} diagnostics`);
    return { diagnostics };
  }

  /**
   * Get document symbols
   */
  async getSymbols(params: GetSymbolsParams): Promise<GetSymbolsResult> {
    const uri = vscode.Uri.file(params.path);
    
    try {
      const result = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
        'vscode.executeDocumentSymbolProvider',
        uri
      );
      
      if (!result) {
        return { symbols: [] };
      }
      
      const symbols = result.map((symbol: vscode.DocumentSymbol) => 
        this.fromVSCodeDocumentSymbol(symbol)
      );
      
      logger.debug(`Got ${symbols.length} symbols for ${params.path}`);
      return { symbols };
    } catch (error) {
      logger.error(`Failed to get symbols: ${params.path}`, error);
      throw new ProtocolError(
        ErrorCode.InternalError,
        `Failed to get symbols: ${String(error)}`,
        { path: params.path }
      );
    }
  }

  /**
   * Find references to a symbol
   */
  async findReferences(params: FindReferencesParams): Promise<FindReferencesResult> {
    const uri = vscode.Uri.file(params.path);
    const position = this.toVSCodePosition(params.position);
    
    try {
      const result = await vscode.commands.executeCommand<vscode.Location[]>(
        'vscode.executeReferenceProvider',
        uri,
        position
      );
      
      if (!result) {
        return { locations: [] };
      }
      
      const locations: Location[] = result.map((loc: vscode.Location) => ({
        uri: loc.uri.toString(),
        range: this.fromVSCodeRange(loc.range),
      }));
      
      logger.debug(`Found ${locations.length} references`);
      return { locations };
    } catch (error) {
      logger.error('Failed to find references', error);
      throw new ProtocolError(
        ErrorCode.InternalError,
        `Failed to find references: ${String(error)}`,
        { path: params.path, position: params.position }
      );
    }
  }

  /**
   * Go to definition
   */
  async goToDefinition(params: GoToDefinitionParams): Promise<FindReferencesResult> {
    const uri = vscode.Uri.file(params.path);
    const position = this.toVSCodePosition(params.position);
    
    try {
      const result = await vscode.commands.executeCommand<vscode.Location[] | vscode.LocationLink[]>(
        'vscode.executeDefinitionProvider',
        uri,
        position
      );
      
      if (!result) {
        return { locations: [] };
      }
      
      const locations: Location[] = result.map((item: vscode.Location | vscode.LocationLink) => {
        if ('targetUri' in item) {
          // LocationLink
          return {
            uri: item.targetUri.toString(),
            range: this.fromVSCodeRange(item.targetRange),
          };
        } else {
          // Location
          return {
            uri: item.uri.toString(),
            range: this.fromVSCodeRange(item.range),
          };
        }
      });
      
      logger.debug(`Found ${locations.length} definitions`);
      return { locations };
    } catch (error) {
      logger.error('Failed to go to definition', error);
      throw new ProtocolError(
        ErrorCode.InternalError,
        `Failed to go to definition: ${String(error)}`,
        { path: params.path, position: params.position }
      );
    }
  }

  /**
   * Get hover information
   */
  async getHover(params: GetHoverParams): Promise<GetHoverResult> {
    const uri = vscode.Uri.file(params.path);
    const position = this.toVSCodePosition(params.position);
    
    try {
      const result = await vscode.commands.executeCommand<vscode.Hover[]>(
        'vscode.executeHoverProvider',
        uri,
        position
      );
      
      if (!result || result.length === 0) {
        return { content: '' };
      }
      
      // Combine all hover contents
      const contents: string[] = [];
      for (const hover of result) {
        for (const content of hover.contents) {
          if (typeof content === 'string') {
            contents.push(content);
          } else if ('value' in content) {
            contents.push(content.value);
          }
        }
      }
      
      return { content: contents.join('\n\n') };
    } catch (error) {
      logger.error('Failed to get hover', error);
      throw new ProtocolError(
        ErrorCode.InternalError,
        `Failed to get hover: ${String(error)}`,
        { path: params.path, position: params.position }
      );
    }
  }

  /**
   * Search for text in files
   */
  async findInFiles(params: FindInFilesParams): Promise<FindInFilesResult> {
    const results: SearchResult[] = [];
    
    try {
      // Use VS Code's search API
      const files = await vscode.workspace.findFiles(
        params.options?.include || '**/*',
        params.options?.exclude || '**/node_modules/**',
        params.options?.maxResults
      );
      
      const searchPattern = params.options?.useRegex
        ? new RegExp(params.query, params.options?.caseSensitive ? '' : 'i')
        : null;
      
      for (const file of files) {
        try {
          const document = await vscode.workspace.openTextDocument(file);
          const text = document.getText();
          const lines = text.split('\n');
          const matches: Array<{ range: Range; preview: string }> = [];
          
          for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
            const line = lines[lineIndex];
            let searchIndex = 0;
            
            while (true) {
              let foundIndex: number;
              
              if (searchPattern) {
                const match = line.slice(searchIndex).match(searchPattern);
                if (!match || match.index === undefined) {
                  break;
                }
                foundIndex = searchIndex + match.index;
              } else {
                foundIndex = params.options?.caseSensitive
                  ? line.indexOf(params.query, searchIndex)
                  : line.toLowerCase().indexOf(params.query.toLowerCase(), searchIndex);
                if (foundIndex === -1) {
                  break;
                }
              }
              
              const matchLength = searchPattern
                ? (line.slice(foundIndex).match(searchPattern)?.[0].length || params.query.length)
                : params.query.length;
              
              matches.push({
                range: {
                  start: { line: lineIndex, character: foundIndex },
                  end: { line: lineIndex, character: foundIndex + matchLength },
                },
                preview: line.trim(),
              });
              
              searchIndex = foundIndex + matchLength;
            }
          }
          
          if (matches.length > 0) {
            results.push({
              path: file.fsPath,
              matches,
            });
          }
        } catch {
          // Skip files that can't be read
        }
      }
      
      logger.debug(`Found matches in ${results.length} files`);
      return { results };
    } catch (error) {
      logger.error('Failed to search files', error);
      throw new ProtocolError(
        ErrorCode.InternalError,
        `Failed to search files: ${String(error)}`
      );
    }
  }

  /**
   * Find and replace in files
   */
  async findAndReplace(params: FindAndReplaceParams): Promise<FindAndReplaceResult> {
    // First find all matches
    const searchResult = await this.findInFiles({
      query: params.query,
      options: params.options,
    });
    
    let totalReplacements = 0;
    
    // Perform replacements
    for (const result of searchResult.results) {
      try {
        const uri = vscode.Uri.file(result.path);
        const document = await vscode.workspace.openTextDocument(uri);
        const edit = new vscode.WorkspaceEdit();
        
        // Add all replacements for this file
        for (const match of result.matches) {
          const range = new vscode.Range(
            new vscode.Position(match.range.start.line, match.range.start.character),
            new vscode.Position(match.range.end.line, match.range.end.character)
          );
          edit.replace(uri, range, params.replacement);
          totalReplacements++;
        }
        
        await vscode.workspace.applyEdit(edit);
      } catch {
        // Skip files that can't be edited
      }
    }
    
    logger.debug(`Replaced ${totalReplacements} occurrences`);
    return { count: totalReplacements };
  }

  /**
   * Get all open text documents
   */
  async getOpenDocuments(): Promise<Array<{ uri: string; languageId: string; isDirty: boolean }>> {
    return vscode.workspace.textDocuments.map((doc: vscode.TextDocument) => ({
      uri: doc.uri.toString(),
      languageId: doc.languageId,
      isDirty: doc.isDirty,
    }));
  }

  /**
   * Get visible text editors
   */
  async getVisibleEditors(): Promise<Array<{ documentUri: string; viewColumn: number }>> {
    return vscode.window.visibleTextEditors.map((editor: vscode.TextEditor) => ({
      documentUri: editor.document.uri.toString(),
      viewColumn: editor.viewColumn || 1,
    }));
  }
}
