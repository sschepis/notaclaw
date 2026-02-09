import React, { useMemo } from 'react';
import { Button } from '../../ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { AIProviderConfig } from '../../../../shared/ai-types';
import { PROVIDER_META } from '../../ai-provider/ProviderMetadata';
import { Plus, Settings2, Trash2, Power, AlertCircle } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../ui/tooltip';

interface ProvidersTabProps {
  providers: AIProviderConfig[];
  onAddProvider: () => void;
  onEditProvider: (provider: AIProviderConfig) => void;
  onDeleteProvider: (id: string) => void;
  onToggleProvider: (provider: AIProviderConfig) => void;
}

export const ProvidersTab: React.FC<ProvidersTabProps> = ({
  providers,
  onAddProvider,
  onEditProvider,
  onDeleteProvider,
  onToggleProvider
}) => {
  
  const categorizedProviders = useMemo(() => {
    const cloud = providers.filter(p => PROVIDER_META[p.type]?.category === 'cloud');
    const local = providers.filter(p => PROVIDER_META[p.type]?.category === 'local' || !PROVIDER_META[p.type]);
    return { cloud, local };
  }, [providers]);

  const renderProviderCard = (provider: AIProviderConfig) => {
    const meta = PROVIDER_META[provider.type] || {
      name: 'Custom Provider',
      icon: '⚡',
      gradient: 'from-gray-500/20 to-slate-500/20',
      borderActive: 'border-gray-500/30',
      desc: 'Custom AI Endpoint',
      category: 'local'
    };

    const isConfigured = (
      (provider.type === 'openai' && provider.apiKey) ||
      (provider.type === 'anthropic' && provider.apiKey) ||
      (provider.type === 'openrouter' && provider.apiKey) ||
      (provider.type === 'google' && provider.apiKey) ||
      (provider.type === 'vertex' && provider.projectId) ||
      (provider.type === 'local' && provider.endpoint) ||
      (provider.type === 'lmstudio' && provider.endpoint) ||
      (provider.type === 'webllm')
    );

    return (
      <Card 
        key={provider.id} 
        className={cn(
          "relative overflow-hidden transition-all duration-200 border-gray-800 bg-gray-900/40 hover:bg-gray-900/60 group",
          provider.enabled ? meta.borderActive : "border-gray-800",
          provider.enabled ? "shadow-lg shadow-black/20" : "opacity-80"
        )}
      >
        {/* Background Gradient */}
        <div className={cn(
          "absolute inset-0 bg-gradient-to-br opacity-0 transition-opacity duration-500",
          meta.gradient,
          provider.enabled ? "opacity-100" : "group-hover:opacity-50"
        )} />

        <CardHeader className="relative z-10 flex flex-row items-start justify-between pb-2">
          <div className="flex items-center gap-3">
            <div className={cn(
              "flex h-10 w-10 items-center justify-center rounded-lg text-lg font-bold bg-gray-950/50 backdrop-blur-sm border border-white/5",
              provider.enabled ? "text-white" : "text-gray-500"
            )}>
              {meta.icon}
            </div>
            <div>
              <CardTitle className="text-base font-bold text-gray-100 flex items-center gap-2">
                {provider.name}
                {!isConfigured && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Missing configuration</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </CardTitle>
              <CardDescription className="text-xs text-gray-400 font-medium">
                {meta.desc}
              </CardDescription>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
             <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className={cn(
                      "h-8 w-8 rounded-full transition-colors",
                      provider.enabled 
                        ? "text-emerald-400 hover:text-emerald-300 hover:bg-emerald-400/10" 
                        : "text-gray-500 hover:text-gray-300 hover:bg-gray-800"
                    )}
                    onClick={() => onToggleProvider(provider)}
                  >
                    <Power className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{provider.enabled ? 'Disable Provider' : 'Enable Provider'}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </CardHeader>

        <CardContent className="relative z-10 pb-3">
          <div className="flex flex-wrap gap-2 mt-2">
            {provider.models.length > 0 ? (
              <>
                {provider.models.slice(0, 3).map(model => (
                  <Badge key={model} variant="secondary" className="bg-gray-950/40 text-gray-300 border-white/5 hover:bg-gray-950/60">
                    {model}
                  </Badge>
                ))}
                {provider.models.length > 3 && (
                  <Badge variant="outline" className="border-gray-700 text-gray-400 bg-transparent">
                    +{provider.models.length - 3} more
                  </Badge>
                )}
              </>
            ) : (
              <span className="text-xs text-gray-500 italic">No models fetched</span>
            )}
          </div>
        </CardContent>

        <CardFooter className="relative z-10 pt-0 flex justify-between items-center border-t border-white/5 bg-black/20 p-3">
          <div className="text-xs text-gray-500 font-mono">
            {provider.type}
          </div>
          <div className="flex gap-2">
            <Button 
              size="sm" 
              variant="ghost" 
              className="h-7 text-xs hover:bg-white/10"
              onClick={() => onEditProvider(provider)}
            >
              <Settings2 className="mr-1.5 h-3.5 w-3.5" />
              Configure
            </Button>
            <Button 
              size="sm" 
              variant="ghost" 
              className="h-7 text-xs text-red-400 hover:text-red-300 hover:bg-red-950/30"
              onClick={() => onDeleteProvider(provider.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardFooter>
      </Card>
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Action */}
      <div className="flex justify-between items-center bg-gray-900/50 p-4 rounded-xl border border-gray-800 backdrop-blur-sm sticky top-0 z-20">
        <div>
          <h3 className="text-lg font-semibold text-white">AI Providers</h3>
          <p className="text-sm text-gray-400">Manage your connections to AI models and services.</p>
        </div>
        <Button onClick={onAddProvider} className="bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20">
          <Plus className="mr-2 h-4 w-4" />
          Add Provider
        </Button>
      </div>

      {/* Cloud Providers Section */}
      <div className="space-y-4">
        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider px-1 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
          Cloud Providers
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {categorizedProviders.cloud.map(renderProviderCard)}
          {categorizedProviders.cloud.length === 0 && (
            <div className="col-span-full border border-dashed border-gray-800 rounded-xl p-8 text-center text-gray-500 bg-gray-900/20">
              No cloud providers configured.
            </div>
          )}
        </div>
      </div>

      {/* Local Providers Section */}
      <div className="space-y-4">
        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider px-1 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          Local & Custom Providers
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {categorizedProviders.local.map(renderProviderCard)}
          {categorizedProviders.local.length === 0 && (
            <div className="col-span-full border border-dashed border-gray-800 rounded-xl p-8 text-center text-gray-500 bg-gray-900/20">
              No local providers configured.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
