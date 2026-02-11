export interface Context {
  dsn: {
    registerTool: (tool: any, handler: (args: any) => Promise<any>) => void;
    publishObservation?: (content: string, peers: string[]) => void;
  };
}
