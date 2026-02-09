
module.exports = {
  activate: (context) => {
    console.log('[Network Visualizer] Renderer activated');
    const { React } = context;

    const NetworkVisualizerButton = () => {
      return React.createElement('button', {
        className: 'w-9 h-9 rounded-lg flex items-center justify-center bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white transition-all',
        onClick: () => console.log('Network Visualizer clicked'),
        title: 'Network Visualizer'
      }, 'NET');
    };

    context.registerComponent('sidebar:nav-item', {
      id: 'network-visualizer-nav',
      component: NetworkVisualizerButton
    });
  }
};
