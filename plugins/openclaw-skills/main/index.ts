
import * as fs from 'fs/promises';
import { Dirent } from 'fs';
import * as path from 'path';
import { ModernSkillAdapter } from '../src/ModernSkillAdapter';
import { Skill, LegacySkill } from '../src/types';

interface PluginContext {
  ipc: {
    handle(channel: string, handler: (data: any) => Promise<any>): void;
  };
  services: {
    tools: {
      register(tool: any): void;
    };
  };
  traits: {
    register(trait: any): void;
  };
  on(event: string, listener: () => void): void;
}

class LegacySkillAdapter {
  context: PluginContext;
  skills: Map<string, LegacySkill>;
  searchPaths: string[];

  constructor(context: PluginContext) {
    this.context = context;
    this.skills = new Map();
    // Resolve home directory properly
    const home = process.env.HOME || (process.platform === 'win32' ? process.env.USERPROFILE : '') || '';
    
    // Default search paths
    this.searchPaths = [
        process.env.OPENCLAW_SKILLS_PATH || '',
        path.join(home, '.openclaw/workspace/skills'),
        path.join(home, 'Development/openclaw/skills')
    ].filter(Boolean);
  }

  async initialize() {
    console.log(`[OpenClaw Skills] Scanning for legacy skills in: ${this.searchPaths.join(', ')}`);
    
    for (const p of this.searchPaths) {
        try {
            await fs.stat(p);
            await this.scanDirectory(p);
        } catch (e) {
            // Ignore missing paths
        }
    }

    console.log(`[OpenClaw Skills] Loaded ${this.skills.size} legacy skills.`);
    this.registerSkills();
  }

  async scanDirectory(dir: string) {
    // Safety check: ensure we are inside one of the allowed search paths
    const allowed = this.searchPaths.some(p => dir.startsWith(p));
    if (!allowed) {
        console.warn(`[OpenClaw Skills] Skipping unsafe path: ${dir}`);
        return;
    }

    let entries: Dirent[];
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch (err: any) {
      if (err.code === 'ENOENT') return;
      console.warn(`[OpenClaw Skills] Error reading directory ${dir}: ${err.message}`);
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
        await this.scanDirectory(fullPath);
      } else if (entry.name === 'SKILL.md') {
        await this.loadSkill(fullPath);
      }
    }
  }

  async loadSkill(filePath: string) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      if (!content) return;

      const skill = this.parseSkill(content, filePath);
      if (skill) {
        this.skills.set(skill.name, skill);
      }
    } catch (error: any) {
      console.warn(`[OpenClaw Skills] Error parsing ${filePath}:`, error.message);
    }
  }

  parseSkill(content: string, filePath: string): LegacySkill | null {
    // Robust parsing needed
    if (typeof content !== 'string') return null;

    const skillBlockMatch = content.match(/<skill>([\s\S]*?)<\/skill>/);
    if (!skillBlockMatch) return null;

    const blockContent = skillBlockMatch[1];
    
    const nameMatch = blockContent.match(/<name>(.*?)<\/name>/);
    const descMatch = blockContent.match(/<description>([\s\S]*?)<\/description>/);
    
    if (!nameMatch) return null;

    const name = nameMatch[1].trim();
    // Validate name format (alphanumeric + dashes)
    if (!/^[a-zA-Z0-9-_]+$/.test(name)) {
        console.warn(`[OpenClaw Skills] Invalid skill name "${name}" in ${filePath}`);
        return null;
    }

    const description = descMatch ? descMatch[1].trim() : '';
    
    return {
      id: `openclaw.legacy.${name}`,
      name: name,
      description: description,
      path: filePath,
      dir: path.dirname(filePath),
      version: '1.0.0', 
      semanticDomain: 'cognitive', 
      type: 'legacy'
    };
  }

  registerSkills() {
    if (!this.context.services || !this.context.services.tools) {
        console.warn('[OpenClaw Skills] Tool registry not available.');
        return;
    }

    // Register tool capabilities
    const tools = Array.from(this.skills.values()).map(skill => ({
      name: skill.name,
      description: skill.description || `Legacy skill: ${skill.name}`,
      parameters: {
        type: 'object',
        properties: {
          args: { 
            type: 'string', 
            description: 'Arguments to pass to the skill (CLI style)' 
          }
        }
      },
      handler: async (args: any) => this.executeSkill(skill.name, args)
    }));

    tools.forEach(tool => {
      try {
        this.context.services.tools.register(tool);
      } catch (e: any) {
        console.error(`[OpenClaw Skills] Failed to register ${tool.name}:`, e.message);
      }
    });
  }

  async executeSkill(name: string, args: any) {
    const skill = this.skills.get(name);
    if (!skill) throw new Error(`Skill ${name} not found`);

    console.log(`[OpenClaw Skills] Reading context for ${name}`);

    // Return the content for Context Injection
    try {
        const content = await fs.readFile(skill.path, 'utf8');
        return {
            output: content,
            type: 'markdown',
            usage: 'Read the content to understand how to use this tool.'
        };
    } catch (e: any) {
        throw new Error(`Failed to read skill definition: ${e.message}`);
    }
  }
}

export const activate = async (context: PluginContext) => {
    console.log('[OpenClaw Skill Manager] Activating...');

    // Register trait for AI to understand legacy skill capabilities
    context.traits.register({
      id: '@alephnet/openclaw-skills:legacy-skills',
      name: 'OpenClaw Legacy Skills',
      description: 'Provides access to OpenClaw legacy skill definitions for context injection',
      instruction: `You have access to OpenClaw legacy skills - pre-defined task templates and instructions.

Legacy skills are located in SKILL.md files and contain structured guidance for specific tasks.
When a skill is executed, its content is injected as context for you to follow.

Use case: When the user references a known skill or task pattern, you can invoke the skill
to get detailed instructions on how to proceed.

Skills are registered dynamically based on what's found in the user's OpenClaw workspace.`,
      activationMode: 'dynamic',
      triggerKeywords: ['skill', 'openclaw', 'legacy', 'SKILL.md', 'task template'],
      priority: 10,
      source: '@alephnet/openclaw-skills'
    });

    const home = process.env.HOME || (process.platform === 'win32' ? process.env.USERPROFILE : '') || '';
    const searchPaths = [
        process.env.OPENCLAW_SKILLS_PATH || '',
        path.join(home, '.openclaw/workspace/skills'),
        path.join(home, 'Development/openclaw/skills')
    ].filter(Boolean);

    const legacyAdapter = new LegacySkillAdapter(context);
    await legacyAdapter.initialize();

    const modernAdapter = new ModernSkillAdapter(searchPaths);
    await modernAdapter.initialize();

    // Register modern skills
    for (const [name, skill] of modernAdapter.skills) {
        context.services.tools.register({
            name: skill.name,
            description: skill.description,
            parameters: {
                type: 'object',
                properties: skill.inputs || {}
            },
            handler: async (args: any) => modernAdapter.executeSkill(name, args)
        });
    }
    
    // IPC endpoints for UI
    context.ipc.handle('skills:list', async () => {
        const legacy = Array.from(legacyAdapter.skills.values());
        const modern = Array.from(modernAdapter.skills.values());
        return [...legacy, ...modern];
    });

    context.ipc.handle('skills:execute', async ({ name, args }: { name: string, args: any }) => {
        if (legacyAdapter.skills.has(name)) {
            return legacyAdapter.executeSkill(name, args);
        } else if (modernAdapter.skills.has(name)) {
            return modernAdapter.executeSkill(name, args);
        } else {
            throw new Error(`Skill ${name} not found`);
        }
    });

    context.on('ready', () => {
      console.log('[OpenClaw Skill Manager] Ready');
    });
};

  
export const deactivate = () => {
    console.log('[OpenClaw Skill Manager] Deactivated');
};
