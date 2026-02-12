import { WidgetDefinition } from './types';

class WidgetRegistry {
  private widgets: Map<string, WidgetDefinition> = new Map();

  register(definition: WidgetDefinition) {
    this.widgets.set(definition.type, definition);
  }

  get(type: string): WidgetDefinition | undefined {
    return this.widgets.get(type);
  }

  getAll(): WidgetDefinition[] {
    return Array.from(this.widgets.values());
  }
}

export const widgetRegistry = new WidgetRegistry();
