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

// plugins/degentrader/renderer/index.tsx
var index_exports = {};
__export(index_exports, {
  activate: () => activate
});
module.exports = __toCommonJS(index_exports);
var import_react3 = __toESM(require("react"));

// plugins/degentrader/renderer/Dashboard.tsx
var import_react = __toESM(require("react"));
var Dashboard = ({ context }) => {
  const [status, setStatus] = (0, import_react.useState)(null);
  const [loading, setLoading] = (0, import_react.useState)(false);
  const [config, setConfig] = (0, import_react.useState)({ minScore: 0.7, maxOpenPositions: 5, allocationPct: 0.1 });
  const fetchStatus = async () => {
    const result = await context.ipc.invoke("degentrader:get-status");
    setStatus(result);
  };
  (0, import_react.useEffect)(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5e3);
    return () => clearInterval(interval);
  }, []);
  const toggleEngine = async () => {
    setLoading(true);
    if (status?.active) {
      await context.ipc.invoke("degentrader:stop");
    } else {
      await context.ipc.invoke("degentrader:start");
    }
    await fetchStatus();
    setLoading(false);
  };
  const toggleStrategy = async (name, enabled) => {
    await context.ipc.invoke("degentrader:toggle-strategy", { name, enabled });
    fetchStatus();
  };
  const updateConfig = async () => {
    await context.ipc.invoke("degentrader:update-config", config);
    alert("Configuration updated!");
  };
  if (!status) return /* @__PURE__ */ import_react.default.createElement("div", null, "Loading...");
  return /* @__PURE__ */ import_react.default.createElement("div", { className: "space-y-6" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "bg-white/5 p-6 rounded-xl border border-white/10" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "flex justify-between items-center mb-4" }, /* @__PURE__ */ import_react.default.createElement("h2", { className: "text-xl font-bold" }, "Status"), /* @__PURE__ */ import_react.default.createElement(
    "button",
    {
      onClick: toggleEngine,
      disabled: loading,
      className: `px-4 py-2 rounded-lg font-bold ${status.active ? "bg-red-500 hover:bg-red-600" : "bg-green-500 hover:bg-green-600"}`
    },
    status.active ? "STOP TRADING" : "START TRADING"
  )), /* @__PURE__ */ import_react.default.createElement("div", { className: "grid grid-cols-3 gap-4" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "bg-black/20 p-4 rounded-lg" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "text-gray-400 text-sm" }, "Total Trades"), /* @__PURE__ */ import_react.default.createElement("div", { className: "text-2xl font-mono" }, status.performance.totalTrades)), /* @__PURE__ */ import_react.default.createElement("div", { className: "bg-black/20 p-4 rounded-lg" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "text-gray-400 text-sm" }, "Win Rate"), /* @__PURE__ */ import_react.default.createElement("div", { className: "text-2xl font-mono" }, status.performance.totalTrades > 0 ? (status.performance.profitableTrades / status.performance.totalTrades * 100).toFixed(1) : 0, "%")), /* @__PURE__ */ import_react.default.createElement("div", { className: "bg-black/20 p-4 rounded-lg" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "text-gray-400 text-sm" }, "Profit (Paper)"), /* @__PURE__ */ import_react.default.createElement("div", { className: `text-2xl font-mono ${status.performance.totalProfit >= 0 ? "text-green-400" : "text-red-400"}` }, status.performance.totalProfit.toFixed(2))))), /* @__PURE__ */ import_react.default.createElement("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-6" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "bg-white/5 p-6 rounded-xl border border-white/10" }, /* @__PURE__ */ import_react.default.createElement("h2", { className: "text-xl font-bold mb-4" }, "Strategies"), /* @__PURE__ */ import_react.default.createElement("div", { className: "space-y-2" }, status.strategies.map((s) => /* @__PURE__ */ import_react.default.createElement("div", { key: s.name, className: "flex justify-between items-center bg-black/20 p-3 rounded" }, /* @__PURE__ */ import_react.default.createElement("div", null, /* @__PURE__ */ import_react.default.createElement("div", { className: "font-medium" }, s.name), /* @__PURE__ */ import_react.default.createElement("div", { className: "text-xs text-gray-400" }, s.description)), /* @__PURE__ */ import_react.default.createElement("div", { className: "flex items-center space-x-4" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "text-sm text-gray-400" }, "Weight: ", s.weight.toFixed(2)), /* @__PURE__ */ import_react.default.createElement(
    "button",
    {
      onClick: () => toggleStrategy(s.name, !s.enabled),
      className: `w-10 h-6 rounded-full transition-colors relative ${s.enabled ? "bg-green-500" : "bg-gray-600"}`
    },
    /* @__PURE__ */ import_react.default.createElement("div", { className: `absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${s.enabled ? "left-5" : "left-1"}` })
  )))))), /* @__PURE__ */ import_react.default.createElement("div", { className: "bg-white/5 p-6 rounded-xl border border-white/10" }, /* @__PURE__ */ import_react.default.createElement("h2", { className: "text-xl font-bold mb-4" }, "Configuration"), /* @__PURE__ */ import_react.default.createElement("div", { className: "space-y-4" }, /* @__PURE__ */ import_react.default.createElement("div", null, /* @__PURE__ */ import_react.default.createElement("label", { className: "block text-sm text-gray-400 mb-1" }, "Min Confidence Score (0.0 - 1.0)"), /* @__PURE__ */ import_react.default.createElement(
    "input",
    {
      type: "number",
      step: "0.1",
      min: "0",
      max: "1",
      value: config.minScore,
      onChange: (e) => setConfig({ ...config, minScore: parseFloat(e.target.value) }),
      className: "w-full bg-black/20 border border-white/10 rounded p-2 text-white"
    }
  )), /* @__PURE__ */ import_react.default.createElement("div", null, /* @__PURE__ */ import_react.default.createElement("label", { className: "block text-sm text-gray-400 mb-1" }, "Max Open Positions"), /* @__PURE__ */ import_react.default.createElement(
    "input",
    {
      type: "number",
      min: "1",
      max: "20",
      value: config.maxOpenPositions,
      onChange: (e) => setConfig({ ...config, maxOpenPositions: parseInt(e.target.value) }),
      className: "w-full bg-black/20 border border-white/10 rounded p-2 text-white"
    }
  )), /* @__PURE__ */ import_react.default.createElement("div", null, /* @__PURE__ */ import_react.default.createElement("label", { className: "block text-sm text-gray-400 mb-1" }, "Allocation per Trade (0.0 - 1.0)"), /* @__PURE__ */ import_react.default.createElement(
    "input",
    {
      type: "number",
      step: "0.05",
      min: "0.01",
      max: "1.0",
      value: config.allocationPct,
      onChange: (e) => setConfig({ ...config, allocationPct: parseFloat(e.target.value) }),
      className: "w-full bg-black/20 border border-white/10 rounded p-2 text-white"
    }
  )), /* @__PURE__ */ import_react.default.createElement(
    "button",
    {
      onClick: updateConfig,
      className: "w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded"
    },
    "Update Config"
  )))), /* @__PURE__ */ import_react.default.createElement("div", { className: "bg-white/5 p-6 rounded-xl border border-white/10" }, /* @__PURE__ */ import_react.default.createElement("h2", { className: "text-xl font-bold mb-4" }, "Trade History"), /* @__PURE__ */ import_react.default.createElement("div", { className: "overflow-x-auto" }, /* @__PURE__ */ import_react.default.createElement("table", { className: "w-full text-left text-sm" }, /* @__PURE__ */ import_react.default.createElement("thead", null, /* @__PURE__ */ import_react.default.createElement("tr", { className: "text-gray-400 border-b border-white/10" }, /* @__PURE__ */ import_react.default.createElement("th", { className: "p-2" }, "Time"), /* @__PURE__ */ import_react.default.createElement("th", { className: "p-2" }, "Symbol"), /* @__PURE__ */ import_react.default.createElement("th", { className: "p-2" }, "Chain"), /* @__PURE__ */ import_react.default.createElement("th", { className: "p-2" }, "Entry"), /* @__PURE__ */ import_react.default.createElement("th", { className: "p-2" }, "Exit"), /* @__PURE__ */ import_react.default.createElement("th", { className: "p-2" }, "PnL"), /* @__PURE__ */ import_react.default.createElement("th", { className: "p-2" }, "Reason"))), /* @__PURE__ */ import_react.default.createElement("tbody", null, status.history && status.history.length > 0 ? status.history.map((t) => /* @__PURE__ */ import_react.default.createElement("tr", { key: t.id, className: "border-b border-white/5 hover:bg-white/5" }, /* @__PURE__ */ import_react.default.createElement("td", { className: "p-2" }, new Date(t.timestamp).toLocaleTimeString()), /* @__PURE__ */ import_react.default.createElement("td", { className: "p-2 font-bold" }, t.symbol), /* @__PURE__ */ import_react.default.createElement("td", { className: "p-2" }, t.chain), /* @__PURE__ */ import_react.default.createElement("td", { className: "p-2" }, "$", t.entryPrice.toFixed(4)), /* @__PURE__ */ import_react.default.createElement("td", { className: "p-2" }, "$", t.exitPrice.toFixed(4)), /* @__PURE__ */ import_react.default.createElement("td", { className: `p-2 font-bold ${t.pnl >= 0 ? "text-green-400" : "text-red-400"}` }, (t.pnl * 100).toFixed(2), "%"), /* @__PURE__ */ import_react.default.createElement("td", { className: "p-2 text-gray-400" }, t.reason))) : /* @__PURE__ */ import_react.default.createElement("tr", null, /* @__PURE__ */ import_react.default.createElement("td", { colSpan: 7, className: "p-4 text-center text-gray-500" }, "No closed trades yet")))))));
};

// plugins/degentrader/renderer/WalletSetup.tsx
var import_react2 = __toESM(require("react"));
var WalletSetup = ({ context }) => {
  const [wallets, setWallets] = (0, import_react2.useState)({});
  const [chain, setChain] = (0, import_react2.useState)("ETH");
  const [privateKey, setPrivateKey] = (0, import_react2.useState)("");
  const [label, setLabel] = (0, import_react2.useState)("");
  const [loading, setLoading] = (0, import_react2.useState)(false);
  const [message, setMessage] = (0, import_react2.useState)("");
  const fetchWallets = async () => {
    const result = await context.ipc.invoke("degentrader:get-wallets");
    setWallets(result);
  };
  (0, import_react2.useEffect)(() => {
    fetchWallets();
  }, []);
  const handleImport = async () => {
    if (!privateKey || !label) return;
    setLoading(true);
    setMessage("");
    try {
      const result = await context.ipc.invoke("degentrader:import-wallet", {
        chain,
        privateKey,
        label
      });
      if (result.success) {
        setMessage(`Wallet imported: ${result.address}`);
        setPrivateKey("");
        setLabel("");
        fetchWallets();
      } else {
        setMessage(`Error: ${result.error}`);
      }
    } catch (err) {
      setMessage(`Error: ${err.message}`);
    }
    setLoading(false);
  };
  return /* @__PURE__ */ import_react2.default.createElement("div", { className: "space-y-6" }, /* @__PURE__ */ import_react2.default.createElement("div", { className: "bg-white/5 p-6 rounded-xl border border-white/10" }, /* @__PURE__ */ import_react2.default.createElement("h2", { className: "text-xl font-bold mb-4" }, "Import Wallet"), /* @__PURE__ */ import_react2.default.createElement("div", { className: "space-y-4" }, /* @__PURE__ */ import_react2.default.createElement("div", null, /* @__PURE__ */ import_react2.default.createElement("label", { className: "block text-sm text-gray-400 mb-1" }, "Chain"), /* @__PURE__ */ import_react2.default.createElement(
    "select",
    {
      value: chain,
      onChange: (e) => setChain(e.target.value),
      className: "w-full bg-black/20 border border-white/10 rounded p-2 text-white"
    },
    /* @__PURE__ */ import_react2.default.createElement("option", { value: "ETH" }, "Ethereum"),
    /* @__PURE__ */ import_react2.default.createElement("option", { value: "SOL" }, "Solana"),
    /* @__PURE__ */ import_react2.default.createElement("option", { value: "BASE" }, "Base")
  )), /* @__PURE__ */ import_react2.default.createElement("div", null, /* @__PURE__ */ import_react2.default.createElement("label", { className: "block text-sm text-gray-400 mb-1" }, "Label"), /* @__PURE__ */ import_react2.default.createElement(
    "input",
    {
      type: "text",
      value: label,
      onChange: (e) => setLabel(e.target.value),
      placeholder: "My Main Wallet",
      className: "w-full bg-black/20 border border-white/10 rounded p-2 text-white"
    }
  )), /* @__PURE__ */ import_react2.default.createElement("div", null, /* @__PURE__ */ import_react2.default.createElement("label", { className: "block text-sm text-gray-400 mb-1" }, "Private Key"), /* @__PURE__ */ import_react2.default.createElement(
    "input",
    {
      type: "password",
      value: privateKey,
      onChange: (e) => setPrivateKey(e.target.value),
      placeholder: "0x...",
      className: "w-full bg-black/20 border border-white/10 rounded p-2 text-white"
    }
  )), /* @__PURE__ */ import_react2.default.createElement(
    "button",
    {
      onClick: handleImport,
      disabled: loading,
      className: "w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded"
    },
    loading ? "Importing..." : "Import Wallet"
  ), message && /* @__PURE__ */ import_react2.default.createElement("div", { className: `p-2 rounded text-sm ${message.startsWith("Error") ? "bg-red-500/20 text-red-400" : "bg-green-500/20 text-green-400"}` }, message))), /* @__PURE__ */ import_react2.default.createElement("div", { className: "bg-white/5 p-6 rounded-xl border border-white/10" }, /* @__PURE__ */ import_react2.default.createElement("h2", { className: "text-xl font-bold mb-4" }, "Your Wallets"), Object.entries(wallets).map(([chainName, chainWallets]) => /* @__PURE__ */ import_react2.default.createElement("div", { key: chainName, className: "mb-4" }, /* @__PURE__ */ import_react2.default.createElement("h3", { className: "text-sm font-bold text-gray-400 mb-2" }, chainName), /* @__PURE__ */ import_react2.default.createElement("div", { className: "space-y-2" }, chainWallets.length === 0 ? /* @__PURE__ */ import_react2.default.createElement("div", { className: "text-gray-500 text-sm italic" }, "No wallets added") : chainWallets.map((w) => /* @__PURE__ */ import_react2.default.createElement("div", { key: w.address, className: "bg-black/20 p-3 rounded flex justify-between items-center" }, /* @__PURE__ */ import_react2.default.createElement("div", null, /* @__PURE__ */ import_react2.default.createElement("div", { className: "font-medium" }, w.label), /* @__PURE__ */ import_react2.default.createElement("div", { className: "text-xs text-gray-400 font-mono" }, w.address.substring(0, 6), "...", w.address.substring(w.address.length - 4))))))))));
};

// plugins/degentrader/renderer/index.tsx
var activate = (context) => {
  console.log("[DegenTrader] Renderer activated");
  const MainPanel = () => {
    const [view, setView] = (0, import_react3.useState)("dashboard");
    return /* @__PURE__ */ import_react3.default.createElement("div", { className: "h-full flex flex-col bg-gray-900 text-white" }, /* @__PURE__ */ import_react3.default.createElement("div", { className: "flex border-b border-white/10 p-4" }, /* @__PURE__ */ import_react3.default.createElement("h1", { className: "text-xl font-bold mr-8" }, "Degen Trader \u{1F680}"), /* @__PURE__ */ import_react3.default.createElement("div", { className: "flex space-x-4" }, /* @__PURE__ */ import_react3.default.createElement(
      "button",
      {
        onClick: () => setView("dashboard"),
        className: `px-3 py-1 rounded ${view === "dashboard" ? "bg-blue-600" : "hover:bg-white/10"}`
      },
      "Dashboard"
    ), /* @__PURE__ */ import_react3.default.createElement(
      "button",
      {
        onClick: () => setView("wallets"),
        className: `px-3 py-1 rounded ${view === "wallets" ? "bg-blue-600" : "hover:bg-white/10"}`
      },
      "Wallets"
    ))), /* @__PURE__ */ import_react3.default.createElement("div", { className: "flex-1 overflow-auto p-4" }, view === "dashboard" ? /* @__PURE__ */ import_react3.default.createElement(Dashboard, { context }) : /* @__PURE__ */ import_react3.default.createElement(WalletSetup, { context })));
  };
  const SidebarIcon = () => {
    const { activeSidebarView, setActiveSidebarView } = context.useAppStore();
    const isActive = activeSidebarView === "degentrader";
    return /* @__PURE__ */ import_react3.default.createElement(
      "button",
      {
        className: `w-9 h-9 rounded-lg flex items-center justify-center transition-all ${isActive ? "bg-blue-600 text-white" : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"}`,
        onClick: () => setActiveSidebarView("degentrader"),
        title: "Degen Trader"
      },
      "\u{1F4C8}"
    );
  };
  context.registerComponent("sidebar:nav-item", {
    id: "degentrader-nav",
    component: SidebarIcon
  });
  context.registerComponent("sidebar:view:degentrader", {
    id: "degentrader-panel",
    component: MainPanel
  });
};
