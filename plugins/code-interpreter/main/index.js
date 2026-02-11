var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
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
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// plugins/code-interpreter/main/index.ts
var index_exports = {};
__export(index_exports, {
  default: () => index_default
});
module.exports = __toCommonJS(index_exports);
var import_child_process = require("child_process");
var os = __toESM(require("os"));
var CodeInterpreter = class {
  context;
  sessions;
  maxOutputSize;
  defaultTimeout;
  maxTimeout;
  constructor(context) {
    this.context = context;
    this.sessions = /* @__PURE__ */ new Map();
    this.maxOutputSize = 1024 * 1024;
    this.defaultTimeout = 1e4;
    this.maxTimeout = 6e4;
  }
  activate() {
    this.context.ipc.handle("exec", async (params) => this.executeCommand(params));
    this.context.ipc.handle("spawn", async (params) => this.spawnProcess(params));
    this.context.ipc.handle("kill", async ({ pid }) => this.killProcess(pid));
    if (this.context.services && this.context.services.tools) {
      this.context.services.tools.register({
        name: "exec",
        description: "Execute shell commands (Local Host)",
        parameters: {
          type: "object",
          properties: {
            command: { type: "string" },
            cwd: { type: "string" },
            timeout: { type: "number", description: "Timeout in ms (max 60000)" }
          },
          required: ["command"]
        },
        handler: async (args) => this.executeCommand(args)
      });
    }
  }
  async executeCommand({ command, cwd, timeout }) {
    console.log(`[CodeInterpreter] Executing: ${command.substring(0, 50)}...`);
    if (!command || typeof command !== "string") {
      throw new Error("Invalid command provided");
    }
    if (this.isForbidden(command)) {
      throw new Error("Command blocked by security policy");
    }
    return new Promise((resolve, reject) => {
      const shell = os.platform() === "win32" ? "powershell.exe" : "/bin/bash";
      const args = os.platform() === "win32" ? ["-Command", command] : ["-c", command];
      const safeTimeout = Math.min(timeout || this.defaultTimeout, this.maxTimeout);
      const child = (0, import_child_process.spawn)(shell, args, {
        cwd: cwd || process.cwd(),
        env: process.env,
        // Inherit env (be careful here in prod)
        stdio: ["ignore", "pipe", "pipe"]
      });
      let stdout = "";
      let stderr = "";
      let killed = false;
      let outputSize = 0;
      const timer = setTimeout(() => {
        killed = true;
        child.kill("SIGTERM");
        setTimeout(() => {
          if (!child.killed) child.kill("SIGKILL");
        }, 1e3);
        reject(new Error(`Command timed out after ${safeTimeout}ms`));
      }, safeTimeout);
      const appendOutput = (data, isError) => {
        if (outputSize >= this.maxOutputSize) return;
        const str = data.toString();
        const len = str.length;
        if (outputSize + len > this.maxOutputSize) {
          const truncated = str.substring(0, this.maxOutputSize - outputSize);
          if (isError) stderr += truncated + "\n[Truncated]";
          else stdout += truncated + "\n[Truncated]";
          outputSize = this.maxOutputSize;
          child.kill();
        } else {
          if (isError) stderr += str;
          else stdout += str;
          outputSize += len;
        }
      };
      child.stdout?.on("data", (data) => appendOutput(data, false));
      child.stderr?.on("data", (data) => appendOutput(data, true));
      child.on("error", (err) => {
        clearTimeout(timer);
        if (!killed) reject(err);
      });
      child.on("close", (code) => {
        clearTimeout(timer);
        if (!killed) {
          if (code === 0) {
            resolve({ output: stdout, code });
          } else {
            resolve({ output: stdout, error: stderr, code });
          }
        }
      });
    });
  }
  isForbidden(command) {
    const forbidden = [
      "rm -rf /",
      ":(){ :|:& };:",
      "mkfs",
      "dd if=/dev/zero"
    ];
    return forbidden.some((f) => command.includes(f));
  }
  spawnProcess({ command, cwd }) {
    return { error: "Background processes not supported in this version." };
  }
  killProcess(pid) {
    if (!pid || typeof pid !== "number") return { success: false, error: "Invalid PID" };
    try {
      process.kill(pid);
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }
};
var index_default = {
  activate: (context) => {
    console.log("[Code Interpreter] Activating...");
    const interpreter = new CodeInterpreter(context);
    interpreter.activate();
    context.on("ready", () => {
      console.log("[Code Interpreter] Ready (Local Host Mode)");
    });
  },
  deactivate: () => {
    console.log("[Code Interpreter] Deactivated");
  }
};
