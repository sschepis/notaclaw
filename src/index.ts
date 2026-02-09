import { DSNNode, generateKeyTriplet } from '@sschepis/alephnet-node';
import { AlephAIService } from './services/AlephAI';
import { PluginManager } from './core/PluginManager';

async function main() {
  console.log('Starting Notaclaw Client...');
  
  // Initialize AI Service (Node capability, not plugin capability)
  const aiService = new AlephAIService();

  const keyTriplet = generateKeyTriplet();
  const node = new DSNNode({
    nodeId: 'client-node',
    semanticDomain: 'cognitive',
    existingKeyTriplet: keyTriplet
  });
  
  await node.start();
  console.log('Node started. Initializing Plugin Manager...');

  // Load plugins dynamically from the plugins/ directory
  // distinct from the core app logic
  const pluginManager = new PluginManager({ dsn: node, ai: aiService });
  await pluginManager.loadAll();
  
  console.log('Notaclaw is running. Press Ctrl+C to stop.');
  
  // Keep alive
  setInterval(() => {}, 10000);
}

main().catch(console.error);
