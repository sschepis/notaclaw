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
  on: (event: string, callback: () => void) => void;
}
