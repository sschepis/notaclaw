/**
 * ImageRenderer - Renders inline images within messages.
 *
 * Supports base64 data URLs and remote URLs.
 * Click to open a lightbox/zoom view.
 * Registered as a fence renderer for ```image / ```img fences.
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Maximize2, Download } from 'lucide-react';
import { FenceBlock } from '../../../store/useFenceStore';
import { parseFenceJSON } from '../../../../shared/rich-content-types';

interface ImageData {
  src: string;
  alt?: string;
  caption?: string;
  width?: number;
  height?: number;
}

interface ImageRendererProps {
  block: FenceBlock;
}

export const ImageRenderer: React.FC<ImageRendererProps> = ({ block }) => {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  const imageData = useMemo<ImageData>(() => {
    // Try JSON parse first
    const parsed = parseFenceJSON<Partial<ImageData>>(block.content, {});
    if (parsed.src) {
      return {
        src: parsed.src,
        alt: parsed.alt || 'Image',
        caption: parsed.caption,
        width: parsed.width,
        height: parsed.height,
      };
    }
    // Fall back: treat content as raw URL or data URI
    const trimmed = block.content.trim();
    return {
      src: trimmed,
      alt: block.meta || 'Image',
    };
  }, [block.content, block.meta]);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = imageData.src;
    link.download = imageData.alt || 'image';
    link.click();
  };

  if (error) {
    return (
      <div className="my-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
        <X size={14} />
        <span>Failed to load image</span>
      </div>
    );
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="my-3 rounded-lg overflow-hidden border border-border bg-muted/30 group relative"
      >
        {/* Image */}
        <div className="relative">
          {!loaded && (
            <div className="w-full h-48 bg-muted/50 animate-pulse flex items-center justify-center">
              <span className="text-xs text-muted-foreground">Loading image...</span>
            </div>
          )}
          <img
            src={imageData.src}
            alt={imageData.alt}
            className={`w-full h-auto max-h-[500px] object-contain cursor-pointer transition-opacity ${loaded ? 'opacity-100' : 'opacity-0 h-0'}`}
            style={imageData.width ? { maxWidth: imageData.width } : undefined}
            onLoad={() => setLoaded(true)}
            onError={() => setError(true)}
            onClick={() => setLightboxOpen(true)}
          />

          {/* Hover overlay with actions */}
          {loaded && (
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
              <div className="flex gap-2">
                <button
                  onClick={() => setLightboxOpen(true)}
                  className="p-2 bg-black/60 rounded-full text-white hover:bg-black/80 transition-colors"
                  title="Zoom"
                >
                  <Maximize2 size={14} />
                </button>
                <button
                  onClick={handleDownload}
                  className="p-2 bg-black/60 rounded-full text-white hover:bg-black/80 transition-colors"
                  title="Download"
                >
                  <Download size={14} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Caption */}
        {imageData.caption && (
          <div className="px-3 py-1.5 border-t border-border">
            <span className="text-[11px] text-muted-foreground italic">{imageData.caption}</span>
          </div>
        )}
      </motion.div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-8"
            onClick={() => setLightboxOpen(false)}
          >
            {/* Close button */}
            <button
              onClick={() => setLightboxOpen(false)}
              className="absolute top-4 right-4 p-2 bg-white/10 rounded-full text-white hover:bg-white/20 transition-colors z-10"
            >
              <X size={20} />
            </button>

            {/* Full-size image */}
            <motion.img
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              src={imageData.src}
              alt={imageData.alt}
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />

            {/* Caption in lightbox */}
            {imageData.caption && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/60 rounded-full">
                <span className="text-sm text-white/80">{imageData.caption}</span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export const IMAGE_LANGUAGES = ['image', 'img'];
