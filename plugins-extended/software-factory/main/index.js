/**
 * Software Factory Plugin - Main Process Entry
 * 
 * Note: The full TypeScript implementation is in src/index.ts
 * This stub allows the plugin to load without requiring TypeScript compilation.
 * Run `npm run build` in this plugin directory to enable full functionality.
 */

module.exports = {
  activate(context) {
    console.log('[Software Factory] Main process activated (stub)');
    console.log('[Software Factory] Run "npm run build" in plugins/software-factory to enable full functionality');
    
    return {
      dispose() {
        console.log('[Software Factory] Main process deactivated');
      }
    };
  }
};
