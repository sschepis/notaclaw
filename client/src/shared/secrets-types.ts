/**
 * Secrets Storage System - Shared Types
 * 
 * Provides type definitions for the encrypted secrets vault that spans
 * the entire application lifecycle: AI provider keys, identity material,
 * plugin credentials, service tokens, and arbitrary user secrets.
 */

/** Supported secret value types */
export type SecretValue = string;

/** Namespace for scoping secrets to prevent cross-domain access */
export type SecretNamespace =
  | 'ai-providers'   // API keys for AI providers (OpenAI, Anthropic, etc.)
  | 'identity'       // Private keys, SEA keypairs
  | 'services'       // Service subscription tokens & API keys
  | 'plugins'        // Per-plugin scoped secrets
  | 'user'           // User-defined secrets (custom tokens, passwords)
  | 'system';        // Internal system secrets (master key derivatives, etc.)

/** Metadata stored alongside each secret entry */
export interface SecretMetadata {
  /** When the secret was first stored */
  createdAt: number;
  /** When the secret was last updated */
  updatedAt: number;
  /** Optional TTL in ms — secret auto-expires after createdAt + ttl */
  ttl?: number;
  /** Human-readable label for UI display (never contains the actual secret) */
  label?: string;
  /** Which component/plugin stored this secret */
  origin?: string;
  /** Whether the secret has been rotated (previous version existed) */
  rotated?: boolean;
}

/** A single entry in the vault (never leaves main process with value populated) */
export interface SecretEntry {
  /** Composite key: namespace/key */
  id: string;
  namespace: SecretNamespace;
  key: string;
  /** The actual secret value — only available in main process */
  value: SecretValue;
  metadata: SecretMetadata;
}

/** Redacted entry safe to send to renderer (value stripped) */
export interface SecretEntryRedacted {
  id: string;
  namespace: SecretNamespace;
  key: string;
  metadata: SecretMetadata;
  /** Whether a value is present (without revealing it) */
  hasValue: boolean;
}

/** Options for storing a secret */
export interface SetSecretOptions {
  namespace: SecretNamespace;
  key: string;
  value: SecretValue;
  /** Optional label for UI display */
  label?: string;
  /** Optional TTL in milliseconds */
  ttl?: number;
  /** Tag the origin component */
  origin?: string;
}

/** Options for retrieving a secret */
export interface GetSecretOptions {
  namespace: SecretNamespace;
  key: string;
}

/** Options for deleting a secret */
export interface DeleteSecretOptions {
  namespace: SecretNamespace;
  key: string;
}

/** Options for listing secrets (returns redacted entries) */
export interface ListSecretsOptions {
  namespace?: SecretNamespace;
  /** Glob-style key prefix filter */
  keyPrefix?: string;
}

/** Result of a vault health check */
export interface VaultStatus {
  initialized: boolean;
  locked: boolean;
  entryCount: number;
  encryptionAvailable: boolean;
  lastSavedAt: number | null;
  namespaces: Record<SecretNamespace, number>;
}

/** Events emitted by the SecretsManager for audit logging */
export type SecretEventType =
  | 'secret:set'
  | 'secret:get'
  | 'secret:delete'
  | 'secret:expired'
  | 'vault:initialized'
  | 'vault:locked'
  | 'vault:unlocked'
  | 'vault:saved'
  | 'vault:error';

export interface SecretEvent {
  type: SecretEventType;
  namespace?: SecretNamespace;
  key?: string;
  timestamp: number;
  /** Never contains the actual secret value */
  details?: string;
}
