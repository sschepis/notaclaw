import { TwitterApi } from 'twitter-api-v2';
import { NeynarAPIClient } from '@neynar/nodejs-sdk'; // Farcaster client

// Note: In a real deployment, these would be injected via environment variables
// or the Secure Secrets Manager plugin.
let clients = {
    twitter: null,
    farcaster: null,
    lens: null
};

export function activate(context) {
  console.log('[Social Mirror] Activating Social Graph connectors...');

  context.dsn.registerTool({
    name: 'configurePlatform',
    description: 'Initializes a platform connection with secure credentials',
    parameters: {
      type: 'object',
      properties: {
        platform: { type: 'string', enum: ['twitter', 'farcaster'] },
        credentials: { 
            type: 'object',
            properties: {
                apiKey: { type: 'string' },
                apiSecret: { type: 'string' },
                accessToken: { type: 'string' },
                accessSecret: { type: 'string' },
                signerUuid: { type: 'string' } // Farcaster specific
            }
        }
      },
      required: ['platform', 'credentials']
    }
  }, async (args) => {
    try {
        if (args.platform === 'twitter') {
            clients.twitter = new TwitterApi({
                appKey: args.credentials.apiKey,
                appSecret: args.credentials.apiSecret,
                accessToken: args.credentials.accessToken,
                accessSecret: args.credentials.accessSecret,
            });
            // Verify connection
            const me = await clients.twitter.v2.me();
            console.log(`[Social Mirror] Twitter Connected: @${me.data.username}`);
            return { status: 'success', username: me.data.username };
        } 
        
        if (args.platform === 'farcaster') {
            clients.farcaster = new NeynarAPIClient(args.credentials.apiKey);
            console.log(`[Social Mirror] Farcaster Client Initialized`);
            return { status: 'success', platform: 'farcaster' };
        }

        return { status: 'error', message: 'Platform not supported yet' };
    } catch (e) {
        console.error(`[Social Mirror] Config Failed: ${e.message}`);
        return { status: 'error', message: e.message };
    }
  });

  context.dsn.registerTool({
    name: 'postContent',
    description: 'Publishes content to configured platforms',
    parameters: {
      type: 'object',
      properties: {
        platforms: { type: 'array', items: { type: 'string' } },
        content: { type: 'string' }
      },
      required: ['platforms', 'content']
    }
  }, async (args) => {
    const results = {};

    // Twitter
    if (args.platforms.includes('twitter') && clients.twitter) {
        try {
            const tweet = await clients.twitter.v2.tweet(args.content);
            results.twitter = { success: true, id: tweet.data.id };
        } catch (e) {
            results.twitter = { success: false, error: e.message };
        }
    }

    // Farcaster
    if (args.platforms.includes('farcaster') && clients.farcaster) {
        try {
            // Note: Neynar API publish structure
            const cast = await clients.farcaster.publishCast(args.credentials.signerUuid, args.content);
            results.farcaster = { success: true, hash: cast.hash };
        } catch (e) {
            results.farcaster = { success: false, error: e.message };
        }
    }

    return { status: 'completed', results };
  });

  console.log('[Social Mirror] Activated.');
}
