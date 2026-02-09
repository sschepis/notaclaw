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

// plugins/governance/renderer/index.tsx
var index_exports = {};
__export(index_exports, {
  activate: () => activate,
  deactivate: () => deactivate
});
module.exports = __toCommonJS(index_exports);
var import_react2 = __toESM(require("react"));
var import_lucide_react = require("lucide-react");

// plugins/governance/renderer/CoherencePanel.tsx
var import_react = __toESM(require("react"));
var Icon = ({ d, className }) => /* @__PURE__ */ import_react.default.createElement("svg", { className, fill: "none", stroke: "currentColor", viewBox: "0 0 24 24" }, /* @__PURE__ */ import_react.default.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d }));
var Shield = ({ className }) => /* @__PURE__ */ import_react.default.createElement(Icon, { className, d: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" });
var CheckCircle2 = ({ className }) => /* @__PURE__ */ import_react.default.createElement(Icon, { className, d: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" });
var XCircle = ({ className }) => /* @__PURE__ */ import_react.default.createElement(Icon, { className, d: "M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" });
var AlertCircle = ({ className }) => /* @__PURE__ */ import_react.default.createElement(Icon, { className, d: "M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" });
var Plus = ({ className }) => /* @__PURE__ */ import_react.default.createElement(Icon, { className, d: "M12 4v16m8-8H4" });
var Eye = ({ className }) => /* @__PURE__ */ import_react.default.createElement(Icon, { className, d: "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" });
var Link2 = ({ className }) => /* @__PURE__ */ import_react.default.createElement(Icon, { className, d: "M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" });
var BookOpen = ({ className }) => /* @__PURE__ */ import_react.default.createElement(Icon, { className, d: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" });
var Button = ({ children, onClick, className, disabled, size }) => /* @__PURE__ */ import_react.default.createElement(
  "button",
  {
    onClick,
    disabled,
    className: `inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 ${size === "sm" ? "h-8 px-3 text-xs" : "h-10 px-4 py-2 text-sm"} ${className}`
  },
  children
);
var CoherencePanel = ({ context }) => {
  const { useAlephStore } = context;
  const {
    coherence: { claims, verificationTasks, syntheses },
    submitClaim,
    verifyClaim,
    loadVerificationTasks,
    claimTask,
    createSynthesis
  } = useAlephStore();
  const [tab, setTab] = (0, import_react.useState)("claims");
  const [newStatement, setNewStatement] = (0, import_react.useState)("");
  const [synthTitle, setSynthTitle] = (0, import_react.useState)("");
  const [selectedClaimIds, setSelectedClaimIds] = (0, import_react.useState)([]);
  const [showSubmit, setShowSubmit] = (0, import_react.useState)(false);
  (0, import_react.useEffect)(() => {
    loadVerificationTasks();
  }, []);
  const handleSubmitClaim = async () => {
    if (!newStatement.trim()) return;
    await submitClaim(newStatement.trim());
    setNewStatement("");
    setShowSubmit(false);
  };
  const handleVerify = async (claimId, result) => {
    await verifyClaim(claimId, result, { method: "manual_review" });
  };
  const handleCreateSynthesis = async () => {
    if (!synthTitle.trim() || selectedClaimIds.length === 0) return;
    await createSynthesis(synthTitle, selectedClaimIds);
    setSynthTitle("");
    setSelectedClaimIds([]);
  };
  const toggleClaimSelection = (id) => {
    setSelectedClaimIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };
  const statusIcon = (status) => {
    if (status === "VERIFIED") return /* @__PURE__ */ import_react.default.createElement(CheckCircle2, { className: "w-3 h-3 text-emerald-400" });
    if (status === "REFUTED") return /* @__PURE__ */ import_react.default.createElement(XCircle, { className: "w-3 h-3 text-red-400" });
    return /* @__PURE__ */ import_react.default.createElement(AlertCircle, { className: "w-3 h-3 text-amber-400" });
  };
  const tabs = [
    { id: "claims", label: "Claims", count: claims.length },
    { id: "tasks", label: "Tasks", count: verificationTasks.filter((t) => t.status === "OPEN").length },
    { id: "syntheses", label: "Syntheses", count: syntheses.length }
  ];
  return /* @__PURE__ */ import_react.default.createElement("div", { className: "h-full flex flex-col text-white" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "flex border-b border-white/5 bg-white/5" }, tabs.map((t) => /* @__PURE__ */ import_react.default.createElement(
    "button",
    {
      key: t.id,
      onClick: () => setTab(t.id),
      className: `flex-1 py-2.5 text-xs font-medium transition-colors relative ${tab === t.id ? "text-blue-400" : "text-gray-500 hover:text-gray-300"}`
    },
    t.label,
    " ",
    t.count > 0 && /* @__PURE__ */ import_react.default.createElement("span", { className: "ml-1 text-[10px] opacity-60" }, "(", t.count, ")"),
    tab === t.id && /* @__PURE__ */ import_react.default.createElement("div", { className: "absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" })
  ))), /* @__PURE__ */ import_react.default.createElement("div", { className: "flex-1 overflow-y-auto p-3 space-y-2" }, tab === "claims" && /* @__PURE__ */ import_react.default.createElement(import_react.default.Fragment, null, /* @__PURE__ */ import_react.default.createElement("div", { className: "flex justify-between items-center mb-2" }, /* @__PURE__ */ import_react.default.createElement("h4", { className: "text-[10px] uppercase tracking-wider text-gray-500 font-bold" }, "Coherence Claims"), /* @__PURE__ */ import_react.default.createElement(Button, { size: "sm", onClick: () => setShowSubmit(!showSubmit), className: "h-6 text-[10px] bg-blue-600 px-2 text-white" }, /* @__PURE__ */ import_react.default.createElement(Plus, { className: "w-3 h-3 mr-1" }), " Submit")), showSubmit && /* @__PURE__ */ import_react.default.createElement("div", { className: "overflow-hidden mb-3" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "p-3 bg-blue-900/10 rounded-lg border border-blue-500/10 space-y-2 mb-3" }, /* @__PURE__ */ import_react.default.createElement(
    "textarea",
    {
      value: newStatement,
      onChange: (e) => setNewStatement(e.target.value),
      placeholder: "Enter a claim statement for verification...",
      className: "w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500 h-20 resize-none focus:outline-none focus:border-blue-500/50"
    }
  ), /* @__PURE__ */ import_react.default.createElement("div", { className: "flex gap-2" }, /* @__PURE__ */ import_react.default.createElement(Button, { size: "sm", onClick: handleSubmitClaim, disabled: !newStatement.trim(), className: "h-6 text-[10px] bg-blue-600 text-white" }, "Submit Claim"), /* @__PURE__ */ import_react.default.createElement(Button, { size: "sm", onClick: () => setShowSubmit(false), className: "h-6 text-[10px] bg-gray-700 text-white" }, "Cancel")))), claims.length === 0 ? /* @__PURE__ */ import_react.default.createElement("div", { className: "text-center py-8 text-gray-500 text-xs" }, /* @__PURE__ */ import_react.default.createElement(Shield, { className: "w-6 h-6 mx-auto mb-2 opacity-40" }), /* @__PURE__ */ import_react.default.createElement("p", null, "No claims submitted yet.")) : claims.map((claim, i) => /* @__PURE__ */ import_react.default.createElement(
    "div",
    {
      key: claim.id,
      className: `p-3 rounded-xl border transition-colors ${selectedClaimIds.includes(claim.id) ? "border-blue-500/30 bg-blue-900/10" : "border-white/5 bg-white/5 hover:border-white/10"}`
    },
    /* @__PURE__ */ import_react.default.createElement("div", { className: "flex items-start gap-2" }, /* @__PURE__ */ import_react.default.createElement("button", { onClick: () => toggleClaimSelection(claim.id), className: "mt-0.5 shrink-0" }, statusIcon(claim.status)), /* @__PURE__ */ import_react.default.createElement("div", { className: "flex-1 min-w-0" }, /* @__PURE__ */ import_react.default.createElement("p", { className: "text-xs text-gray-200" }, claim.statement), /* @__PURE__ */ import_react.default.createElement("div", { className: "flex items-center gap-3 mt-1.5 text-[9px] text-gray-500" }, /* @__PURE__ */ import_react.default.createElement("span", { className: `px-1.5 py-0.5 rounded-full font-medium ${claim.status === "VERIFIED" ? "bg-emerald-500/10 text-emerald-400" : claim.status === "REFUTED" ? "bg-red-500/10 text-red-400" : "bg-amber-500/10 text-amber-400"}` }, claim.status), /* @__PURE__ */ import_react.default.createElement("span", null, "Score: ", (claim.consensusScore * 100).toFixed(0), "%"), /* @__PURE__ */ import_react.default.createElement("span", null, claim.verificationCount, " verifications"))), /* @__PURE__ */ import_react.default.createElement("div", { className: "flex gap-1 shrink-0" }, /* @__PURE__ */ import_react.default.createElement("button", { onClick: () => handleVerify(claim.id, "VERIFIED"), title: "Verify", className: "p-1 hover:bg-emerald-500/10 rounded text-gray-600 hover:text-emerald-400" }, /* @__PURE__ */ import_react.default.createElement(CheckCircle2, { className: "w-3.5 h-3.5" })), /* @__PURE__ */ import_react.default.createElement("button", { onClick: () => handleVerify(claim.id, "REFUTED"), title: "Refute", className: "p-1 hover:bg-red-500/10 rounded text-gray-600 hover:text-red-400" }, /* @__PURE__ */ import_react.default.createElement(XCircle, { className: "w-3.5 h-3.5" }))))
  )), selectedClaimIds.length >= 2 && /* @__PURE__ */ import_react.default.createElement("div", { className: "p-3 bg-purple-900/10 rounded-lg border border-purple-500/10 space-y-2 mt-3" }, /* @__PURE__ */ import_react.default.createElement("h4", { className: "text-xs font-medium text-purple-400 flex items-center gap-1" }, /* @__PURE__ */ import_react.default.createElement(BookOpen, { className: "w-3 h-3" }), " Create Synthesis (", selectedClaimIds.length, " claims)"), /* @__PURE__ */ import_react.default.createElement(
    "input",
    {
      value: synthTitle,
      onChange: (e) => setSynthTitle(e.target.value),
      placeholder: "Synthesis title...",
      className: "w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white"
    }
  ), /* @__PURE__ */ import_react.default.createElement(Button, { size: "sm", onClick: handleCreateSynthesis, disabled: !synthTitle.trim(), className: "h-6 text-[10px] bg-purple-600 text-white" }, "Create"))), tab === "tasks" && (verificationTasks.length === 0 ? /* @__PURE__ */ import_react.default.createElement("div", { className: "text-center py-8 text-gray-500 text-xs" }, /* @__PURE__ */ import_react.default.createElement(Eye, { className: "w-6 h-6 mx-auto mb-2 opacity-40" }), /* @__PURE__ */ import_react.default.createElement("p", null, "No verification tasks available.")) : verificationTasks.map((task, i) => /* @__PURE__ */ import_react.default.createElement(
    "div",
    {
      key: task.id,
      className: "p-3 bg-white/5 rounded-xl border border-white/5"
    },
    /* @__PURE__ */ import_react.default.createElement("div", { className: "flex items-center justify-between mb-1" }, /* @__PURE__ */ import_react.default.createElement("span", { className: `text-[9px] px-1.5 py-0.5 rounded-full font-medium ${task.status === "OPEN" ? "bg-blue-500/10 text-blue-400" : task.status === "CLAIMED" ? "bg-amber-500/10 text-amber-400" : "bg-emerald-500/10 text-emerald-400"}` }, task.status), /* @__PURE__ */ import_react.default.createElement("span", { className: "text-[10px] text-emerald-400 font-mono" }, "+", task.reward, "\u2135")),
    /* @__PURE__ */ import_react.default.createElement("p", { className: "text-xs text-gray-200 mb-1" }, task.claimStatement || "Claim verification task"),
    /* @__PURE__ */ import_react.default.createElement("div", { className: "flex items-center justify-between text-[9px] text-gray-500" }, /* @__PURE__ */ import_react.default.createElement("span", null, task.type), task.status === "OPEN" && /* @__PURE__ */ import_react.default.createElement(Button, { size: "sm", onClick: () => claimTask(task.id), className: "h-5 text-[9px] bg-blue-600 px-1.5 text-white" }, "Claim"))
  ))), tab === "syntheses" && (syntheses.length === 0 ? /* @__PURE__ */ import_react.default.createElement("div", { className: "text-center py-8 text-gray-500 text-xs" }, /* @__PURE__ */ import_react.default.createElement(Link2, { className: "w-6 h-6 mx-auto mb-2 opacity-40" }), /* @__PURE__ */ import_react.default.createElement("p", null, "No syntheses created yet.")) : syntheses.map((s, i) => /* @__PURE__ */ import_react.default.createElement(
    "div",
    {
      key: s.id,
      className: "p-3 bg-white/5 rounded-xl border border-white/5"
    },
    /* @__PURE__ */ import_react.default.createElement("h4", { className: "text-sm font-medium text-white mb-1" }, s.title),
    /* @__PURE__ */ import_react.default.createElement("div", { className: "flex gap-2 text-[10px] text-gray-500" }, /* @__PURE__ */ import_react.default.createElement("span", { className: "px-1.5 py-0.5 bg-purple-500/10 text-purple-400 rounded-full" }, s.status), /* @__PURE__ */ import_react.default.createElement("span", null, s.acceptedClaimIds.length, " claims"), /* @__PURE__ */ import_react.default.createElement("span", null, new Date(s.timestamp).toLocaleDateString()))
  )))));
};

// plugins/governance/renderer/index.tsx
var activate = (context) => {
  console.log("[Governance Console] Renderer activated");
  const { ui } = context;
  const cleanupNav = ui.registerNavigation({
    id: "governance-nav",
    label: "Governance",
    icon: import_lucide_react.Scale,
    view: {
      id: "governance-panel",
      name: "Governance Console",
      icon: import_lucide_react.Scale,
      component: () => /* @__PURE__ */ import_react2.default.createElement(CoherencePanel, { context })
    },
    order: 400
  });
  context._cleanups = [cleanupNav];
};
var deactivate = (context) => {
  console.log("[Governance Console] Renderer deactivated");
  if (context._cleanups) {
    context._cleanups.forEach((cleanup) => cleanup());
  }
};
