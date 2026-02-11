export interface Context {
  dsn: {
    registerTool: (tool: any, handler: (args: any) => Promise<any>) => void;
  };
  storage: {
    get: (key: string) => Promise<any>;
    set: (key: string, value: any) => Promise<void>;
  };
  on: (event: string, callback: () => void) => void;
  ipc: {
    on: (channel: string, handler: (data: any) => void) => void;
    send: (channel: string, data: any) => void;
  };
}

export interface Proposal {
  id: string;
  title: string;
  description: string;
  creator: string;
  status: 'active' | 'passed' | 'rejected';
  votes: {
    yes: number;
    no: number;
  };
  deadline: number;
}
