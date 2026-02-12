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
    
    // Fallback: check src/index.ts, main/index.ts, or src/main/index.ts
    if (!actualEntry) {
        const srcIndex = path.join(pluginPath, 'src', 'index.ts');
        const mainIndex = path.join(pluginPath, 'main', 'index.ts');
        const srcMainIndex = path.join(pluginPath, 'src', 'main', 'index.ts');
        if (fs.existsSync(srcIndex)) actualEntry = srcIndex;
        else if (fs.existsSync(mainIndex)) actualEntry = mainIndex;
        else if (fs.existsSync(srcMainIndex)) actualEntry = srcMainIndex;
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

    if (actualEntry) {
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
    } else {
        console.log(`Skipping main build for ${pkg.name}: No entry point found`);
    }

    // Always attempt renderer build regardless of main build result
    await buildRendererEntry(pluginPath, pkg);
}

async function buildRendererEntry(pluginPath, pkg) {
    const manifestJsonPath = path.join(pluginPath, 'manifest.json');
    let manifest = null;

    try {
        manifest = JSON.parse(fs.readFileSync(manifestJsonPath, 'utf8'));
    } catch {
        return; // No manifest.json or parse error; skip renderer build
    }

    if (!manifest.renderer) return;

    // Determine output path from manifest
    const rendererOut = path.join(pluginPath, manifest.renderer);
    const rendererDir = path.dirname(manifest.renderer);

    // Find the renderer source entry point
    // Look for .tsx/.ts source files corresponding to the output path
    // e.g., manifest.renderer = "dist/renderer/index.js" → look for renderer/index.tsx
    const rendererSrcCandidates = [];

    // Strip leading "dist/" from renderer path to find source
    const srcRelative = manifest.renderer
        .replace(/^dist\//, '')
        .replace(/\.js$/, '');

    rendererSrcCandidates.push(
        path.join(pluginPath, srcRelative + '.tsx'),
        path.join(pluginPath, srcRelative + '.ts'),
        path.join(pluginPath, srcRelative + '.jsx'),
        path.join(pluginPath, srcRelative + '.js'),
    );

    // Also check src/ prefixed paths (e.g., src/renderer/index.tsx)
    rendererSrcCandidates.push(
        path.join(pluginPath, 'src', srcRelative + '.tsx'),
        path.join(pluginPath, 'src', srcRelative + '.ts'),
        path.join(pluginPath, 'src', srcRelative + '.jsx'),
        path.join(pluginPath, 'src', srcRelative + '.js'),
    );

    let rendererEntry = null;
    for (const candidate of rendererSrcCandidates) {
        if (fs.existsSync(candidate)) {
            rendererEntry = candidate;
            break;
        }
    }

    if (!rendererEntry) {
        console.log(`  Skipping renderer build for ${pkg.name}: No renderer source found`);
        return;
    }

    console.log(`  Building renderer for ${pkg.name}...`);

    // Renderer code runs in a sandboxed browser-like environment.
    // React, ReactDOM, framer-motion, lucide-react are provided by the host via require().
    const rendererExternals = [
        'react', 'react-dom', 'react/jsx-runtime',
        'framer-motion', 'lucide-react', 'alephnet'
    ];

    try {
        // Build the renderer bundle.js (single file the PluginLoader tries first)
        const bundleOut = path.join(path.dirname(rendererOut), 'bundle.js');
        await esbuild.build({
            entryPoints: [rendererEntry],
            outfile: bundleOut,
            bundle: true,
            platform: 'browser',
            format: 'cjs',
            target: 'es2020',
            external: rendererExternals,
            allowOverwrite: true,
            jsx: 'automatic',
        });

        // Also output the non-bundled index.js for fallback
        await esbuild.build({
            entryPoints: [rendererEntry],
            outfile: rendererOut,
            bundle: true,
            platform: 'browser',
            format: 'cjs',
            target: 'es2020',
            external: rendererExternals,
            allowOverwrite: true,
            jsx: 'automatic',
        });

        console.log(`  ✓ Built renderer for ${pkg.name}`);
    } catch (e) {
        console.error(`  ✗ Failed to build renderer for ${pkg.name}:`, e.message);
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
