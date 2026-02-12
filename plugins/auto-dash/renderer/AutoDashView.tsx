import React, { useEffect, useMemo, useState } from 'react';
import WidthProvider, { Responsive } from 'react-grid-layout';
import { useDashboardStore } from '../src/store';
import { widgetRegistry } from '../src/WidgetRegistry';
import { registerWidgets } from './widgets/index';
import { WidgetContext } from './WidgetContext';
import { WidgetInstance } from '../src/types';

const ResponsiveGridLayout = WidthProvider(Responsive as any) as any;

interface AutoDashViewProps {
  context: any;
}

export const AutoDashView: React.FC<AutoDashViewProps> = ({ context }) => {
  const { 
    layouts, 
    widgets, 
    updateLayout, 
    isEditing, 
    setEditing,
    setWidgets,
    setLayouts,
    addWidget,
    removeWidget
  } = useDashboardStore();

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    registerWidgets();
    setMounted(true);

    const handleUpdate = (newSchema: any) => {
      console.log('[AutoDashView] Received update:', newSchema);
      if (newSchema.widgets) {
        const newWidgets: Record<string, WidgetInstance> = {};
        const newLayout: any[] = [];
        
        newSchema.widgets.forEach((w: any, i: number) => {
          const id = w.id || `widget-${i}`;
          newWidgets[id] = {
            id: id,
            type: w.type,
            config: { title: w.title, context: w.context, ...w.config },
            dataSource: w.dataSource,
            data: w.data
          };
          
          // Use saved layout if available
          const savedLayout = w.config?.layout;
          
          newLayout.push({
            i: id,
            x: savedLayout ? savedLayout.x : (i * 4) % 12,
            y: savedLayout ? savedLayout.y : Math.floor((i * 4) / 12) * 4,
            w: savedLayout ? savedLayout.w : 4,
            h: savedLayout ? savedLayout.h : 4
          });
        });
        
        setWidgets(newWidgets);
        setLayouts({ lg: newLayout });
      }
    };

    context.ipc.on('autodash:update', handleUpdate);
    return () => {
    };
  }, [context, setWidgets, setLayouts]);

  const onLayoutChange = (layout: any[], allLayouts: any) => {
    updateLayout(layout);
  };

  const handleSave = async () => {
    setEditing(false);
    
    const currentWidgets = Object.values(widgets).map(w => {
        const l = (layouts['lg'] || []).find((l: any) => l.i === w.id);
        return {
            id: w.id,
            type: w.type,
            title: w.config.title,
            context: w.config.context,
            config: {
                ...w.config,
                layout: l ? { x: l.x, y: l.y, w: l.w, h: l.h } : undefined
            },
            dataSource: w.dataSource,
            data: w.data
        };
    });

    await context.ipc.invoke('autodash:save-layout', {
        layout: 'grid',
        widgets: currentWidgets
    });
  };

  const handleAction = (intent: string, actionContext: any) => {
    context.ipc.invoke('autodash:action', { intent, context: actionContext });
  };

  const widgetContextValue = useMemo(() => ({ onAction: handleAction }), [context]);

  const requestAIGeneration = async () => {
    try {
      await context.ipc.invoke('autodash:generate', {});
    } catch (e) {
      console.error('AI Generation failed', e);
    }
  };

  const handleAddWidget = () => {
      const id = `new-widget-${Date.now()}`;
      const newWidget: WidgetInstance = {
          id,
          type: 'metric',
          config: { title: 'New Metric' },
          data: { value: 0, unit: 'units' }
      };
      const layoutItem = {
          i: id,
          x: 0,
          y: Infinity,
          w: 4,
          h: 4
      };
      addWidget(newWidget, layoutItem as any);
  };

  if (!mounted) return <div className="p-4 text-gray-400">Initializing AutoDash...</div>;

  return (
    <div className="h-full w-full bg-gray-950 flex flex-col overflow-hidden">
      <header className="flex justify-between items-center p-4 bg-gray-900 border-b border-gray-800 shrink-0">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
            AutoDash
            <span className="text-xs font-normal text-gray-500 bg-gray-800 px-2 py-0.5 rounded">v2.0</span>
        </h1>
        <div className="flex gap-2">
          {isEditing && (
              <button
                onClick={handleAddWidget}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm transition-colors"
              >
                  + Add Widget
              </button>
          )}
          <button
            onClick={requestAIGeneration}
            className="px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded text-sm transition-colors flex items-center gap-1"
          >
            <span>✨</span> AI Enhance
          </button>
          <button
            onClick={() => isEditing ? handleSave() : setEditing(true)}
            className={`px-3 py-1 rounded text-sm transition-colors ${
              isEditing ? 'bg-green-600 hover:bg-green-500 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
            }`}
          >
            {isEditing ? 'Save & Done' : 'Edit Layout'}
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4">
        <WidgetContext.Provider value={widgetContextValue}>
            {Object.keys(widgets).length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-500">
                    <p className="mb-4">No widgets configured.</p>
                    <button 
                        onClick={requestAIGeneration}
                        className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded text-sm"
                    >
                        Ask AI to build a dashboard
                    </button>
                </div>
            ) : (
                <ResponsiveGridLayout
                    className="layout"
                    layouts={layouts}
                    breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
                    cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
                    rowHeight={30}
                    onLayoutChange={onLayoutChange}
                    isDraggable={isEditing}
                    isResizable={isEditing}
                    draggableHandle=".drag-handle"
                    margin={[10, 10]}
                >
                    {Object.values(widgets).map((widget) => {
                    const def = widgetRegistry.get(widget.type);
                    if (!def) {
                        return (
                            <div key={widget.id} className="bg-red-900/20 border border-red-800 rounded p-2 text-red-400 text-xs">
                                Unknown widget: {widget.type}
                            </div>
                        );
                    }
                    
                    const Component = def.component;

                    return (
                        <div key={widget.id} className="bg-gray-900/50 border border-gray-800 rounded-lg overflow-hidden flex flex-col shadow-sm hover:shadow-md transition-shadow">
                            {isEditing && (
                                <div className="drag-handle h-6 bg-gray-800/80 cursor-move flex items-center px-2 border-b border-gray-800 shrink-0">
                                    <span className="text-xs text-gray-400 font-mono">{def.name}</span>
                                    <div className="ml-auto flex gap-1">
                                        <button
                                            className="text-gray-500 hover:text-red-400 px-1"
                                            onClick={(e) => {
                                                e.stopPropagation(); // Prevent drag start
                                                if (confirm('Remove widget?')) {
                                                    removeWidget(widget.id);
                                                }
                                            }}
                                        >
                                            ×
                                        </button>
                                    </div>
                                </div>
                            )}
                            <div className="flex-1 overflow-auto p-2 relative">
                                <Component id={widget.id} config={widget.config} data={widget.data || {}} />
                            </div>
                        </div>
                    );
                    })}
                </ResponsiveGridLayout>
            )}
        </WidgetContext.Provider>
      </div>
    </div>
  );
};
