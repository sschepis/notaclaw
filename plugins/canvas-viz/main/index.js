var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// plugins/canvas-viz/main/index.ts
var index_exports = {};
__export(index_exports, {
  default: () => index_default
});
module.exports = __toCommonJS(index_exports);
var CanvasService = class {
  context;
  nodes;
  edges;
  constructor(context) {
    this.context = context;
    this.nodes = /* @__PURE__ */ new Map();
    this.edges = /* @__PURE__ */ new Map();
  }
  register() {
    this.context.ipc.handle("canvas:get-graph", async () => this.getGraph());
    this.context.ipc.handle("canvas:add-node", async (node) => this.addNode(node));
    const events = this.context.events;
    if (events && events.on) {
      events.on("dsn:observation", (obs) => {
        try {
          if (obs && obs.content) {
            const node = { id: `obs-${Date.now()}`, label: obs.content.substring(0, 20) };
            this.addNode(node);
          }
        } catch (e) {
          console.error("Canvas Viz: Failed to add observation node", e);
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
  addNode(node) {
    if (!node.id) node.id = Math.random().toString(36).substr(2, 9);
    this.nodes.set(node.id, node);
    this.context.ipc.send("canvas:node-added", node);
    return node;
  }
};
var index_default = {
  activate: (context) => {
    console.log("[Canvas Viz] Activating...");
    const service = new CanvasService(context);
    service.register();
    context.dsn.registerTool({
      name: "generate_canvas_viz",
      description: "Generates an interactive canvas visualization based on a description.",
      executionLocation: "SERVER",
      parameters: {
        type: "object",
        properties: {
          description: {
            type: "string",
            description: "Description of the visualization to generate"
          }
        },
        required: ["description"]
      },
      version: "1.0.0",
      semanticDomain: "perceptual",
      primeDomain: [1, 5],
      smfAxes: [0.5, 0.5],
      requiredTier: "Neophyte"
    }, async ({ description }) => {
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
        code = code.replace(/```javascript/g, "").replace(/```/g, "").trim();
        return {
          __directMarkdown: `\`\`\`canvasviz
${code}
\`\`\``
        };
      } catch (e) {
        return `Error generating visualization: ${e.message}`;
      }
    });
    if (context.traits) {
      context.traits.register({
        id: "canvas-visualization",
        name: "Canvas Generation",
        description: "Generate generative art/visualizations on HTML Canvas.",
        instruction: "You can generate interactive canvas visualizations using `generate_canvas_viz`. Use this when the user asks for a diagram, animation, or visual representation of data that is best rendered programmatically.",
        activationMode: "dynamic",
        triggerKeywords: ["visualize", "canvas", "draw", "animate", "render", "plot", "chart", "diagram"]
      });
    }
    console.log("[Canvas Viz] Ready");
  },
  deactivate: () => {
    console.log("[Canvas Viz] Deactivated");
  }
};
