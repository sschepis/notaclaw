import { EventEmitter } from 'events';

export class NetworkManager extends EventEmitter {
  private node: any;
  private topic: string = 'entangled-chat-general';

  constructor() {
    super();
  }

  async init() {
    // Dynamic import for ESM modules
    // @ts-ignore
    const { createLibp2p } = await import('libp2p');
    // @ts-ignore
    const { webSockets } = await import('@libp2p/websockets');
    // @ts-ignore
    const { mplex } = await import('@libp2p/mplex');
    // @ts-ignore
    const { noise } = await import('@libp2p/noise');
    // @ts-ignore
    const { bootstrap } = await import('@libp2p/bootstrap');
    // @ts-ignore
    const { kadDHT } = await import('@libp2p/kad-dht');
    // @ts-ignore
    const { floodsub } = await import('@libp2p/floodsub');

    // @ts-ignore
    this.node = await createLibp2p({
      transports: [webSockets()],
      streamMuxers: [mplex()],
      connectionEncryption: [noise() as any],
      peerDiscovery: [
        bootstrap({
          list: [
            '/dns4/ams-1.bootstrap.libp2p.io/tcp/443/wss/p2p/QmSoLer265NRgSp2LA3dPaeykiS1J6DifTC88U5uFQxkYA',
            '/dns4/lon-1.bootstrap.libp2p.io/tcp/443/wss/p2p/QmSoLMeWqB7YGVLJN3pNLQpmmEk35v6wYtsMGLzSr5QBU3',
            '/dns4/sfo-3.bootstrap.libp2p.io/tcp/443/wss/p2p/QmSoLPppuBtQSGwKDZT2M73ULpjvfd3aZ6ha4oFGL1KrGM',
            '/dns4/sgp-1.bootstrap.libp2p.io/tcp/443/wss/p2p/QmSoLSafTMBsPKadTEjbXHJfi8GPjCBEBsP1pE81Gq82tC',
            '/dns4/nyc-1.bootstrap.libp2p.io/tcp/443/wss/p2p/QmSoLueR4xBeUbY9WZ9xGUUxunbKWcrNFTDAadQJmocnCm'
          ]
        })
      ],
      services: {
        dht: kadDHT(),
        pubsub: floodsub()
      }
    });

    this.node.addEventListener('peer:discovery', (evt: any) => {
      const peer = evt.detail;
      // console.log('Discovered:', peer.id.toString());
      this.node.peerStore.addressBook.add(peer.id, peer.multiaddrs);
      this.node.dial(peer.id).catch(() => {});
    });

    this.node.addEventListener('peer:connect', (evt: any) => {
      const peerId = evt.detail;
      // console.log('Connected:', peerId.toString());
      this.emit('peer:connect', peerId.toString());
    });

    await this.node.start();
    // console.log('libp2p node started');

    this.node.services.pubsub.subscribe(this.topic);
    this.node.services.pubsub.addEventListener('message', (message: any) => {
      // console.log(`Received: ${new TextDecoder().decode(message.detail.data)}`);
      try {
          const data = JSON.parse(new TextDecoder().decode(message.detail.data));
          this.emit('message', data);
      } catch (e) {
          console.error('Failed to parse message', e);
      }
    });
  }

  async broadcast(message: any) {
    if (!this.node) throw new Error('Network not initialized');
    const data = new TextEncoder().encode(JSON.stringify(message));
    await this.node.services.pubsub.publish(this.topic, data);
  }

  async stop() {
    if (this.node) {
      await this.node.stop();
    }
  }
  
  getPeerId(): string {
      return this.node ? this.node.peerId.toString() : '';
  }
}
