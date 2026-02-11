
import { activate, Fact, KnowledgeGraph } from '../src/index';

describe('Resonant Agent Plugin', () => {
  let context: any;
  let aiCompleteMock: jest.Mock;
  let toolHandler: Function;

  beforeEach(() => {
    aiCompleteMock = jest.fn();
    context = {
      ai: {
        complete: aiCompleteMock
      },
      dsn: {
        registerTool: jest.fn((def, handler) => {
          toolHandler = handler;
        })
      }
    };
  });

  test('activate registers tool', async () => {
    await activate(context);
    expect(context.dsn.registerTool).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'consultResonanceEngine' }),
        expect.any(Function)
    );
  });

  test('knowledge graph operations', () => {
    const kg = new KnowledgeGraph();
    const f1 = new Fact('A', 'is', 'B');
    kg.add(f1);
    
    expect(kg.getFactById(f1.id)).toBe(f1);
    expect(kg.query('A')).toHaveLength(1);
    expect(kg.query(null, 'is')).toHaveLength(1);
    expect(kg.query(null, null, 'B')).toHaveLength(1);
    expect(kg.query('X')).toHaveLength(0);
  });

  test('consultResonanceEngine tool calls AI', async () => {
    await activate(context);
    
    // Mock semantic indexer response
    aiCompleteMock.mockResolvedValueOnce({
        text: JSON.stringify({ relevant_ids: [] })
    });
    
    // Mock final response
    aiCompleteMock.mockResolvedValueOnce({
        text: JSON.stringify({ answer: 'Mocked Answer', sentiment: 'calm' })
    });

    const result = await toolHandler({ query: 'Who am I?' });
    
    expect(aiCompleteMock).toHaveBeenCalledTimes(2);
    expect(result.answer).toBe('Mocked Answer');
  });
});
