export class PluginContextMock {
  public id: string;
  public ipc = {
    handlers: new Map<string, Function>(),
    sent: [] as { channel: string, data: any }[],
    
    handle: (channel: string, handler: Function) => {
      this.ipc.handlers.set(channel, handler);
    },
    send: (channel: string, data: any) => {
      this.ipc.sent.push({ channel, data });
    },
    on: (channel: string, handler: Function) => {
      this.ipc.handlers.set(channel, handler);
    }
  };
  
  public services = {
    tools: {
      registered: [] as any[],
      register: (tool: any) => {
        this.services.tools.registered.push(tool);
      }
    },
    gateways: {
      registered: [] as any[],
      register: (gateway: any) => {
        this.services.gateways.registered.push(gateway);
      }
    }
  };

  public dsn = {
    observations: [] as { content: string, smf: number[] }[],
    publishObservation: (content: string, smf: number[]) => {
      this.dsn.observations.push({ content, smf });
    },
    registerTool: (tool: any, handler: Function) => {
        this.services.tools.registered.push({ ...tool, handler });
    }
  };

  public storage = {
      get: async (_key: string) => null as any,
      set: async (_key: string, _val: any) => {},
      delete: async (_key: string) => {}
  };

  public secrets = {
      get: async (_key: string) => null as any
  };

  public events = new Map<string, Function[]>();

  constructor(id: string) {
    this.id = id;
  }

  on(event: string, callback: Function) {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)!.push(callback);
  }

  emit(event: string, ...args: any[]) {
    const handlers = this.events.get(event) || [];
    handlers.forEach(h => h(...args));
  }
}
