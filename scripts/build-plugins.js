const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const esbuild = require('esbuild');

const PLUGIN_DIRS = ['plugins', 'plugins-extended'];
const ROOT_DIR = path.resolve(__dirname, '..');

async function buildPlugin(pluginPath) {
    const manifestPath = path.join(pluginPath, 'package.json');
    if (!fs.existsSync(manifestPath)) return;

    const pkg = require(manifestPath);
    // Only build if it has typescript dev dependency or tsconfig or main is .js but src is .ts
    // For simplicity, we check if main exists and if there is a corresponding .ts file
    
    if (!pkg.main) return;

    const entryPoint = path.join(pluginPath, pkg.main.replace('.js', '.ts'));
    const entryPoint2 = path.join(pluginPath, pkg.main.replace('.js', '.tsx'));
    
    let actualEntry = null;
    if (fs.existsSync(entryPoint)) actualEntry = entryPoint;
    else if (fs.existsSync(entryPoint2)) actualEntry = entryPoint2;
    
    // Fallback: check src/index.ts or main/index.ts
    if (!actualEntry) {
        const srcIndex = path.join(pluginPath, 'src', 'index.ts');
        const mainIndex = path.join(pluginPath, 'main', 'index.ts');
        if (fs.existsSync(srcIndex)) actualEntry = srcIndex;
        else if (fs.existsSync(mainIndex)) actualEntry = mainIndex;
    }

    // Fallback: Check if main is .js and exists (for ESM -> CJS conversion)
    if (!actualEntry && pkg.main && pkg.main.endsWith('.js')) {
        const jsEntry = path.join(pluginPath, pkg.main);
        if (fs.existsSync(jsEntry)) {
             // Check if it has ESM syntax
             try {
                const content = fs.readFileSync(jsEntry, 'utf8');
                if (content.includes('import ') || content.includes('export ')) {
                    actualEntry = jsEntry;
                    console.log(`Detected ESM in .js file: ${pkg.name}`);
                }
             } catch (e) {}
        }
    }

    if (!actualEntry) {
        console.log(`Skipping ${pkg.name}: No entry point found`);
        return;
    }

    console.log(`Building ${pkg.name}...`);
    
    try {
        await esbuild.build({
            entryPoints: [actualEntry],
            outfile: path.join(pluginPath, pkg.main),
            bundle: true,
            platform: 'node',
            format: 'cjs',
            target: 'node18',
            external: ['electron', ...Object.keys(pkg.dependencies || {}), ...Object.keys(pkg.peerDependencies || {})],
            allowOverwrite: true,
        });
        console.log(`✓ Built ${pkg.name}`);
    } catch (e) {
        console.error(`✗ Failed to build ${pkg.name}:`, e.message);
    }
}

async function main() {
    for (const dir of PLUGIN_DIRS) {
        const fullDir = path.join(ROOT_DIR, dir);
        if (!fs.existsSync(fullDir)) continue;

        const plugins = fs.readdirSync(fullDir);
        for (const plugin of plugins) {
            if (plugin.startsWith('.')) continue;
            await buildPlugin(path.join(fullDir, plugin));
        }
    }
}

main().catch(console.error);
