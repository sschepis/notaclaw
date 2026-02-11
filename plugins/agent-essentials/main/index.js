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
var https = __toESM(require("https"));
var import_url = require("url");
var index_default = {
  activate: (context) => {
    console.log("[Agent Essentials] Main process activated");
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
      id: "@alephnet/agent-essentials:url-reader",
      name: "URL Content Reader",
      description: "Enables reading and extracting content from web pages",
      instruction: `You have access to a URL reading capability via the 'read_url' tool. Use this when:
- You need to fetch content from a specific URL
- The user shares a link and wants you to analyze its content
- You need to verify information from a web source
- Following up on search results to get full content

Call read_url with a 'url' parameter. Returns the text content of the page (limited to first 5000 chars).`,
      activationMode: "dynamic",
      triggerKeywords: ["read url", "fetch page", "visit", "open link", "http", "https", "website content"],
      priority: 14,
      source: "@alephnet/agent-essentials"
    });
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
      // Information retrieval
      smfAxes: [0.5, 0.5],
      requiredTier: "Neophyte",
      version: "1.0.0"
    }, async ({ query }) => {
      console.log(`[Agent Essentials] Searching for: ${query}`);
      const apiKey = await context.secrets.get("search_api_key");
      if (apiKey) {
        try {
          const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&q=${encodeURIComponent(query)}`;
          return new Promise((resolve, reject) => {
            https.get(url, (res) => {
              let data = "";
              res.on("data", (chunk) => data += chunk);
              res.on("end", () => {
                try {
                  const json = JSON.parse(data);
                  resolve({
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
        } catch (e) {
          console.error("Search failed:", e);
        }
      }
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
    });
    context.dsn.registerTool({
      name: "read_url",
      description: "Read and extract content from a URL",
      executionLocation: "SERVER",
      parameters: {
        type: "object",
        properties: {
          url: { type: "string", description: "The URL to read" }
        },
        required: ["url"]
      },
      semanticDomain: "perceptual",
      primeDomain: [5, 7],
      // Data ingestion
      smfAxes: [0.8, 0.2],
      requiredTier: "Neophyte",
      version: "1.0.0"
    }, async ({ url }) => {
      console.log(`[Agent Essentials] Reading URL: ${url}`);
      return new Promise((resolve, reject) => {
        try {
          const parsedUrl = new import_url.URL(url);
          if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
            return reject(new Error("Only HTTP/HTTPS protocols are supported"));
          }
          const req = https.get(url, (res) => {
            if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
              const newUrl = new import_url.URL(res.headers.location, url).toString();
              console.log(`[Agent Essentials] Redirecting to ${newUrl}`);
              https.get(newUrl, (res2) => {
                let data2 = "";
                res2.on("data", (chunk) => data2 += chunk);
                res2.on("end", () => resolve({ content: data2.substring(0, 5e3) }));
              }).on("error", reject);
              return;
            }
            let data = "";
            res.on("data", (chunk) => data += chunk);
            res.on("end", () => resolve({ content: data.substring(0, 5e3) }));
          });
          req.on("error", (err) => reject(err));
          req.end();
        } catch (e) {
          reject(new Error(`Invalid URL: ${e.message}`));
        }
      });
    });
    context.on("ready", () => {
      console.log("[Agent Essentials] Ready");
    });
  },
  deactivate: () => {
    console.log("[Agent Essentials] Deactivated");
  }
};
