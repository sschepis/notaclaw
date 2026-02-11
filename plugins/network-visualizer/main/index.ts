/**
 * Network Visualizer - Main Process
 */

export interface PluginContext {
  ipc?: {
    handle: (channel: string, handler: (args: any) => Promise<any>) => void;
  };
}

class NetworkService {
  private context: PluginContext;

  constructor(context: PluginContext) {
    this.context = context;
  }

  async activate() {
    this.context.ipc?.handle('network:get-topology', async () => {
      // Return mock topology
      return {
        nodes: [
          { id: 'n1', type: 'validator', lat: 37.77, lon: -122.41 },
          { id: 'n2', type: 'relay', lat: 40.71, lon: -74.00 },
          { id: 'n3', type: 'node', lat: 51.50, lon: -0.12 }
        ],
        links: [
          { source: 'n1', target: 'n2', latency: 45 },
          { source: 'n2', target: 'n3', latency: 80 }
        ]
      };
    });
  }
}

export const activate = async (context: PluginContext) => {
  console.log('[NetworkViz] Activating...');
  const service = new NetworkService(context);
  await service.activate();
  console.log('[NetworkViz] Ready');
};

export const deactivate = () => {};
