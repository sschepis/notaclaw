"use strict";
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

// plugins/social-mirror/renderer/index.tsx
var index_exports = {};
__export(index_exports, {
  default: () => SocialMirror
});
module.exports = __toCommonJS(index_exports);
var import_react = __toESM(require("react"));
var import_lucide_react = require("lucide-react");
function SocialMirror() {
  const [activeTab, setActiveTab] = (0, import_react.useState)("feed");
  const [posts, setPosts] = (0, import_react.useState)([]);
  const [content, setContent] = (0, import_react.useState)("");
  const [platform, setPlatform] = (0, import_react.useState)("farcaster");
  const [apiKey, setApiKey] = (0, import_react.useState)("");
  const fetchPosts = () => {
    window.aleph?.invoke("getLatestPosts", { platform: "all", limit: 20 }).then((res) => {
      if (res.posts) setPosts(res.posts);
    });
  };
  (0, import_react.useEffect)(() => {
    if (activeTab === "feed") fetchPosts();
  }, [activeTab]);
  const handlePost = async () => {
    await window.aleph?.invoke("postContent", { platform, content });
    setContent("");
    alert("Posted!");
    setActiveTab("feed");
  };
  const handleConfig = async () => {
    await window.aleph?.invoke("configurePlatform", { platform, apiKey });
    alert("Saved configuration");
  };
  return /* @__PURE__ */ import_react.default.createElement("div", { className: "flex h-full bg-gray-900 text-white" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "w-16 border-r border-gray-700 flex flex-col items-center py-4 gap-4" }, /* @__PURE__ */ import_react.default.createElement(
    "button",
    {
      onClick: () => setActiveTab("feed"),
      className: `p-3 rounded-xl transition ${activeTab === "feed" ? "bg-blue-600" : "hover:bg-gray-800"}`
    },
    /* @__PURE__ */ import_react.default.createElement(import_lucide_react.MessageSquare, { className: "w-6 h-6" })
  ), /* @__PURE__ */ import_react.default.createElement(
    "button",
    {
      onClick: () => setActiveTab("compose"),
      className: `p-3 rounded-xl transition ${activeTab === "compose" ? "bg-green-600" : "hover:bg-gray-800"}`
    },
    /* @__PURE__ */ import_react.default.createElement(import_lucide_react.Share2, { className: "w-6 h-6" })
  ), /* @__PURE__ */ import_react.default.createElement(
    "button",
    {
      onClick: () => setActiveTab("settings"),
      className: `p-3 rounded-xl transition ${activeTab === "settings" ? "bg-gray-600" : "hover:bg-gray-800"}`
    },
    /* @__PURE__ */ import_react.default.createElement(import_lucide_react.Settings, { className: "w-6 h-6" })
  )), /* @__PURE__ */ import_react.default.createElement("div", { className: "flex-1 p-6 overflow-y-auto" }, activeTab === "feed" && /* @__PURE__ */ import_react.default.createElement("div", { className: "max-w-2xl mx-auto space-y-4" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "flex justify-between items-center mb-6" }, /* @__PURE__ */ import_react.default.createElement("h2", { className: "text-2xl font-bold" }, "Social Feed"), /* @__PURE__ */ import_react.default.createElement("button", { onClick: fetchPosts, className: "text-sm text-gray-400 hover:text-white" }, "Refresh")), posts.map((post) => /* @__PURE__ */ import_react.default.createElement("div", { key: post.id, className: "bg-gray-800 p-4 rounded-lg border border-gray-700" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "flex justify-between items-start mb-2" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "font-bold text-blue-400" }, post.author), /* @__PURE__ */ import_react.default.createElement("div", { className: "text-xs text-gray-500 uppercase flex items-center gap-1" }, post.platform === "twitter" ? /* @__PURE__ */ import_react.default.createElement(import_lucide_react.Twitter, { className: "w-3 h-3" }) : /* @__PURE__ */ import_react.default.createElement(import_lucide_react.Globe, { className: "w-3 h-3" }), post.platform)), /* @__PURE__ */ import_react.default.createElement("p", { className: "text-gray-200" }, post.content), /* @__PURE__ */ import_react.default.createElement("div", { className: "mt-3 text-xs text-gray-500" }, new Date(post.timestamp).toLocaleString())))), activeTab === "compose" && /* @__PURE__ */ import_react.default.createElement("div", { className: "max-w-xl mx-auto" }, /* @__PURE__ */ import_react.default.createElement("h2", { className: "text-2xl font-bold mb-6" }, "Compose"), /* @__PURE__ */ import_react.default.createElement("div", { className: "bg-gray-800 p-6 rounded-lg border border-gray-700" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "mb-4" }, /* @__PURE__ */ import_react.default.createElement("label", { className: "block text-sm text-gray-400 mb-2" }, "Platform"), /* @__PURE__ */ import_react.default.createElement(
    "select",
    {
      value: platform,
      onChange: (e) => setPlatform(e.target.value),
      className: "w-full bg-gray-900 border border-gray-600 rounded p-2"
    },
    /* @__PURE__ */ import_react.default.createElement("option", { value: "farcaster" }, "Farcaster"),
    /* @__PURE__ */ import_react.default.createElement("option", { value: "twitter" }, "Twitter / X"),
    /* @__PURE__ */ import_react.default.createElement("option", { value: "bluesky" }, "BlueSky"),
    /* @__PURE__ */ import_react.default.createElement("option", { value: "lens" }, "Lens")
  )), /* @__PURE__ */ import_react.default.createElement("div", { className: "mb-4" }, /* @__PURE__ */ import_react.default.createElement("label", { className: "block text-sm text-gray-400 mb-2" }, "Content"), /* @__PURE__ */ import_react.default.createElement(
    "textarea",
    {
      value: content,
      onChange: (e) => setContent(e.target.value),
      className: "w-full h-32 bg-gray-900 border border-gray-600 rounded p-2",
      placeholder: "What's happening?"
    }
  )), /* @__PURE__ */ import_react.default.createElement(
    "button",
    {
      onClick: handlePost,
      className: "w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded transition"
    },
    "Post"
  ))), activeTab === "settings" && /* @__PURE__ */ import_react.default.createElement("div", { className: "max-w-xl mx-auto" }, /* @__PURE__ */ import_react.default.createElement("h2", { className: "text-2xl font-bold mb-6" }, "Social Configuration"), /* @__PURE__ */ import_react.default.createElement("div", { className: "bg-gray-800 p-6 rounded-lg border border-gray-700 space-y-6" }, /* @__PURE__ */ import_react.default.createElement("div", null, /* @__PURE__ */ import_react.default.createElement("label", { className: "block text-sm text-gray-400 mb-2" }, "Platform"), /* @__PURE__ */ import_react.default.createElement(
    "select",
    {
      value: platform,
      onChange: (e) => setPlatform(e.target.value),
      className: "w-full bg-gray-900 border border-gray-600 rounded p-2"
    },
    /* @__PURE__ */ import_react.default.createElement("option", { value: "farcaster" }, "Farcaster"),
    /* @__PURE__ */ import_react.default.createElement("option", { value: "twitter" }, "Twitter / X"),
    /* @__PURE__ */ import_react.default.createElement("option", { value: "lens" }, "Lens")
  )), /* @__PURE__ */ import_react.default.createElement("div", null, /* @__PURE__ */ import_react.default.createElement("label", { className: "block text-sm text-gray-400 mb-2" }, "API Key / Token"), /* @__PURE__ */ import_react.default.createElement(
    "input",
    {
      type: "password",
      value: apiKey,
      onChange: (e) => setApiKey(e.target.value),
      className: "w-full bg-gray-900 border border-gray-600 rounded p-2",
      placeholder: "sk_..."
    }
  )), /* @__PURE__ */ import_react.default.createElement(
    "button",
    {
      onClick: handleConfig,
      className: "bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded"
    },
    "Save Credentials"
  )))));
}
