import { useState, useEffect, useCallback } from 'react';
import { RISAScript, RISATask, RISAEvent } from '../../shared/risa/types';

export function useRISAServices() {
  const [scripts, setScripts] = useState<RISAScript[]>([]);
  const [tasks, setTasks] = useState<RISATask[]>([]);
  const [events, setEvents] = useState<RISAEvent[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch initial data
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [fetchedScripts, fetchedTasks] = await Promise.all([
        window.electronAPI.risaGetScripts(),
        window.electronAPI.risaGetTasks()
      ]);
      setScripts(fetchedScripts);
      setTasks(fetchedTasks);
      setIsInitialized(true);
    } catch (error) {
      console.error('Failed to fetch RISA data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    // Subscribe to RISA events
    const unsubscribe = window.electronAPI.onRISAEvent((_event, data) => {
      const { type, payload } = data;
      
      // Update local state based on events
      if (type === 'lifecycle.task.created') {
        // Optimistic update or refetch? Let's fetch for now to be safe
        fetchData(); 
      } else if (type === 'lifecycle.task.completed') {
        fetchData();
      }

      // Add to event log
      setEvents(prev => [{
        id: payload.id || Date.now().toString(),
        type,
        payload,
        timestamp: new Date().toISOString()
      }, ...prev].slice(0, 100)); // Keep last 100 events
    });

    return () => {
      unsubscribe();
    };
  }, [fetchData]);

  // Script Management
  const installScript = async (script: Omit<RISAScript, 'id' | 'installedAt' | 'updatedAt'>) => {
    const newScript = await window.electronAPI.risaInstallScript(script);
    setScripts(prev => [...prev, newScript]);
    return newScript;
  };

  const updateScript = async (id: string, updates: Partial<RISAScript>) => {
    const updatedScript = await window.electronAPI.risaUpdateScript({ id, updates });
    setScripts(prev => prev.map(s => s.id === id ? updatedScript : s));
    return updatedScript;
  };

  const uninstallScript = async (id: string) => {
    await window.electronAPI.risaUninstallScript(id);
    setScripts(prev => prev.filter(s => s.id !== id));
  };

  // Task Management
  const startTask = async (scriptId: string, triggerEvent?: RISAEvent) => {
    const taskId = await window.electronAPI.risaStartTask({ scriptId, triggerEvent });
    // State update will happen via event subscription
    return taskId;
  };

  const stopTask = async (taskId: string) => {
    await window.electronAPI.risaStopTask(taskId);
    // State update will happen via event subscription
  };

  const isScriptRunning = (scriptId: string) => {
    return tasks.some(t => t.scriptId === scriptId && t.status === 'running');
  };

  const getTaskByScriptId = (scriptId: string) => {
    return tasks.find(t => t.scriptId === scriptId && (t.status === 'running' || t.status === 'paused'));
  };

  const getScriptsBySource = (source: string) => {
    return scripts.filter(s => s.installationSource === source);
  };

  return {
    scripts,
    tasks,
    events,
    isInitialized,
    isLoading,
    installScript,
    updateScript,
    uninstallScript,
    startTask,
    stopTask,
    isScriptRunning,
    getTaskByScriptId,
    getScriptsBySource,
    refresh: fetchData
  };
}
