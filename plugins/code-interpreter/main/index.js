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
var fs = __toESM(require("fs"));
var path = __toESM(require("path"));
var import_crypto = require("crypto");
var CodeInterpreter = class {
  context;
  sessions;
  dockerAvailable = false;
  // Limits
  maxMemory = "512m";
  maxCpus = 1;
  defaultTimeout = 1e4;
  // 10s
  sessionTimeout = 36e5;
  // 1h
  cleanupInterval = null;
  constructor(context) {
    this.context = context;
    this.sessions = /* @__PURE__ */ new Map();
  }
  async activate() {
    this.dockerAvailable = await this.checkDocker();
    console.log(`[CodeInterpreter] Docker available: ${this.dockerAvailable}`);
    this.context.ipc.handle("create-session", async ({ language }) => this.createSession(language));
    this.context.ipc.handle("execute", async ({ sessionId, code }) => this.executeCode(sessionId, code));
    this.context.ipc.handle("install-package", async ({ sessionId, packageName }) => this.installPackage(sessionId, packageName));
    this.context.ipc.handle("end-session", async ({ sessionId }) => this.endSession(sessionId));
    this.context.ipc.handle("upload-file", async ({ sessionId, filename, content }) => this.uploadFile(sessionId, filename, content));
    this.cleanupInterval = setInterval(() => this.cleanupSessions(), 6e4);
  }
  deactivate() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
  async checkDocker() {
    return new Promise((resolve) => {
      (0, import_child_process.exec)("docker --version", (err) => {
        resolve(!err);
      });
    });
  }
  async createSession(language) {
    if (!this.dockerAvailable) {
      return { sessionId: "", error: "Docker is not available. Please install Docker to use the Code Interpreter." };
    }
    const sessionId = (0, import_crypto.randomUUID)();
    const image = language === "python" ? "python:3.9-slim" : "node:18-slim";
    const workDir = path.join(os.tmpdir(), `code-interpreter-${sessionId}`);
    fs.mkdirSync(workDir, { recursive: true });
    const cmd = language === "python" ? "tail -f /dev/null" : "tail -f /dev/null";
    const dockerCmd = `docker run -d --rm --network none --cpus ${this.maxCpus} --memory ${this.maxMemory} -v "${workDir}:/workspace" -w /workspace ${image} ${cmd}`;
    try {
      const containerId = await this.execPromise(dockerCmd);
      this.sessions.set(sessionId, {
        id: sessionId,
        language,
        containerId: containerId.trim(),
        lastActive: Date.now(),
        workDir
      });
      return { sessionId };
    } catch (e) {
      return { sessionId: "", error: `Failed to start session: ${e.message}` };
    }
  }
  async executeCode(sessionId, code) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { output: "", error: "Session not found", code: 1 };
    }
    session.lastActive = Date.now();
    const scriptName = session.language === "python" ? "script.py" : "script.js";
    const scriptPath = path.join(session.workDir, scriptName);
    fs.writeFileSync(scriptPath, code);
    const cmd = session.language === "python" ? `python ${scriptName}` : `node ${scriptName}`;
    const dockerExec = `docker exec ${session.containerId} ${cmd}`;
    try {
      const output = await this.execPromise(dockerExec, { timeout: this.defaultTimeout });
      return { output, code: 0 };
    } catch (e) {
      if (e.killed) {
        return { output: "", error: "Execution timed out", code: 124 };
      }
      return { output: e.stdout || "", error: e.stderr || e.message, code: e.code || 1 };
    }
  }
  async installPackage(sessionId, packageName) {
    const session = this.sessions.get(sessionId);
    if (!session) return { success: false, error: "Session not found" };
    const cmd = session.language === "python" ? `pip install ${packageName}` : `npm install ${packageName}`;
    return { success: false, error: "Dynamic package installation is disabled in secure mode (Network isolated)." };
  }
  async uploadFile(sessionId, filename, content) {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error("Session not found");
    const filePath = path.join(session.workDir, filename);
    fs.writeFileSync(filePath, content);
  }
  async endSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (session) {
      await this.execPromise(`docker kill ${session.containerId}`);
      fs.rmSync(session.workDir, { recursive: true, force: true });
      this.sessions.delete(sessionId);
    }
  }
  cleanupSessions() {
    const now = Date.now();
    for (const [id, session] of this.sessions) {
      if (now - session.lastActive > this.sessionTimeout) {
        this.endSession(id);
      }
    }
  }
  execPromise(command, options = {}) {
    return new Promise((resolve, reject) => {
      (0, import_child_process.exec)(command, { ...options, encoding: "utf8" }, (error, stdout, stderr) => {
        if (error) {
          error.stdout = stdout;
          error.stderr = stderr;
          reject(error);
        } else {
          resolve(stdout);
        }
      });
    });
  }
};
var interpreter;
var index_default = {
  activate: async (context) => {
    console.log("[Code Interpreter] Activating...");
    interpreter = new CodeInterpreter(context);
    await interpreter.activate();
  },
  deactivate: () => {
    console.log("[Code Interpreter] Deactivated");
    if (interpreter) interpreter.deactivate();
  }
};
