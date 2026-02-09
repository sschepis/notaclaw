import { PluginManifest, PluginContext, AlephExtension } from '../plugin-types';
import { TrustAssessment, Capability, CapabilityCheckResult } from '../trust-types';

export * from '../plugin-types';

export interface LoadedPlugin {
  manifest: PluginManifest;
  alephConfig?: AlephExtension;
  instance?: any;
  context: PluginContext;
  path: string;
  trust?: TrustAssessment;
  status: 'active' | 'error' | 'blocked' | 'pending-confirmation' | 'disabled';
  capabilityDecisions?: Map<Capability, CapabilityCheckResult>;
  loadedAt?: Date;
  metadata?: any; // For backward compatibility with renderer PluginMetadata if needed
}

export interface PluginManagerConfig {
  pluginsDir: string;
  bundledPluginsDir?: string;
  storagePath?: string;
}
