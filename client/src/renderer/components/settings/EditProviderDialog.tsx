import React, { useEffect, useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { AIProviderConfig } from '../../../shared/ai-types';
import { PROVIDER_META } from '../ai-provider/ProviderMetadata';
import { AlertCircle, RotateCw, FileJson, Key, Globe, Server, Cpu } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

interface EditProviderDialogProps {
  provider: AIProviderConfig;
  onClose: () => void;
  onSave: (provider: AIProviderConfig) => void;
  onChange: (provider: AIProviderConfig) => void;
}

export const EditProviderDialog: React.FC<EditProviderDialogProps> = ({
  provider,
  onClose,
  onSave,
  onChange,
}) => {
  const [fetchingModels, setFetchingModels] = useState(false);
  const [modelError, setModelError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-fetch models when provider config changes (debounced)
  useEffect(() => {
    // Clear any pending fetch
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Check if we have enough info to fetch models
    const canFetch = 
      (provider.type === 'anthropic' || provider.type === 'vertex' || provider.type === 'vertex-anthropic' || provider.type === 'webllm') ||
      (provider.type === 'local' && provider.endpoint) ||
      (provider.type === 'lmstudio' && provider.endpoint) ||
      (provider.type === 'openai' && provider.apiKey) ||
      (provider.type === 'openrouter' && provider.apiKey) ||
      (provider.type === 'google' && provider.apiKey);

    if (!canFetch) {
      return;
    }

    // Debounce the fetch to avoid hammering the API while typing
    debounceRef.current = setTimeout(async () => {
      setFetchingModels(true);
      setModelError(null);
      try {
        const models = await window.electronAPI.fetchProviderModels(provider);
        if (models && models.length > 0) {
          onChange({ ...provider, models });
        }
      } catch (err) {
        console.error('Failed to fetch models:', err);
        setModelError(err instanceof Error ? err.message : 'Failed to fetch models');
      } finally {
        setFetchingModels(false);
      }
    }, 800);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [provider.type, provider.apiKey, provider.endpoint, provider.authJsonPath]);

  const meta = PROVIDER_META[provider.type] || { icon: '⚡', name: 'Custom' };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl bg-card border-border text-foreground shadow-2xl shadow-black/50">
        <DialogHeader className="border-b border-border pb-4">
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-2xl">
              {meta.icon}
            </div>
            <div>
              {provider.id ? 'Edit Provider' : 'Add Provider'}
              <div className="text-sm font-normal text-muted-foreground mt-1">
                Configure connection details for {meta.name}
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-12 gap-6 py-4">
          {/* Left Column: Configuration */}
          <div className="col-span-7 space-y-5">
            <div className="grid gap-2">
              <Label htmlFor="name">Display Name</Label>
              <Input
                id="name"
                value={provider.name}
                onChange={e => onChange({...provider, name: e.target.value})}
                className="bg-background/60 border-border focus:border-blue-500/50"
              />
            </div>

            <div className="grid gap-2">
              <Label>Provider Type</Label>
              <Select
                value={provider.type}
                onValueChange={(val) => onChange({...provider, type: val as any})}
              >
                <SelectTrigger className="bg-background/60 border-border">
                  <SelectValue placeholder="Select Type" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border max-h-[300px]">
                  <SelectItem value="openai">OpenAI</SelectItem>
                  <SelectItem value="anthropic">Anthropic</SelectItem>
                  <SelectItem value="openrouter">OpenRouter</SelectItem>
                  <SelectItem value="google">Google Gemini (API Key)</SelectItem>
                  <SelectItem value="vertex">Google Vertex AI</SelectItem>
                  <SelectItem value="vertex-anthropic">Google Vertex Anthropic</SelectItem>
                  <SelectItem value="lmstudio">LM Studio</SelectItem>
                  <SelectItem value="local">Local (Ollama)</SelectItem>
                  <SelectItem value="webllm">WebLLM (In-Browser)</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Dynamic Fields based on Type */}
            {(['openai', 'anthropic', 'openrouter', 'custom', 'google'].includes(provider.type)) && (
              <div className="grid gap-2 animate-in fade-in slide-in-from-top-2">
                <Label className="flex items-center gap-2">
                  <Key className="w-3.5 h-3.5 text-muted-foreground" />
                  API Key
                </Label>
                <Input
                  type="password"
                  value={provider.apiKey || ''}
                  onChange={e => onChange({...provider, apiKey: e.target.value})}
                  placeholder={
                    provider.type === 'openrouter' ? 'sk-or-...' : 
                    provider.type === 'anthropic' ? 'sk-ant-...' : 
                    'sk-...'
                  }
                  className="bg-background/60 border-border font-mono text-sm"
                />
              </div>
            )}

            {(['openai', 'anthropic', 'openrouter', 'lmstudio', 'local', 'custom'].includes(provider.type)) && (
              <div className="grid gap-2 animate-in fade-in slide-in-from-top-2">
                <Label className="flex items-center gap-2">
                  <Globe className="w-3.5 h-3.5 text-muted-foreground" />
                  Endpoint {provider.type === 'lmstudio' ? '' : '(Optional)'}
                </Label>
                <Input
                  value={provider.endpoint || ''}
                  onChange={e => onChange({...provider, endpoint: e.target.value})}
                  placeholder={
                    provider.type === 'lmstudio' ? 'http://localhost:1234/v1' :
                    provider.type === 'local' ? 'http://localhost:11434' :
                    provider.type === 'openrouter' ? 'https://openrouter.ai/api/v1' :
                    'https://api.openai.com/v1'
                  }
                  className="bg-background/60 border-border font-mono text-sm"
                />
              </div>
            )}

            {(provider.type === 'vertex' || provider.type === 'vertex-anthropic') && (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-2 bg-muted/40 p-4 rounded-lg border border-border">
                <div className="grid gap-2">
                  <Label className="flex items-center gap-2">
                    <FileJson className="w-3.5 h-3.5 text-muted-foreground" />
                    Service Account JSON
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      readOnly
                      value={provider.authJsonPath || ''}
                      placeholder="No file selected"
                      className="flex-1 cursor-default bg-background/60 border-border text-xs"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="border-border hover:bg-muted"
                      onClick={async () => {
                        const filePath = await window.electronAPI.selectFile({
                          title: 'Select Service Account JSON',
                          filters: [{ name: 'JSON Files', extensions: ['json'] }],
                        });
                        if (filePath) {
                          onChange({...provider, authJsonPath: filePath});
                        }
                      }}
                    >
                      Browse…
                    </Button>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>GCP Project ID</Label>
                  <Input
                    value={provider.projectId || ''}
                    onChange={e => onChange({...provider, projectId: e.target.value})}
                    placeholder="my-gcp-project"
                    className="bg-background/60 border-border"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Region</Label>
                  <Select
                    value={provider.location || 'us-central1'}
                    onValueChange={(val) => onChange({...provider, location: val})}
                  >
                  <SelectTrigger className="bg-background/60 border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                      {['global','us-central1','us-east1','us-west1','europe-west1','europe-west4','asia-northeast1','asia-southeast1'].map(loc => (
                        <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 pt-2">
              <Checkbox
                id="enabled"
                checked={provider.enabled}
                onCheckedChange={(checked) => onChange({...provider, enabled: checked as boolean})}
                className="border-border data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
              />
              <Label htmlFor="enabled" className="cursor-pointer">Enable this provider</Label>
            </div>
          </div>

          {/* Right Column: Model Status */}
          <div className="col-span-5 flex flex-col h-full bg-background/40 rounded-xl border border-border overflow-hidden">
            <div className="p-3 border-b border-border bg-card/60 flex justify-between items-center">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Server className="w-4 h-4 text-blue-400" />
                Available Models
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-blue-400"
                      onClick={async (e) => {
                        e.preventDefault();
                        setFetchingModels(true);
                        try {
                          const models = await window.electronAPI.fetchProviderModels(provider, true);
                          if (models && models.length > 0) {
                            onChange({ ...provider, models });
                          }
                        } catch (err) {
                          console.error('Failed to refresh models:', err);
                          setModelError(err instanceof Error ? err.message : 'Failed to refresh models');
                        } finally {
                          setFetchingModels(false);
                        }
                      }}
                    >
                      <RotateCw className={cn("w-3.5 h-3.5", fetchingModels && "animate-spin")} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Force Refresh</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            
            <div className="flex-1 p-3 overflow-y-auto min-h-[300px] max-h-[500px]">
              {fetchingModels ? (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-3">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  <p className="text-xs">Fetching models...</p>
                </div>
              ) : modelError ? (
                <div className="h-full flex flex-col items-center justify-center text-red-400 gap-2 text-center p-4">
                  <AlertCircle className="w-8 h-8 opacity-50" />
                  <p className="text-sm font-medium">Connection Failed</p>
                  <p className="text-xs opacity-80">{modelError}</p>
                </div>
              ) : provider.models && provider.models.length > 0 ? (
                <div className="space-y-1.5">
                  {provider.models.map(model => (
                    <div key={model} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/60 group transition-colors">
                      <Cpu className="w-3 h-3 text-muted-foreground group-hover:text-blue-400" />
                      <span className="text-xs text-foreground font-mono truncate" title={model}>{model}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-2 text-center p-4">
                  <Server className="w-8 h-8 opacity-20" />
                  <p className="text-sm">No models found</p>
                  <p className="text-xs opacity-50 max-w-[150px]">
                    Configure credentials to fetch available models
                  </p>
                </div>
              )}
            </div>
            
            <div className="p-2 border-t border-border bg-card/40 text-xs text-center text-muted-foreground">
              {provider.models.length} models available
            </div>
          </div>
        </div>

        <DialogFooter className="border-t border-border pt-4">
          <Button variant="ghost" onClick={onClose} className="hover:bg-muted text-muted-foreground hover:text-foreground">
            Cancel
          </Button>
          <Button onClick={() => onSave(provider)} className="bg-blue-600 hover:bg-blue-500 text-white min-w-[100px]">
            Save Provider
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
