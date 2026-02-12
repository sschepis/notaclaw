import React, { useContext } from 'react';
import { MetricCard } from '../components/MetricCard';
import { LogViewer } from '../components/LogViewer';
import { SimpleChart } from '../components/SimpleChart';
import { ActionConsole } from '../components/ActionConsole';
import { widgetRegistry } from '../../src/WidgetRegistry';
import { WidgetContext } from '../WidgetContext';
import { WidgetProps } from '../../src/types';

// Wrappers
const MetricWidget: React.FC<WidgetProps> = ({ config, data }) => (
  <MetricCard title={config.title} data={data} context={config.context} />
);

const LogWidget: React.FC<WidgetProps> = ({ config, data }) => (
  <LogViewer title={config.title} data={data} />
);

const ChartWidget: React.FC<WidgetProps> = ({ config, data }) => (
  <SimpleChart title={config.title} data={data} />
);

const ActionWidget: React.FC<WidgetProps> = ({ config, data }) => {
  const { onAction } = useContext(WidgetContext);
  return <ActionConsole actions={data?.actions || []} onAction={onAction} />;
};

const PlaceholderWidget: React.FC<WidgetProps> = ({ config }) => (
  <div className="flex items-center justify-center h-full text-gray-500 bg-gray-900 border border-gray-800 rounded">
    {config.title || 'Placeholder'}
  </div>
);

// Register
export const registerWidgets = () => {
  widgetRegistry.register({
    type: 'metric',
    name: 'Metric Card',
    description: 'Displays a single value with trend',
    component: MetricWidget,
    defaultConfig: { title: 'New Metric', context: '' }
  });

  widgetRegistry.register({
    type: 'log',
    name: 'Log Viewer',
    description: 'Displays a list of logs',
    component: LogWidget,
    defaultConfig: { title: 'System Logs' }
  });

  widgetRegistry.register({
    type: 'chart',
    name: 'Simple Chart',
    description: 'Displays a line chart',
    component: ChartWidget,
    defaultConfig: { title: 'Performance' }
  });

  widgetRegistry.register({
    type: 'action',
    name: 'Action Console',
    description: 'Buttons to trigger actions',
    component: ActionWidget,
    defaultConfig: { title: 'Actions' }
  });

  widgetRegistry.register({
    type: 'chat',
    name: 'Chat',
    description: 'Chat interface',
    component: PlaceholderWidget,
    defaultConfig: { title: 'Chat' }
  });

  widgetRegistry.register({
    type: 'list',
    name: 'List',
    description: 'List view',
    component: PlaceholderWidget,
    defaultConfig: { title: 'List' }
  });
};
