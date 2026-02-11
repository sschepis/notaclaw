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

// plugins/wallet/renderer/index.tsx
var index_exports = {};
__export(index_exports, {
  activate: () => activate
});
module.exports = __toCommonJS(index_exports);
var import_react = __toESM(require("react"));
var WalletDashboard = ({ context }) => {
  const [balance, setBalance] = (0, import_react.useState)({ available: 0, staked: 0 });
  const { useAppStore } = context;
  (0, import_react.useEffect)(() => {
    const fetchBalance = async () => {
      try {
        const api = window.electronAPI;
        if (api && api.pluginInvokeTool) {
          const result = await api.pluginInvokeTool("get_wallet_balance", {});
          if (result) {
            setBalance(result);
          }
        } else {
          console.warn("pluginInvokeTool not available, using mock");
          setBalance({ available: 1250, staked: 5e3 });
        }
      } catch (e) {
        console.error("Failed to fetch balance", e);
        setBalance({ available: 1250, staked: 5e3 });
      }
    };
    fetchBalance();
  }, []);
  return /* @__PURE__ */ import_react.default.createElement("div", { className: "p-6 text-white h-full overflow-y-auto bg-gray-950" }, /* @__PURE__ */ import_react.default.createElement("h1", { className: "text-2xl font-bold mb-6 flex items-center space-x-2" }, /* @__PURE__ */ import_react.default.createElement("span", { className: "w-3 h-3 bg-blue-500 rounded-full" }), /* @__PURE__ */ import_react.default.createElement("span", null, "AlephNet Wallet")), /* @__PURE__ */ import_react.default.createElement("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-6 mb-8" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "bg-gray-800/50 border border-gray-700 p-6 rounded-xl backdrop-blur-sm" }, /* @__PURE__ */ import_react.default.createElement("h3", { className: "text-gray-400 text-sm uppercase tracking-wider mb-2" }, "Available Balance"), /* @__PURE__ */ import_react.default.createElement("div", { className: "flex items-baseline space-x-2" }, /* @__PURE__ */ import_react.default.createElement("p", { className: "text-4xl font-mono text-blue-400 font-bold" }, balance.available), /* @__PURE__ */ import_react.default.createElement("span", { className: "text-xl text-gray-500" }, "\u2135"))), /* @__PURE__ */ import_react.default.createElement("div", { className: "bg-gray-800/50 border border-gray-700 p-6 rounded-xl backdrop-blur-sm" }, /* @__PURE__ */ import_react.default.createElement("h3", { className: "text-gray-400 text-sm uppercase tracking-wider mb-2" }, "Staked (Magus Tier)"), /* @__PURE__ */ import_react.default.createElement("div", { className: "flex items-baseline space-x-2" }, /* @__PURE__ */ import_react.default.createElement("p", { className: "text-4xl font-mono text-purple-400 font-bold" }, balance.staked), /* @__PURE__ */ import_react.default.createElement("span", { className: "text-xl text-gray-500" }, "\u2135")), /* @__PURE__ */ import_react.default.createElement("div", { className: "mt-2 text-xs text-green-400 flex items-center" }, /* @__PURE__ */ import_react.default.createElement("span", { className: "mr-1" }, "\u25CF"), " Earning 5% APY"))), /* @__PURE__ */ import_react.default.createElement("div", { className: "space-y-4" }, /* @__PURE__ */ import_react.default.createElement("h3", { className: "text-lg font-medium text-gray-300" }, "Quick Actions"), /* @__PURE__ */ import_react.default.createElement("div", { className: "flex space-x-4" }, /* @__PURE__ */ import_react.default.createElement("button", { className: "bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors font-medium" }, "Send Tokens"), /* @__PURE__ */ import_react.default.createElement("button", { className: "bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg transition-colors font-medium" }, "Stake More"))), /* @__PURE__ */ import_react.default.createElement("div", { className: "mt-8" }, /* @__PURE__ */ import_react.default.createElement("h3", { className: "text-lg font-medium text-gray-300 mb-4" }, "Recent Transactions"), /* @__PURE__ */ import_react.default.createElement("div", { className: "bg-gray-900/50 rounded-xl border border-gray-800 overflow-hidden" }, [1, 2, 3].map((i) => /* @__PURE__ */ import_react.default.createElement("div", { key: i, className: "flex items-center justify-between p-4 border-b border-gray-800 last:border-0 hover:bg-gray-800/30 transition-colors" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "flex items-center space-x-3" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-gray-400" }, "\u2193"), /* @__PURE__ */ import_react.default.createElement("div", null, /* @__PURE__ */ import_react.default.createElement("p", { className: "text-sm font-medium text-gray-200" }, "Received from Node_Alpha"), /* @__PURE__ */ import_react.default.createElement("p", { className: "text-xs text-gray-500" }, "2 mins ago"))), /* @__PURE__ */ import_react.default.createElement("span", { className: "text-green-400 font-mono" }, "+50.00 \u2135"))))));
};
var activate = (context) => {
  console.log("Wallet Plugin Activated");
  const { useAppStore } = context;
  const WalletButton = () => {
    const { activeSidebarView, setActiveSidebarView } = useAppStore();
    const isActive = activeSidebarView === "wallet";
    return /* @__PURE__ */ import_react.default.createElement(
      "button",
      {
        className: `w-9 h-9 rounded-lg flex items-center justify-center transition-all ${isActive ? "bg-blue-600 text-white" : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"}`,
        onClick: () => setActiveSidebarView("wallet"),
        title: "Wallet"
      },
      "WAL"
    );
  };
  context.registerComponent("sidebar:nav-item", {
    id: "wallet-nav",
    component: WalletButton
  });
  context.registerComponent("sidebar:view:wallet", {
    id: "wallet-dashboard",
    component: () => /* @__PURE__ */ import_react.default.createElement(WalletDashboard, { context })
  });
};
