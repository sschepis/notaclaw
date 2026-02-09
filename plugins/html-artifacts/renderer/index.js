
module.exports = {
  activate: (context) => {
    console.log('[HTML Artifacts] Renderer activated');
    const { React } = context;

    const ArtifactStudio = () => {
        return React.createElement('div', { className: 'p-4 text-white' }, 
            React.createElement('h1', { className: 'text-xl font-bold mb-4' }, 'Artifact Studio'),
            React.createElement('p', {}, 'This is a simplified version of the Artifact Studio.')
        );
    };

    const ArtifactsButton = () => {
      return React.createElement('button', {
        className: 'w-9 h-9 rounded-lg flex items-center justify-center bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white transition-all',
        onClick: () => {
            console.log('Artifacts clicked');
            // context.navigate('artifact-studio');
        },
        title: 'Artifacts'
      }, 'HTML');
    };

    context.registerComponent('stage:view', {
        id: 'artifact-studio',
        component: ArtifactStudio
    });

    context.registerComponent('sidebar:nav-item', {
      id: 'artifact-nav',
      component: ArtifactsButton
    });
  }
};
