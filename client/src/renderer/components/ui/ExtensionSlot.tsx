import React from 'react';
import { usePluginStore } from '../../store/usePluginStore';

interface ExtensionSlotProps {
  name: string;
  className?: string;
  context?: any; // Data to pass to the extension
}

export const ExtensionSlot: React.FC<ExtensionSlotProps> = ({ name, className, context }) => {
  const extensions = usePluginStore((state) => state.extensions[name] || []);

  if (extensions.length === 0) {
    return null;
  }

  return (
    <div className={`extension-slot ${className || ''}`} data-slot={name}>
      {extensions.map((ext) => {
        const Component = ext.component;
        return (
          <div key={ext.id} className="extension-item">
            <Component {...ext.props} context={context} />
          </div>
        );
      })}
    </div>
  );
};
