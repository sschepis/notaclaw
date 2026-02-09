import React from 'react';
import { Attachment } from '../../../store/useAppStore';

export const MessageAttachments: React.FC<{ attachments: Attachment[] }> = ({ attachments }) => {
  if (!attachments || attachments.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mb-3 pb-3 border-b border-white/5">
      {attachments.map(attachment => (
        <div 
          key={attachment.id}
          className="relative group/attachment"
        >
          {attachment.type === 'image' && attachment.dataUrl ? (
            <img 
              src={attachment.dataUrl} 
              alt={attachment.name}
              className="h-16 w-16 object-cover rounded border border-white/10 shadow-sm"
            />
          ) : (
            <div className="flex items-center gap-2 px-2 py-1.5 bg-black/20 rounded border border-white/10">
              <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="text-[10px] text-gray-300 max-w-[100px] truncate font-medium">{attachment.name}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
