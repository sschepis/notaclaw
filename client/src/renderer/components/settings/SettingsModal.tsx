import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent } from '../ui/dialog';
import { Button } from '../ui/button';
import { AISettings, AIProviderConfig, AIRoutingRule } from '../../../shared/ai-types';
import { ProvidersTab } from './tabs/ProvidersTab';
import { RoutingRulesTab } from './tabs/RoutingRulesTab';
import { EditProviderDialog } from './EditProviderDialog';
import { GeneralSettings } from './GeneralSettings';
import { PluginSettingsRenderer } from './PluginSettingsRenderer';
import { Settings, Cpu, Palette, LayoutGrid, X, Puzzle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useSettingsTabs } from '../../services/SlotRegistry';
import { SlotErrorBoundary } from '../ui/SlotErrorBoundary';
import { useAppStore } from '../../store/useAppStore';
import { usePluginStore } from '../../store/usePluginStore';
import { BUILT_IN_THEMES, DEFAULT_CUSTOM_THEME } from '../../themes';
import { hexToHSL, hslToHex } from '../../utils/color';

interface SettingsModalProps {
  show: boolean;
  onClose: () => void;
}

const DEFAULT_PROVIDER: AIProviderConfig = {
  id: '',
  name: 'New Provider',
  type: 'openai',
  apiKey: '',
  models: [], // Models are auto-fetched from provider API
  enabled: true
};

export const SettingsModal: React.FC<SettingsModalProps> = ({ show, onClose }) => {
  const [activeCategory, setActiveCategory] = useState('ai');
  const { theme, setTheme, customTheme, updateCustomTheme } = useAppStore();
  const { plugins } = usePluginStore();
  
  // AI Settings State
  const [settings, setSettings] = useState<AISettings>({ providers: [], rules: [] });
  const [editingProvider, setEditingProvider] = useState<AIProviderConfig | null>(null);
  const [activeTab, setActiveTab] = useState(0); // 0 = Providers, 1 = Rules

  useEffect(() => {
    if (show) {
      loadSettings();
    }
  }, [show]);

  const loadSettings = async () => {
    try {
      const data = await window.electronAPI.getAISettings();
      setSettings(data);
    } catch (err) {
      console.error('Failed to load settings', err);
    }
  };

  const handleSave = async () => {
    try {
      await window.electronAPI.saveAISettings(settings);
      onClose();
    } catch (err) {
      console.error('Failed to save settings', err);
    }
  };

  // AI Helpers
  const handleAddProvider = () => {
    setEditingProvider({ ...DEFAULT_PROVIDER, id: Date.now().toString() });
  };

  const handleUpdateProvider = (provider: AIProviderConfig) => {
    setSettings(prev => ({
      ...prev,
      providers: prev.providers.map(p => p.id === provider.id ? provider : p)
    }));
    setEditingProvider(null);
  };

  const handleToggleProvider = (provider: AIProviderConfig) => {
    const updated = { ...provider, enabled: !provider.enabled };
    handleUpdateProvider(updated);
  };

  const handleSaveNewProvider = (provider: AIProviderConfig) => {
    setSettings(prev => ({
      ...prev,
      providers: [...prev.providers, provider]
    }));
    setEditingProvider(null);
  };

  const handleDeleteProvider = (id: string) => {
    setSettings(prev => ({
      ...prev,
      providers: prev.providers.filter(p => p.id !== id)
    }));
  };

  const handleUpdateRule = (index: number, field: keyof AIRoutingRule, value: any) => {
    const newRules = [...settings.rules];
    newRules[index] = { ...newRules[index], [field]: value };
    setSettings(prev => ({ ...prev, rules: newRules }));
  };

  const handleAddRule = () => {
    const newRule: AIRoutingRule = {
      id: Date.now().toString(),
      contentType: 'chat',
      providerId: settings.providers[0]?.id || '',
      priority: 1
    };
    setSettings(prev => ({ ...prev, rules: [...prev.rules, newRule] }));
  };

  const handleDeleteRule = (index: number) => {
    const newRules = [...settings.rules];
    newRules.splice(index, 1);
    setSettings(prev => ({ ...prev, rules: newRules }));
  };

  // Get plugin-registered settings tabs
  const pluginSettingsTabs = useSettingsTabs();

  // Filter plugins that have configuration but NO registered settings tab
  const configurablePlugins = useMemo(() => {
    return plugins.filter(p => 
      p.alephConfig?.configuration && 
      p.alephConfig.configuration.length > 0 &&
      !pluginSettingsTabs.find(t => t.pluginId === p.id)
    );
  }, [plugins, pluginSettingsTabs]);

  const NAV_ITEMS = useMemo(() => [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'ai', label: 'AI & Models', icon: Cpu },
    { id: 'appearance', label: 'Appearance', icon: Palette },
  ], []);
  
  // Check if current category is a plugin tab
  const activePluginTab = pluginSettingsTabs.find(t => t.id === activeCategory);
  
  // Check if current category is a configurable plugin (auto-generated)
  const activeConfigurablePlugin = configurablePlugins.find(p => `plugin:${p.id}` === activeCategory);

  return (
    <>
      <Dialog open={show} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-7xl p-0 overflow-hidden bg-background border-border text-foreground shadow-2xl shadow-black/80 h-[85vh] flex flex-col">
          
          <div className="flex flex-1 overflow-hidden">
              {/* Sidebar */}
              <div className="w-64 bg-card/60 border-r border-border p-4 space-y-2 backdrop-blur-sm flex flex-col overflow-y-auto">
                  <div className="mb-6 px-4">
                <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                      <LayoutGrid className="w-6 h-6 text-blue-500" />
                      Settings
                    </h2>
                  </div>
                  
                  <div className="space-y-1 flex-1">
                    {/* Built-in tabs */}
                    {NAV_ITEMS.map(item => (
                      <button
                        key={item.id}
                        onClick={() => setActiveCategory(item.id)}
                        className={cn(
                          "w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-3",
                          activeCategory === item.id
                            ? "bg-blue-600/10 text-blue-400 border border-blue-500/20 shadow-lg shadow-blue-500/5"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                      >
                          <item.icon className={cn("w-4 h-4", activeCategory === item.id ? "text-blue-400" : "text-muted-foreground")} />
                        {item.label}
                      </button>
                    ))}
                    
                    {/* Plugin-registered settings tabs */}
                    {pluginSettingsTabs.length > 0 && (
                      <>
                        <div className="my-2 border-t border-border" />
                        <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          Extensions
                        </div>
                        {pluginSettingsTabs.map(tab => {
                          const Icon = tab.icon;
                          return (
                            <button
                              key={tab.id}
                              onClick={() => setActiveCategory(tab.id)}
                              className={cn(
                                "w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-3",
                                  activeCategory === tab.id
                                    ? "bg-purple-600/10 text-purple-400 border border-purple-500/20 shadow-lg shadow-purple-500/5"
                                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                              )}
                            >
                              <Icon className={cn("w-4 h-4", activeCategory === tab.id ? "text-purple-400" : "text-muted-foreground")} />
                              {tab.label}
                            </button>
                          );
                        })}
                      </>
                    )}

                    {/* Configurable Plugins (Auto-generated) */}
                    {configurablePlugins.length > 0 && (
                      <>
                        <div className="my-2 border-t border-border" />
                        <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          Plugins
                        </div>
                        {configurablePlugins.map(plugin => (
                          <button
                            key={plugin.id}
                            onClick={() => setActiveCategory(`plugin:${plugin.id}`)}
                            className={cn(
                              "w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-3",
                              activeCategory === `plugin:${plugin.id}`
                                ? "bg-emerald-600/10 text-emerald-400 border border-emerald-500/20 shadow-lg shadow-emerald-500/5"
                                : "text-muted-foreground hover:bg-muted hover:text-foreground"
                            )}
                          >
                            <Puzzle className={cn("w-4 h-4", activeCategory === `plugin:${plugin.id}` ? "text-emerald-400" : "text-muted-foreground")} />
                            {plugin.name}
                          </button>
                        ))}
                      </>
                    )}
                  </div>

                  <div className="pt-4 border-t border-border">
                <div className="px-4 py-2 text-xs text-muted-foreground">
                  Version 0.1.0-alpha
                </div>
                  </div>
              </div>

              {/* Content Area */}
              <div className="flex-1 flex flex-col bg-background relative">
                  {/* Close Button */}
                  <div className="absolute top-4 right-4 z-50">
                    <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground">
                      <X className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-8">
                    {/* General Settings */}
                    {activeCategory === 'general' && (
                        <GeneralSettings />
                    )}

                    {/* AI Settings */}
                    {activeCategory === 'ai' && (
                        <div className="space-y-6 max-w-5xl mx-auto h-full flex flex-col">
                            <div className="flex items-center justify-between mb-2">
                              <div>
                                <h2 className="text-2xl font-bold text-foreground">AI Configuration</h2>
                                <p className="text-muted-foreground text-sm mt-1">Manage providers, models, and routing rules.</p>
                              </div>
                            </div>
                            
                            <div className="flex p-1 bg-card/60 rounded-lg border border-border w-fit backdrop-blur-sm">
                                <button 
                                    className={cn(
                                      "px-6 py-2 rounded-md text-sm font-medium transition-all duration-200",
                                      activeTab === 0 
                                        ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20" 
                                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                                    )}
                                    onClick={() => setActiveTab(0)}
                                >
                                    Providers
                                </button>
                                <button 
                                    className={cn(
                                      "px-6 py-2 rounded-md text-sm font-medium transition-all duration-200",
                                      activeTab === 1 
                                        ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20" 
                                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                                    )}
                                    onClick={() => setActiveTab(1)}
                                >
                                    Routing Rules
                                </button>
                            </div>

                            <div className="flex-1 mt-4">
                              {activeTab === 0 && (
                                <ProvidersTab
                                  providers={settings.providers}
                                  onAddProvider={handleAddProvider}
                                  onEditProvider={setEditingProvider}
                                  onDeleteProvider={handleDeleteProvider}
                                  onToggleProvider={handleToggleProvider}
                                />
                              )}

                              {activeTab === 1 && (
                                <RoutingRulesTab
                                  rules={settings.rules}
                                  providers={settings.providers}
                                  onUpdateRule={handleUpdateRule}
                                  onAddRule={handleAddRule}
                                  onDeleteRule={handleDeleteRule}
                                />
                              )}
                            </div>
                        </div>
                    )}

                    {/* Appearance Settings */}
                    {activeCategory === 'appearance' && (
                        <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <h2 className="text-2xl font-bold text-foreground mb-6">Appearance</h2>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {[...BUILT_IN_THEMES, DEFAULT_CUSTOM_THEME].map(t => {
                                const isCustom = t.id === 'custom';
                                const active = theme === t.id;
                                const displayTheme = isCustom && active ? customTheme : t;

                                return (
                                  <button
                                    key={t.id}
                                    onClick={() => setTheme(t.id)}
                                    className={cn(
                                      "relative p-4 rounded-xl border-2 text-left transition-all hover:scale-[1.02] group",
                                      active 
                                        ? "border-blue-500 bg-blue-500/10" 
                                        : "border-border bg-card/40 hover:border-border hover:bg-muted"
                                  )}
                                >
                                    <div className="flex items-center justify-between mb-3">
                                      <span className={cn(
                                        "font-medium transition-colors",
                                      active ? "text-blue-400" : "text-foreground group-hover:text-blue-400"
                                    )}>{displayTheme.name}</span>
                                      {active && (
                                        <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                                      )}
                                    </div>
                                    <p className="text-xs text-muted-foreground mb-4 h-8 line-clamp-2">{displayTheme.description}</p>
                                    <div className="flex gap-2">
                                      {/* Color swatches */}
                                      <div className="w-8 h-8 rounded-lg border border-white/10 shadow-sm" style={{ background: `hsl(${displayTheme.colors.background})` }} title="Background" />
                                      <div className="w-8 h-8 rounded-lg border border-white/10 shadow-sm" style={{ background: `hsl(${displayTheme.colors.primary})` }} title="Primary" />
                                      <div className="w-8 h-8 rounded-lg border border-white/10 shadow-sm" style={{ background: `hsl(${displayTheme.colors.secondary})` }} title="Secondary" />
                                      <div className="w-8 h-8 rounded-lg border border-white/10 shadow-sm" style={{ background: `hsl(${displayTheme.colors.accent})` }} title="Accent" />
                                    </div>
                                  </button>
                                );
                              })}
                            </div>

                            {/* Custom Theme Editor */}
                            {theme === 'custom' && (
                              <div className="mt-8 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="flex items-center justify-between">
                                  <h3 className="text-lg font-bold text-foreground">Customize Theme</h3>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => {
                                      // Reset to default custom theme
                                      updateCustomTheme(DEFAULT_CUSTOM_THEME.colors);
                                    }}
                                  >
                                    Reset Defaults
                                  </Button>
                                </div>
                                
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-6 border border-border rounded-xl bg-card/40">
                                  {[
                                    { key: 'background', label: 'Background' },
                                    { key: 'foreground', label: 'Text Color' },
                                    { key: 'primary', label: 'Primary Color' },
                                    { key: 'primaryForeground', label: 'Primary Text' },
                                    { key: 'secondary', label: 'Secondary Color' },
                                    { key: 'accent', label: 'Accent Color' },
                                    { key: 'card', label: 'Card Background' },
                                    { key: 'border', label: 'Borders' },
                                  ].map(({ key, label }) => (
                                    <div key={key} className="flex items-center justify-between group">
                                      <label className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">{label}</label>
                                      <div className="flex items-center gap-3">
                                        <span className="text-xs font-mono text-muted-foreground uppercase">
                                          {hslToHex(customTheme.colors[key as keyof typeof customTheme.colors])}
                                        </span>
                                        <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-border shadow-sm transition-transform active:scale-95">
                                          <input
                                            type="color"
                                            className="absolute inset-0 w-[150%] h-[150%] -top-1/4 -left-1/4 cursor-pointer p-0 border-0"
                                            value={hslToHex(customTheme.colors[key as keyof typeof customTheme.colors])}
                                            onChange={(e) => updateCustomTheme({ [key]: hexToHSL(e.target.value) })}
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            <div className="mt-8 p-6 border border-border rounded-xl bg-card/40">
                              <h3 className="text-sm font-medium text-foreground mb-2">About Themes</h3>
                              <p className="text-sm text-muted-foreground">
                                Themes affect the entire application interface. Changes are saved automatically and persist across sessions.
                              </p>
                            </div>
                        </div>
                    )}
                    
                    {/* Plugin Settings Tabs (Explicitly Registered) */}
                    {activePluginTab && (
                        <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <h2 className="text-2xl font-bold text-foreground mb-6">{activePluginTab.label}</h2>
                            <SlotErrorBoundary slotId="settings:tab" extensionId={activePluginTab.id}>
                                <activePluginTab.component />
                            </SlotErrorBoundary>
                        </div>
                    )}

                    {/* Auto-generated Plugin Settings */}
                    {activeConfigurablePlugin && (
                        <PluginSettingsRenderer plugin={activeConfigurablePlugin} />
                    )}
                  </div>
                  
                  {/* Footer Action Bar */}
                  <div className="p-6 border-t border-border bg-background/80 backdrop-blur-sm flex justify-end gap-3 sticky bottom-0 z-10">
                      <Button variant="ghost" onClick={onClose} className="hover:bg-muted text-muted-foreground hover:text-foreground">Cancel</Button>
                      <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-500 text-white min-w-[120px] shadow-lg shadow-blue-900/20">
                        Save Changes
                      </Button>
                  </div>
              </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Provider Modal */}
      {editingProvider && (
        <EditProviderDialog
          provider={editingProvider}
          onClose={() => setEditingProvider(null)}
          onSave={(provider) => {
            const exists = settings.providers.find(p => p.id === provider.id);
            if (exists) handleUpdateProvider(provider);
            else handleSaveNewProvider(provider);
          }}
          onChange={setEditingProvider}
        />
      )}
    </>
  );
};
