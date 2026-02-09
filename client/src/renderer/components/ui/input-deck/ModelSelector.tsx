import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/select';
import { AIProviderConfig } from '../../../../shared/ai-types';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../ui/tooltip';

interface ModelSelectorProps {
  selectedModel: string | null;
  onModelChange: (model: string) => void;
  isGenerating: boolean;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  selectedModel,
  onModelChange,
  isGenerating,
}) => {
  const [providers, setProviders] = useState<AIProviderConfig[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProviders();
  }, []);

  const loadProviders = async () => {
    try {
      const settings = await window.electronAPI.getAISettings();
      const enabledProviders = settings.providers.filter(p => p.enabled);
      
      // Fetch fresh models for each provider (uses 24hr cache internally)
      const providersWithModels = await Promise.all(
        enabledProviders.map(async (provider) => {
          try {
            const models = await window.electronAPI.fetchProviderModels(provider);
            return { ...provider, models };
          } catch (err) {
            console.warn(`Failed to fetch models for ${provider.name}:`, err);
            // Fall back to stored models if fetch fails
            return provider;
          }
        })
      );
      
      setProviders(providersWithModels);
      setLoading(false);
    } catch (err) {
      console.error('Failed to load AI providers:', err);
      setLoading(false);
    }
  };

  // Build list of all available models
  const allModels = providers.flatMap(provider =>
    provider.models.map(model => ({
      id: `${provider.id}:${model}`,
      name: model,
      providerName: provider.name,
    }))
  );

  // Parse selected model to get display name
  const getDisplayValue = () => {
    if (!selectedModel) return undefined;
    const parts = selectedModel.split(':');
    return parts.length > 1 ? parts[1] : selectedModel;
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.3 }}
          className="w-full"
        >
          <Select
            value={selectedModel || ''}
            onValueChange={onModelChange}
            disabled={isGenerating || loading || allModels.length === 0}
          >
            <SelectTrigger
              className={`h-7 px-2.5 text-[11px] font-medium rounded-md transition-all border-0 shadow-none focus:ring-0 gap-2 w-auto min-w-[140px] justify-start ${
                isGenerating || loading
                  ? 'bg-transparent text-muted-foreground cursor-not-allowed'
                  : 'bg-muted/40 hover:bg-muted/60 text-muted-foreground hover:text-foreground'
              }`}
            >
              <svg className="w-3.5 h-3.5 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
              <SelectValue placeholder="Select Model">
                <span className="truncate">{getDisplayValue() || "Select Model"}</span>
              </SelectValue>
            </SelectTrigger>

            <SelectContent className="bg-popover/95 backdrop-blur-sm border-border text-popover-foreground max-h-[300px]">
              {loading ? (
                <div className="px-3 py-2 text-xs text-muted-foreground">Loading models...</div>
              ) : allModels.length === 0 ? (
                <div className="px-3 py-2 text-xs text-muted-foreground">No models available</div>
              ) : (
                providers.map(provider => (
                  <div key={provider.id}>
                    {/* Provider Group Label */}
                    <div className="px-2 py-1.5 text-[10px] uppercase tracking-wider font-bold text-muted-foreground/70 bg-muted/20">
                      {provider.name}
                    </div>

                    {/* Models for this provider */}
                    {provider.models.map(model => (
                      <SelectItem
                        key={`${provider.id}:${model}`}
                        value={`${provider.id}:${model}`}
                        className="text-xs py-1.5 px-2 cursor-pointer focus:bg-primary/10 focus:text-primary"
                      >
                        <span className="font-medium">{model}</span>
                      </SelectItem>
                    ))}

                    {/* Divider between providers */}
                    {provider !== providers[providers.length - 1] && (
                      <div className="my-1 border-t border-border/50" />
                    )}
                  </div>
                ))
              )}
            </SelectContent>
          </Select>
        </motion.div>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        <p>AI Model</p>
      </TooltipContent>
    </Tooltip>
  );
};
