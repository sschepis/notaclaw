/**
 * Configuration helper for Agent Control extension
 */

import * as vscode from 'vscode';
import * as crypto from 'crypto';
import { AgentControlConfig } from '../protocol/types';

const CONFIG_SECTION = 'agentControl';

/**
 * Get the full configuration object
 */
export function getConfig(): AgentControlConfig {
  const config = vscode.workspace.getConfiguration(CONFIG_SECTION);
  
  return {
    enabled: config.get<boolean>('enabled', false),
    port: config.get<number>('port', 19876),
    host: config.get<string>('host', '127.0.0.1'),
    token: config.get<string>('token', ''),
    allowedOrigins: config.get<string[]>('allowedOrigins', ['*']),
    tls: {
      enabled: config.get<boolean>('tls.enabled', false),
      certPath: config.get<string>('tls.certPath', ''),
      keyPath: config.get<string>('tls.keyPath', ''),
      caPath: config.get<string>('tls.caPath', ''),
    },
    rateLimit: {
      enabled: config.get<boolean>('rateLimit.enabled', true),
      requestsPerSecond: config.get<number>('rateLimit.requestsPerSecond', 100),
    },
    logging: {
      level: config.get<'debug' | 'info' | 'warn' | 'error'>('logging.level', 'info'),
      logToFile: config.get<boolean>('logging.logToFile', false),
    },
    security: {
      allowFileSystemAccess: config.get<boolean>('security.allowFileSystemAccess', true),
      allowTerminalAccess: config.get<boolean>('security.allowTerminalAccess', true),
      allowCommandExecution: config.get<boolean>('security.allowCommandExecution', true),
      restrictedPaths: config.get<string[]>('security.restrictedPaths', []),
      restrictedCommands: config.get<string[]>('security.restrictedCommands', []),
      allowedCommands: config.get<string[]>('security.allowedCommands', []),
      requireApproval: config.get<boolean>('security.requireApproval', false),
      allowedMethodCategories: config.get<string[]>('security.allowedMethodCategories', []),
    },
  };
}

/**
 * Update a configuration value
 */
export async function updateConfig<K extends keyof AgentControlConfig>(
  key: K,
  value: AgentControlConfig[K],
  global: boolean = true
): Promise<void> {
  const config = vscode.workspace.getConfiguration(CONFIG_SECTION);
  await config.update(key, value, global ? vscode.ConfigurationTarget.Global : vscode.ConfigurationTarget.Workspace);
}

/**
 * Generate a secure random token
 */
export function generateToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Check if the token is configured
 */
export function hasToken(): boolean {
  const config = getConfig();
  return config.token.length > 0;
}

/**
 * Get or generate the authentication token
 */
export async function getOrGenerateToken(): Promise<string> {
  const config = getConfig();
  
  if (config.token && config.token.length > 0) {
    return config.token;
  }
  
  // Generate a new token
  const newToken = generateToken();
  await updateConfig('token', newToken);
  return newToken;
}

/**
 * Check if a path is restricted
 */
export function isPathRestricted(filePath: string): boolean {
  const config = getConfig();
  const restrictedPaths = config.security.restrictedPaths;
  
  if (restrictedPaths.length === 0) {
    return false;
  }
  
  // Check against each pattern
  for (const pattern of restrictedPaths) {
    if (matchGlobPattern(filePath, pattern)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Check if a command is restricted.
 * If `allowedCommands` is non-empty (allow-list mode), only those commands are permitted.
 * Otherwise falls back to the deny-list (`restrictedCommands`).
 */
export function isCommandRestricted(command: string): boolean {
  const config = getConfig();

  // Allow-list mode: if allowedCommands is configured, only those commands pass
  const allowedCommands = config.security.allowedCommands;
  if (allowedCommands.length > 0) {
    return !allowedCommands.includes(command);
  }

  // Deny-list mode (default)
  const restrictedCommands = config.security.restrictedCommands;
  return restrictedCommands.includes(command);
}

/**
 * Check if a method category is allowed.
 * If `allowedMethodCategories` is non-empty, only those categories are permitted.
 * An empty array means all categories are allowed (default).
 */
export function isMethodCategoryAllowed(category: string): boolean {
  const config = getConfig();
  const allowed = config.security.allowedMethodCategories;
  if (allowed.length === 0) {
    return true; // No restrictions — all categories allowed
  }
  return allowed.includes(category);
}

/**
 * Simple glob pattern matching
 */
function matchGlobPattern(path: string, pattern: string): boolean {
  // Convert glob pattern to regex
  const regexPattern = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&') // Escape special regex chars
    .replace(/\*/g, '.*')                  // * matches anything
    .replace(/\?/g, '.');                  // ? matches single char
  
  const regex = new RegExp(`^${regexPattern}$`, 'i');
  return regex.test(path);
}

/**
 * Watch for configuration changes
 */
export function onConfigChange(callback: (config: AgentControlConfig) => void): vscode.Disposable {
  return vscode.workspace.onDidChangeConfiguration((event) => {
    if (event.affectsConfiguration(CONFIG_SECTION)) {
      callback(getConfig());
    }
  });
}

/**
 * Validate the configuration
 */
export function validateConfig(): { valid: boolean; errors: string[] } {
  const config = getConfig();
  const errors: string[] = [];
  
  // Check port range
  if (config.port < 1024 || config.port > 65535) {
    errors.push(`Invalid port: ${config.port}. Must be between 1024 and 65535.`);
  }
  
  // Check host format
  if (!isValidHost(config.host)) {
    errors.push(`Invalid host: ${config.host}. Must be a valid IP address or hostname.`);
  }
  
  // Warn if no token set
  if (!config.token) {
    errors.push('No authentication token configured. A token will be auto-generated.');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Check if host is valid
 */
function isValidHost(host: string): boolean {
  // Check for valid IPv4
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (ipv4Regex.test(host)) {
    const parts = host.split('.').map(Number);
    return parts.every(part => part >= 0 && part <= 255);
  }
  
  // Check for valid hostname
  const hostnameRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return hostnameRegex.test(host);
}
