"use strict";
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

// plugins/reputation-manager/renderer/index.tsx
var index_exports = {};
__export(index_exports, {
  activate: () => activate
});
module.exports = __toCommonJS(index_exports);
var import_lucide_react = require("lucide-react");
var activate = (context) => {
  const React = context.React;
  const { useState, useEffect } = React;
  const ReputationPanel = () => {
    const [entities, setEntities] = useState({});
    const [selectedEntityId, setSelectedEntityId] = useState(null);
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(true);
    const [feedbackRating, setFeedbackRating] = useState(5);
    const [feedbackComment, setFeedbackComment] = useState("");
    const [feedbackCategory, setFeedbackCategory] = useState("General");
    const [submitting, setSubmitting] = useState(false);
    useEffect(() => {
      const fetchData = async () => {
        try {
          const [allEntities, currentSettings] = await Promise.all([
            context.ipc.invoke("reputation:get-all"),
            context.ipc.invoke("reputation:get-settings")
          ]);
          setEntities(allEntities);
          setSettings(currentSettings);
          const entityIds = Object.keys(allEntities);
          if (entityIds.length > 0 && !selectedEntityId) {
            setSelectedEntityId(entityIds[0]);
          }
        } catch (err) {
          console.error("Failed to load reputation data:", err);
        } finally {
          setLoading(false);
        }
      };
      fetchData();
      const handleUpdate = (event) => {
        setEntities((prev) => {
          const entity = prev[event.entityId];
          if (!entity) return prev;
          return {
            ...prev,
            [event.entityId]: {
              ...entity,
              score: event.newScore
              // Ideally we'd get the full updated entity or update history locally
              // For now, let's just update the score to trigger UI update
              // A full refetch might be safer for consistency
            }
          };
        });
        fetchData();
      };
      context.ipc.on("reputation:updated", handleUpdate);
      return () => {
      };
    }, []);
    const selectedEntity = selectedEntityId ? entities[selectedEntityId] : null;
    const handleSubmitFeedback = async (e) => {
      e.preventDefault();
      if (!selectedEntityId) return;
      setSubmitting(true);
      try {
        await context.ipc.invoke("reputation:submit-feedback", {
          entityId: selectedEntityId,
          score: feedbackRating,
          comment: feedbackComment,
          category: feedbackCategory,
          reviewerId: "user-interaction"
          // In a real app, this would be the current user's ID
        });
        setFeedbackComment("");
        setFeedbackRating(5);
      } catch (err) {
        console.error("Failed to submit feedback:", err);
      } finally {
        setSubmitting(false);
      }
    };
    if (loading) {
      return /* @__PURE__ */ React.createElement("div", { className: "p-4 text-white" }, "Loading reputation data...");
    }
    return /* @__PURE__ */ React.createElement("div", { className: "h-full flex flex-col p-4 text-white bg-gray-900" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between mb-6" }, /* @__PURE__ */ React.createElement("h2", { className: "text-xl font-bold flex items-center gap-2" }, /* @__PURE__ */ React.createElement(import_lucide_react.Shield, { className: "text-blue-400" }), " Reputation Manager"), settings && /* @__PURE__ */ React.createElement("div", { className: "text-xs text-gray-400" }, "Decay: ", settings.decayRate, "/day after ", settings.decayWindow, " days")), Object.keys(entities).length === 0 ? /* @__PURE__ */ React.createElement("div", { className: "text-center text-gray-400 mt-10" }, /* @__PURE__ */ React.createElement(import_lucide_react.Users, { className: "w-12 h-12 mx-auto mb-2 opacity-50" }), /* @__PURE__ */ React.createElement("p", null, "No entities tracked yet."), /* @__PURE__ */ React.createElement("p", { className: "text-xs mt-2" }, "Interact with peers or agents to generate reputation data.")) : /* @__PURE__ */ React.createElement("div", { className: "flex flex-1 gap-4 overflow-hidden" }, /* @__PURE__ */ React.createElement("div", { className: "w-1/3 border-r border-white/10 pr-4 overflow-y-auto" }, /* @__PURE__ */ React.createElement("h3", { className: "text-sm font-bold text-gray-400 mb-3 uppercase tracking-wider" }, "Entities"), /* @__PURE__ */ React.createElement("div", { className: "space-y-2" }, Object.values(entities).map((entity) => /* @__PURE__ */ React.createElement(
      "div",
      {
        key: entity.id,
        onClick: () => setSelectedEntityId(entity.id),
        className: `p-3 rounded-lg cursor-pointer transition-colors ${selectedEntityId === entity.id ? "bg-blue-600/20 border border-blue-500/50" : "bg-white/5 hover:bg-white/10 border border-transparent"}`
      },
      /* @__PURE__ */ React.createElement("div", { className: "font-bold text-sm truncate" }, entity.id),
      /* @__PURE__ */ React.createElement("div", { className: "flex justify-between items-center mt-1" }, /* @__PURE__ */ React.createElement("span", { className: "text-xs text-blue-300" }, entity.rank), /* @__PURE__ */ React.createElement("span", { className: "text-xs font-mono" }, Math.round(entity.score)))
    )))), /* @__PURE__ */ React.createElement("div", { className: "flex-1 flex flex-col overflow-hidden" }, selectedEntity ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "bg-white/5 p-6 rounded-lg mb-6 text-center border border-white/10 relative overflow-hidden" }, /* @__PURE__ */ React.createElement("div", { className: "absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500" }), /* @__PURE__ */ React.createElement("div", { className: "text-sm text-gray-400 mb-2" }, "Trust Score"), /* @__PURE__ */ React.createElement("div", { className: "text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500" }, Math.round(selectedEntity.score)), /* @__PURE__ */ React.createElement("div", { className: "text-sm text-blue-300 mt-2 font-medium" }, selectedEntity.rank), /* @__PURE__ */ React.createElement("div", { className: "mt-4 flex justify-center gap-2" }, selectedEntity.history.length > 1 && (() => {
      const last = selectedEntity.history[selectedEntity.history.length - 1].score;
      const prev = selectedEntity.history[selectedEntity.history.length - 2].score;
      const diff = last - prev;
      if (diff > 0) return /* @__PURE__ */ React.createElement("span", { className: "text-green-400 text-xs flex items-center gap-1" }, /* @__PURE__ */ React.createElement(import_lucide_react.TrendingUp, { size: 12 }), " +", diff.toFixed(1));
      if (diff < 0) return /* @__PURE__ */ React.createElement("span", { className: "text-red-400 text-xs flex items-center gap-1" }, /* @__PURE__ */ React.createElement(import_lucide_react.TrendingDown, { size: 12 }), " ", diff.toFixed(1));
      return /* @__PURE__ */ React.createElement("span", { className: "text-gray-400 text-xs flex items-center gap-1" }, /* @__PURE__ */ React.createElement(import_lucide_react.Minus, { size: 12 }), " Stable");
    })())), /* @__PURE__ */ React.createElement("div", { className: "flex-1 overflow-y-auto pr-2" }, /* @__PURE__ */ React.createElement("div", { className: "mb-6" }, /* @__PURE__ */ React.createElement("h3", { className: "text-sm font-bold text-gray-400 mb-3 uppercase tracking-wider" }, "Submit Feedback"), /* @__PURE__ */ React.createElement("form", { onSubmit: handleSubmitFeedback, className: "bg-white/5 p-4 rounded-lg border border-white/10" }, /* @__PURE__ */ React.createElement("div", { className: "flex gap-4 mb-3" }, /* @__PURE__ */ React.createElement("div", { className: "flex-1" }, /* @__PURE__ */ React.createElement("label", { className: "block text-xs text-gray-500 mb-1" }, "Rating"), /* @__PURE__ */ React.createElement("div", { className: "flex gap-1" }, [1, 2, 3, 4, 5].map((star) => /* @__PURE__ */ React.createElement(
      "button",
      {
        key: star,
        type: "button",
        onClick: () => setFeedbackRating(star),
        className: `text-lg focus:outline-none transition-transform hover:scale-110 ${star <= feedbackRating ? "text-yellow-400" : "text-gray-600"}`
      },
      "\u2605"
    )))), /* @__PURE__ */ React.createElement("div", { className: "flex-1" }, /* @__PURE__ */ React.createElement("label", { className: "block text-xs text-gray-500 mb-1" }, "Category"), /* @__PURE__ */ React.createElement(
      "select",
      {
        value: feedbackCategory,
        onChange: (e) => setFeedbackCategory(e.target.value),
        className: "w-full bg-black/20 border border-white/10 rounded px-2 py-1 text-sm text-white focus:border-blue-500 outline-none"
      },
      /* @__PURE__ */ React.createElement("option", { value: "General" }, "General"),
      /* @__PURE__ */ React.createElement("option", { value: "Performance" }, "Performance"),
      /* @__PURE__ */ React.createElement("option", { value: "Reliability" }, "Reliability"),
      /* @__PURE__ */ React.createElement("option", { value: "Communication" }, "Communication")
    ))), /* @__PURE__ */ React.createElement("div", { className: "mb-3" }, /* @__PURE__ */ React.createElement("label", { className: "block text-xs text-gray-500 mb-1" }, "Comment"), /* @__PURE__ */ React.createElement(
      "textarea",
      {
        value: feedbackComment,
        onChange: (e) => setFeedbackComment(e.target.value),
        className: "w-full bg-black/20 border border-white/10 rounded p-2 text-sm text-white focus:border-blue-500 outline-none resize-none h-20",
        placeholder: "Describe your experience...",
        required: true
      }
    )), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "submit",
        disabled: submitting,
        className: "w-full bg-blue-600 hover:bg-blue-500 text-white py-2 rounded text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
      },
      submitting ? "Submitting..." : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(import_lucide_react.Send, { size: 14 }), " Submit Feedback")
    ))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "flex justify-between items-center mb-3" }, /* @__PURE__ */ React.createElement("h3", { className: "text-sm font-bold text-gray-400 uppercase tracking-wider" }, "Recent Feedback"), /* @__PURE__ */ React.createElement(
      "select",
      {
        className: "bg-black/20 border border-white/10 rounded px-2 py-1 text-xs text-gray-400 focus:border-blue-500 outline-none",
        onChange: (e) => {
          console.log("Filter by:", e.target.value);
        }
      },
      /* @__PURE__ */ React.createElement("option", { value: "all" }, "All Categories"),
      /* @__PURE__ */ React.createElement("option", { value: "General" }, "General"),
      /* @__PURE__ */ React.createElement("option", { value: "Performance" }, "Performance"),
      /* @__PURE__ */ React.createElement("option", { value: "Reliability" }, "Reliability"),
      /* @__PURE__ */ React.createElement("option", { value: "Communication" }, "Communication"),
      /* @__PURE__ */ React.createElement("option", { value: "DSN" }, "DSN")
    )), /* @__PURE__ */ React.createElement("div", { className: "space-y-3" }, selectedEntity.feedback.length === 0 ? /* @__PURE__ */ React.createElement("div", { className: "text-center text-gray-500 py-4 text-sm" }, "No feedback yet.") : selectedEntity.feedback.map((item) => /* @__PURE__ */ React.createElement("div", { key: item.id, className: "bg-white/5 p-3 rounded-lg border border-white/5 hover:bg-white/10 transition-colors group" }, /* @__PURE__ */ React.createElement("div", { className: "flex justify-between items-start mb-1" }, /* @__PURE__ */ React.createElement("span", { className: "font-bold text-sm text-blue-300" }, item.reviewerId), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement("span", { className: "text-xs text-gray-500" }, new Date(item.timestamp).toLocaleDateString()), /* @__PURE__ */ React.createElement("button", { className: "opacity-0 group-hover:opacity-100 text-xs text-red-400 hover:text-red-300 transition-opacity", title: "Report this feedback" }, "Report"))), /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between mb-1" }, /* @__PURE__ */ React.createElement("div", { className: "flex text-yellow-400 text-xs" }, Array.from({ length: 5 }).map((_, i) => /* @__PURE__ */ React.createElement("span", { key: i, className: i < item.score ? "text-yellow-400" : "text-gray-700" }, "\u2605"))), /* @__PURE__ */ React.createElement("span", { className: "text-xs bg-white/10 px-2 py-0.5 rounded text-gray-400" }, item.category)), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-gray-300 mt-1" }, item.comment))))))) : /* @__PURE__ */ React.createElement("div", { className: "flex-1 flex items-center justify-center text-gray-500" }, "Select an entity to view details"))));
  };
  const ReputationManagerButton = () => {
    const { activeSidebarView, setActiveSidebarView } = context.useAppStore();
    const isActive = activeSidebarView === "reputation-manager";
    return /* @__PURE__ */ React.createElement(
      "button",
      {
        className: `w-9 h-9 rounded-lg flex items-center justify-center transition-all ${isActive ? "bg-blue-600 text-white" : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"}`,
        onClick: () => setActiveSidebarView("reputation-manager"),
        title: "Reputation Manager"
      },
      /* @__PURE__ */ React.createElement(import_lucide_react.Shield, { size: 20, strokeWidth: 1.5 })
    );
  };
  context.registerComponent("sidebar:nav-item", {
    id: "reputation-manager-nav",
    component: ReputationManagerButton
  });
  context.registerComponent("sidebar:view:reputation-manager", {
    id: "reputation-manager-panel",
    component: ReputationPanel
  });
};
