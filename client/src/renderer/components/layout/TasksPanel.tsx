import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Circle, Clock, AlertCircle } from 'lucide-react';

interface Task {
    id: string;
    title: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    priority: 'low' | 'medium' | 'high';
    progress?: number;
}

// Mock data for now as we don't have a task store slice yet
const MOCK_TASKS: Task[] = [
    { id: '1', title: 'Synchronize Neural Weights', status: 'running', priority: 'high', progress: 45 },
    { id: '2', title: 'Index Knowledge Graph', status: 'pending', priority: 'medium' },
    { id: '3', title: 'Update Plugin Manifests', status: 'completed', priority: 'low' },
    { id: '4', title: 'Garbage Collection', status: 'failed', priority: 'low' },
];

export const TasksPanel: React.FC = () => {
  return (
    <div className="h-full flex flex-col p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground tracking-tight">System Tasks</h2>
        <div className="text-xs font-mono text-muted-foreground">
          {MOCK_TASKS.filter(t => t.status === 'running').length} Running
        </div>
      </div>

      <div className="space-y-3">
        {MOCK_TASKS.map((task, i) => (
            <motion.div
                key={task.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-card border border-border rounded-xl p-4 flex items-center space-x-4"
            >
                <div className={`
                    p-2 rounded-full 
                    ${task.status === 'running' ? 'bg-primary/20 text-primary' : 
                      task.status === 'completed' ? 'bg-emerald-500/20 text-emerald-500' :
                      task.status === 'failed' ? 'bg-destructive/20 text-destructive' :
                      'bg-muted/50 text-muted-foreground'}
                `}>
                    {task.status === 'running' && <Clock className="w-5 h-5 animate-pulse" />}
                    {task.status === 'completed' && <CheckCircle2 className="w-5 h-5" />}
                    {task.status === 'failed' && <AlertCircle className="w-5 h-5" />}
                    {task.status === 'pending' && <Circle className="w-5 h-5" />}
                </div>

                <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                        <h3 className="text-sm font-medium text-foreground">{task.title}</h3>
                        <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${
                            task.priority === 'high' ? 'bg-destructive/10 text-destructive' :
                            task.priority === 'medium' ? 'bg-amber-500/10 text-amber-500' :
                            'bg-primary/10 text-primary'
                        }`}>
                            {task.priority}
                        </span>
                    </div>
                    
                    {task.status === 'running' && task.progress !== undefined && (
                        <div className="w-full bg-muted rounded-full h-1.5 mt-2 overflow-hidden">
                            <div 
                                className="bg-primary h-full rounded-full transition-all duration-500" 
                                style={{ width: `${task.progress}%` }}
                            />
                        </div>
                    )}
                </div>
            </motion.div>
        ))}
      </div>
    </div>
  );
};
