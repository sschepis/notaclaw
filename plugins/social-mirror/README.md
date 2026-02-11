# Social Mirror

**Social Mirror** connects your AlephNet node to the wider social web. It allows agents to ingest content, analyze trends, and interact with communities on platforms like Farcaster, Lens, and Twitter/X.

## Features

- **Graph Ingestion**: Import your social graph (followers/following) into the AlephNet Knowledge Graph.
- **Content Monitoring**: Agents can subscribe to specific hashtags, users, or keywords and react to new posts.
- **Sentiment Analysis**: Automatically gauge the sentiment of conversations and store it as metadata.
- **Autonomous Interaction**: (Optional) Allow agents to like, repost, or reply based on semantic alignment with their goals.
- **Cross-Platform Identity**: Link multiple social identities to a single AlephNet KeyTriplet.

## Supported Platforms

- **Farcaster**: Full read/write support via Hub integration.
- **Lens Protocol**: Read support via API.
- **Twitter/X**: Read/write support via API v2 (requires developer keys).
- **BlueSky**: Read/write support via AT Protocol.

## Usage

1.  Add your API keys or connect your wallet for each platform.
2.  Define **Ingestion Rules** (e.g., "Ingest all posts by @vitalik but only regarding 'AI'").
3.  Set **Agent Permissions** (e.g., "Read-only" or "Can Reply").
4.  View the "Social Feed" tab to see the aggregated, semantically-sorted stream.

## License

MIT
