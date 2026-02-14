import { useState, useEffect, useCallback, useRef } from 'react';

const STORAGE_KEY = 'notaclaw:chat-drafts';
const DEBOUNCE_MS = 300;

/**
 * Manages a per-conversation (or global) draft that persists across
 * navigations and app restarts via localStorage.
 *
 * Drafts are stored as a JSON map: { [conversationId]: draftText }
 * A special key "__global__" is used when no conversation is active.
 */

function loadDrafts(): Record<string, string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // corrupted data – start fresh
  }
  return {};
}

function saveDrafts(drafts: Record<string, string>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
  } catch {
    // storage full or unavailable – silently ignore
  }
}

function keyFor(conversationId: string | null): string {
  return conversationId ?? '__global__';
}

export function useDraftPersistence(conversationId: string | null) {
  const key = keyFor(conversationId);

  // Initialise state from localStorage on mount / conversation switch
  const [content, setContentState] = useState<string>(() => {
    const drafts = loadDrafts();
    return drafts[key] ?? '';
  });

  // Keep a ref to the latest content so the debounce timer always
  // writes the most recent value without needing to cancel/restart.
  const contentRef = useRef(content);
  contentRef.current = content;

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // When the active conversation changes, load its draft
  useEffect(() => {
    const drafts = loadDrafts();
    setContentState(drafts[key] ?? '');
  }, [key]);

  // Persist to localStorage on every change (debounced)
  const persistNow = useCallback(() => {
    const drafts = loadDrafts();
    const current = contentRef.current;
    if (current) {
      drafts[key] = current;
    } else {
      delete drafts[key];
    }
    saveDrafts(drafts);
  }, [key]);

  const setContent = useCallback(
    (valueOrFn: string | ((prev: string) => string)) => {
      setContentState((prev) => {
        const next = typeof valueOrFn === 'function' ? valueOrFn(prev) : valueOrFn;
        return next;
      });
    },
    []
  );

  // Schedule a debounced save whenever content changes
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(persistNow, DEBOUNCE_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [content, persistNow]);

  // Also flush on unmount / conversation switch to avoid data loss
  useEffect(() => {
    return () => {
      persistNow();
    };
  }, [persistNow]);

  // Flush on page unload (covers app close / refresh)
  useEffect(() => {
    const handleBeforeUnload = () => persistNow();
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [persistNow]);

  /**
   * Clear the draft for the current conversation.
   * Call this after successfully sending a message.
   */
  const clearDraft = useCallback(() => {
    setContentState('');
    const drafts = loadDrafts();
    delete drafts[key];
    saveDrafts(drafts);
  }, [key]);

  return { content, setContent, clearDraft } as const;
}
