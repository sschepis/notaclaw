# Canvas Visualizer Plugin

Renders interactive HTML5 Canvas visualizations inline in chat conversations. Both users and AI can generate visualizations by describing them in plain English.

## How It Works

### For Users
Ask the AI to create a visualization in plain English:
> "Show me a particle system with 200 glowing dots bouncing around"

The AI will respond with a `canvas` code fence that renders as a live, animated canvas directly in the chat.

### For AI
The AI uses the `generate_canvas_visualization` skill to produce JavaScript code inside a ` ```canvas ` fence block. The code receives:
- A pre-created `<canvas id="canvas">` element (default 600×400)
- Full Canvas 2D API access via `canvas.getContext('2d')`
- `requestAnimationFrame()` for animations
- Mouse/keyboard event listeners for interactivity

### Code Format

````markdown
```canvas
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
canvas.width = 600;
canvas.height = 400;

function draw() {
  ctx.fillStyle = 'rgba(0,0,0,0.05)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  // ... drawing code ...
  requestAnimationFrame(draw);
}
draw();
```
````

### Custom Dimensions

````markdown
```canvas width=800 height=600
// Code with custom canvas size
```
````

## Toolbar Controls

Each rendered canvas includes a toolbar with:

| Control | Description |
|---------|-------------|
| ⏸ Pause/Play | Freeze/resume the animation |
| 🔄 Restart | Re-execute the code from scratch |
| `</>` View Source | Toggle read-only source code view |
| ✏️ Edit Source | Edit the code and re-run |
| 📋 Copy | Copy the source code to clipboard |
| ⛶ Expand | Toggle fullscreen mode |

## Security

All code executes inside a **sandboxed iframe** with:
- `sandbox="allow-scripts"` — JS only, no network/forms/popups/same-origin
- Strict CSP: `default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'`
- 50KB code size limit
- Iframe destroyed on component unmount (stops all animations)

## Supported Fence Languages

- ` ```canvas ` — Primary tag
- ` ```viz ` — Alias

## Plugin Structure

```
canvas-viz/
├── manifest.json      # Plugin metadata
├── aleph.json         # Skill declaration
├── package.json       # NPM metadata
├── README.md          # This file
├── main/
│   └── index.js       # Skill registration (main process)
└── renderer/
    ├── index.js       # Renderer entry point
    └── bundle.js      # Bundled renderer (identical)
```
