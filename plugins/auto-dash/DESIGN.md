# AutoDash Design Specification

## Overview
This document outlines the design for the AutoDash plugin enhancements, focusing on a dynamic, extensible, and real-time dashboard system.

## 1. Dynamic Grid Layout
**Goal**: Replace the hardcoded layout with a flexible grid system.

### Implementation
- **Library**: `react-grid-layout`
- **Storage**: Layout configuration (positions, sizes) will be persisted in the plugin's local storage or a dedicated configuration file managed by the backend.
- **Structure**:
  ```typescript
  interface LayoutItem {
    i: string; // Widget ID
    x: number;
    y: number;
    w: number;
    h: number;
  }
  interface DashboardLayout {
    id: string;
    name: string;
    items: LayoutItem[];
  }
  ```

## 2. Widget System
**Goal**: Create an extensible system for widget types.

### Architecture
- **Widget Registry**: A singleton registry where widget components are registered.
- **Widget Interface**:
  ```typescript
  interface WidgetProps {
    id: string;
    config: any; // Widget-specific configuration
    data: any;   // Real-time data
  }
  
  interface WidgetDefinition {
    type: string;
    name: string;
    component: React.FC<WidgetProps>;
    defaultConfig: any;
    ConfigComponent?: React.FC<{ config: any, onChange: (newConfig: any) => void }>;
  }
  ```
- **Built-in Widgets**:
  - `MetricCard`: Simple key-value display.
  - `SimpleChart`: Line/Bar chart.
  - `LogViewer`: Scrolling log display.
  - `ActionConsole`: Button grid for actions.

## 3. Data Binding & Real-Time Updates
**Goal**: Enable widgets to subscribe to data sources.

### Mechanism
- **Data Sources**:
  - `SystemStats`: CPU, Memory, etc.
  - `Logs`: Stream of log entries.
  - `Custom`: API endpoints or DSN topics.
- **Subscription Manager**:
  - Widgets specify a `dataSource` in their config.
  - A central service handles subscriptions and pushes updates to the store.

## 4. State Management
**Goal**: Centralized state for layout and data.

### Implementation
- **Library**: `zustand`
- **Store Structure**:
  ```typescript
  interface DashboardState {
    layout: LayoutItem[];
    widgets: Record<string, WidgetInstance>; // id -> instance config
    isEditing: boolean;
    updateLayout: (layout: LayoutItem[]) => void;
    addWidget: (type: string) => void;
    removeWidget: (id: string) => void;
    updateWidgetConfig: (id: string, config: any) => void;
  }
  ```

## 5. UI/UX Enhancements
- **Edit Mode**: Toggle to enable drag-and-drop and resizing.
- **Widget Toolbar**: Add new widgets from a palette.
- **Config Panel**: Modal or side panel to edit widget settings.

## 6. AI Integration
- **Prompt**: "Create a dashboard for X".
- **Action**: The AI generates a `DashboardLayout` and `WidgetInstance` configuration json which is then loaded into the store.

## Plan
1.  **Setup**: Install dependencies (`react-grid-layout`, `zustand`, `recharts` or similar for charts).
2.  **Core**: Implement `DashboardStore` and `WidgetRegistry`.
3.  **Layout**: Replace `AutoDashView` static layout with `react-grid-layout`.
4.  **Widgets**: Refactor existing components to match `WidgetDefinition`.
5.  **Configuration**: Add UI to edit widget configs.
6.  **Persistence**: Save/load state.
