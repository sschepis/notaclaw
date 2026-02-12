/// <reference types="node" />
import Gun from 'gun';
import * as fs from 'fs';
import * as path from 'path';

// Define Group interface locally
interface Group {
  id: string;
  name: string;
  topic: string;
  description?: string;
  visibility: 'public' | 'private' | 'restricted';
  memberCount: number;
  createdBy: string;
  createdAt: number;
  joined?: boolean;
}

const INITIAL_GROUPS: Partial<Group>[] = [
  { name: 'AlephNet General', topic: 'General discussion about the AlephNet ecosystem', visibility: 'public' },
  { name: 'Prompt Engineering', topic: 'Share and refine your prompt crafting skills', visibility: 'public' },
  { name: 'Agent Development', topic: 'Building and deploying SRIA agents', visibility: 'public' },
  { name: 'Coherence & Truth', topic: 'Verifying claims and building the truth graph', visibility: 'public' },
  { name: 'Marketplace', topic: 'Trading plugins, skills, and resources', visibility: 'public' },
  { name: 'Developers', topic: 'Technical discussion and SDK support', visibility: 'public' },
  { name: 'Off-Topic', topic: 'Everything else', visibility: 'public' },
];

function generateId(prefix: string = ''): string {
  return `${prefix}${prefix ? '_' : ''}${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function getPeers(): string[] {
  const defaultPeers = [
    'http://localhost:8765/gun',
    'https://gun-manhattan.herokuapp.com/gun',
    'https://gun-us.herokuapp.com/gun'
  ];

  try {
    const configPath = path.join(process.cwd(), 'data', 'config.json');
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      if (config.network && Array.isArray(config.network.peers)) {
        return config.network.peers;
      }
    }
  } catch (e) {
    console.warn('Failed to load config.json, using defaults:', e);
  }
  return defaultPeers;
}

async function main() {
  console.log('Starting group population script...');

  const peers = getPeers();
  console.log(`Connecting to peers: ${peers.join(', ')}`);

  // Initialize Gun
  const gun = Gun({
    peers: peers,
    file: 'data/radata' 
  });

  // Wait for a moment to connect
  await new Promise(resolve => setTimeout(resolve, 2000));

  console.log('Scanning existing groups...');
  
  const existingGroups = new Map<string, any>();
  
  // Load existing groups from 'groups' node
  await new Promise<void>((resolve) => {
    // Timeout to stop waiting if no groups found or slow connection
    const timeout = setTimeout(() => {
      console.log(`Scan timed out. Found ${existingGroups.size} groups.`);
      resolve();
    }, 5000);

    gun.get('groups').map().once((data, id) => {
      if (data && id && id !== '_') {
        existingGroups.set(id, data);
        console.log(`Found group: ${data.name} (${id})`);
      }
    });
  });

  console.log('Checking against initial groups...');

  for (const initialGroup of INITIAL_GROUPS) {
    const exists = [...existingGroups.values()].some(g => g.name === initialGroup.name);
    
    if (exists) {
      console.log(`Group "${initialGroup.name}" already exists. Skipping.`);
    } else {
      console.log(`Creating group "${initialGroup.name}"...`);
      
      const id = generateId('grp');
      const newGroup: Group = {
        id,
        name: initialGroup.name!,
        topic: initialGroup.topic!,
        visibility: initialGroup.visibility as 'public' | 'private' | 'restricted',
        memberCount: 0,
        createdBy: 'system-script',
        createdAt: Date.now(),
        joined: false
      };

      // Write to Gun
      gun.get('groups').get(id).put(newGroup as any, (ack: any) => {
        if (ack.err) {
          console.error(`Failed to create group "${newGroup.name}":`, ack.err);
        } else {
          console.log(`Successfully created group "${newGroup.name}" (${id})`);
        }
      });
    }
  }

  // Allow some time for writes to propagate
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  console.log('Done.');
  process.exit(0);
}

main().catch(console.error);
