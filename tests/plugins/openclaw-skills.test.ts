import { PluginContextMock } from '../mocks/PluginContextMock';
import path from 'path';
import fs from 'fs';

// Mock fs and path if needed, but integration test with real files is better for scanning logic
// We will create a temp skill file for testing

const skillPlugin = require('../../plugins/openclaw-skills/main/index');

describe('OpenClaw Skills Plugin', () => {
  let context: PluginContextMock;
  const testSkillsDir = path.join(__dirname, 'temp-skills');

  beforeAll(() => {
    if (!fs.existsSync(testSkillsDir)) {
      fs.mkdirSync(testSkillsDir);
    }
    // Create a dummy skill
    const skillContent = `
<skill>
  <name>test-skill</name>
  <description>A test skill for unit testing.</description>
</skill>
# Usage
Run this.
    `;
    fs.writeFileSync(path.join(testSkillsDir, 'SKILL.md'), skillContent);
  });

  afterAll(() => {
    if (fs.existsSync(path.join(testSkillsDir, 'SKILL.md'))) {
      fs.unlinkSync(path.join(testSkillsDir, 'SKILL.md'));
    }
    if (fs.existsSync(testSkillsDir)) {
      fs.rmdirSync(testSkillsDir);
    }
  });

  beforeEach(() => {
    context = new PluginContextMock('openclaw-skills');
    // Override process.env for test
    process.env.OPENCLAW_SKILLS_PATH = testSkillsDir;
  });

  it('should scan and register legacy skills', async () => {
    await skillPlugin.activate(context);
    
    // Verify tool registration
    expect(context.services.tools.registered.length).toBeGreaterThan(0);
    const tool = context.services.tools.registered.find(t => t.name === 'test-skill');
    expect(tool).toBeDefined();
    expect(tool.description).toBe('A test skill for unit testing.');
  });

  it('should execute skill by returning content', async () => {
    await skillPlugin.activate(context);
    const tool = context.services.tools.registered.find(t => t.name === 'test-skill');
    
    const result = await tool.handler({ args: 'some args' });
    expect(result.type).toBe('markdown');
    expect(result.output).toContain('<name>test-skill</name>');
  });
});
