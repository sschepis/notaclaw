import React, { useEffect, useState } from 'react';
import { WidgetRenderer } from './components/WidgetRenderer';

interface AutoDashViewProps {
  context: any; // RendererPluginContext
}

export const AutoDashView: React.FC<AutoDashViewProps> = ({ context }) => {
  const [schema, setSchema] = useState<any>(null);
  const [lastUpdate, setLastUpdate] = useState<number>(Date.now());
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    // Listen for schema updates
    const handleUpdate = (newSchema: any) => {
      console.log('[AutoDashView] Received schema update:', newSchema);
      setSchema(newSchema);
      setLastUpdate(Date.now());
      setGenerating(false);
    };

    context.ipc.on('autodash:update', handleUpdate);

    return () => {
      // Cleanup if necessary
    };
  }, [context]);

  const handleAction = async (intent: string, actionContext: any) => {
    console.log('[AutoDashView] Triggering action:', intent);
    const result = await context.ipc.invoke('autodash:action', { intent, context: actionContext });
    console.log('[AutoDashView] Action result:', result);
  };

  const requestAIGeneration = async () => {
    setGenerating(true);
    try {
      await context.ipc.invoke('autodash:generate', {});
    } catch (e) {
      console.error('[AutoDashView] AI generation failed:', e);
      setGenerating(false);
    }
  };

  if (!schema) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <div className="text-center">
          <div className="mb-2">Waiting for system data...</div>
          <div className="text-xs text-gray-600">Dashboard updates every 5 seconds</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-gray-950 p-6 overflow-y-auto">
      <header className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">AutoDash</h1>
        <div className="flex items-center gap-4">
          <button
            onClick={requestAIGeneration}
            disabled={generating}
            className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
              generating
                ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-500 text-white'
            }`}
          >
            {generating ? 'Generating...' : '✨ AI Enhance'}
          </button>
          <div className="text-xs text-gray-500">
            {new Date(lastUpdate).toLocaleTimeString()}
          </div>
        </div>
      </header>

      <div className={`grid gap-4 ${
        schema.layout === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' :
        schema.layout === 'focus' ? 'grid-cols-1' :
        'grid-cols-1'
      }`}>
        {schema.widgets?.map((widget: any) => (
          <WidgetRenderer
            key={widget.id}
            widget={widget}
            onAction={handleAction}
          />
        ))}
      </div>
    </div>
  );
};
