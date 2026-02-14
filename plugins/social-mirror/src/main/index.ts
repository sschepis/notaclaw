import { TwitterApi } from 'twitter-api-v2';
import { NeynarAPIClient } from '@neynar/nodejs-sdk';

interface Clients {
    twitter: TwitterApi | null;
    farcaster: NeynarAPIClient | null;
    lens: any | null;
}

const clients: Clients = {
    twitter: null,
    farcaster: null,
    lens: null
};

interface ToolArgs {
    platform?: string;
    credentials: {
        apiKey: string;
        apiSecret: string;
        accessToken: string;
        accessSecret: string;
        signerUuid: string;
    };
    platforms?: string[];
    content?: string;
}

export function activate(context: any) {
    console.log("[Social Mirror] Activating Social Graph connectors...");

    context.dsn.registerTool({
        name: "configurePlatform",
        description: "Initializes a platform connection with secure credentials",
        parameters: {
            type: "object",
            properties: {
                platform: { type: "string", enum: ["twitter", "farcaster"] },
                credentials: {
                    type: "object",
                    properties: {
                        apiKey: { type: "string" },
                        apiSecret: { type: "string" },
                        accessToken: { type: "string" },
                        accessSecret: { type: "string" },
                        signerUuid: { type: "string" }
                    }
                }
            },
            required: ["platform", "credentials"]
        }
    }, async (args: ToolArgs) => {
        try {
            if (args.platform === "twitter") {
                clients.twitter = new TwitterApi({
                    appKey: args.credentials.apiKey,
                    appSecret: args.credentials.apiSecret,
                    accessToken: args.credentials.accessToken,
                    accessSecret: args.credentials.accessSecret
                });
                const me = await clients.twitter.v2.me();
                console.log(`[Social Mirror] Twitter Connected: @${me.data.username}`);
                return { status: "success", username: me.data.username };
            }
            if (args.platform === "farcaster") {
                clients.farcaster = new NeynarAPIClient({ apiKey: args.credentials.apiKey });
                console.log(`[Social Mirror] Farcaster Client Initialized`);
                return { status: "success", platform: "farcaster" };
            }
            return { status: "error", message: "Platform not supported yet" };
        } catch (e: any) {
            console.error(`[Social Mirror] Config Failed: ${e.message}`);
            return { status: "error", message: e.message };
        }
    });

    context.dsn.registerTool({
        name: "postContent",
        description: "Publishes content to configured platforms",
        parameters: {
            type: "object",
            properties: {
                platforms: { type: "array", items: { type: "string" } },
                content: { type: "string" }
            },
            required: ["platforms", "content"]
        }
    }, async (args: ToolArgs) => {
        const results: any = {};
        
        if (!args.content) {
            return { status: "error", message: "Content is required" };
        }

        if (args.platforms?.includes("twitter") && clients.twitter) {
            try {
                const tweet = await clients.twitter.v2.tweet(args.content);
                results.twitter = { success: true, id: tweet.data.id };
            } catch (e: any) {
                results.twitter = { success: false, error: e.message };
            }
        }

        if (args.platforms?.includes("farcaster") && clients.farcaster) {
            try {
                const cast = await clients.farcaster.publishCast({ signerUuid: args.credentials.signerUuid, text: args.content });
                results.farcaster = { success: true, hash: (cast as any).cast?.hash || (cast as any).hash };
            } catch (e: any) {
                results.farcaster = { success: false, error: e.message };
            }
        }
        return { status: "completed", results };
    });

    if (context.traits) {
        context.traits.register({
            id: 'social-mirror',
            name: 'Social Media Integration',
            description: 'Post updates to Twitter and Farcaster.',
            instruction: 'You can post content to social media platforms (Twitter, Farcaster). Use `configurePlatform` to set up credentials if needed, and `postContent` to publish updates. Use this to share findings or announcements.',
            activationMode: 'dynamic',
            triggerKeywords: ['social media', 'twitter', 'tweet', 'farcaster', 'cast', 'post', 'publish', 'share']
        });
    }

    console.log("[Social Mirror] Activated.");
}
