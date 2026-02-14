/**
 * AudioPlayer - Renders a compact inline audio player within messages.
 *
 * Compact player with play/pause, progress, and duration display.
 * Registered as a fence renderer for ```audio fences.
 */

import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, Volume2, AlertCircle } from 'lucide-react';
import { FenceBlock } from '../../../store/useFenceStore';
import { parseFenceJSON } from '../../../../shared/rich-content-types';

interface AudioData {
  src: string;
  caption?: string;
  autoplay?: boolean;
}

interface AudioPlayerProps {
  block: FenceBlock;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ block }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState(false);

  const audioData = useMemo<AudioData>(() => {
    const parsed = parseFenceJSON<Partial<AudioData>>(block.content, {});
    if (parsed.src) {
      return {
        src: parsed.src,
        caption: parsed.caption,
        autoplay: parsed.autoplay ?? false,
      };
    }
    return {
      src: block.content.trim(),
    };
  }, [block.content]);

  const togglePlay = useCallback(() => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setPlaying(!playing);
  }, [playing]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onDurationChange = () => setDuration(audio.duration || 0);
    const onEnded = () => setPlaying(false);
    const onError = () => setError(true);

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('durationchange', onDurationChange);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('durationchange', onDurationChange);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
    };
  }, []);

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = x / rect.width;
    audioRef.current.currentTime = pct * duration;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (error) {
    return (
      <div className="my-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
        <AlertCircle size={14} />
        <span>Failed to load audio</span>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="my-2 rounded-lg border border-border bg-muted/30 overflow-hidden"
    >
      <audio ref={audioRef} src={audioData.src} preload="metadata" />

      <div className="flex items-center gap-3 px-3 py-2">
        {/* Play/Pause button */}
        <button
          onClick={togglePlay}
          className="w-8 h-8 rounded-full bg-primary/20 hover:bg-primary/30 flex items-center justify-center text-primary transition-colors flex-shrink-0"
        >
          {playing ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
        </button>

        {/* Progress bar */}
        <div className="flex-1 min-w-0">
          <div
            className="h-1.5 bg-muted rounded-full cursor-pointer group"
            onClick={handleSeek}
          >
            <div
              className="h-full bg-primary rounded-full relative transition-all group-hover:h-2"
              style={{ width: `${progress}%` }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-primary shadow-sm opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        </div>

        {/* Time display */}
        <div className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground flex-shrink-0">
          <span>{formatDuration(currentTime)}</span>
          <span>/</span>
          <span>{formatDuration(duration)}</span>
        </div>

        {/* Volume icon */}
        <Volume2 size={12} className="text-muted-foreground flex-shrink-0" />
      </div>

      {/* Caption */}
      {audioData.caption && (
        <div className="px-3 py-1 border-t border-border">
          <span className="text-[10px] text-muted-foreground italic">{audioData.caption}</span>
        </div>
      )}
    </motion.div>
  );
};

export const AUDIO_LANGUAGES = ['audio'];
