import { PluginContext } from '../../../client/src/shared/plugin-types';

let interval: any;

export default {
  activate: (context: PluginContext) => {
    console.log('[Coherence Monitor] Main process activated');
    
    const startMonitoring = () => {
      console.log('[Coherence Monitor] Ready');
      
      // Start emitting mock coherence data
      if (interval) clearInterval(interval);
      interval = setInterval(() => {
        const coherence = Math.random();
        const entropy = Math.random() * 0.5;
        const event = {
          timestamp: Date.now(),
          coherence,
          entropy,
          source: 'SRIA-Core',
          message: coherence > 0.8 ? 'High coherence achieved' : 'Entropy increasing'
        };
        
        context.ipc.send('coherence:update', event);
      }, 3000);
    };

    // If context is already ready (though typical pattern is event), we listen
    context.on('ready', startMonitoring);
    context.on('stop', () => {
      if (interval) clearInterval(interval);
    });
  },
  
  deactivate: () => {
    console.log('[Coherence Monitor] Deactivated');
    if (interval) clearInterval(interval);
  }
};
