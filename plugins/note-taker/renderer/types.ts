export interface Note {
  id: string;
  title: string;
  parentId: string | null;
  type: 'note' | 'folder';
  content?: string;
  children?: string[];
  updatedAt: number;
}

export interface NoteService {
  getNotes(): Promise<Record<string, Note>>;
  saveNote(note: Note): Promise<void>;
  deleteNote(id: string): Promise<void>;
}

export interface PluginContext {
  React: typeof import('react');
  ui: any;
  storage: {
    get(key: string): Promise<any>;
    set(key: string, value: any): Promise<void>;
  };
  dsn: {
    invokeTool(toolName: string, args: any): Promise<any>;
    registerTool(toolDefinition: any, handler: (args: any) => Promise<any>): void;
  };
}
