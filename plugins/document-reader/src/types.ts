export interface Tool {
  name: string;
  description: string;
  executionLocation: 'SERVER' | 'CLIENT';
  parameters: any;
  semanticDomain?: string;
  primeDomain?: number[];
  smfAxes?: number[];
  requiredTier?: string;
  version?: string;
}

export interface Context {
  dsn: {
    registerTool: (tool: Tool, handler: (args: any) => Promise<any>) => void;
  };
  storage: {
    get: (key: string) => Promise<any>;
    set: (key: string, value: any) => Promise<void>;
  };
  on: (event: string, callback: () => void) => void;
}
