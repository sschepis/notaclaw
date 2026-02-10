import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Badge } from '../../ui/badge';
import { PluginManifest } from '../../../../shared/plugin-types';
import { Puzzle, Check, Search, Sparkles, Shield, Zap, Brain, MessageCircle, Code, Database, Network } from 'lucide-react';

interface ExtensionsStepProps {
  onComplete: () => void;
}

// Category mapping for icons
const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  ai: <Brain className="w-4 h-4" />,
  security: <Shield className="w-4 h-4" />,
  communication: <MessageCircle className="w-4 h-4" />,
  development: <Code className="w-4 h-4" />,
  data: <Database className="w-4 h-4" />,
  network: <Network className="w-4 h-4" />,
  default: <Puzzle className="w-4 h-4" />,
};

// Category colors
const CATEGORY_COLORS: Record<string, string> = {
  ai: 'from-purple-500/20 to-pink-500/20 border-purple-500/30',
  security: 'from-emerald-500/20 to-teal-500/20 border-emerald-500/30',
  communication: 'from-blue-500/20 to-cyan-500/20 border-blue-500/30',
  development: 'from-orange-500/20 to-amber-500/20 border-orange-500/30',
  data: 'from-indigo-500/20 to-violet-500/20 border-indigo-500/30',
  network: 'from-rose-500/20 to-red-500/20 border-rose-500/30',
  default: 'from-gray-500/20 to-slate-500/20 border-gray-500/30',
};

// Infer category from plugin name/id
const getCategory = (plugin: PluginManifest): string => {
  const name = plugin.id.toLowerCase();
  if (name.includes('voice') || name.includes('chat') || name.includes('comm')) return 'communication';
  if (name.includes('security') || name.includes('vault') || name.includes('secret') || name.includes('backup')) return 'security';
  if (name.includes('code') || name.includes('interpreter') || name.includes('software')) return 'development';
  if (name.includes('data') || name.includes('graph') || name.includes('search') || name.includes('semantic')) return 'data';
  if (name.includes('network') || name.includes('mesh') || name.includes('swarm')) return 'network';
  if (name.includes('ai') || name.includes('llm') || name.includes('agent') || name.includes('resonant')) return 'ai';
  return 'default';
};

export const ExtensionsStep: React.FC<ExtensionsStepProps> = ({ onComplete }) => {
  const [plugins, setPlugins] = useState<PluginManifest[]>([]);
  const [selectedPlugins, setSelectedPlugins] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchPlugins = async () => {
      try {
        const installedPlugins = await window.electronAPI.getPlugins();
        // Filter to only show non-core (extended) plugins
        const extendedPlugins = installedPlugins.filter((p: PluginManifest) => !p.isCore);
        setPlugins(extendedPlugins);
        
        // Pre-select plugins that are currently active
        const activePlugins = extendedPlugins
          .filter((p: PluginManifest) => p.status === 'active')
          .map((p: PluginManifest) => p.id);
        setSelectedPlugins(new Set(activePlugins));
      } catch (error) {
        console.error("Failed to fetch plugins", error);
      } finally {
        setLoading(false);
      }
    };
    fetchPlugins();
  }, []);

  const togglePlugin = (id: string) => {
    setSelectedPlugins(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleContinue = async () => {
    setSaving(true);
    try {
      // Enable selected plugins, disable unselected
      for (const plugin of plugins) {
        if (selectedPlugins.has(plugin.id)) {
          if (plugin.status === 'disabled') {
            await window.electronAPI.pluginEnable(plugin.id);
          }
        } else {
          if (plugin.status === 'active') {
            await window.electronAPI.pluginDisable(plugin.id);
          }
        }
      }
      onComplete();
    } catch (error) {
      console.error("Failed to save plugin preferences", error);
      // Continue anyway
      onComplete();
    }
  };

  const filteredPlugins = plugins.filter(plugin =>
    plugin.name.toLowerCase().includes(search.toLowerCase()) ||
    plugin.description.toLowerCase().includes(search.toLowerCase())
  );

  // Group plugins by category
  const groupedPlugins = filteredPlugins.reduce((acc, plugin) => {
    const category = getCategory(plugin);
    if (!acc[category]) acc[category] = [];
    acc[category].push(plugin);
    return acc;
  }, {} as Record<string, PluginManifest[]>);

  const categoryOrder = ['ai', 'development', 'data', 'communication', 'security', 'network', 'default'];
  const sortedCategories = Object.keys(groupedPlugins).sort(
    (a, b) => categoryOrder.indexOf(a) - categoryOrder.indexOf(b)
  );

  const categoryLabels: Record<string, string> = {
    ai: 'AI & Agents',
    security: 'Security & Privacy',
    communication: 'Communication',
    development: 'Development Tools',
    data: 'Data & Search',
    network: 'Network & Mesh',
    default: 'Other Extensions',
  };

  return (
    <motion.div
      className="space-y-5"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -30 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      {/* Header */}
      <div className="text-center space-y-3">
        <motion.div
          className="w-16 h-16 mx-auto bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-2xl flex items-center justify-center border border-blue-500/20"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, type: 'spring' }}
        >
          <Sparkles className="w-8 h-8 text-blue-400" />
        </motion.div>

        <motion.h2
          className="text-2xl font-bold"
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          Choose Your Extensions
        </motion.h2>
        <motion.p
          className="text-gray-400 text-sm max-w-sm mx-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          Select the capabilities you want to enable. You can always change these later in Settings.
        </motion.p>
      </div>

      {/* Search */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="relative"
      >
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <Input
          placeholder="Search extensions..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 bg-white/[0.03] border-white/[0.08] focus:border-blue-500/50 h-11"
        />
      </motion.div>

      {/* Selection Stats */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="flex items-center justify-between text-sm"
      >
        <span className="text-gray-400">
          <span className="text-blue-400 font-semibold">{selectedPlugins.size}</span> of {plugins.length} selected
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedPlugins(new Set(plugins.map(p => p.id)))}
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
          >
            Select All
          </button>
          <span className="text-gray-600">|</span>
          <button
            onClick={() => setSelectedPlugins(new Set())}
            className="text-xs text-gray-400 hover:text-gray-300 transition-colors"
          >
            Clear
          </button>
        </div>
      </motion.div>

      {/* Extensions Grid */}
      <motion.div
        className="max-h-[40vh] overflow-y-auto space-y-4 pr-1 custom-scrollbar"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto" />
            <p className="text-gray-500 text-sm mt-3">Loading extensions...</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {sortedCategories.map((category, catIdx) => (
              <motion.div
                key={category}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * catIdx }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-gray-500">{CATEGORY_ICONS[category]}</span>
                  <span className="text-[10px] uppercase tracking-widest text-white/30 font-semibold">
                    {categoryLabels[category]}
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {groupedPlugins[category].map((plugin) => {
                    const isSelected = selectedPlugins.has(plugin.id);
                    const colors = CATEGORY_COLORS[category];
                    
                    return (
                      <motion.button
                        key={plugin.id}
                        layout
                        onClick={() => togglePlugin(plugin.id)}
                        className={`p-3 rounded-xl border transition-all duration-300 text-left ${
                          isSelected
                            ? `bg-gradient-to-br ${colors} shadow-lg ring-1 ring-white/10`
                            : 'bg-white/[0.02] border-white/[0.06] hover:border-white/10 hover:bg-white/[0.04]'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {/* Icon or initials */}
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                            isSelected ? 'bg-white/10' : 'bg-white/[0.03]'
                          }`}>
                            {plugin.icon ? (
                              <img src={plugin.icon} alt="" className="w-6 h-6 rounded" />
                            ) : (
                              <span className="text-xs font-bold text-white/40">
                                {plugin.name.substring(0, 2).toUpperCase()}
                              </span>
                            )}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className={`font-semibold text-sm ${isSelected ? 'text-white' : 'text-white/70'}`}>
                                {plugin.name}
                              </span>
                              {plugin.isAlephExtension && (
                                <Badge variant="outline" className="text-[8px] px-1 py-0 h-4 border-blue-500/50 text-blue-400">
                                  Aleph
                                </Badge>
                              )}
                            </div>
                            <p className="text-[11px] text-white/40 line-clamp-1">
                              {plugin.description}
                            </p>
                          </div>

                          {/* Checkbox */}
                          <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
                            isSelected 
                              ? 'bg-blue-500 border-blue-500' 
                              : 'border-white/20'
                          }`}>
                            {isSelected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                          </div>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            ))}

            {filteredPlugins.length === 0 && !loading && (
              <div className="text-center py-8 text-gray-500 text-sm">
                No extensions found matching "{search}"
              </div>
            )}
          </AnimatePresence>
        )}
      </motion.div>

      {/* Quick Presets */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="flex flex-wrap gap-2"
      >
        <span className="text-[10px] text-white/30 self-center">Quick:</span>
        <button
          onClick={() => {
            const devPlugins = plugins.filter(p => 
              p.id.includes('code') || p.id.includes('software') || p.id.includes('interpreter')
            ).map(p => p.id);
            setSelectedPlugins(new Set(devPlugins));
          }}
          className="px-2 py-1 text-[10px] rounded-full bg-white/[0.03] border border-white/[0.08] text-white/50 hover:text-white/80 hover:border-white/20 transition-colors"
        >
          <Zap className="w-3 h-3 inline mr-1" />
          Developer
        </button>
        <button
          onClick={() => {
            const aiPlugins = plugins.filter(p => 
              p.id.includes('agent') || p.id.includes('ai') || p.id.includes('resonant')
            ).map(p => p.id);
            setSelectedPlugins(new Set(aiPlugins));
          }}
          className="px-2 py-1 text-[10px] rounded-full bg-white/[0.03] border border-white/[0.08] text-white/50 hover:text-white/80 hover:border-white/20 transition-colors"
        >
          <Brain className="w-3 h-3 inline mr-1" />
          AI Focus
        </button>
        <button
          onClick={() => {
            const minimalPlugins = plugins.slice(0, 5).map(p => p.id);
            setSelectedPlugins(new Set(minimalPlugins));
          }}
          className="px-2 py-1 text-[10px] rounded-full bg-white/[0.03] border border-white/[0.08] text-white/50 hover:text-white/80 hover:border-white/20 transition-colors"
        >
          Minimal
        </button>
      </motion.div>

      {/* Continue Button */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
      >
        <Button
          onClick={handleContinue}
          disabled={saving}
          className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/20 border border-blue-500/20 transition-all duration-300 disabled:opacity-40 disabled:shadow-none"
        >
          {saving ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Saving...
            </span>
          ) : (
            'Continue'
          )}
        </Button>
      </motion.div>

      {/* Skip option */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="text-center"
      >
        <button
          onClick={onComplete}
          className="text-xs text-white/30 hover:text-white/50 transition-colors"
        >
          Skip for now
        </button>
      </motion.div>
    </motion.div>
  );
};
