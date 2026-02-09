const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const readdir = promisify(fs.readdir);
const readFile = promisify(fs.readFile);
const stat = promisify(fs.stat);

/**
 * Production-Grade Legacy Skill Adapter
 * - Validates paths (prevent directory traversal)
 * - Caches loaded skills
 * - Graceful error handling for malformed files
 */
class LegacySkillAdapter {
  constructor(context) {
    this.context = context;
    this.skills = new Map();
    // Resolve home directory properly
    const home = process.env.HOME || (process.platform === 'win32' ? process.env.USERPROFILE : '');
    
    // Default search paths
    this.searchPaths = [
        process.env.OPENCLAW_SKILLS_PATH,
        path.join(home, '.openclaw/workspace/skills'),
        path.join(home, 'Development/openclaw/skills')
    ].filter(Boolean);
  }

  async initialize() {
    console.log(`[OpenClaw Skills] Scanning for skills in: ${this.searchPaths.join(', ')}`);
    
    for (const p of this.searchPaths) {
        try {
            await stat(p);
            await this.scanDirectory(p);
        } catch (e) {
            // Ignore missing paths
        }
    }

    console.log(`[OpenClaw Skills] Loaded ${this.skills.size} legacy skills.`);
    this.registerSkills();
  }

  async scanDirectory(dir) {
    // Safety check: ensure we are inside one of the allowed search paths
    const allowed = this.searchPaths.some(p => dir.startsWith(p));
    if (!allowed) {
        console.warn(`[OpenClaw Skills] Skipping unsafe path: ${dir}`);
        return;
    }

    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch (err) {
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

  async loadSkill(filePath) {
    try {
      const content = await readFile(filePath, 'utf8');
      if (!content) return;

      const skill = this.parseSkill(content, filePath);
      if (skill) {
        this.skills.set(skill.name, skill);
      }
    } catch (error) {
      console.warn(`[OpenClaw Skills] Error parsing ${filePath}:`, error.message);
    }
  }

  parseSkill(content, filePath) {
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
      handler: async (args) => this.executeSkill(skill.name, args)
    }));

    tools.forEach(tool => {
      try {
        this.context.services.tools.register(tool);
      } catch (e) {
        console.error(`[OpenClaw Skills] Failed to register ${tool.name}:`, e.message);
      }
    });
    
    // IPC endpoints for UI
    this.context.ipc.handle('skills:list', async () => Array.from(this.skills.values()));
    this.context.ipc.handle('skills:execute', async ({ name, args }) => this.executeSkill(name, args));
  }

  async executeSkill(name, args) {
    const skill = this.skills.get(name);
    if (!skill) throw new Error(`Skill ${name} not found`);

    console.log(`[OpenClaw Skills] Reading context for ${name}`);

    // Return the content for Context Injection
    try {
        const content = await readFile(skill.path, 'utf8');
        return {
            output: content,
            type: 'markdown',
            usage: 'Read the content to understand how to use this tool.'
        };
    } catch (e) {
        throw new Error(`Failed to read skill definition: ${e.message}`);
    }
  }
}

module.exports = {
  activate: async (context) => {
    console.log('[OpenClaw Skill Manager] Activating...');
    const adapter = new LegacySkillAdapter(context);
    await adapter.initialize();
    
    context.on('ready', () => {
      console.log('[OpenClaw Skill Manager] Ready');
    });
  },
  
  deactivate: () => {
    console.log('[OpenClaw Skill Manager] Deactivated');
  }
};
