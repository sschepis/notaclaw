import * as fs from 'fs/promises';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class DependencyManager {
    private baseDir: string;

    constructor(baseDir: string) {
        this.baseDir = baseDir;
    }

    async ensureInitialized(skillDir: string) {
        const packageJsonPath = path.join(skillDir, 'package.json');
        try {
            await fs.access(packageJsonPath);
        } catch {
            // Create minimal package.json
            await fs.writeFile(packageJsonPath, JSON.stringify({
                name: 'openclaw-skill-' + path.basename(skillDir),
                version: '1.0.0',
                private: true
            }, null, 2));
        }
    }

    async installDependencies(skillDir: string, dependencies: Record<string, string>) {
        await this.ensureInitialized(skillDir);

        const depsToInstall = Object.entries(dependencies)
            .map(([name, version]) => `${name}@${version}`)
            .join(' ');

        if (!depsToInstall) return;

        console.log(`[DependencyManager] Installing dependencies for ${skillDir}: ${depsToInstall}`);
        
        try {
            await execAsync(`npm install ${depsToInstall}`, { cwd: skillDir });
            console.log(`[DependencyManager] Installation complete for ${skillDir}`);
        } catch (e: any) {
            console.error(`[DependencyManager] Installation failed: ${e.message}`);
            throw new Error(`Failed to install dependencies: ${e.message}`);
        }
    }

    async listDependencies(skillDir: string): Promise<string[]> {
        const packageJsonPath = path.join(skillDir, 'package.json');
        try {
            const content = await fs.readFile(packageJsonPath, 'utf8');
            const pkg = JSON.parse(content);
            return Object.keys(pkg.dependencies || {});
        } catch {
            return [];
        }
    }
}
