import { PluginContext } from '../../../client/src/shared/plugin-types';

class CanvasService {
  context: PluginContext;
  nodes: Map<string, any>;
  edges: Map<string, any>;

  constructor(context: PluginContext) {
    this.context = context;
    this.nodes = new Map();
    this.edges = new Map();
  }

  register() {
    this.context.ipc.handle('canvas:get-graph', async () => this.getGraph());
    this.context.ipc.handle('canvas:add-node', async (node: any) => this.addNode(node));
    
    // Listen for DSN observations to auto-populate the graph
    // Hook into global event bus if available
    const events = (this.context as any).events;
    if (events && events.on) {
        events.on('dsn:observation', (obs: any) => {
            // Parse observation and add node
            try {
                if (obs && obs.content) {
                    const node = { id: `obs-${Date.now()}`, label: obs.content.substring(0, 20) };
                    this.addNode(node);
                }
            } catch (e) {
                console.error('Canvas Viz: Failed to add observation node', e);
            }
        });
    }
  }

  getGraph() {
    return {
      nodes: Array.from(this.nodes.values()),
      edges: Array.from(this.edges.values())
    };
  }

  addNode(node: any) {
    if (!node.id) node.id = Math.random().toString(36).substr(2, 9);
    this.nodes.set(node.id, node);
    this.context.ipc.send('canvas:node-added', node);
    return node;
  }
}

export default {
  activate: (context: PluginContext) => {
    console.log('[Canvas Viz] Activating...');
    const service = new CanvasService(context);
    service.register();
    
    // Register tool
    context.dsn.registerTool({
      name: 'generate_canvas_viz',
      description: 'Generates an interactive canvas visualization based on a description.',
      executionLocation: 'SERVER',
      parameters: {
        type: 'object',
        properties: {
          description: {
            type: 'string',
            description: 'Description of the visualization to generate'
          }
        },
        required: ['description']
      },
      version: '1.0.0',
      semanticDomain: 'perceptual',
      primeDomain: [1, 5],
      smfAxes: [0.5, 0.5],
      requiredTier: 'Neophyte'
    }, async ({ description }: { description: string }) => {
      const prompt = `
      Create a JavaScript class that extends 'CanvasVisualization' to render: ${description}.
      
      The base class is defined as:
      class CanvasVisualization {
        constructor(canvasId) {
           this.canvas = document.getElementById(canvasId);
           this.ctx = this.canvas.getContext('2d');
           this.width = this.canvas.width;
           this.height = this.canvas.height;
        }
        start() { ... } // starts animation loop
        stop() { ... } // stops animation loop
        animate() { ... } // calls update() then draw()
        update() {} // Override this for logic
        draw() {} // Override this for rendering
      }
      
      Your code must:
      1. Define a class that extends CanvasVisualization.
      2. Override update() and/or draw() methods.
      3. Instantiate your class with 'canvas' as the ID.
      4. Call .start() on the instance.
      
      Example:
      class MyViz extends CanvasVisualization {
         draw() {
           this.ctx.fillStyle = 'red';
           this.ctx.fillRect(0, 0, 100, 100);
         }
      }
      new MyViz('canvas').start();
      
      Return ONLY the JavaScript code. Do not wrap in markdown blocks.
      `;

      try {
          const response = await context.ai.complete({ userPrompt: prompt });
          let code = response.text;
          // Clean up markdown if present
          code = code.replace(/```javascript/g, '').replace(/```/g, '').trim();
          
          return {
            __directMarkdown: `\`\`\`canvasviz\n${code}\n\`\`\``
          };
      } catch (e: any) {
          return `Error generating visualization: ${e.message}`;
      }
    });

    console.log('[Canvas Viz] Ready');
  },
  
  deactivate: () => {
    console.log('[Canvas Viz] Deactivated');
  }
};
