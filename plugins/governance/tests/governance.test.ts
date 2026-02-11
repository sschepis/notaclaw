import { activate } from '../src/index';

const mockContext = {
    storage: {
        get: jest.fn().mockResolvedValue({}),
        set: jest.fn().mockResolvedValue(undefined)
    },
    dsn: {
        registerTool: jest.fn()
    },
    ipc: {
        send: jest.fn(),
        on: jest.fn()
    },
    on: jest.fn()
};

describe('Governance Console', () => {
    let handlers: any = {};

    beforeEach(() => {
        jest.clearAllMocks();
        mockContext.dsn.registerTool.mockImplementation((tool, handler) => {
            handlers[tool.name] = handler;
        });
    });

    test('should submit a proposal', async () => {
        await activate(mockContext as any);
        const submit = handlers['submit_proposal'];
        
        const result = await submit({
            title: 'Increase Block Size',
            description: 'We should increase the block size.',
            creator: 'Alice'
        });

        expect(result.status).toBe('submitted');
        expect(result.proposal.title).toBe('Increase Block Size');
        expect(result.proposal.status).toBe('active');
        
        expect(mockContext.storage.set).toHaveBeenCalledWith(
            'proposals',
            expect.objectContaining({
                [result.proposal.id]: expect.objectContaining({
                    title: 'Increase Block Size'
                })
            })
        );
    });

    test('should vote on a proposal', async () => {
        await activate(mockContext as any);
        const submit = handlers['submit_proposal'];
        const vote = handlers['vote_proposal'];
        
        // Submit first
        const pResult = await submit({
            title: 'Test Proposal',
            description: 'Test',
            creator: 'Bob'
        });
        const proposalId = pResult.proposal.id;

        // Vote
        const vResult = await vote({
            proposalId,
            vote: 'yes',
            voter: 'Charlie'
        });

        expect(vResult.status).toBe('voted');
        expect(vResult.proposal.votes.yes).toBe(1);
        expect(vResult.proposal.votes.no).toBe(0);
        
        // Vote again (different user in theory)
        const vResult2 = await vote({
            proposalId,
            vote: 'no',
            voter: 'Dave'
        });
        
        expect(vResult2.status).toBe('voted');
        expect(vResult2.proposal.votes.yes).toBe(1);
        expect(vResult2.proposal.votes.no).toBe(1);
    });
});
