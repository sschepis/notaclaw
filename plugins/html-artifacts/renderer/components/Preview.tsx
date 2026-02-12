import React, { useEffect, useRef } from 'react';

interface PreviewProps {
  content: string;
  onLog: (log: any) => void;
  onError: (error: any) => void;
}

const Preview: React.FC<PreviewProps> = ({ content, onLog, onError }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Security check: ensure message is from our iframe
      // In srcDoc, origin is 'null' or 'about:srcdoc' depending on browser
      
      const data = event.data;
      if (data?.type === 'log') {
        onLog(data.args);
      } else if (data?.type === 'error') {
        onError(data);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onLog, onError]);

  return (
    <div className="w-full h-full bg-white rounded-lg overflow-hidden shadow-inner relative">
      <div className="absolute top-0 left-0 right-0 h-6 bg-gray-100 border-b flex items-center px-2 space-x-1.5">
        <div className="w-2.5 h-2.5 rounded-full bg-red-400"></div>
        <div className="w-2.5 h-2.5 rounded-full bg-yellow-400"></div>
        <div className="w-2.5 h-2.5 rounded-full bg-green-400"></div>
      </div>
      <iframe
        ref={iframeRef}
        srcDoc={content}
        className="w-full h-[calc(100%-24px)] mt-6 border-none"
        sandbox="allow-scripts allow-forms allow-popups allow-modals allow-same-origin" 
        title="Artifact Preview"
      />
    </div>
  );
};

export default Preview;
