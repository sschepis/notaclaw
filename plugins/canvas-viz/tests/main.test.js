"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = __importDefault(require("../main/index"));
describe('Canvas Viz Plugin', () => {
    let mockContext;
    let registeredTools = {};
    beforeEach(() => {
        registeredTools = {};
        mockContext = {
            ipc: {
                handle: jest.fn(),
                send: jest.fn()
            },
            dsn: {
                registerTool: jest.fn((def, handler) => {
                    registeredTools[def.name] = handler;
                })
            },
            ai: {
                complete: jest.fn()
            },
            events: {
                on: jest.fn()
            }
        };
        jest.clearAllMocks();
    });
    it('should activate and register tool', () => {
        index_1.default.activate(mockContext);
        expect(mockContext.ipc.handle).toHaveBeenCalledWith('canvas:get-graph', expect.any(Function));
        expect(mockContext.ipc.handle).toHaveBeenCalledWith('canvas:add-node', expect.any(Function));
        expect(mockContext.dsn.registerTool).toHaveBeenCalled();
        expect(registeredTools['generate_canvas_viz']).toBeDefined();
    });
    it('should generate canvas viz code', async () => {
        index_1.default.activate(mockContext);
        mockContext.ai.complete.mockResolvedValue({
            text: '```javascript\nclass MyViz extends CanvasVisualization {}\nnew MyViz("canvas").start();\n```'
        });
        const handler = registeredTools['generate_canvas_viz'];
        const result = await handler({ description: 'test viz' });
        expect(result).toContain('```canvasviz');
        expect(result).toContain('class MyViz extends CanvasVisualization');
        expect(result).not.toContain('```javascript');
    });
    it('should handle AI errors', async () => {
        index_1.default.activate(mockContext);
        mockContext.ai.complete.mockRejectedValue(new Error('AI failed'));
        const handler = registeredTools['generate_canvas_viz'];
        const result = await handler({ description: 'test viz' });
        expect(result).toContain('Error generating visualization: AI failed');
    });
});
