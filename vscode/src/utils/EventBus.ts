/**
 * Typed internal event bus for decoupling service communication.
 * Replaces direct callback wiring between services and WebSocketServer.
 */

export interface EventMap {
  // File system events
  'fs.fileChanged': { type: 'created' | 'changed' | 'deleted'; uri: string };

  // Terminal events
  'terminal.output': { terminalId: number; data: string };
  'terminal.closed': { terminalId: number; exitCode: number | undefined };

  // Editor events
  'editor.documentOpened': { uri: string; languageId: string };
  'editor.documentClosed': { uri: string };
  'editor.documentSaved': { uri: string };
  'editor.selectionChanged': { uri: string; selections: Array<{ start: { line: number; character: number }; end: { line: number; character: number } }> };

  // Debug events
  'debug.sessionStarted': { sessionId: string; name: string; type: string };
  'debug.sessionTerminated': { sessionId: string };
  'debug.breakpointHit': { sessionId: string; threadId: number; reason: string };

  // Server lifecycle events
  'server.clientConnected': { clientId: string; origin: string };
  'server.clientDisconnected': { clientId: string; reason: string };
  'server.started': { port: number; tls: boolean };
  'server.stopped': Record<string, never>;
}

export type EventName = keyof EventMap;
export type EventHandler<T extends EventName> = (data: EventMap[T]) => void;

interface Subscription {
  event: EventName;
  handler: EventHandler<any>;
  once: boolean;
}

export class EventBus {
  private listeners = new Map<EventName, Set<Subscription>>();
  private disposed = false;

  /**
   * Subscribe to an event. Returns an unsubscribe function.
   */
  on<T extends EventName>(event: T, handler: EventHandler<T>): () => void {
    if (this.disposed) {
      return () => {};
    }

    const sub: Subscription = { event, handler, once: false };
    this.getOrCreateSet(event).add(sub);

    return () => {
      const set = this.listeners.get(event);
      if (set) {
        set.delete(sub);
        if (set.size === 0) {
          this.listeners.delete(event);
        }
      }
    };
  }

  /**
   * Subscribe to an event, automatically unsubscribing after the first emission.
   */
  once<T extends EventName>(event: T, handler: EventHandler<T>): () => void {
    if (this.disposed) {
      return () => {};
    }

    const sub: Subscription = { event, handler, once: true };
    this.getOrCreateSet(event).add(sub);

    return () => {
      const set = this.listeners.get(event);
      if (set) {
        set.delete(sub);
        if (set.size === 0) {
          this.listeners.delete(event);
        }
      }
    };
  }

  /**
   * Emit an event to all subscribers.
   */
  emit<T extends EventName>(event: T, data: EventMap[T]): void {
    if (this.disposed) {
      return;
    }

    const set = this.listeners.get(event);
    if (!set) {
      return;
    }

    const toRemove: Subscription[] = [];

    for (const sub of set) {
      try {
        sub.handler(data);
      } catch (err) {
        // Don't let one handler's error break others
        console.error(`EventBus: Error in handler for '${event}':`, err);
      }

      if (sub.once) {
        toRemove.push(sub);
      }
    }

    for (const sub of toRemove) {
      set.delete(sub);
    }

    if (set.size === 0) {
      this.listeners.delete(event);
    }
  }

  /**
   * Remove all listeners for a specific event, or all events if none specified.
   */
  removeAllListeners(event?: EventName): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }

  /**
   * Get the number of listeners for a specific event.
   */
  listenerCount(event: EventName): number {
    return this.listeners.get(event)?.size ?? 0;
  }

  /**
   * Dispose the event bus, removing all listeners.
   */
  dispose(): void {
    this.disposed = true;
    this.listeners.clear();
  }

  private getOrCreateSet(event: EventName): Set<Subscription> {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    return set;
  }
}

// Singleton instance for the extension
let instance: EventBus | null = null;

export function getEventBus(): EventBus {
  if (!instance) {
    instance = new EventBus();
  }
  return instance;
}

export function resetEventBus(): void {
  if (instance) {
    instance.dispose();
    instance = null;
  }
}
