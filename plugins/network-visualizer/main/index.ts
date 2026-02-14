/**
 * Network Visualizer - Main Process
 */

export interface PluginContext {
  ipc?: {
    handle: (channel: string, handler: (args: any) => Promise<any>) => void;
  };
  traits?: {
    register: (trait: any) => void;
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

    if (this.context.traits) {
      this.context.traits.register({
        id: 'network-visualization',
        name: 'Network Topology',
        description: 'Visualize network nodes and connections.',
        instruction: 'You have access to network topology data. If the user asks about the network structure, nodes, or latency, you can retrieve this data using `network:get-topology`.',
        activationMode: 'dynamic',
        triggerKeywords: ['network', 'topology', 'nodes', 'latency', 'visualize']
      });
    }
  }
}

export const activate = async (context: PluginContext) => {
  console.log('[NetworkViz] Activating...');
  const service = new NetworkService(context);
  await service.activate();
  console.log('[NetworkViz] Ready');
};

export const deactivate = () => {};
