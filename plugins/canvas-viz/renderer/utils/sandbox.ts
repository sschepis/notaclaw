export const LIBRARIES = {
    d3: 'https://d3js.org/d3.v7.min.js',
    three: 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js',
    chartjs: 'https://cdn.jsdelivr.net/npm/chart.js',
    p5: 'https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.4.0/p5.min.js'
};

const BASE_CLASS = `
class CanvasVisualization {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        this.animationId = null;
        this.isRunning = false;
        
        // Handle resize
        window.addEventListener('resize', () => {
            this.width = window.innerWidth;
            this.height = window.innerHeight;
            this.canvas.width = this.width;
            this.canvas.height = this.height;
            if (this.onResize) this.onResize(this.width, this.height);
        });
        
        // Handle data binding and controls
        window.addEventListener('message', (event) => {
            if (event.data.type === 'data-update') {
                if (this.onData) this.onData(event.data.payload);
            }
            if (event.data.type === 'pause') this.stop();
            if (event.data.type === 'resume') this.start();
            if (event.data.type === 'export-image') {
                const dataUrl = this.canvas.toDataURL('image/png');
                window.parent.postMessage({ type: 'export-image-data', payload: dataUrl }, '*');
            }
        });
    }

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.animate();
    }

    stop() {
        this.isRunning = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }

    animate() {
        if (!this.isRunning) return;
        if (this.update) this.update();
        if (this.draw) this.draw();
        this.animationId = requestAnimationFrame(() => this.animate());
    }
}
`;

export const buildHtml = (code: string, libraries: string[] = []) => {
    const scripts = libraries.map(lib => `<script src="${lib}"></script>`).join('\n');
    
    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval' https:; style-src 'unsafe-inline'; connect-src https:; img-src data: https:;">
    <style>
        html, body { margin: 0; padding: 0; overflow: hidden; background: #0a0a0f; width: 100%; height: 100%; }
        canvas { display: block; width: 100%; height: 100%; }
        #error-overlay {
            position: fixed; bottom: 0; left: 0; right: 0;
            background: rgba(220, 38, 38, 0.9); color: #fff;
            font: 12px/1.4 monospace; padding: 8px 12px;
            display: none; z-index: 1000; max-height: 30%; overflow-y: auto;
        }
    </style>
    ${scripts}
</head>
<body>
    <canvas id="canvas"></canvas>
    <div id="error-overlay"></div>
    <script>
    ${BASE_CLASS}
    
    (function() {
        const errorOverlay = document.getElementById("error-overlay");
        window.onerror = function(msg, source, line, col, error) {
            errorOverlay.style.display = "block";
            errorOverlay.textContent = "Error (line " + line + "): " + msg;
            return true;
        };
        
        try {
            // Initialize canvas size
            const canvas = document.getElementById('canvas');
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            
            // User code execution
            ${code}
            
            // Auto-start if instance exists and has start method
            // Assuming user code creates an instance or setup
            // We expect user code to instantiate CanvasVisualization or similar
            
        } catch (ex) {
            errorOverlay.style.display = "block";
            errorOverlay.textContent = "Error: " + ex.message;
        }
    })();
    </script>
</body>
</html>`;
};
