const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const pluginsDir = path.join(__dirname, '../plugins');

async function buildPlugins() {
  console.log('Building plugins...');
  
  if (!fs.existsSync(pluginsDir)) {
    console.error('Plugins directory not found');
    return;
  }

  const plugins = fs.readdirSync(pluginsDir).filter(f => fs.statSync(path.join(pluginsDir, f)).isDirectory());

  for (const plugin of plugins) {
    const pluginPath = path.join(pluginsDir, plugin);
    const rendererPath = path.join(pluginPath, 'renderer');
    
    // Check for entry point (index.tsx or index.js)
    let entryPoint = null;
    if (fs.existsSync(path.join(rendererPath, 'index.tsx'))) {
      entryPoint = path.join(rendererPath, 'index.tsx');
    } else if (fs.existsSync(path.join(rendererPath, 'index.js'))) {
      entryPoint = path.join(rendererPath, 'index.js');
    }

    if (entryPoint) {
      console.log(`Building ${plugin}...`);
      try {
        await esbuild.build({
          entryPoints: [entryPoint],
          outfile: path.join(rendererPath, 'bundle.js'),
          bundle: true,
          format: 'cjs',
          platform: 'browser',
          external: ['react', 'react-dom', 'alephnet'],
          alias: {
            '@': path.resolve(__dirname, '../client/src'),
            '@radix-ui/react-slot': path.resolve(__dirname, '../client/node_modules/@radix-ui/react-slot'),
            'class-variance-authority': path.resolve(__dirname, '../client/node_modules/class-variance-authority'),
            'clsx': path.resolve(__dirname, '../client/node_modules/clsx'),
            'tailwind-merge': path.resolve(__dirname, '../client/node_modules/tailwind-merge')
          },
          loader: { '.tsx': 'tsx', '.ts': 'ts' },
          target: ['es2020']
        });
        console.log(`✓ ${plugin} built successfully`);
      } catch (e) {
        console.error(`✗ Failed to build ${plugin}:`, e);
      }
    } else {
      console.log(`- ${plugin}: No renderer entry point found`);
    }
  }
}

buildPlugins();
