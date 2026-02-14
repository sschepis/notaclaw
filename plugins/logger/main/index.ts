// Main process entry point
export default (context: any) => {
  console.log('[Logger] Main process loaded');

  if (context.traits) {
    context.traits.register({
      id: 'system-logger',
      name: 'System Logging',
      description: 'Log system events.',
      instruction: 'You can log system events for debugging or auditing purposes. The system automatically captures logs, but you can explicitly note important events.',
      activationMode: 'manual' // Passive
    });
  }
};
