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

// plugins/canvas-viz/renderer/index.tsx
var index_exports = {};
__export(index_exports, {
  activate: () => activate
});
module.exports = __toCommonJS(index_exports);
var import_react = require("react");
var import_jsx_runtime = require("react/jsx-runtime");
var activate = (context) => {
  console.log("[Canvas Viz] Renderer activated");
  const MAX_CODE_SIZE = 51200;
  const DEFAULT_WIDTH = 600;
  const DEFAULT_HEIGHT = 400;
  const BASE_CLASS = `
    class CanvasVisualization {
        constructor(canvasId) {
            this.canvas = document.getElementById(canvasId);
            this.ctx = this.canvas.getContext('2d');
            this.width = this.canvas.width;
            this.height = this.canvas.height;
            this.animationId = null;
            this.isRunning = false;
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
            this.update();
            this.draw();
            this.animationId = requestAnimationFrame(() => this.animate());
        }

        update() {}
        draw() {}
    }
    `;
  const buildSrcdoc = (code, width, height) => {
    return `<!DOCTYPE html><html><head><meta charset="utf-8">
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'">
        <style>html,body{margin:0;padding:0;overflow:hidden;background:#0a0a0f;width:100%;height:100%}
        canvas{display:block}
        #error-overlay{position:fixed;bottom:0;left:0;right:0;background:rgba(220,38,38,.9);color:#fff;
        font:12px/1.4 monospace;padding:8px 12px;display:none;z-index:1000;max-height:30%;overflow-y:auto}
        </style></head><body>
        <canvas id="canvas" width="${width}" height="${height}"></canvas>
        <div id="error-overlay"></div>
        <script>
        ${BASE_CLASS}
        (function(){var e=document.getElementById("error-overlay");
        window.onerror=function(m,s,l,c,err){e.style.display="block";e.textContent="Error (line "+l+"): "+m;return true};
        try{
            ${code}
        }catch(ex){e.style.display="block";e.textContent="Error: "+ex.message}})();<\/script>
        </body></html>`;
  };
  const Icon = ({ d }) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("svg", { className: "w-3.5 h-3.5", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d }) });
  const PlayIcon = () => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", { className: "w-3.5 h-3.5", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M21 12a9 9 0 11-18 0 9 9 0 0118 0z" })
  ] });
  const PauseIcon = () => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { d: "M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" });
  const CodeIcon = () => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { d: "M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" });
  const EditIcon = () => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { d: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" });
  const CopyIcon = () => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { d: "M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" });
  const ExpandIcon = () => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { d: "M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" });
  const CheckIcon = () => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { d: "M5 13l4 4L19 7" });
  const RefreshIcon = () => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { d: "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" });
  const Btn = ({ onClick, active, title, children }) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    "button",
    {
      onClick,
      className: `p-1 rounded text-gray-400 hover:text-white hover:bg-white/10 transition-colors ${active ? "text-cyan-400 bg-cyan-500/10" : ""}`,
      title,
      children
    }
  );
  const CanvasRenderer = (props) => {
    const block = props.block;
    const code = block.content || "";
    const [view, setView] = (0, import_react.useState)("canvas");
    const [editCode, setEditCode] = (0, import_react.useState)(code);
    const [activeCode, setActiveCode] = (0, import_react.useState)(code);
    const [isPaused, setIsPaused] = (0, import_react.useState)(false);
    const [copied, setCopied] = (0, import_react.useState)(false);
    const [isExpanded, setIsExpanded] = (0, import_react.useState)(false);
    const [iframeKey, setIframeKey] = (0, import_react.useState)(0);
    const isOversize = code.length > MAX_CODE_SIZE;
    const dims = (0, import_react.useMemo)(() => {
      let w = DEFAULT_WIDTH, h = DEFAULT_HEIGHT;
      if (block.meta) {
        const wm = block.meta.match(/width=(\d+)/);
        const hm = block.meta.match(/height=(\d+)/);
        if (wm) w = parseInt(wm[1], 10);
        if (hm) h = parseInt(hm[1], 10);
      }
      return { width: w, height: h };
    }, [block.meta]);
    const srcdoc = (0, import_react.useMemo)(() => {
      if (isOversize) return "";
      return buildSrcdoc(activeCode, dims.width, dims.height);
    }, [activeCode, dims.width, dims.height, iframeKey]);
    if (isOversize) {
      return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "my-2 p-4 rounded-lg border border-red-500/30 bg-red-900/10 text-red-300 text-xs", children: [
        "Canvas code exceeds 50KB limit (",
        (code.length / 1024).toFixed(1),
        "KB)"
      ] });
    }
    const containerH = isExpanded ? "80vh" : Math.min(dims.height + 40, 500) + "px";
    return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: `my-2 rounded-lg overflow-hidden border border-cyan-500/20 bg-gray-950 shadow-[0_0_20px_-5px_rgba(6,182,212,0.1)] ${isExpanded ? "fixed inset-4 z-50" : ""}`, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex items-center justify-between px-2 py-1 bg-gray-900/80 border-b border-cyan-500/10", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex items-center gap-1.5", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "w-2 h-2 rounded-full bg-cyan-500 animate-pulse" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "text-[10px] font-mono text-cyan-400/80 uppercase tracking-wider font-bold", children: view === "edit" ? "EDITING" : view === "source" ? "SOURCE" : "CANVAS" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex items-center gap-0.5", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Btn, { onClick: () => setIsPaused((p) => !p), title: isPaused ? "Resume" : "Pause", active: isPaused, children: isPaused ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PlayIcon, {}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PauseIcon, {}) }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Btn, { onClick: () => {
            setIframeKey((k) => k + 1);
            setIsPaused(false);
            setView("canvas");
          }, title: "Restart", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RefreshIcon, {}) }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "w-px h-4 bg-white/10 mx-0.5" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Btn, { onClick: () => setView((v) => v === "source" ? "canvas" : "source"), title: "View Source", active: view === "source", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CodeIcon, {}) }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Btn, { onClick: () => {
            if (view === "edit") {
              setActiveCode(editCode);
              setIframeKey((k) => k + 1);
              setView("canvas");
            } else {
              setEditCode(activeCode);
              setView("edit");
            }
          }, title: view === "edit" ? "Save & Run" : "Edit Source", active: view === "edit", children: view === "edit" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CheckIcon, {}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EditIcon, {}) }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Btn, { onClick: () => {
            navigator.clipboard.writeText(activeCode).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 2e3);
            });
          }, title: copied ? "Copied!" : "Copy Code", children: copied ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CheckIcon, {}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CopyIcon, {}) }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "w-px h-4 bg-white/10 mx-0.5" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Btn, { onClick: () => setIsExpanded((e) => !e), title: isExpanded ? "Collapse" : "Expand", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ExpandIcon, {}) })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { height: containerH, position: "relative" }, children: [
        view === "canvas" && !isPaused && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "iframe",
          {
            srcDoc: srcdoc,
            sandbox: "allow-scripts",
            className: "w-full h-full border-0",
            style: { background: "#0a0a0f" },
            title: "Canvas Visualization"
          },
          "f-" + iframeKey
        ),
        view === "canvas" && isPaused && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "w-full h-full flex items-center justify-center bg-gray-950 text-gray-500", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "text-center", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "text-3xl mb-2", children: "\u23F8" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "text-xs font-mono", children: "Paused" })
        ] }) }),
        view === "source" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", { className: "w-full h-full overflow-auto p-3 text-xs font-mono text-gray-300 bg-gray-950 leading-5 m-0", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", { children: activeCode }) }),
        view === "edit" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "textarea",
          {
            value: editCode,
            onChange: (e) => setEditCode(e.target.value),
            className: "w-full h-full p-3 text-xs font-mono text-gray-200 bg-gray-950 border-0 outline-none resize-none leading-5",
            spellCheck: false,
            placeholder: "Enter canvas JavaScript code..."
          }
        )
      ] })
    ] });
  };
  const { useFenceStore } = context.require("alephnet");
  const { registerRenderer } = useFenceStore.getState();
  registerRenderer({
    id: "canvas-viz-renderer",
    languages: ["canvas", "viz", "canvasviz"],
    component: CanvasRenderer,
    priority: 10
  });
  console.log("[Canvas Viz] Fence renderer registered for: canvas, viz, canvasviz");
};
