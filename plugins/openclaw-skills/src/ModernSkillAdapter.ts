import * as fs from 'fs/promises';
import * as path from 'path';
import { ModernSkill } from './types';
import { SkillValidator } from './SkillValidator';
import { DependencyManager } from './DependencyManager';

export class ModernSkillAdapter {
    skills: Map<string, ModernSkill> = new Map();
    dependencyManager: DependencyManager;
    searchPaths: string[];

    constructor(searchPaths: string[]) {
        this.searchPaths = searchPaths;
        // Initialize dependency manager with a base directory for shared cache if needed
        // For now, we install per skill
        this.dependencyManager = new DependencyManager('');
    }

    async initialize() {
        console.log(`[ModernSkillAdapter] Scanning for skills in: ${this.searchPaths.join(', ')}`);
        for (const p of this.searchPaths) {
            try {
                await this.scanDirectory(p);
            } catch (e) {
                // Ignore
            }
        }
        console.log(`[ModernSkillAdapter] Loaded ${this.skills.size} modern skills.`);
    }

    async scanDirectory(dir: string) {
        let entries;
        try {
            entries = await fs.readdir(dir, { withFileTypes: true });
        } catch {
            return;
        }

        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
                
                // Check if this directory is a skill (has skill.json)
                const skillJsonPath = path.join(fullPath, 'skill.json');
                try {
                    await fs.access(skillJsonPath);
                    await this.loadSkill(fullPath);
                } catch {
                    // Not a skill root, recurse
                    await this.scanDirectory(fullPath);
                }
            }
        }
    }

    async loadSkill(dir: string) {
        try {
            const skillJsonPath = path.join(dir, 'skill.json');
            const content = await fs.readFile(skillJsonPath, 'utf8');
            const manifest = JSON.parse(content);

            const skill: ModernSkill = {
                ...manifest,
                id: `openclaw.modern.${manifest.name}`,
                path: skillJsonPath,
                dir: dir,
                type: 'modern'
            };

            const validation = SkillValidator.validate(skill);
            if (!validation.valid) {
                console.warn(`[ModernSkillAdapter] Invalid skill at ${dir}: ${validation.errors.join(', ')}`);
                return;
            }

            // Check dependencies
            if (skill.dependencies) {
                await this.dependencyManager.installDependencies(dir, skill.dependencies);
            }

            this.skills.set(skill.name, skill);
        } catch (e: any) {
            console.warn(`[ModernSkillAdapter] Failed to load skill at ${dir}: ${e.message}`);
        }
    }

    async executeSkill(name: string, args: any) {
        const skill = this.skills.get(name);
        if (!skill) throw new Error(`Skill ${name} not found`);

        const entryPoint = path.join(skill.dir, skill.entryPoint);
        
        // Basic security check
        const security = await SkillValidator.validateCode(entryPoint);
        if (!security.safe) {
            throw new Error(`Security check failed: ${security.errors.join(', ')}`);
        }

        console.log(`[ModernSkillAdapter] Executing ${name} (${entryPoint})`);

        // For now, we require the module and execute a default export function
        // In a real release, this should be sandboxed (vm2 or child_process)
        try {
            // Invalidate cache to allow hot reloading (basic)
            delete require.cache[require.resolve(entryPoint)];
            const module = require(entryPoint);
            
            if (typeof module.default === 'function') {
                return await module.default(args);
            } else if (typeof module === 'function') {
                return await module(args);
            } else {
                throw new Error('Skill entry point must export a default function');
            }
        } catch (e: any) {
            throw new Error(`Skill execution failed: ${e.message}`);
        }
    }
}
