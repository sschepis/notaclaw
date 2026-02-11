
import { activate, deactivate } from '../main/index';
// import * as fs from 'fs/promises'; // We don't import this directly in test but mock it

// Mock fs/promises
jest.mock('fs/promises', () => {
  return {
    readdir: jest.fn(),
    readFile: jest.fn(),
    stat: jest.fn(),
    Dirent: class {
      constructor(name: string, type: string) {
        // @ts-ignore
        this.name = name;
        // @ts-ignore
        this.type = type;
      }
      isDirectory() { 
        // @ts-ignore
        return this.type === 'directory'; 
      }
    }
  };
});

// Import mocked fs to configure mocks
import * as fs from 'fs/promises';

describe('OpenClaw Skills', () => {
  let context: any;
  let traits: { [key: string]: any } = {};
  let tools: { [key: string]: any } = {};
  let ipcHandlers: { [key: string]: Function } = {};

  beforeEach(() => {
    jest.clearAllMocks();
    traits = {};
    tools = {};
    ipcHandlers = {};
    
    context = {
      traits: {
        register: jest.fn((t) => traits[t.id] = t)
      },
      services: {
        tools: {
          register: jest.fn((t) => tools[t.name] = t)
        }
      },
      ipc: {
        handle: jest.fn((channel, handler) => ipcHandlers[channel] = handler)
      },
      on: jest.fn()
    };
  });

  test('activate registers traits', async () => {
    (fs.stat as unknown as jest.Mock).mockRejectedValue(new Error('ENOENT'));
    
    await activate(context);
    expect(context.traits.register).toHaveBeenCalledWith(expect.objectContaining({
      id: '@alephnet/openclaw-skills:legacy-skills'
    }));
  });

  test('scans directory and loads SKILL.md', async () => {
    // Mock stat
    (fs.stat as unknown as jest.Mock).mockImplementation((path: string) => {
        if (path.includes('skills')) return Promise.resolve({});
        return Promise.reject(new Error('ENOENT'));
    });

    // Mock readdir
    (fs.readdir as unknown as jest.Mock).mockImplementation((dir: string) => {
        if (dir.endsWith('skills')) {
            // Return Dirent-like objects
            return Promise.resolve([
                { name: 'my-skill', isDirectory: () => true }
            ]);
        }
        if (dir.endsWith('my-skill')) {
             return Promise.resolve([
                { name: 'SKILL.md', isDirectory: () => false }
            ]);
        }
        return Promise.resolve([]);
    });

    // Mock readFile
    (fs.readFile as unknown as jest.Mock).mockImplementation((file: string) => {
        if (file.endsWith('SKILL.md')) {
            return Promise.resolve(`
<skill>
  <name>my-cool-skill</name>
  <description>Does cool things</description>
</skill>
            `);
        }
        return Promise.reject(new Error('ENOENT'));
    });

    process.env.OPENCLAW_SKILLS_PATH = '/test/skills';

    await activate(context);

    // Verify
    expect(context.services.tools.register).toHaveBeenCalledWith(expect.objectContaining({
        name: 'my-cool-skill'
    }));
    
    // Test IPC
    const skills = await ipcHandlers['skills:list']();
    expect(skills).toHaveLength(1);
    expect(skills[0].name).toBe('my-cool-skill');
  });
});
