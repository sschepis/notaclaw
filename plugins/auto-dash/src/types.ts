import React from 'react';
import { Layout } from 'react-grid-layout';

export interface WidgetConfig {
  [key: string]: any;
}

export interface WidgetProps {
  id: string;
  config: WidgetConfig;
  data: any;
}

export interface WidgetDefinition {
  type: string;
  name: string;
  description: string;
  component: React.FC<WidgetProps>;
  defaultConfig: WidgetConfig;
  ConfigComponent?: React.FC<{
    config: WidgetConfig;
    onChange: (newConfig: WidgetConfig) => void;
  }>;
}

export interface WidgetInstance {
  id: string;
  type: string;
  config: WidgetConfig;
  dataSource?: string;
  data?: any;
}

export interface DashboardLayout {
  id: string;
  name: string;
  layout: Layout[];
  widgets: Record<string, WidgetInstance>;
}
