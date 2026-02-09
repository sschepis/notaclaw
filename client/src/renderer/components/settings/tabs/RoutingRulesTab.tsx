import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Button } from '../../ui/button';
import { AIRoutingRule, AIProviderConfig } from '../../../../shared/ai-types';
import { Trash2, Zap, MessageSquare, Code, FileText, BarChart2, Bot } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { Card, CardContent } from '../../ui/card';

interface RoutingRulesTabProps {
  rules: AIRoutingRule[];
  providers: AIProviderConfig[];
  onUpdateRule: (index: number, field: keyof AIRoutingRule, value: any) => void;
  onAddRule: () => void;
  onDeleteRule: (index: number) => void;
}

const CONTENT_TYPE_ICONS: Record<string, React.ReactNode> = {
  chat: <MessageSquare className="w-4 h-4 text-blue-400" />,
  agent: <Bot className="w-4 h-4 text-orange-400" />,
  code: <Code className="w-4 h-4 text-purple-400" />,
  embedding: <Zap className="w-4 h-4 text-yellow-400" />,
  summary: <FileText className="w-4 h-4 text-green-400" />,
  analysis: <BarChart2 className="w-4 h-4 text-red-400" />,
};

export const RoutingRulesTab: React.FC<RoutingRulesTabProps> = ({
  rules,
  providers,
  onUpdateRule,
  onAddRule,
  onDeleteRule
}) => {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-semibold text-white">Routing Rules</h3>
          <p className="text-sm text-gray-400 mt-1 max-w-2xl">
            Configure how different types of AI requests are handled. Rules are evaluated in order of priority (highest first).
          </p>
        </div>
        <Button onClick={onAddRule} className="bg-blue-600 hover:bg-blue-500">
          Add Rule
        </Button>
      </div>

      <div className="space-y-3">
        {/* Header */}
        <div className="grid grid-cols-12 gap-4 px-4 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider">
          <div className="col-span-1 text-center">Priority</div>
          <div className="col-span-3">Content Type</div>
          <div className="col-span-4">Provider</div>
          <div className="col-span-3">Specific Model</div>
          <div className="col-span-1 text-right">Actions</div>
        </div>

        {/* Rules List */}
        <div className="space-y-2">
          {rules.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-gray-800 rounded-xl bg-gray-900/30">
              <Zap className="w-12 h-12 text-gray-700 mx-auto mb-3" />
              <h4 className="text-gray-400 font-medium">No routing rules defined</h4>
              <p className="text-gray-600 text-sm mt-1">Create a rule to direct specific tasks to specialized models.</p>
              <Button variant="outline" size="sm" onClick={onAddRule} className="mt-4 border-gray-700 text-gray-300 hover:bg-gray-800">
                Create Default Rule
              </Button>
            </div>
          ) : (
            rules
              .sort((a, b) => b.priority - a.priority)
              .map((rule, idx) => {
                const selectedProvider = providers.find(p => p.id === rule.providerId);
                
                return (
                  <Card key={rule.id || idx} className="bg-gray-900/40 border-gray-800 hover:border-gray-700 transition-colors">
                    <CardContent className="p-3">
                      <div className="grid grid-cols-12 gap-4 items-center">
                        {/* Priority */}
                        <div className="col-span-1 flex justify-center">
                          <div className="bg-gray-800 text-gray-300 text-xs font-mono py-1 px-2 rounded border border-gray-700 w-12 text-center">
                            {rule.priority}
                          </div>
                        </div>

                        {/* Content Type */}
                        <div className="col-span-3">
                          <Select
                            value={rule.contentType}
                            onValueChange={(val) => onUpdateRule(idx, 'contentType', val)}
                          >
                            <SelectTrigger className="h-9 bg-gray-950/50 border-gray-700 text-gray-200 focus:ring-blue-500/20">
                              <div className="flex items-center gap-2">
                                {CONTENT_TYPE_ICONS[rule.contentType] || <Zap className="w-4 h-4 text-gray-400" />}
                                <span className="font-medium text-gray-200 capitalize">{rule.contentType}</span>
                              </div>
                            </SelectTrigger>
                            <SelectContent className="bg-gray-900 border-gray-700">
                              {Object.entries(CONTENT_TYPE_ICONS).map(([type, icon]) => (
                                <SelectItem key={type} value={type} className="text-gray-200 focus:bg-gray-800">
                                  <div className="flex items-center gap-2">
                                    {icon}
                                    <span className="capitalize">{type}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Provider Selection */}
                        <div className="col-span-4">
                          <Select
                            value={rule.providerId}
                            onValueChange={(val) => onUpdateRule(idx, 'providerId', val)}
                          >
                            <SelectTrigger className="h-9 bg-gray-950/50 border-gray-700 text-gray-200 focus:ring-blue-500/20">
                              <SelectValue placeholder="Select Provider" />
                            </SelectTrigger>
                            <SelectContent className="bg-gray-900 border-gray-700">
                              {providers.map(p => (
                                <SelectItem key={p.id} value={p.id} className="text-gray-200 focus:bg-gray-800">
                                  <div className="flex items-center gap-2">
                                    <span className={cn("w-2 h-2 rounded-full", p.enabled ? "bg-emerald-500" : "bg-gray-600")} />
                                    {p.name}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Model Selection */}
                        <div className="col-span-3">
                          {selectedProvider ? (
                            <Select
                              value={rule.model || ''}
                              onValueChange={(val) => onUpdateRule(idx, 'model', val === 'default' ? undefined : val)}
                              disabled={!selectedProvider.models.length}
                            >
                              <SelectTrigger className="h-9 bg-gray-950/50 border-gray-700 text-gray-200 focus:ring-blue-500/20">
                                <SelectValue placeholder="Default Model" />
                              </SelectTrigger>
                              <SelectContent className="bg-gray-900 border-gray-700">
                                <SelectItem value="default" className="text-gray-400 italic">Default Model</SelectItem>
                                {selectedProvider.models.map(m => (
                                  <SelectItem key={m} value={m} className="text-gray-200 focus:bg-gray-800 font-mono text-xs">
                                    {m}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <div className="text-xs text-gray-600 italic px-2">Select provider first</div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="col-span-1 flex justify-end">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-gray-500 hover:text-red-400 hover:bg-red-950/20 rounded-full"
                            onClick={() => onDeleteRule(idx)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
          )}
        </div>
      </div>
    </div>
  );
};
