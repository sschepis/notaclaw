import React from 'react';
import { PluginContext } from '../types';

interface NoteTreeProps {
  context: PluginContext;
  eventBus: EventTarget;
}

export const NoteTree: React.FC<NoteTreeProps> = ({ context, eventBus }) => {
  return (
    <div className="p-4">
      <h2 className="text-lg font-bold">Note Explorer</h2>
      <p>Tree view placeholder</p>
    </div>
  );
};
