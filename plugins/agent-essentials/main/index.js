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

// plugins/agent-essentials/main/index.ts
var index_exports = {};
__export(index_exports, {
  default: () => index_default
});
module.exports = __toCommonJS(index_exports);

// plugins/agent-essentials/main/services/FilesystemService.ts
var fs = __toESM(require("fs"));
var path = __toESM(require("path"));
var os = __toESM(require("os"));
var import_archiver = __toESM(require("archiver"));
var unzipper = __toESM(require("unzipper"));
var FilesystemService = class {
  sandboxRoot;
  constructor(sandboxRoot) {
    const root = sandboxRoot || "~/alephnet/sandbox";
    if (root.startsWith("~")) {
      this.sandboxRoot = path.join(os.homedir(), root.slice(1));
    } else {
      this.sandboxRoot = path.resolve(root);
    }
    this.ensureSandboxExists();
  }
  resolvePath(filePath) {
    if (filePath.startsWith("~")) {
      return path.join(os.homedir(), filePath.slice(1));
    }
    if (path.isAbsolute(filePath)) {
      return path.resolve(filePath);
    }
    return path.resolve(this.sandboxRoot, filePath);
  }
  ensureSandboxExists() {
    if (!fs.existsSync(this.sandboxRoot)) {
      fs.mkdirSync(this.sandboxRoot, { recursive: true });
    }
  }
  validatePath(filePath) {
    const resolvedPath = this.resolvePath(filePath);
    if (!resolvedPath.startsWith(this.sandboxRoot)) {
      throw new Error(`Security Error: Access denied to path '${filePath}'. Outside of sandbox '${this.sandboxRoot}'.`);
    }
    return resolvedPath;
  }
  async readFile(filePath) {
    const fullPath = this.validatePath(filePath);
    return fs.promises.readFile(fullPath, "utf-8");
  }
  async writeFile(filePath, content) {
    const fullPath = this.validatePath(filePath);
    await fs.promises.mkdir(path.dirname(fullPath), { recursive: true });
    return fs.promises.writeFile(fullPath, content, "utf-8");
  }
  async listFiles(dirPath) {
    const fullPath = this.validatePath(dirPath);
    const files = await fs.promises.readdir(fullPath);
    return files;
  }
  async createDirectory(dirPath) {
    const fullPath = this.validatePath(dirPath);
    await fs.promises.mkdir(fullPath, { recursive: true });
  }
  async deleteFile(filePath) {
    const fullPath = this.validatePath(filePath);
    return fs.promises.rm(fullPath, { recursive: true, force: true });
  }
  async move(sourcePath, destPath) {
    const fullSource = this.validatePath(sourcePath);
    const fullDest = this.validatePath(destPath);
    return fs.promises.rename(fullSource, fullDest);
  }
  async getStats(filePath) {
    const fullPath = this.validatePath(filePath);
    return fs.promises.stat(fullPath);
  }
  async compressFiles(sourcePaths, outputPath) {
    const fullOutputPath = this.validatePath(outputPath);
    const output = fs.createWriteStream(fullOutputPath);
    const archive = (0, import_archiver.default)("zip", { zlib: { level: 9 } });
    return new Promise((resolve3, reject) => {
      output.on("close", resolve3);
      archive.on("error", reject);
      archive.pipe(output);
      for (const sourcePath of sourcePaths) {
        const fullSourcePath = this.validatePath(sourcePath);
        const stats = fs.statSync(fullSourcePath);
        if (stats.isDirectory()) {
          archive.directory(fullSourcePath, path.basename(fullSourcePath));
        } else {
          archive.file(fullSourcePath, { name: path.basename(fullSourcePath) });
        }
      }
      archive.finalize();
    });
  }
  async extractArchive(archivePath, outputDir) {
    const fullArchivePath = this.validatePath(archivePath);
    const fullOutputDir = this.validatePath(outputDir);
    return fs.createReadStream(fullArchivePath).pipe(unzipper.Extract({ path: fullOutputDir })).promise();
  }
};

// plugins/agent-essentials/main/services/WebSearchService.ts
var https = __toESM(require("https"));
var import_url = require("url");

// plugins/agent-essentials/main/utils/RateLimiter.ts
var RateLimiter = class {
  tokens;
  lastRefill;
  maxTokens;
  refillRate;
  // tokens per second
  constructor(maxTokens, refillRate) {
    this.maxTokens = maxTokens;
    this.refillRate = refillRate;
    this.tokens = maxTokens;
    this.lastRefill = Date.now();
  }
  refill() {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1e3;
    const newTokens = elapsed * this.refillRate;
    if (newTokens > 0) {
      this.tokens = Math.min(this.maxTokens, this.tokens + newTokens);
      this.lastRefill = now;
    }
  }
  tryConsume(tokens = 1) {
    this.refill();
    if (this.tokens >= tokens) {
      this.tokens -= tokens;
      return true;
    }
    return false;
  }
  async waitForToken(tokens = 1) {
    while (!this.tryConsume(tokens)) {
      await new Promise((resolve3) => setTimeout(resolve3, 100));
    }
  }
};

// plugins/agent-essentials/main/services/WebSearchService.ts
var WebSearchService = class {
  rateLimiter;
  apiKey = null;
  storage = null;
  constructor(apiKey, storage) {
    this.apiKey = apiKey || null;
    this.storage = storage || null;
    this.rateLimiter = new RateLimiter(10, 10 / 60);
  }
  setApiKey(key) {
    this.apiKey = key;
  }
  setStorage(storage) {
    this.storage = storage;
  }
  async search(query) {
    if (!this.rateLimiter.tryConsume()) {
      throw new Error("Rate limit exceeded. Please try again later.");
    }
    console.log(`[WebSearchService] Searching for: ${query}`);
    let result;
    if (this.apiKey) {
      result = await this.performGoogleSearch(query);
    } else {
      result = this.getMockResults(query);
    }
    await this.saveHistory(query, result);
    return result;
  }
  async saveHistory(query, result) {
    if (!this.storage) return;
    try {
      const history = await this.storage.get("search_history") || [];
      history.unshift({
        query,
        timestamp: Date.now(),
        resultCount: result.results?.length || 0
      });
      if (history.length > 100) history.length = 100;
      await this.storage.set("search_history", history);
    } catch (e) {
      console.error("Failed to save search history", e);
    }
  }
  // ...
  async performGoogleSearch(query) {
    return new Promise((resolve3, reject) => {
      const url = `https://www.googleapis.com/customsearch/v1?key=${this.apiKey}&q=${encodeURIComponent(query)}`;
      https.get(url, (res) => {
        let data = "";
        res.on("data", (chunk) => data += chunk);
        res.on("end", () => {
          try {
            const json = JSON.parse(data);
            resolve3({
              results: json.items?.map((item) => ({
                title: item.title,
                snippet: item.snippet,
                url: item.link
              })) || [],
              metadata: { source: "google" }
            });
          } catch (e) {
            reject(e);
          }
        });
      }).on("error", reject);
    });
  }
  getMockResults(query) {
    return {
      results: [
        {
          title: `Simulated Result: ${query}`,
          snippet: `This is a placeholder result for "${query}". To enable real web search, configure a search provider in Agent Essentials settings.`,
          url: "https://aleph.network/docs/plugins/agent-essentials"
        },
        {
          title: "AlephNet Documentation",
          snippet: "Official documentation for AlephNet Distributed Sentience Network.",
          url: "https://aleph.network/docs"
        }
      ],
      metadata: {
        source: "simulation",
        note: "Real web search requires API configuration"
      }
    };
  }
  async readUrl(url) {
    console.log(`[WebSearchService] Reading URL: ${url}`);
    return new Promise((resolve3, reject) => {
      try {
        const parsedUrl = new import_url.URL(url);
        if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
          return reject(new Error("Only HTTP/HTTPS protocols are supported"));
        }
        const req = https.get(url, (res) => {
          if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            const newUrl = new import_url.URL(res.headers.location, url).toString();
            console.log(`[WebSearchService] Redirecting to ${newUrl}`);
            this.readUrl(newUrl).then(resolve3).catch(reject);
            return;
          }
          let data = "";
          res.on("data", (chunk) => data += chunk);
          res.on("end", () => resolve3({ content: data.substring(0, 5e3) }));
        });
        req.on("error", (err) => reject(err));
        req.end();
      } catch (e) {
        reject(new Error(`Invalid URL: ${e.message}`));
      }
    });
  }
};

// plugins/agent-essentials/main/services/SystemInfoService.ts
var si = __toESM(require("systeminformation"));
var SystemInfoService = class {
  async getSystemInfo() {
    const [cpu2, mem2, osInfo2, currentLoad2, networkInterfaces2] = await Promise.all([
      si.cpu(),
      si.mem(),
      si.osInfo(),
      si.currentLoad(),
      si.networkInterfaces()
    ]);
    return {
      cpu: {
        manufacturer: cpu2.manufacturer,
        brand: cpu2.brand,
        speed: cpu2.speed,
        cores: cpu2.cores,
        physicalCores: cpu2.physicalCores,
        load: currentLoad2.currentLoad,
        loadUser: currentLoad2.currentLoadUser,
        loadSystem: currentLoad2.currentLoadSystem
      },
      memory: {
        total: mem2.total,
        free: mem2.free,
        used: mem2.used,
        active: mem2.active,
        available: mem2.available
      },
      os: {
        platform: osInfo2.platform,
        distro: osInfo2.distro,
        release: osInfo2.release,
        hostname: osInfo2.hostname
      },
      network: Array.isArray(networkInterfaces2) ? networkInterfaces2.map((iface) => ({
        iface: iface.iface,
        ip4: iface.ip4,
        mac: iface.mac,
        internal: iface.internal
      })) : []
    };
  }
  async getProcessList() {
    const processes2 = await si.processes();
    return processes2.list.slice(0, 20).map((p) => ({
      pid: p.pid,
      name: p.name,
      cpu: p.cpu,
      mem: p.mem
    }));
  }
};

// plugins/agent-essentials/main/services/BrowserService.ts
var puppeteer = __toESM(require("puppeteer-core"));
var fs2 = __toESM(require("fs"));
var os2 = __toESM(require("os"));
var BrowserService = class {
  browser = null;
  getExecutablePath() {
    const platform2 = os2.platform();
    if (platform2 === "darwin") {
      const paths = [
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary",
        "/Applications/Chromium.app/Contents/MacOS/Chromium",
        "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"
      ];
      for (const p of paths) {
        if (fs2.existsSync(p)) return p;
      }
    } else if (platform2 === "win32") {
      const paths = [
        "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
        "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
        "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
        "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
      ];
      for (const p of paths) {
        if (fs2.existsSync(p)) return p;
      }
    } else if (platform2 === "linux") {
      const paths = [
        "/usr/bin/google-chrome",
        "/usr/bin/chromium-browser",
        "/usr/bin/chromium"
      ];
      for (const p of paths) {
        if (fs2.existsSync(p)) return p;
      }
    }
    throw new Error("Browser executable not found. Please install Google Chrome, Chromium, or Microsoft Edge.");
  }
  async getBrowser() {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        executablePath: this.getExecutablePath(),
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"]
      });
    }
    return this.browser;
  }
  async browsePage(url) {
    const browser = await this.getBrowser();
    const page = await browser.newPage();
    try {
      await page.goto(url, { waitUntil: "networkidle2" });
      const content = await page.evaluate(() => document.body.innerText);
      return content;
    } finally {
      await page.close();
    }
  }
  async screenshotPage(url) {
    const browser = await this.getBrowser();
    const page = await browser.newPage();
    try {
      await page.setViewport({ width: 1280, height: 800 });
      await page.goto(url, { waitUntil: "networkidle2" });
      const buffer = await page.screenshot({ encoding: "base64" });
      return buffer;
    } finally {
      await page.close();
    }
  }
  async extractData(url, selector) {
    const browser = await this.getBrowser();
    const page = await browser.newPage();
    try {
      await page.goto(url, { waitUntil: "networkidle2" });
      const texts = await page.evaluate((sel) => {
        const elements = document.querySelectorAll(sel);
        return Array.from(elements).map((el) => el.innerText);
      }, selector);
      return texts;
    } finally {
      await page.close();
    }
  }
  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
};

// plugins/agent-essentials/main/services/ClipboardService.ts
var import_screenshot_desktop = __toESM(require("screenshot-desktop"));
var import_node_notifier = __toESM(require("node-notifier"));
var path2 = __toESM(require("path"));
var os3 = __toESM(require("os"));
var ClipboardService = class {
  async readClipboard() {
    const clipboardy = (await import("clipboardy")).default;
    return clipboardy.read();
  }
  async writeClipboard(text) {
    const clipboardy = (await import("clipboardy")).default;
    return clipboardy.write(text);
  }
  async captureScreenshot(outputPath) {
    const absolutePath = outputPath ? path2.resolve(outputPath) : path2.resolve(os3.tmpdir(), `screenshot-${Date.now()}.png`);
    await (0, import_screenshot_desktop.default)({ filename: absolutePath });
    return absolutePath;
  }
  async sendNotification(title, message) {
    return new Promise((resolve3, reject) => {
      import_node_notifier.default.notify({
        title,
        message,
        wait: false
      }, (err) => {
        if (err) reject(err);
        else resolve3();
      });
    });
  }
};

// plugins/agent-essentials/main/tools/filesystem.ts
function registerFilesystemTools(context, service) {
  context.dsn.registerTool({
    name: "fs_read_file",
    description: "Read the contents of a file within the sandbox",
    executionLocation: "SERVER",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "Relative path to the file" }
      },
      required: ["path"]
    },
    semanticDomain: "perceptual",
    primeDomain: [5],
    // Data
    smfAxes: [0.5, 0.5],
    requiredTier: "Neophyte",
    version: "1.0.0"
  }, async ({ path: path3 }) => {
    return { content: await service.readFile(path3) };
  });
  context.dsn.registerTool({
    name: "fs_write_file",
    description: "Write content to a file within the sandbox",
    executionLocation: "SERVER",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "Relative path to the file" },
        content: { type: "string", description: "Content to write" }
      },
      required: ["path", "content"]
    },
    semanticDomain: "cognitive",
    primeDomain: [5],
    smfAxes: [0.5, 0.5],
    requiredTier: "Neophyte",
    version: "1.0.0"
  }, async ({ path: path3, content }) => {
    await service.writeFile(path3, content);
    return { success: true, message: `File written to ${path3}` };
  });
  context.dsn.registerTool({
    name: "fs_list_files",
    description: "List files and directories in a path",
    executionLocation: "SERVER",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "Directory path to list" }
      },
      required: ["path"]
    },
    semanticDomain: "perceptual",
    primeDomain: [5],
    smfAxes: [0.5, 0.5],
    requiredTier: "Neophyte",
    version: "1.0.0"
  }, async ({ path: path3 }) => {
    const files = await service.listFiles(path3);
    return { files };
  });
  context.dsn.registerTool({
    name: "fs_delete_file",
    description: "Delete a file",
    executionLocation: "SERVER",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "Path to the file" }
      },
      required: ["path"]
    },
    semanticDomain: "cognitive",
    primeDomain: [5],
    smfAxes: [0.5, 0.5],
    requiredTier: "Neophyte",
    version: "1.0.0"
  }, async ({ path: path3 }) => {
    await service.deleteFile(path3);
    return { success: true };
  });
  context.dsn.registerTool({
    name: "fs_create_directory",
    description: "Create a directory",
    executionLocation: "SERVER",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "Directory path" }
      },
      required: ["path"]
    },
    semanticDomain: "cognitive",
    primeDomain: [5],
    smfAxes: [0.5, 0.5],
    requiredTier: "Neophyte",
    version: "1.0.0"
  }, async ({ path: path3 }) => {
    await service.createDirectory(path3);
    return { success: true };
  });
  context.dsn.registerTool({
    name: "fs_compress_files",
    description: "Compress files into a zip archive",
    executionLocation: "SERVER",
    parameters: {
      type: "object",
      properties: {
        sourcePaths: { type: "array", items: { type: "string" }, description: "List of file paths to compress" },
        outputPath: { type: "string", description: "Path for the output zip file" }
      },
      required: ["sourcePaths", "outputPath"]
    },
    semanticDomain: "cognitive",
    primeDomain: [5],
    smfAxes: [0.5, 0.5],
    requiredTier: "Neophyte",
    version: "1.0.0"
  }, async ({ sourcePaths, outputPath }) => {
    await service.compressFiles(sourcePaths, outputPath);
    return { success: true, message: `Created archive at ${outputPath}` };
  });
  context.dsn.registerTool({
    name: "fs_extract_archive",
    description: "Extract a zip archive",
    executionLocation: "SERVER",
    parameters: {
      type: "object",
      properties: {
        archivePath: { type: "string", description: "Path to the zip file" },
        outputDir: { type: "string", description: "Directory to extract to" }
      },
      required: ["archivePath", "outputDir"]
    },
    semanticDomain: "cognitive",
    primeDomain: [5],
    smfAxes: [0.5, 0.5],
    requiredTier: "Neophyte",
    version: "1.0.0"
  }, async ({ archivePath, outputDir }) => {
    await service.extractArchive(archivePath, outputDir);
    return { success: true, message: `Extracted to ${outputDir}` };
  });
}

// plugins/agent-essentials/main/tools/web.ts
function registerWebTools(context, searchService, browserService) {
  context.dsn.registerTool({
    name: "web_search",
    description: "Search the web for information",
    executionLocation: "SERVER",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "The search query" }
      },
      required: ["query"]
    },
    semanticDomain: "cognitive",
    primeDomain: [2, 3],
    smfAxes: [0.5, 0.5],
    requiredTier: "Neophyte",
    version: "1.0.0"
  }, async ({ query }) => {
    return searchService.search(query);
  });
  context.dsn.registerTool({
    name: "web_browse",
    description: "Browse a web page and extract content",
    executionLocation: "SERVER",
    parameters: {
      type: "object",
      properties: {
        url: { type: "string", description: "URL to browse" }
      },
      required: ["url"]
    },
    semanticDomain: "perceptual",
    primeDomain: [5, 7],
    smfAxes: [0.8, 0.2],
    requiredTier: "Neophyte",
    version: "1.0.0"
  }, async ({ url }) => {
    const content = await browserService.browsePage(url);
    return { content };
  });
  context.dsn.registerTool({
    name: "web_screenshot",
    description: "Take a screenshot of a web page",
    executionLocation: "SERVER",
    parameters: {
      type: "object",
      properties: {
        url: { type: "string", description: "URL to screenshot" }
      },
      required: ["url"]
    },
    semanticDomain: "perceptual",
    primeDomain: [5, 7],
    smfAxes: [0.8, 0.2],
    requiredTier: "Neophyte",
    version: "1.0.0"
  }, async ({ url }) => {
    const screenshot2 = await browserService.screenshotPage(url);
    return { screenshot: screenshot2, format: "base64" };
  });
  context.dsn.registerTool({
    name: "web_extract",
    description: "Extract data from a web page using a CSS selector",
    executionLocation: "SERVER",
    parameters: {
      type: "object",
      properties: {
        url: { type: "string", description: "URL to extract from" },
        selector: { type: "string", description: "CSS selector" }
      },
      required: ["url", "selector"]
    },
    semanticDomain: "cognitive",
    primeDomain: [5, 7],
    smfAxes: [0.8, 0.2],
    requiredTier: "Neophyte",
    version: "1.0.0"
  }, async ({ url, selector }) => {
    const data = await browserService.extractData(url, selector);
    return { data };
  });
}

// plugins/agent-essentials/main/tools/system.ts
function registerSystemTools(context, systemService, clipboardService) {
  context.dsn.registerTool({
    name: "sys_get_info",
    description: "Get detailed system information (CPU, Memory, Network)",
    executionLocation: "SERVER",
    parameters: {
      type: "object",
      properties: {},
      required: []
    },
    semanticDomain: "meta",
    primeDomain: [5],
    smfAxes: [0.5, 0.5],
    requiredTier: "Neophyte",
    version: "1.0.0"
  }, async () => {
    return systemService.getSystemInfo();
  });
  context.dsn.registerTool({
    name: "sys_clipboard_read",
    description: "Read from the system clipboard",
    executionLocation: "SERVER",
    parameters: {
      type: "object",
      properties: {},
      required: []
    },
    semanticDomain: "perceptual",
    primeDomain: [5],
    smfAxes: [0.5, 0.5],
    requiredTier: "Neophyte",
    version: "1.0.0"
  }, async () => {
    const content = await clipboardService.readClipboard();
    return { content };
  });
  context.dsn.registerTool({
    name: "sys_clipboard_write",
    description: "Write to the system clipboard",
    executionLocation: "SERVER",
    parameters: {
      type: "object",
      properties: {
        content: { type: "string", description: "Content to write" }
      },
      required: ["content"]
    },
    semanticDomain: "cognitive",
    // or meta? cognitive seems appropriate for writing data
    primeDomain: [5],
    smfAxes: [0.5, 0.5],
    requiredTier: "Neophyte",
    version: "1.0.0"
  }, async ({ content }) => {
    await clipboardService.writeClipboard(content);
    return { success: true };
  });
  context.dsn.registerTool({
    name: "sys_screenshot",
    description: "Take a screenshot of the desktop",
    executionLocation: "SERVER",
    parameters: {
      type: "object",
      properties: {
        outputPath: { type: "string", description: "Optional path to save the screenshot" }
      },
      required: []
    },
    semanticDomain: "perceptual",
    primeDomain: [5],
    smfAxes: [0.5, 0.5],
    requiredTier: "Neophyte",
    version: "1.0.0"
  }, async ({ outputPath }) => {
    const result = await clipboardService.captureScreenshot(outputPath);
    return { result };
  });
  context.dsn.registerTool({
    name: "sys_notify",
    description: "Send a system notification",
    executionLocation: "SERVER",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", description: "Notification title" },
        message: { type: "string", description: "Notification message" }
      },
      required: ["title", "message"]
    },
    semanticDomain: "meta",
    primeDomain: [5],
    smfAxes: [0.5, 0.5],
    requiredTier: "Neophyte",
    version: "1.0.0"
  }, async ({ title, message }) => {
    await clipboardService.sendNotification(title, message);
    return { success: true };
  });
}

// plugins/agent-essentials/main/index.ts
var index_default = {
  activate: (context) => {
    console.log("[Agent Essentials] Main process activated");
    const fsService = new FilesystemService();
    const searchService = new WebSearchService(void 0, context.storage);
    const systemService = new SystemInfoService();
    const browserService = new BrowserService();
    const clipboardService = new ClipboardService();
    context.traits.register({
      id: "@alephnet/agent-essentials:web-search",
      name: "Web Search Capability",
      description: "Enables searching the web for current information and data",
      instruction: `You have access to a web search capability via the 'web_search' tool. Use this when:
- The user asks about current events, news, or time-sensitive information
- You need factual data that may have changed since your training
- Research or verification of claims is required
- The user explicitly asks to search for something

Call web_search with a 'query' parameter containing your search terms. Results include title, snippet, and URL.`,
      activationMode: "dynamic",
      triggerKeywords: ["search", "look up", "find online", "google", "current", "latest", "news", "today"],
      priority: 15,
      source: "@alephnet/agent-essentials"
    });
    context.traits.register({
      id: "@alephnet/agent-essentials:filesystem",
      name: "Filesystem Access",
      description: "Enables reading and writing files in a secure sandbox",
      instruction: `You can access files in a secure sandbox. Use 'fs_read_file', 'fs_write_file', 'fs_list_files' to manage files.`,
      activationMode: "dynamic",
      triggerKeywords: ["file", "read", "write", "save", "list files", "directory"],
      priority: 10,
      source: "@alephnet/agent-essentials"
    });
    registerFilesystemTools(context, fsService);
    registerWebTools(context, searchService, browserService);
    registerSystemTools(context, systemService, clipboardService);
    context.ipc.handle("fs:list", async ({ path: path3 }) => fsService.listFiles(path3));
    context.ipc.handle("fs:read", async ({ path: path3 }) => fsService.readFile(path3));
    context.ipc.handle("fs:write", async ({ path: path3, content }) => fsService.writeFile(path3, content));
    context.ipc.handle("fs:delete", async ({ path: path3 }) => fsService.deleteFile(path3));
    context.ipc.handle("fs:mkdir", async ({ path: path3 }) => fsService.createDirectory(path3));
    context.ipc.handle("sys:info", async () => systemService.getSystemInfo());
    context.secrets.get("search_api_key").then((key) => {
      if (key) {
        searchService.setApiKey(key);
      }
    });
    context.on("ready", () => {
      console.log("[Agent Essentials] Ready");
    });
  },
  deactivate: () => {
    console.log("[Agent Essentials] Deactivated");
  }
};
