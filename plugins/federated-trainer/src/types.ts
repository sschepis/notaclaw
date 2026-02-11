export interface Context {
  storage: {
    get: (key: string) => Promise<any>;
    set: (key: string, value: any) => Promise<void>;
  };
  dsn: {
    registerTool: (tool: any, handler: (args: any) => Promise<any>) => void;
  };
  ipc: {
    send: (channel: string, data: any) => void;
    on: (channel: string, handler: (args: any) => void) => void;
  };
}

export interface TrainingRound {
  id: string;
  modelId: string;
  status: 'initializing' | 'training' | 'completed' | 'failed';
  participants: number;
  progress: number;
  epochs: number;
}
