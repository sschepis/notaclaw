import React from 'react';
import { MetricCard } from './MetricCard';
import { LogViewer } from './LogViewer';
import { ActionConsole } from './ActionConsole';
import { SimpleChart } from './SimpleChart';

interface Widget {
  id: string;
  type: "metric" | "log" | "chat" | "list" | "chart";
  title?: string;
  data: any;
  context?: any;
  actions?: any[];
}

interface WidgetRendererProps {
  widget: Widget;
  onAction: (intent: string, context: any) => void;
}

export const WidgetRenderer: React.FC<WidgetRendererProps> = ({ widget, onAction }) => {
  const renderContent = () => {
    switch (widget.type) {
      case 'metric':
        return <MetricCard title={widget.title || 'Metric'} data={widget.data} context={widget.context} />;
      case 'log':
        return <LogViewer title={widget.title || 'Logs'} data={widget.data} />;
      case 'chat':
        return <div className="text-gray-400">Chat widget placeholder</div>;
      case 'list':
        return <div className="text-gray-400">List widget placeholder</div>;
      case 'chart':
        return <SimpleChart title={widget.title || 'Chart'} data={widget.data} />;
      default:
        return <div className="text-red-400">Unknown widget type: {widget.type}</div>;
    }
  };

  return (
    <div className="flex flex-col gap-2 p-2 border border-gray-800 rounded bg-gray-900/50">
      {renderContent()}
      {widget.actions && widget.actions.length > 0 && (
        <ActionConsole actions={widget.actions} onAction={onAction} />
      )}
    </div>
  );
};
