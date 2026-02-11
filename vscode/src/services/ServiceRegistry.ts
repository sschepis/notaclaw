/**
 * Service Registry — lightweight DI container for decoupling service
 * instantiation from the WebSocketServer.
 *
 * Services register themselves by name; consumers resolve them by name.
 * Supports lazy initialization via factory functions and singleton semantics.
 */

import { Disposable } from 'vscode';

type Factory<T> = () => T;

interface ServiceEntry<T = any> {
  factory: Factory<T>;
  instance: T | null;
  singleton: boolean;
}

export class ServiceRegistry implements Disposable {
  private services = new Map<string, ServiceEntry>();
  private disposed = false;

  /**
   * Register a service factory. The factory is called lazily on first resolve().
   * By default services are singletons (one instance per registry lifetime).
   */
  register<T>(name: string, factory: Factory<T>, singleton = true): void {
    if (this.disposed) {
      throw new Error(`ServiceRegistry is disposed; cannot register '${name}'`);
    }
    if (this.services.has(name)) {
      throw new Error(`Service '${name}' is already registered`);
    }
    this.services.set(name, { factory, instance: null, singleton });
  }

  /**
   * Register an already-instantiated service (always singleton).
   */
  registerInstance<T>(name: string, instance: T): void {
    if (this.disposed) {
      throw new Error(`ServiceRegistry is disposed; cannot register '${name}'`);
    }
    if (this.services.has(name)) {
      throw new Error(`Service '${name}' is already registered`);
    }
    this.services.set(name, { factory: () => instance, instance, singleton: true });
  }

  /**
   * Resolve a service by name. Creates the instance on first call (for singletons).
   * Throws if the service is not registered.
   */
  resolve<T>(name: string): T {
    if (this.disposed) {
      throw new Error(`ServiceRegistry is disposed; cannot resolve '${name}'`);
    }

    const entry = this.services.get(name);
    if (!entry) {
      throw new Error(`Service '${name}' is not registered`);
    }

    if (entry.singleton) {
      if (entry.instance === null) {
        entry.instance = entry.factory();
      }
      return entry.instance as T;
    }

    // Transient — new instance every time
    return entry.factory() as T;
  }

  /**
   * Check whether a service is registered.
   */
  has(name: string): boolean {
    return this.services.has(name);
  }

  /**
   * Unregister a service. If the service has a dispose() method, it is called.
   */
  unregister(name: string): void {
    const entry = this.services.get(name);
    if (entry?.instance && typeof (entry.instance as any).dispose === 'function') {
      (entry.instance as any).dispose();
    }
    this.services.delete(name);
  }

  /**
   * Return all registered service names.
   */
  getRegisteredNames(): string[] {
    return Array.from(this.services.keys());
  }

  /**
   * Dispose all singleton instances that implement dispose(), then clear the registry.
   */
  dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;

    for (const [, entry] of this.services) {
      if (entry.instance && typeof (entry.instance as any).dispose === 'function') {
        try {
          (entry.instance as any).dispose();
        } catch {
          // best-effort cleanup
        }
      }
    }

    this.services.clear();
  }
}

// Singleton registry for the extension
let instance: ServiceRegistry | null = null;

export function getServiceRegistry(): ServiceRegistry {
  if (!instance) {
    instance = new ServiceRegistry();
  }
  return instance;
}

export function resetServiceRegistry(): void {
  if (instance) {
    instance.dispose();
    instance = null;
  }
}
