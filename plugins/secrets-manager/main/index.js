/**
 * Secrets Manager - Main Process Entry
 * This plugin primarily provides a renderer component for managing secrets.
 * The main process entry is minimal since secrets management is handled
 * by the core SecretsManager service.
 */

module.exports = {
  activate: (context) => {
    console.log('[Secrets Manager] Main process activated');
  },
  
  deactivate: () => {
    console.log('[Secrets Manager] Deactivated');
  }
};

