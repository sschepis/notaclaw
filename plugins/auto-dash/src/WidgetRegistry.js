"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.widgetRegistry = void 0;
class WidgetRegistry {
    widgets = new Map();
    register(definition) {
        this.widgets.set(definition.type, definition);
    }
    get(type) {
        return this.widgets.get(type);
    }
    getAll() {
        return Array.from(this.widgets.values());
    }
}
exports.widgetRegistry = new WidgetRegistry();
