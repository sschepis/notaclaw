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

// plugins/planman/renderer/index.tsx
var index_exports = {};
__export(index_exports, {
  activate: () => activate,
  deactivate: () => deactivate
});
module.exports = __toCommonJS(index_exports);
var import_react = require("react");
var import_lucide_react = require("lucide-react");

// plugins/planman/renderer/store.ts
function createPlanmanStore(create, ipcInvoke) {
  return create((set, get) => ({
    // Initial state
    projects: [],
    activeProject: null,
    healthReport: null,
    activityFeed: [],
    settings: {
      autoAssign: true,
      autoReplan: false,
      checkInterval: "*/30 * * * *",
      defaultAgentIds: [],
      maxConcurrentTasks: 3,
      notifyOnMilestone: true
    },
    selectedTaskId: null,
    activeView: "list",
    isLoading: false,
    error: null,
    // Actions
    loadProjects: async () => {
      set({ isLoading: true, error: null });
      try {
        const projects = await ipcInvoke("planman:project:list", {});
        set({ projects, isLoading: false });
      } catch (err) {
        set({ error: err.message || "Failed to load projects", isLoading: false });
      }
    },
    loadProject: async (projectId) => {
      set({ isLoading: true, error: null });
      try {
        const project = await ipcInvoke("planman:project:get", { projectId });
        set({ activeProject: project, isLoading: false });
      } catch (err) {
        set({ error: err.message || "Failed to load project", isLoading: false });
      }
    },
    createProject: async (name, description, goals) => {
      set({ isLoading: true, error: null });
      try {
        const project = await ipcInvoke("planman:project:create", { name, description, goals });
        const { projects } = get();
        set({
          projects: [...projects, { id: project.id, name: project.name, status: project.status, createdAt: project.createdAt, updatedAt: project.updatedAt }],
          activeProject: project,
          isLoading: false
        });
        return project;
      } catch (err) {
        set({ error: err.message || "Failed to create project", isLoading: false });
        throw err;
      }
    },
    deleteProject: async (projectId) => {
      try {
        await ipcInvoke("planman:project:delete", { projectId });
        const { projects, activeProject } = get();
        set({
          projects: projects.filter((p) => p.id !== projectId),
          activeProject: activeProject?.id === projectId ? null : activeProject
        });
      } catch (err) {
        set({ error: err.message || "Failed to delete project" });
      }
    },
    generatePlan: async (projectId, constraints) => {
      set({ isLoading: true, error: null });
      try {
        const plan = await ipcInvoke("planman:project:plan", { projectId, constraints });
        const { activeProject } = get();
        if (activeProject && activeProject.id === projectId) {
          set({ activeProject: { ...activeProject, plan }, isLoading: false });
        } else {
          set({ isLoading: false });
        }
      } catch (err) {
        set({ error: err.message || "Failed to generate plan", isLoading: false });
      }
    },
    executePlan: async (projectId) => {
      try {
        await ipcInvoke("planman:project:execute", { projectId });
        const project = await ipcInvoke("planman:project:get", { projectId });
        set({ activeProject: project });
      } catch (err) {
        set({ error: err.message || "Failed to execute plan" });
      }
    },
    pauseProject: async (projectId) => {
      try {
        await ipcInvoke("planman:project:pause", { projectId });
        const project = await ipcInvoke("planman:project:get", { projectId });
        set({ activeProject: project });
      } catch (err) {
        set({ error: err.message || "Failed to pause project" });
      }
    },
    replanProject: async (projectId, reason) => {
      set({ isLoading: true, error: null });
      try {
        await ipcInvoke("planman:project:replan", { projectId, reason });
        const project = await ipcInvoke("planman:project:get", { projectId });
        set({ activeProject: project, isLoading: false });
      } catch (err) {
        set({ error: err.message || "Failed to re-plan project", isLoading: false });
      }
    },
    updateTask: async (projectId, taskId, updates) => {
      try {
        await ipcInvoke("planman:task:update", { projectId, taskId, ...updates });
        const project = await ipcInvoke("planman:project:get", { projectId });
        set({ activeProject: project });
      } catch (err) {
        set({ error: err.message || "Failed to update task" });
      }
    },
    assignTask: async (projectId, taskId, agentId) => {
      try {
        await ipcInvoke("planman:task:assign", { projectId, taskId, agentId });
        const project = await ipcInvoke("planman:project:get", { projectId });
        set({ activeProject: project });
      } catch (err) {
        set({ error: err.message || "Failed to assign task" });
      }
    },
    searchTasks: async (query) => {
      try {
        return await ipcInvoke("planman:task:search", { query });
      } catch (err) {
        set({ error: err.message || "Search failed" });
        return [];
      }
    },
    getReport: async (projectId) => {
      set({ isLoading: true, error: null });
      try {
        const report = await ipcInvoke("planman:project:report", { projectId });
        set({ healthReport: report, isLoading: false });
      } catch (err) {
        set({ error: err.message || "Failed to get report", isLoading: false });
      }
    },
    loadSettings: async () => {
      try {
        const settings = await ipcInvoke("planman:settings:get", {});
        set({ settings });
      } catch (err) {
        set({ error: err.message || "Failed to load settings" });
      }
    },
    updateSettings: async (updates) => {
      try {
        const settings = await ipcInvoke("planman:settings:update", updates);
        set({ settings });
      } catch (err) {
        set({ error: err.message || "Failed to update settings" });
      }
    },
    selectTask: (taskId) => {
      set({ selectedTaskId: taskId });
    },
    setActiveView: (view) => {
      set({ activeView: view });
    },
    addActivity: (entry) => {
      const { activityFeed } = get();
      set({ activityFeed: [entry, ...activityFeed].slice(0, 100) });
    }
  }));
}

// plugins/planman/renderer/index.tsx
var import_jsx_runtime = require("react/jsx-runtime");
var store = null;
var activate = (context) => {
  console.log("[planman] Renderer activated");
  const { ui, useAppStore } = context;
  const ipcInvoke = (channel, data) => {
    return context.ipc?.invoke?.(channel, data) ?? Promise.reject("IPC not available");
  };
  const zustandCreate = context.zustand?.create || ((fn) => {
    let state = {};
    const listeners = /* @__PURE__ */ new Set();
    const get = () => state;
    const set = (partial) => {
      state = typeof partial === "function" ? { ...state, ...partial(state) } : { ...state, ...partial };
      listeners.forEach((l) => l());
    };
    state = fn(set, get);
    const useStore = (selector) => {
      const [, forceUpdate] = (0, import_react.useState)(0);
      (0, import_react.useEffect)(() => {
        const listener = () => forceUpdate((n) => n + 1);
        listeners.add(listener);
        return () => {
          listeners.delete(listener);
        };
      }, []);
      return selector ? selector(state) : state;
    };
    useStore.getState = get;
    useStore.setState = set;
    return useStore;
  });
  store = createPlanmanStore(zustandCreate, ipcInvoke);
  if (context.ipc) {
    context.ipc.on("planman:task:statusChanged", (event) => {
      const s = store.getState();
      s.addActivity({
        id: Date.now().toString(),
        timestamp: Date.now(),
        projectId: event.projectId,
        projectName: "",
        type: "task_status",
        message: `Task status: ${event.oldStatus} \u2192 ${event.newStatus}`
      });
      if (s.activeProject?.id === event.projectId) {
        s.loadProject(event.projectId);
      }
    });
    context.ipc.on("planman:project:healthUpdate", (report) => {
      const s = store.getState();
      if (s.activeProject?.id === report.projectId) {
        store.setState({ healthReport: report });
      }
      s.addActivity({
        id: Date.now().toString(),
        timestamp: Date.now(),
        projectId: report.projectId,
        projectName: "",
        type: "health",
        message: `Health: ${report.overallHealth} (${report.completionPercentage}% complete)`
      });
    });
    context.ipc.on("planman:milestone:reached", (event) => {
      const s = store.getState();
      s.addActivity({
        id: Date.now().toString(),
        timestamp: Date.now(),
        projectId: event.projectId,
        projectName: "",
        type: "milestone",
        message: `\u{1F3AF} Milestone reached: ${event.name}`
      });
    });
  }
  const StatusBadge = ({ status }) => {
    const colors = {
      planning: "bg-blue-500/20 text-blue-400",
      active: "bg-green-500/20 text-green-400",
      paused: "bg-yellow-500/20 text-yellow-400",
      completed: "bg-emerald-500/20 text-emerald-400",
      archived: "bg-gray-500/20 text-gray-400",
      pending: "bg-gray-500/20 text-gray-400",
      ready: "bg-blue-500/20 text-blue-400",
      assigned: "bg-purple-500/20 text-purple-400",
      in_progress: "bg-yellow-500/20 text-yellow-400",
      blocked: "bg-red-500/20 text-red-400",
      review: "bg-orange-500/20 text-orange-400",
      done: "bg-green-500/20 text-green-400",
      cancelled: "bg-gray-500/20 text-gray-500"
    };
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: `px-2 py-0.5 rounded-full text-[10px] font-medium uppercase ${colors[status] || "bg-gray-500/20 text-gray-400"}`, children: status.replace("_", " ") });
  };
  const PriorityBadge = ({ priority }) => {
    const colors = {
      critical: "text-red-400",
      high: "text-orange-400",
      medium: "text-yellow-400",
      low: "text-gray-400"
    };
    return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: `text-[10px] font-medium ${colors[priority]}`, children: [
      priority === "critical" ? "\u{1F534}" : priority === "high" ? "\u{1F7E0}" : priority === "medium" ? "\u{1F7E1}" : "\u26AA",
      " ",
      priority
    ] });
  };
  const ProgressBar = ({ percentage }) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "w-full h-1.5 bg-gray-700 rounded-full overflow-hidden", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    "div",
    {
      className: `h-full rounded-full transition-all duration-300 ${percentage === 100 ? "bg-green-500" : percentage > 60 ? "bg-blue-500" : percentage > 30 ? "bg-yellow-500" : "bg-red-500"}`,
      style: { width: `${Math.min(100, percentage)}%` }
    }
  ) });
  const TaskCard = ({ task, onClick }) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
    "div",
    {
      onClick,
      className: "p-3 bg-[#2a2a2a] border border-gray-700 rounded-lg cursor-pointer hover:border-gray-500 transition-colors",
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex items-start justify-between mb-1", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h4", { className: "text-sm font-medium text-white truncate flex-1", children: task.title }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PriorityBadge, { priority: task.priority })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "text-xs text-gray-400 line-clamp-2 mb-2", children: task.description }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex items-center justify-between", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusBadge, { status: task.status }),
          task.estimatedEffort && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "text-[10px] text-gray-500 flex items-center gap-1", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_lucide_react.Clock, { size: 10 }),
            " ",
            task.estimatedEffort
          ] })
        ] }),
        task.tags.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "flex flex-wrap gap-1 mt-2", children: task.tags.slice(0, 3).map((tag) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "px-1.5 py-0.5 bg-gray-700 rounded text-[10px] text-gray-300", children: tag }, tag)) })
      ]
    }
  );
  const TaskDetailModal = ({ task, projectId, onClose }) => {
    const [notes, setNotes] = (0, import_react.useState)("");
    const handleStatusChange = async (newStatus) => {
      await store.getState().updateTask(projectId, task.id, { status: newStatus });
    };
    const handleAddNote = async () => {
      if (!notes.trim()) return;
      await store.getState().updateTask(projectId, task.id, { notes: notes.trim() });
      setNotes("");
    };
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4", onClick: onClose, children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "bg-[#1e1e1e] border border-gray-700 rounded-xl w-full max-w-2xl max-h-[80vh] overflow-y-auto", onClick: (e) => e.stopPropagation(), children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "p-4 border-b border-gray-700 flex justify-between items-start", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { className: "text-lg font-semibold text-white", children: task.title }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex items-center gap-2 mt-1", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusBadge, { status: task.status }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PriorityBadge, { priority: task.priority }),
            task.estimatedEffort && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "text-xs text-gray-400", children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_lucide_react.Clock, { size: 12, className: "inline mr-1" }),
              task.estimatedEffort
            ] })
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { onClick: onClose, className: "text-gray-400 hover:text-white", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_lucide_react.X, { size: 18 }) })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "p-4 space-y-4", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h4", { className: "text-xs font-semibold text-gray-400 uppercase mb-1", children: "Description" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "text-sm text-gray-200", children: task.description || "No description" })
        ] }),
        task.acceptanceCriteria.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h4", { className: "text-xs font-semibold text-gray-400 uppercase mb-1", children: "Acceptance Criteria" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", { className: "space-y-1", children: task.acceptanceCriteria.map((c, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { className: "text-sm text-gray-300 flex items-start gap-2", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_lucide_react.CheckCircle, { size: 14, className: "text-gray-500 mt-0.5 flex-shrink-0" }),
            c
          ] }, i)) })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h4", { className: "text-xs font-semibold text-gray-400 uppercase mb-1", children: "Update Status" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "flex flex-wrap gap-2", children: ["ready", "in_progress", "review", "done", "blocked", "cancelled"].map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "button",
            {
              onClick: () => handleStatusChange(s),
              disabled: task.status === s,
              className: `px-2 py-1 rounded text-xs ${task.status === s ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"}`,
              children: s.replace("_", " ")
            },
            s
          )) })
        ] }),
        task.dependsOn.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h4", { className: "text-xs font-semibold text-gray-400 uppercase mb-1", children: "Dependencies" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "flex flex-wrap gap-1", children: task.dependsOn.map((dep) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "px-2 py-0.5 bg-gray-700 rounded text-xs text-gray-300", children: dep }, dep)) })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h4", { className: "text-xs font-semibold text-gray-400 uppercase mb-1", children: [
            "Notes (",
            task.notes.length,
            ")"
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "space-y-2 max-h-40 overflow-y-auto mb-2", children: task.notes.map((note, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "p-2 bg-[#2a2a2a] rounded text-xs", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex justify-between mb-1", children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "text-gray-400 font-medium", children: note.author }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "text-gray-500", children: new Date(note.timestamp).toLocaleString() })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "text-gray-300", children: note.content })
          ] }, i)) }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex gap-2", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              "input",
              {
                value: notes,
                onChange: (e) => setNotes(e.target.value),
                onKeyDown: (e) => e.key === "Enter" && handleAddNote(),
                placeholder: "Add a note...",
                className: "flex-1 px-3 py-1.5 bg-[#2a2a2a] border border-gray-600 rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { onClick: handleAddNote, className: "px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-sm text-white", children: "Add" })
          ] })
        ] })
      ] })
    ] }) });
  };
  const ProjectListView = () => {
    const [showCreate, setShowCreate] = (0, import_react.useState)(false);
    const [newName, setNewName] = (0, import_react.useState)("");
    const [newDesc, setNewDesc] = (0, import_react.useState)("");
    const [newGoals, setNewGoals] = (0, import_react.useState)("");
    const state = store();
    const { projects, isLoading, loadProjects, createProject, loadProject, deleteProject, setActiveView } = state;
    (0, import_react.useEffect)(() => {
      loadProjects();
    }, []);
    const handleCreate = async () => {
      if (!newName.trim() || !newDesc.trim()) return;
      const goals = newGoals.trim() ? newGoals.split("\n").filter(Boolean) : void 0;
      await createProject(newName.trim(), newDesc.trim(), goals);
      setShowCreate(false);
      setNewName("");
      setNewDesc("");
      setNewGoals("");
      setActiveView("board");
    };
    return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "p-4 space-y-4", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex items-center justify-between", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h2", { className: "text-lg font-semibold text-white flex items-center gap-2", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_lucide_react.KanbanSquare, { size: 20 }),
          " Projects"
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { onClick: () => setShowCreate(!showCreate), className: "flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-sm text-white", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_lucide_react.Plus, { size: 14 }),
          " New Project"
        ] })
      ] }),
      showCreate && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "p-4 bg-[#2a2a2a] border border-gray-700 rounded-lg space-y-3", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "input",
          {
            value: newName,
            onChange: (e) => setNewName(e.target.value),
            placeholder: "Project name",
            className: "w-full px-3 py-2 bg-[#1e1e1e] border border-gray-600 rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "textarea",
          {
            value: newDesc,
            onChange: (e) => setNewDesc(e.target.value),
            placeholder: "Project description",
            rows: 3,
            className: "w-full px-3 py-2 bg-[#1e1e1e] border border-gray-600 rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "textarea",
          {
            value: newGoals,
            onChange: (e) => setNewGoals(e.target.value),
            placeholder: "Goals (one per line, optional)",
            rows: 2,
            className: "w-full px-3 py-2 bg-[#1e1e1e] border border-gray-600 rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex gap-2", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { onClick: handleCreate, className: "px-4 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-sm text-white", children: "Create" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { onClick: () => setShowCreate(false), className: "px-4 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm text-gray-300", children: "Cancel" })
        ] })
      ] }),
      isLoading ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex items-center justify-center py-8 text-gray-400", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_lucide_react.Loader2, { size: 20, className: "animate-spin mr-2" }),
        " Loading..."
      ] }) : projects.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "text-center py-12 text-gray-500", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_lucide_react.KanbanSquare, { size: 40, className: "mx-auto mb-3 opacity-30" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "text-sm", children: "No projects yet. Create one to get started." })
      ] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3", children: projects.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
        "div",
        {
          onClick: () => {
            loadProject(p.id);
            setActiveView("board");
          },
          className: "p-4 bg-[#2a2a2a] border border-gray-700 rounded-lg cursor-pointer hover:border-gray-500 transition-colors",
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex items-start justify-between mb-2", children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { className: "text-sm font-semibold text-white truncate", children: p.name }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusBadge, { status: p.status })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "text-xs text-gray-500 mb-3", children: new Date(p.updatedAt).toLocaleDateString() }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "flex justify-end", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              "button",
              {
                onClick: (e) => {
                  e.stopPropagation();
                  deleteProject(p.id);
                },
                className: "p-1 text-gray-500 hover:text-red-400",
                title: "Delete",
                children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_lucide_react.Trash2, { size: 14 })
              }
            ) })
          ]
        },
        p.id
      )) })
    ] });
  };
  const BoardView = () => {
    const state = store();
    const { activeProject, selectedTaskId, selectTask, isLoading, generatePlan, executePlan, pauseProject, getReport } = state;
    if (!activeProject) {
      return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "p-4 text-gray-400 text-sm", children: "Select a project to view its board." });
    }
    const tasks = activeProject.plan.tasks;
    const columns = [
      { id: "pending", label: "Pending", icon: import_lucide_react.Circle },
      { id: "ready", label: "Ready", icon: import_lucide_react.Zap },
      { id: "in_progress", label: "In Progress", icon: import_lucide_react.Clock },
      { id: "review", label: "Review", icon: import_lucide_react.FileText },
      { id: "done", label: "Done", icon: import_lucide_react.CheckCircle },
      { id: "blocked", label: "Blocked", icon: import_lucide_react.AlertCircle }
    ];
    const totalTasks = tasks.length;
    const doneTasks = tasks.filter((t) => t.status === "done").length;
    const completion = totalTasks > 0 ? Math.round(doneTasks / totalTasks * 100) : 0;
    const selectedTask = selectedTaskId ? tasks.find((t) => t.id === selectedTaskId) : null;
    return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex flex-col h-full", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "p-4 border-b border-gray-700", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex items-center justify-between mb-2", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { onClick: () => state.setActiveView("list"), className: "text-gray-400 hover:text-white", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_lucide_react.ChevronRight, { size: 16, className: "rotate-180" }) }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { className: "text-lg font-semibold text-white", children: activeProject.name }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusBadge, { status: activeProject.status })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex items-center gap-2", children: [
            activeProject.plan.tasks.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
              "button",
              {
                onClick: () => generatePlan(activeProject.id),
                disabled: isLoading,
                className: "flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-sm text-white disabled:opacity-50",
                children: [
                  isLoading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_lucide_react.Loader2, { size: 14, className: "animate-spin" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_lucide_react.RefreshCw, { size: 14 }),
                  " Generate Plan"
                ]
              }
            ),
            activeProject.status === "planning" && tasks.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
              "button",
              {
                onClick: () => executePlan(activeProject.id),
                className: "flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 rounded text-sm text-white",
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_lucide_react.Play, { size: 14 }),
                  " Execute"
                ]
              }
            ),
            activeProject.status === "active" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
              "button",
              {
                onClick: () => pauseProject(activeProject.id),
                className: "flex items-center gap-1 px-3 py-1.5 bg-yellow-600 hover:bg-yellow-700 rounded text-sm text-white",
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_lucide_react.Pause, { size: 14 }),
                  " Pause"
                ]
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
              "button",
              {
                onClick: () => getReport(activeProject.id),
                className: "flex items-center gap-1 px-2 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm text-gray-300",
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_lucide_react.BarChart3, { size: 14 }),
                  " Report"
                ]
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex items-center gap-4 text-xs text-gray-400", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
            totalTasks,
            " tasks"
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
            doneTasks,
            " done"
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
            completion,
            "% complete"
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "flex-1 max-w-xs", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ProgressBar, { percentage: completion }) })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "flex-1 overflow-x-auto p-4", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "flex gap-4 h-full min-w-min", children: columns.map((col) => {
        const columnTasks = tasks.filter((t) => t.status === col.id);
        return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex flex-col w-64 min-w-[256px]", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex items-center gap-2 mb-3 px-1", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(col.icon, { size: 14, className: "text-gray-400" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "text-xs font-semibold text-gray-400 uppercase", children: col.label }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "text-xs text-gray-500 ml-auto", children: columnTasks.length })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "flex-1 space-y-2 overflow-y-auto", children: columnTasks.map((task) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TaskCard, { task, onClick: () => selectTask(task.id) }, task.id)) })
        ] }, col.id);
      }) }) }),
      selectedTask && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        TaskDetailModal,
        {
          task: selectedTask,
          projectId: activeProject.id,
          onClose: () => selectTask(null)
        }
      )
    ] });
  };
  const ActivityFeed = () => {
    const state = store();
    const { activityFeed } = state;
    return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "h-full flex flex-col bg-[#1e1e1e]", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "p-2 border-b border-gray-700 flex items-center gap-2", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_lucide_react.Activity, { size: 14, className: "text-gray-400" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "text-xs font-semibold text-gray-400 uppercase", children: "Project Activity" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "flex-1 overflow-y-auto p-2 space-y-1", children: activityFeed.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "text-xs text-gray-500 text-center py-4", children: "No activity yet" }) : activityFeed.map((entry) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex items-start gap-2 py-1 px-2 rounded hover:bg-white/5 text-xs", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "text-gray-500 whitespace-nowrap", children: new Date(entry.timestamp).toLocaleTimeString() }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: `${entry.type === "milestone" ? "text-green-400" : entry.type === "health" ? "text-blue-400" : "text-gray-300"}`, children: entry.message })
      ] }, entry.id)) })
    ] });
  };
  const PlanmanSettingsPanel = () => {
    const state = store();
    const { settings, loadSettings, updateSettings } = state;
    (0, import_react.useEffect)(() => {
      loadSettings();
    }, []);
    const Toggle = ({ label, value, onChange }) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex items-center justify-between py-2", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "text-sm text-gray-300", children: label }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "button",
        {
          onClick: () => onChange(!value),
          className: `w-10 h-5 rounded-full relative transition-colors ${value ? "bg-blue-600" : "bg-gray-600"}`,
          children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: `absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${value ? "translate-x-5" : ""}` })
        }
      )
    ] });
    return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "p-4 space-y-4", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h3", { className: "text-sm font-semibold text-white flex items-center gap-2", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_lucide_react.Settings, { size: 16 }),
        " PlanMan Settings"
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "space-y-1", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toggle, { label: "Auto-assign tasks to agents", value: settings.autoAssign, onChange: (v) => updateSettings({ autoAssign: v }) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toggle, { label: "Auto-replan on blockers", value: settings.autoReplan, onChange: (v) => updateSettings({ autoReplan: v }) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toggle, { label: "Notify on milestones", value: settings.notifyOnMilestone, onChange: (v) => updateSettings({ notifyOnMilestone: v }) })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "space-y-2", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex items-center justify-between", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "text-sm text-gray-300", children: "Max concurrent tasks" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "select",
            {
              value: settings.maxConcurrentTasks,
              onChange: (e) => updateSettings({ maxConcurrentTasks: parseInt(e.target.value) }),
              className: "bg-gray-700 rounded px-2 py-1 text-xs text-white border border-gray-600",
              children: [1, 2, 3, 5, 10].map((n) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: n, children: n }, n))
            }
          )
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex items-center justify-between", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "text-sm text-gray-300", children: "Check interval" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
            "select",
            {
              value: settings.checkInterval,
              onChange: (e) => updateSettings({ checkInterval: e.target.value }),
              className: "bg-gray-700 rounded px-2 py-1 text-xs text-white border border-gray-600",
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "*/15 * * * *", children: "Every 15 min" }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "*/30 * * * *", children: "Every 30 min" }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "0 * * * *", children: "Every hour" }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "0 */4 * * *", children: "Every 4 hours" })
              ]
            }
          )
        ] })
      ] })
    ] });
  };
  const ProjectManagerView = () => {
    const state = store();
    const { activeView, error } = state;
    return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "h-full flex flex-col bg-[#1e1e1e] text-white", children: [
      error && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "mx-4 mt-2 px-3 py-2 bg-red-500/20 border border-red-500/30 rounded text-xs text-red-300 flex items-center gap-2", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_lucide_react.AlertTriangle, { size: 14 }),
        " ",
        error,
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { onClick: () => store.setState({ error: null }), className: "ml-auto text-red-400 hover:text-white", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_lucide_react.X, { size: 12 }) })
      ] }),
      activeView === "list" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ProjectListView, {}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BoardView, {})
    ] });
  };
  context.registerComponent("sidebar:nav-item", {
    id: "planman-nav",
    component: () => {
      const { activeSidebarView, setActiveSidebarView } = useAppStore();
      const isActive = activeSidebarView === "planman";
      return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "button",
        {
          className: `relative w-9 h-9 rounded-lg flex items-center justify-center transition-all ${isActive ? "bg-blue-600 text-white" : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"}`,
          onClick: () => setActiveSidebarView("planman"),
          title: "Project Manager",
          children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_lucide_react.KanbanSquare, { size: 18 })
        }
      );
    }
  });
  context.registerComponent("sidebar:view:planman", {
    id: "planman-view",
    component: ProjectManagerView
  });
  context.registerComponent("bottom-panel:tab", {
    id: "planman-activity",
    component: ActivityFeed,
    label: "Project Activity",
    icon: import_lucide_react.Activity
  });
  context.registerComponent("settings:tab", {
    id: "planman-settings",
    component: PlanmanSettingsPanel,
    label: "PlanMan",
    icon: import_lucide_react.KanbanSquare
  });
  const cleanups = [];
  if (ui?.registerCommand) {
    cleanups.push(ui.registerCommand({
      id: "planman:open",
      label: "Open Project Manager",
      icon: import_lucide_react.KanbanSquare,
      category: "Projects",
      action: () => {
        const appStore = useAppStore?.getState?.();
        appStore?.setActiveSidebarView?.("planman");
      }
    }));
    cleanups.push(ui.registerCommand({
      id: "planman:create-project",
      label: "Create New Project",
      icon: import_lucide_react.Plus,
      category: "Projects",
      action: () => {
        const appStore = useAppStore?.getState?.();
        appStore?.setActiveSidebarView?.("planman");
        store.setState({ activeView: "list" });
      }
    }));
  }
  context._cleanups = cleanups;
};
var deactivate = (context) => {
  console.log("[planman] Renderer deactivated");
  if (context._cleanups) {
    context._cleanups.forEach((cleanup) => cleanup());
  }
  store = null;
};
