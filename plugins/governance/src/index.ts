import { Context, Proposal } from './types';

export const activate = async (context: Context) => {
  console.log('[Governance Console] Main process activated');
  
  const proposals = new Map<string, Proposal>();

  const loadProposals = async () => {
      const stored = await context.storage.get('proposals');
      if (stored) {
          Object.values(stored).forEach((p: any) => proposals.set(p.id, p));
      }
  };
  
  const saveProposals = async () => {
      const obj: Record<string, Proposal> = {};
      proposals.forEach((value, key) => {
          obj[key] = value;
      });
      await context.storage.set('proposals', obj);
  };

  await loadProposals();

  context.dsn.registerTool({
    name: 'submit_proposal',
    description: 'Submit a new governance proposal',
    executionLocation: 'SERVER',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        description: { type: 'string' },
        creator: { type: 'string' }
      },
      required: ['title', 'description', 'creator']
    },
    semanticDomain: 'meta',
    primeDomain: [17],
    smfAxes: [0.8],
    requiredTier: 'Adept',
    version: '1.0.0'
  }, async (args: any) => {
      const id = 'prop_' + Date.now();
      const proposal: Proposal = {
          id,
          title: args.title,
          description: args.description,
          creator: args.creator,
          status: 'active',
          votes: { yes: 0, no: 0 },
          deadline: Date.now() + (7 * 24 * 60 * 60 * 1000) // 1 week
      };
      proposals.set(id, proposal);
      await saveProposals();
      return { status: 'submitted', proposal };
  });

  context.dsn.registerTool({
    name: 'vote_proposal',
    description: 'Vote on an active proposal',
    executionLocation: 'SERVER',
    parameters: {
      type: 'object',
      properties: {
        proposalId: { type: 'string' },
        vote: { type: 'string', enum: ['yes', 'no'] },
        voter: { type: 'string' }
      },
      required: ['proposalId', 'vote', 'voter']
    },
    semanticDomain: 'meta',
    primeDomain: [17],
    smfAxes: [0.6],
    requiredTier: 'Neophyte',
    version: '1.0.0'
  }, async (args: any) => {
      const proposal = proposals.get(args.proposalId);
      if (!proposal) return { status: 'error', message: 'Proposal not found' };
      if (proposal.status !== 'active') return { status: 'error', message: 'Proposal not active' };
      if (Date.now() > proposal.deadline) {
          proposal.status = proposal.votes.yes > proposal.votes.no ? 'passed' : 'rejected';
          await saveProposals();
          return { status: 'error', message: 'Voting closed' };
      }

      // Simplistic voting (no check for double voting per user in this MVP)
      if (args.vote === 'yes') proposal.votes.yes++;
      if (args.vote === 'no') proposal.votes.no++;
      
      await saveProposals();
      return { status: 'voted', proposal };
  });

  context.on('ready', () => {
    console.log('[Governance Console] Ready');
  });
};

export const deactivate = () => {
  console.log('[Governance Console] Deactivated');
};
