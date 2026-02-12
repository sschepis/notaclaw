import React from 'react';
import { PluginContext } from '../types';

interface NoteEditorProps {
  context: PluginContext;
  eventBus: EventTarget;
}

export const NoteEditor: React.FC<NoteEditorProps> = ({ context, eventBus }) => {
  return (
    <div className="p-4">
      <h2 className="text-lg font-bold">Note Editor</h2>
      <p>Editor placeholder</p>
    </div>
  );
};
