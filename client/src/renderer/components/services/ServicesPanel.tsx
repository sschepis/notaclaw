import { useState } from 'react';
import { useRISAServices } from '../../hooks/useRISAServices';
import { RISAScript } from '../../../shared/risa/types';
import { Play, Square, RefreshCw, Plus, Trash2, Activity, Clock } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../ui/dialog';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';

export function ServicesPanel() {
  const { 
    scripts, 
    tasks, 
    events, 
    isInitialized, 
    isLoading, 
    installScript, 
    uninstallScript, 
    startTask, 
    stopTask, 
    refresh 
  } = useRISAServices();

  const [activeTab, setActiveTab] = useState<'scripts' | 'tasks' | 'events'>('scripts');
  const [isInstallDialogOpen, setIsInstallDialogOpen] = useState(false);
  const [newScript, setNewScript] = useState<Partial<RISAScript>>({
    name: '',
    description: '',
    entryFunction: '// Write your script here\nasync function main(context, event) {\n  context.log.info("Hello from RISA!");\n}',
    triggers: [{ type: 'manual' }],
    capabilities: ['memory.read', 'script.invoke'],
    installationSource: 'user',
    tags: []
  });

  const handleInstall = async () => {
    if (!newScript.name || !newScript.entryFunction) return;
    
    await installScript(newScript as any);
    setIsInstallDialogOpen(false);
    setNewScript({
      name: '',
      description: '',
      entryFunction: '// Write your script here\nasync function main(context, event) {\n  context.log.info("Hello from RISA!");\n}',
      triggers: [{ type: 'manual' }],
      capabilities: ['memory.read', 'script.invoke'],
      installationSource: 'user',
      tags: []
    });
  };

  const runningTasks = tasks.filter(t => t.status === 'running');

  if (!isInitialized && isLoading) {
    return <div className="p-8 text-center">Initializing RISA Services...</div>;
  }

  return (
    <div className="flex flex-col h-full bg-background text-foreground">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold tracking-tight">RISA Services</h2>
          <Badge variant="outline" className="ml-2 font-mono text-xs">
            {runningTasks.length} Running
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={refresh} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Dialog open={isInstallDialogOpen} onOpenChange={setIsInstallDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="w-4 h-4" /> New Service
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Install New Service</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Name</Label>
                  <Input 
                    id="name" 
                    value={newScript.name} 
                    onChange={e => setNewScript(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="My Service"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Input 
                    id="description" 
                    value={newScript.description} 
                    onChange={e => setNewScript(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Does something useful..."
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="code">Entry Function</Label>
                  <Textarea 
                    id="code" 
                    value={newScript.entryFunction} 
                    onChange={e => setNewScript(prev => ({ ...prev, entryFunction: e.target.value }))}
                    className="font-mono text-xs h-[200px]"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleInstall}>Install Service</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab('scripts')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'scripts' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Scripts ({scripts.length})
        </button>
        <button
          onClick={() => setActiveTab('tasks')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'tasks' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Tasks ({tasks.length})
        </button>
        <button
          onClick={() => setActiveTab('events')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'events' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Event Log
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {activeTab === 'scripts' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {scripts.map(script => (
              <Card key={script.id} className="flex flex-col">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-base">{script.name}</CardTitle>
                    <Badge variant={script.installationSource === 'system' ? 'secondary' : 'outline'}>
                      {script.installationSource}
                    </Badge>
                  </div>
                  <CardDescription className="line-clamp-2 text-xs">
                    {script.description || 'No description'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col justify-end gap-2 text-xs">
                  <div className="flex flex-wrap gap-1 mb-2">
                    {script.triggers.map((t, i) => (
                      <Badge key={i} variant="secondary" className="text-[10px] px-1 py-0 h-5">
                        {t.type === 'interval' ? `Every ${t.intervalMs}ms` : t.type}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2 mt-auto">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1 gap-1"
                      onClick={() => startTask(script.id)}
                    >
                      <Play className="w-3 h-3" /> Run
                    </Button>
                    {script.installationSource !== 'system' && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-destructive hover:text-destructive"
                        onClick={() => uninstallScript(script.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {activeTab === 'tasks' && (
          <div className="space-y-2">
            {tasks.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">No tasks found</div>
            ) : (
              tasks.map(task => (
                <div key={task.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${
                      task.status === 'running' ? 'bg-green-500 animate-pulse' : 
                      task.status === 'error' ? 'bg-red-500' : 'bg-muted-foreground'
                    }`} />
                    <div>
                      <div className="font-medium text-sm">{task.scriptName}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2">
                        <Clock className="w-3 h-3" />
                        {new Date(task.startedAt).toLocaleTimeString()}
                        <span>•</span>
                        <span>{task.executionCount} runs</span>
                        <span>•</span>
                        <span>{task.totalExecutionTimeMs}ms total</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {task.status === 'running' && (
                      <Button variant="ghost" size="sm" onClick={() => stopTask(task.id)}>
                        <Square className="w-3 h-3 text-destructive" />
                      </Button>
                    )}
                    {task.lastError && (
                      <Badge variant="destructive" className="text-[10px]">Error</Badge>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'events' && (
          <div className="space-y-1 font-mono text-xs">
            {events.map(event => (
              <div key={event.id} className="flex gap-2 p-2 hover:bg-muted/50 rounded border-b border-border/50 last:border-0">
                <span className="text-muted-foreground w-20 shrink-0">
                  {new Date(event.timestamp).toLocaleTimeString()}
                </span>
                <span className="text-primary font-semibold w-40 shrink-0 truncate" title={event.type}>
                  {event.type}
                </span>
                <span className="text-foreground/80 truncate flex-1">
                  {JSON.stringify(event.payload)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
