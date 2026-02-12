import React from 'react';

export interface WidgetContextType {
  onAction: (intent: string, context: any) => void;
}

export const WidgetContext = React.createContext<WidgetContextType>({
  onAction: () => console.warn('WidgetContext not provided'),
});
