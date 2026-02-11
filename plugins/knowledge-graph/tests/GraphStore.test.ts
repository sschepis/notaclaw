import { activate } from '../main/index';

// Mock context
const mockContext = {
  traits: {
    register: jest.fn(),
  },
  ipc: {
    handle: jest.fn(),
    send: jest.fn(),
    on: jest.fn(),
  },
  dsn: {
    registerTool: jest.fn(),
  },
  services: {
    tools: {
      register: jest.fn(),
    },
  },
  storage: {
    get: jest.fn().mockResolvedValue([]),
    set: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
  },
  on: jest.fn((event, cb) => {
    if (event === 'ready') cb();
  }),
};

describe('Knowledge Graph Plugin', () => {
  let store: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    store = await activate(mockContext);
  });

  test('activates and loads from storage', async () => {
    expect(mockContext.storage.get).toHaveBeenCalledWith('triples');
    expect(mockContext.traits.register).toHaveBeenCalled();
    expect(mockContext.dsn.registerTool).toHaveBeenCalledTimes(4); // query, add, related, search
  });

  test('addKnowledge creates entities and relations', async () => {
    const result = await store.addKnowledge({
      subject: 'Alice',
      predicate: 'knows',
      object: 'Bob',
      subjectType: 'person',
      objectType: 'person',
    });

    expect(result.success).toBe(true);
    expect(result.subjectEntity.name).toBe('Alice');
    expect(result.objectEntity.name).toBe('Bob');
    expect(store.entities.size).toBe(2);
    expect(store.relations.size).toBe(1);
    
    // Verify persistence
    expect(mockContext.storage.set).toHaveBeenCalled();
  });

  test('searchEntities finds added entities', async () => {
    await store.addEntity({ name: 'Tesla Model S', type: 'car' });
    await store.addEntity({ name: 'SpaceX', type: 'company' });

    const results = await store.searchEntities('Tesla');
    expect(results.length).toBe(1);
    expect(results[0].name).toBe('Tesla Model S');
  });

  test('getRelated traverses the graph', async () => {
    // A -> B -> C
    await store.addKnowledge({ subject: 'A', predicate: 'to', object: 'B' });
    await store.addKnowledge({ subject: 'B', predicate: 'to', object: 'C' });

    const related = await store.getRelated('A', 2);
    // Should find A, B, C (if A is root, it finds relations)
    // "getRelated" implementation:
    // traverse(normalizedId, 0)
    // visited add A
    // find relations where subject=A -> rel(A->B).
    // traverse(B, 1) -> visited add B. find relations where subject=B -> rel(B->C).
    // traverse(C, 2) -> visited add C.
    
    // Result entities should contain A, B, C?
    // Implementation: "if (entity && !result.entities.find...) result.entities.push(entity)"
    
    // The implementation seems to add the entity at currentId.
    // So it should return A, B, C.
    
    // Note: getRelated uses normalizeId which lowercases.
    
    const entityNames = related.entities.map((e: any) => e.name);
    expect(entityNames).toContain('A');
    expect(entityNames).toContain('B');
    expect(entityNames).toContain('C');
  });
});
