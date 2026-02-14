/**
 * VideoRenderer - Renders inline video players within messages.
 *
 * HTML5 video with controls, poster frame support, and optional caption.
 * Registered as a fence renderer for ```video / ```vid fences.
 */

import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle } from 'lucide-react';
import { FenceBlock } from '../../../store/useFenceStore';
import { parseFenceJSON } from '../../../../shared/rich-content-types';

interface VideoData {
  src: string;
  poster?: string;
  caption?: string;
  autoplay?: boolean;
  loop?: boolean;
  muted?: boolean;
  width?: number;
  height?: number;
}

interface VideoRendererProps {
  block: FenceBlock;
}

export const VideoRenderer: React.FC<VideoRendererProps> = ({ block }) => {
  const [error, setError] = useState(false);

  const videoData = useMemo<VideoData>(() => {
    const parsed = parseFenceJSON<Partial<VideoData>>(block.content, {});
    if (parsed.src) {
      return {
        src: parsed.src,
        poster: parsed.poster,
        caption: parsed.caption,
        autoplay: parsed.autoplay ?? false,
        loop: parsed.loop ?? false,
        muted: parsed.muted ?? true,
        width: parsed.width,
        height: parsed.height,
      };
    }
    // Fall back: treat content as raw URL
    return {
      src: block.content.trim(),
      muted: true,
    };
  }, [block.content]);

  if (error) {
    return (
      <div className="my-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
        <AlertCircle size={14} />
        <span>Failed to load video</span>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="my-3 rounded-lg overflow-hidden border border-border bg-black/40"
    >
      {/* Video player */}
      <div className="relative w-full" style={{ aspectRatio: '16/9' }}>
        <video
          src={videoData.src}
          poster={videoData.poster}
          controls
          autoPlay={videoData.autoplay}
          loop={videoData.loop}
          muted={videoData.muted}
          playsInline
          className="w-full h-full object-contain bg-black"
          onError={() => setError(true)}
          style={videoData.width ? { maxWidth: videoData.width } : undefined}
        >
          Your browser does not support the video element.
        </video>
      </div>

      {/* Caption */}
      {videoData.caption && (
        <div className="px-3 py-1.5 border-t border-border bg-muted/30">
          <span className="text-[11px] text-muted-foreground italic">{videoData.caption}</span>
        </div>
      )}
    </motion.div>
  );
};

export const VIDEO_LANGUAGES = ['video', 'vid'];
