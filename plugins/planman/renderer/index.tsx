import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  KanbanSquare, Plus, Play, Pause, RefreshCw, Trash2,
  CheckCircle, Circle, Clock, AlertTriangle, AlertCircle,
  ChevronRight, ChevronDown, BarChart3, List, Columns,
  Search, Settings, Activity, Target, Zap, X,
  ArrowRight, Loader2, FileText
} from 'lucide-react';
import {
  Project, PlanTask, TaskStatus, TaskPriority, ProjectIndexEntry,
  ProjectHealthReport, ActivityEntry, ProjectSettings, Milestone,
  createPlanmanStore, PlanmanState,
} from './store';

// =============================================================================
// Renderer Entry
// =============================================================================

let store: any = null;

export const activate = (context: any) => {
  console.log('[planman] Renderer activated');
  const { ui, useAppStore } = context;

  // Create store with IPC bridge
  const ipcInvoke = (channel: string, data?: any) => {
    return context.ipc?.invoke?.(channel, data) ?? Promise.reject('IPC not available');
  };

  // Use zustand create from context if available, otherwise use simple state
  const zustandCreate = context.zustand?.create || ((fn: any) => {
    let state = {} as any;
    const listeners = new Set<() => void>();
    const get = () => state;
    const set = (partial: any) => {
      state = typeof partial === 'function' ? { ...state, ...partial(state) } : { ...state, ...partial };
      listeners.forEach(l => l());
    };
    state = fn(set, get);
    const useStore = (selector?: any) => {
      const [, forceUpdate] = useState(0);
      useEffect(() => {
        const listener = () => forceUpdate(n => n + 1);
        listeners.add(listener);
        return () => { listeners.delete(listener); };
      }, []);
      return selector ? selector(state) : state;
    };
    useStore.getState = get;
    useStore.setState = set;
    return useStore;
  });

  store = createPlanmanStore(zustandCreate, ipcInvoke);

  // Subscribe to IPC events from main process
  if (context.ipc) {
    context.ipc.on('planman:task:statusChanged', (event: any) => {
      const s = store.getState();
      s.addActivity({
        id: Date.now().toString(),
        timestamp: Date.now(),
        projectId: event.projectId,
        projectName: '',
        type: 'task_status',
        message: `Task status: ${event.oldStatus} → ${event.newStatus}`,
      });
      // Reload active project if it matches
      if (s.activeProject?.id === event.projectId) {
        s.loadProject(event.projectId);
      }
    });

    context.ipc.on('planman:project:healthUpdate', (report: ProjectHealthReport) => {
      const s = store.getState();
      if (s.activeProject?.id === report.projectId) {
        store.setState({ healthReport: report });
      }
      s.addActivity({
        id: Date.now().toString(),
        timestamp: Date.now(),
        projectId: report.projectId,
        projectName: '',
        type: 'health',
        message: `Health: ${report.overallHealth} (${report.completionPercentage}% complete)`,
      });
    });

    context.ipc.on('planman:milestone:reached', (event: any) => {
      const s = store.getState();
      s.addActivity({
        id: Date.now().toString(),
        timestamp: Date.now(),
        projectId: event.projectId,
        projectName: '',
        type: 'milestone',
        message: `🎯 Milestone reached: ${event.name}`,
      });
    });
  }

  // =====================================================================
  // Components
  // =====================================================================

  // --- Status Badge ---
  const StatusBadge = ({ status }: { status: string }) => {
    const colors: Record<string, string> = {
      planning: 'bg-blue-500/20 text-blue-400',
      active: 'bg-green-500/20 text-green-400',
      paused: 'bg-yellow-500/20 text-yellow-400',
      completed: 'bg-emerald-500/20 text-emerald-400',
      archived: 'bg-gray-500/20 text-gray-400',
      pending: 'bg-gray-500/20 text-gray-400',
      ready: 'bg-blue-500/20 text-blue-400',
      assigned: 'bg-purple-500/20 text-purple-400',
      in_progress: 'bg-yellow-500/20 text-yellow-400',
      blocked: 'bg-red-500/20 text-red-400',
      review: 'bg-orange-500/20 text-orange-400',
      done: 'bg-green-500/20 text-green-400',
      cancelled: 'bg-gray-500/20 text-gray-500',
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium uppercase ${colors[status] || 'bg-gray-500/20 text-gray-400'}`}>
        {status.replace('_', ' ')}
      </span>
    );
  };

  // --- Priority Badge ---
  const PriorityBadge = ({ priority }: { priority: TaskPriority }) => {
    const colors: Record<string, string> = {
      critical: 'text-red-400',
      high: 'text-orange-400',
      medium: 'text-yellow-400',
      low: 'text-gray-400',
    };
    return (
      <span className={`text-[10px] font-medium ${colors[priority]}`}>
        {priority === 'critical' ? '🔴' : priority === 'high' ? '🟠' : priority === 'medium' ? '🟡' : '⚪'} {priority}
      </span>
    );
  };

  // --- Progress Bar ---
  const ProgressBar = ({ percentage }: { percentage: number }) => (
    <div className="w-full h-1.5 bg-gray-700 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-300 ${
          percentage === 100 ? 'bg-green-500' : percentage > 60 ? 'bg-blue-500' : percentage > 30 ? 'bg-yellow-500' : 'bg-red-500'
        }`}
        style={{ width: `${Math.min(100, percentage)}%` }}
      />
    </div>
  );

  // --- Task Card ---
  const TaskCard = ({ task, onClick }: { task: PlanTask; onClick: () => void }) => (
    <div
      onClick={onClick}
      className="p-3 bg-[#2a2a2a] border border-gray-700 rounded-lg cursor-pointer hover:border-gray-500 transition-colors"
    >
      <div className="flex items-start justify-between mb-1">
        <h4 className="text-sm font-medium text-white truncate flex-1">{task.title}</h4>
        <PriorityBadge priority={task.priority} />
      </div>
      <p className="text-xs text-gray-400 line-clamp-2 mb-2">{task.description}</p>
      <div className="flex items-center justify-between">
        <StatusBadge status={task.status} />
        {task.estimatedEffort && (
          <span className="text-[10px] text-gray-500 flex items-center gap-1">
            <Clock size={10} /> {task.estimatedEffort}
          </span>
        )}
      </div>
      {task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {task.tags.slice(0, 3).map(tag => (
            <span key={tag} className="px-1.5 py-0.5 bg-gray-700 rounded text-[10px] text-gray-300">
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );

  // --- Task Detail Modal ---
  const TaskDetailModal = ({ task, projectId, onClose }: { task: PlanTask; projectId: string; onClose: () => void }) => {
    const [notes, setNotes] = useState('');

    const handleStatusChange = async (newStatus: TaskStatus) => {
      await store.getState().updateTask(projectId, task.id, { status: newStatus });
    };

    const handleAddNote = async () => {
      if (!notes.trim()) return;
      await store.getState().updateTask(projectId, task.id, { notes: notes.trim() });
      setNotes('');
    };

    return (
      <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
        <div className="bg-[#1e1e1e] border border-gray-700 rounded-xl w-full max-w-2xl max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
          {/* Header */}
          <div className="p-4 border-b border-gray-700 flex justify-between items-start">
            <div>
              <h3 className="text-lg font-semibold text-white">{task.title}</h3>
              <div className="flex items-center gap-2 mt-1">
                <StatusBadge status={task.status} />
                <PriorityBadge priority={task.priority} />
                {task.estimatedEffort && <span className="text-xs text-gray-400"><Clock size={12} className="inline mr-1" />{task.estimatedEffort}</span>}
              </div>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={18} /></button>
          </div>

          {/* Body */}
          <div className="p-4 space-y-4">
            {/* Description */}
            <div>
              <h4 className="text-xs font-semibold text-gray-400 uppercase mb-1">Description</h4>
              <p className="text-sm text-gray-200">{task.description || 'No description'}</p>
            </div>

            {/* Acceptance Criteria */}
            {task.acceptanceCriteria.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-gray-400 uppercase mb-1">Acceptance Criteria</h4>
                <ul className="space-y-1">
                  {task.acceptanceCriteria.map((c, i) => (
                    <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                      <CheckCircle size={14} className="text-gray-500 mt-0.5 flex-shrink-0" />
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Status Actions */}
            <div>
              <h4 className="text-xs font-semibold text-gray-400 uppercase mb-1">Update Status</h4>
              <div className="flex flex-wrap gap-2">
                {(['ready', 'in_progress', 'review', 'done', 'blocked', 'cancelled'] as TaskStatus[]).map(s => (
                  <button
                    key={s}
                    onClick={() => handleStatusChange(s)}
                    disabled={task.status === s}
                    className={`px-2 py-1 rounded text-xs ${task.status === s ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                  >
                    {s.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Dependencies */}
            {task.dependsOn.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-gray-400 uppercase mb-1">Dependencies</h4>
                <div className="flex flex-wrap gap-1">
                  {task.dependsOn.map(dep => (
                    <span key={dep} className="px-2 py-0.5 bg-gray-700 rounded text-xs text-gray-300">{dep}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            <div>
              <h4 className="text-xs font-semibold text-gray-400 uppercase mb-1">Notes ({task.notes.length})</h4>
              <div className="space-y-2 max-h-40 overflow-y-auto mb-2">
                {task.notes.map((note, i) => (
                  <div key={i} className="p-2 bg-[#2a2a2a] rounded text-xs">
                    <div className="flex justify-between mb-1">
                      <span className="text-gray-400 font-medium">{note.author}</span>
                      <span className="text-gray-500">{new Date(note.timestamp).toLocaleString()}</span>
                    </div>
                    <p className="text-gray-300">{note.content}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddNote()}
                  placeholder="Add a note..."
                  className="flex-1 px-3 py-1.5 bg-[#2a2a2a] border border-gray-600 rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
                <button onClick={handleAddNote} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-sm text-white">Add</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // --- Project List View ---
  const ProjectListView = () => {
    const [showCreate, setShowCreate] = useState(false);
    const [newName, setNewName] = useState('');
    const [newDesc, setNewDesc] = useState('');
    const [newGoals, setNewGoals] = useState('');

    const state = store() as PlanmanState;
    const { projects, isLoading, loadProjects, createProject, loadProject, deleteProject, setActiveView } = state;

    useEffect(() => { loadProjects(); }, []);

    const handleCreate = async () => {
      if (!newName.trim() || !newDesc.trim()) return;
      const goals = newGoals.trim() ? newGoals.split('\n').filter(Boolean) : undefined;
      await createProject(newName.trim(), newDesc.trim(), goals);
      setShowCreate(false);
      setNewName('');
      setNewDesc('');
      setNewGoals('');
      setActiveView('board');
    };

    return (
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <KanbanSquare size={20} /> Projects
          </h2>
          <button onClick={() => setShowCreate(!showCreate)} className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-sm text-white">
            <Plus size={14} /> New Project
          </button>
        </div>

        {/* Create Form */}
        {showCreate && (
          <div className="p-4 bg-[#2a2a2a] border border-gray-700 rounded-lg space-y-3">
            <input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Project name"
              className="w-full px-3 py-2 bg-[#1e1e1e] border border-gray-600 rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
            <textarea
              value={newDesc}
              onChange={e => setNewDesc(e.target.value)}
              placeholder="Project description"
              rows={3}
              className="w-full px-3 py-2 bg-[#1e1e1e] border border-gray-600 rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
            />
            <textarea
              value={newGoals}
              onChange={e => setNewGoals(e.target.value)}
              placeholder="Goals (one per line, optional)"
              rows={2}
              className="w-full px-3 py-2 bg-[#1e1e1e] border border-gray-600 rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
            />
            <div className="flex gap-2">
              <button onClick={handleCreate} className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-sm text-white">Create</button>
              <button onClick={() => setShowCreate(false)} className="px-4 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm text-gray-300">Cancel</button>
            </div>
          </div>
        )}

        {/* Project Cards */}
        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-gray-400">
            <Loader2 size={20} className="animate-spin mr-2" /> Loading...
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <KanbanSquare size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">No projects yet. Create one to get started.</p>
          </div>
        ) : (
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p: ProjectIndexEntry) => (
              <div
                key={p.id}
                onClick={() => { loadProject(p.id); setActiveView('board'); }}
                className="p-4 bg-[#2a2a2a] border border-gray-700 rounded-lg cursor-pointer hover:border-gray-500 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-sm font-semibold text-white truncate">{p.name}</h3>
                  <StatusBadge status={p.status} />
                </div>
                <p className="text-xs text-gray-500 mb-3">{new Date(p.updatedAt).toLocaleDateString()}</p>
                <div className="flex justify-end">
                  <button
                    onClick={e => { e.stopPropagation(); deleteProject(p.id); }}
                    className="p-1 text-gray-500 hover:text-red-400"
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // --- Board View (Kanban) ---
  const BoardView = () => {
    const state = store() as PlanmanState;
    const { activeProject, selectedTaskId, selectTask, isLoading, generatePlan, executePlan, pauseProject, getReport } = state;

    if (!activeProject) {
      return <div className="p-4 text-gray-400 text-sm">Select a project to view its board.</div>;
    }

    const tasks = activeProject.plan.tasks;
    const columns: { id: TaskStatus; label: string; icon: any }[] = [
      { id: 'pending', label: 'Pending', icon: Circle },
      { id: 'ready', label: 'Ready', icon: Zap },
      { id: 'in_progress', label: 'In Progress', icon: Clock },
      { id: 'review', label: 'Review', icon: FileText },
      { id: 'done', label: 'Done', icon: CheckCircle },
      { id: 'blocked', label: 'Blocked', icon: AlertCircle },
    ];

    const totalTasks = tasks.length;
    const doneTasks = tasks.filter(t => t.status === 'done').length;
    const completion = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

    const selectedTask = selectedTaskId ? tasks.find(t => t.id === selectedTaskId) : null;

    return (
      <div className="flex flex-col h-full">
        {/* Project Header */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <button onClick={() => state.setActiveView('list')} className="text-gray-400 hover:text-white">
                <ChevronRight size={16} className="rotate-180" />
              </button>
              <h2 className="text-lg font-semibold text-white">{activeProject.name}</h2>
              <StatusBadge status={activeProject.status} />
            </div>
            <div className="flex items-center gap-2">
              {activeProject.plan.tasks.length === 0 && (
                <button onClick={() => generatePlan(activeProject.id)} disabled={isLoading}
                  className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-sm text-white disabled:opacity-50">
                  {isLoading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Generate Plan
                </button>
              )}
              {activeProject.status === 'planning' && tasks.length > 0 && (
                <button onClick={() => executePlan(activeProject.id)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 rounded text-sm text-white">
                  <Play size={14} /> Execute
                </button>
              )}
              {activeProject.status === 'active' && (
                <button onClick={() => pauseProject(activeProject.id)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-yellow-600 hover:bg-yellow-700 rounded text-sm text-white">
                  <Pause size={14} /> Pause
                </button>
              )}
              <button onClick={() => getReport(activeProject.id)}
                className="flex items-center gap-1 px-2 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm text-gray-300">
                <BarChart3 size={14} /> Report
              </button>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-400">
            <span>{totalTasks} tasks</span>
            <span>{doneTasks} done</span>
            <span>{completion}% complete</span>
            <div className="flex-1 max-w-xs"><ProgressBar percentage={completion} /></div>
          </div>
        </div>

        {/* Kanban Columns */}
        <div className="flex-1 overflow-x-auto p-4">
          <div className="flex gap-4 h-full min-w-min">
            {columns.map(col => {
              const columnTasks = tasks.filter(t => t.status === col.id);
              return (
                <div key={col.id} className="flex flex-col w-64 min-w-[256px]">
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <col.icon size={14} className="text-gray-400" />
                    <span className="text-xs font-semibold text-gray-400 uppercase">{col.label}</span>
                    <span className="text-xs text-gray-500 ml-auto">{columnTasks.length}</span>
                  </div>
                  <div className="flex-1 space-y-2 overflow-y-auto">
                    {columnTasks.map(task => (
                      <TaskCard key={task.id} task={task} onClick={() => selectTask(task.id)} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Task Detail Modal */}
        {selectedTask && (
          <TaskDetailModal
            task={selectedTask}
            projectId={activeProject.id}
            onClose={() => selectTask(null)}
          />
        )}
      </div>
    );
  };

  // --- Activity Feed (Bottom Panel) ---
  const ActivityFeed = () => {
    const state = store() as PlanmanState;
    const { activityFeed } = state;

    return (
      <div className="h-full flex flex-col bg-[#1e1e1e]">
        <div className="p-2 border-b border-gray-700 flex items-center gap-2">
          <Activity size={14} className="text-gray-400" />
          <span className="text-xs font-semibold text-gray-400 uppercase">Project Activity</span>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {activityFeed.length === 0 ? (
            <p className="text-xs text-gray-500 text-center py-4">No activity yet</p>
          ) : (
            activityFeed.map(entry => (
              <div key={entry.id} className="flex items-start gap-2 py-1 px-2 rounded hover:bg-white/5 text-xs">
                <span className="text-gray-500 whitespace-nowrap">{new Date(entry.timestamp).toLocaleTimeString()}</span>
                <span className={`${
                  entry.type === 'milestone' ? 'text-green-400' :
                  entry.type === 'health' ? 'text-blue-400' :
                  'text-gray-300'
                }`}>{entry.message}</span>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  // --- Settings Panel ---
  const PlanmanSettingsPanel = () => {
    const state = store() as PlanmanState;
    const { settings, loadSettings, updateSettings } = state;

    useEffect(() => { loadSettings(); }, []);

    const Toggle = ({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) => (
      <div className="flex items-center justify-between py-2">
        <span className="text-sm text-gray-300">{label}</span>
        <button
          onClick={() => onChange(!value)}
          className={`w-10 h-5 rounded-full relative transition-colors ${value ? 'bg-blue-600' : 'bg-gray-600'}`}
        >
          <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${value ? 'translate-x-5' : ''}`} />
        </button>
      </div>
    );

    return (
      <div className="p-4 space-y-4">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Settings size={16} /> PlanMan Settings
        </h3>
        <div className="space-y-1">
          <Toggle label="Auto-assign tasks to agents" value={settings.autoAssign} onChange={v => updateSettings({ autoAssign: v })} />
          <Toggle label="Auto-replan on blockers" value={settings.autoReplan} onChange={v => updateSettings({ autoReplan: v })} />
          <Toggle label="Notify on milestones" value={settings.notifyOnMilestone} onChange={v => updateSettings({ notifyOnMilestone: v })} />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-300">Max concurrent tasks</span>
            <select
              value={settings.maxConcurrentTasks}
              onChange={e => updateSettings({ maxConcurrentTasks: parseInt(e.target.value) })}
              className="bg-gray-700 rounded px-2 py-1 text-xs text-white border border-gray-600"
            >
              {[1, 2, 3, 5, 10].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-300">Check interval</span>
            <select
              value={settings.checkInterval}
              onChange={e => updateSettings({ checkInterval: e.target.value })}
              className="bg-gray-700 rounded px-2 py-1 text-xs text-white border border-gray-600"
            >
              <option value="*/15 * * * *">Every 15 min</option>
              <option value="*/30 * * * *">Every 30 min</option>
              <option value="0 * * * *">Every hour</option>
              <option value="0 */4 * * *">Every 4 hours</option>
            </select>
          </div>
        </div>
      </div>
    );
  };

  // --- Main Project Manager View ---
  const ProjectManagerView = () => {
    const state = store() as PlanmanState;
    const { activeView, error } = state;

    return (
      <div className="h-full flex flex-col bg-[#1e1e1e] text-white">
        {error && (
          <div className="mx-4 mt-2 px-3 py-2 bg-red-500/20 border border-red-500/30 rounded text-xs text-red-300 flex items-center gap-2">
            <AlertTriangle size={14} /> {error}
            <button onClick={() => store.setState({ error: null })} className="ml-auto text-red-400 hover:text-white"><X size={12} /></button>
          </div>
        )}
        {activeView === 'list' ? <ProjectListView /> : <BoardView />}
      </div>
    );
  };

  // =====================================================================
  // Register UI Components
  // =====================================================================

  // Navigation sidebar item
  context.registerComponent('sidebar:nav-item', {
    id: 'planman-nav',
    component: () => {
      const { activeSidebarView, setActiveSidebarView } = useAppStore();
      const isActive = activeSidebarView === 'planman';

      return (
        <button
          className={`relative w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
            isActive ? 'bg-blue-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
          }`}
          onClick={() => setActiveSidebarView('planman')}
          title="Project Manager"
        >
          <KanbanSquare size={18} />
        </button>
      );
    },
  });

  // Sidebar view (stage view)
  context.registerComponent('sidebar:view:planman', {
    id: 'planman-view',
    component: ProjectManagerView,
  });

  // Bottom panel tab
  context.registerComponent('bottom-panel:tab', {
    id: 'planman-activity',
    component: ActivityFeed,
    label: 'Project Activity',
    icon: Activity,
  });

  // Settings tab
  context.registerComponent('settings:tab', {
    id: 'planman-settings',
    component: PlanmanSettingsPanel,
    label: 'PlanMan',
    icon: KanbanSquare,
  });

  // Register commands
  const cleanups: Array<() => void> = [];

  if (ui?.registerCommand) {
    cleanups.push(ui.registerCommand({
      id: 'planman:open',
      label: 'Open Project Manager',
      icon: KanbanSquare,
      category: 'Projects',
      action: () => {
        const appStore = useAppStore?.getState?.();
        appStore?.setActiveSidebarView?.('planman');
      },
    }));

    cleanups.push(ui.registerCommand({
      id: 'planman:create-project',
      label: 'Create New Project',
      icon: Plus,
      category: 'Projects',
      action: () => {
        const appStore = useAppStore?.getState?.();
        appStore?.setActiveSidebarView?.('planman');
        // Store action will show list with create form
        store.setState({ activeView: 'list' });
      },
    }));
  }

  context._cleanups = cleanups;
};

export const deactivate = (context: any) => {
  console.log('[planman] Renderer deactivated');
  if (context._cleanups) {
    context._cleanups.forEach((cleanup: any) => cleanup());
  }
  store = null;
};
