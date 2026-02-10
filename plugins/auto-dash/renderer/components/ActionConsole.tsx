import React from 'react';

interface ActionDefinition {
  label: string;
  intent: string;
  context: any;
}

interface ActionConsoleProps {
  actions: ActionDefinition[];
  onAction: (intent: string, context: any) => void;
}

export const ActionConsole: React.FC<ActionConsoleProps> = ({ actions, onAction }) => {
  if (!actions || actions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-4">
      {actions.map((action, i) => (
        <button
          key={i}
          onClick={() => onAction(action.intent, action.context)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm font-medium transition-colors"
        >
          {action.label}
        </button>
      ))}
    </div>
  );
};
