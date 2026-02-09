import { AlephGunBridge } from '@sschepis/alephnet-node';
import { IdentityManager } from './IdentityManager';
import { SignedEnvelopeService } from './SignedEnvelopeService';
import { 
  DomainDefinition, 
  DomainRules, 
  DomainMembership, 
  DomainVisibility, 
  DomainRole, 
  MembershipStatus 
} from '../../shared/alephnet-types';
import { SignedEnvelope } from '../../shared/trust-types';
import { v4 as uuidv4 } from 'uuid';

export class DomainManager {
  constructor(
    private bridge: AlephGunBridge,
    private identityManager: IdentityManager,
    private envelopeService: SignedEnvelopeService
  ) {}

  async registerDomain(
    handle: string,
    name: string,
    description: string,
    visibility: DomainVisibility,
    rules?: Partial<DomainRules>
  ): Promise<DomainDefinition> {
    const identity = await this.identityManager.getPublicIdentity();
    if (!identity) throw new Error("No identity available");

    // Check handle availability
    const existingId = await this.bridge.get(`domains/by_handle/${handle}`);
    if (existingId) throw new Error(`Handle ${handle} is already taken`);

    const domainId = uuidv4();
    const now = Date.now();

    const defaultRules: DomainRules = {
      minStakingTier: 'Neophyte',
      minReputation: 0,
      requiresApproval: visibility !== 'public',
      whitelist: [],
      blacklist: [],
      grantedCapabilities: []
    };

    const definition: DomainDefinition = {
      id: domainId,
      handle,
      name,
      description,
      ownerId: identity.fingerprint,
      createdAt: now,
      visibility,
      rules: { ...defaultRules, ...rules },
      metadata: {}
    };

    // Sign the definition
    const envelope = await this.envelopeService.create(
      definition,
      'domain-definition',
      '1.0.0',
      []
    );

    // Store in Gun
    await this.bridge.put(`domains/${domainId}`, envelope);
    await this.bridge.put(`domains/by_handle/${handle}`, domainId);
    
    // Add owner as member
    await this.addMember(domainId, identity.fingerprint, 'owner', 'active');

    return definition;
  }

  async joinDomain(domainId: string): Promise<{ status: MembershipStatus }> {
    const identity = await this.identityManager.getPublicIdentity();
    if (!identity) throw new Error("No identity available");

    const domainEnvelope = await this.bridge.get(`domains/${domainId}`) as SignedEnvelope<DomainDefinition>;
    if (!domainEnvelope) throw new Error("Domain not found");
    
    const definition = domainEnvelope.payload;
    
    // Check rules (simplified for now)
    let status: MembershipStatus = 'active';
    if (definition.rules.requiresApproval) {
      status = 'pending';
    }

    // TODO: Check staking tier and reputation here

    await this.addMember(domainId, identity.fingerprint, 'member', status);
    return { status };
  }

  async leaveDomain(domainId: string): Promise<boolean> {
    const identity = await this.identityManager.getPublicIdentity();
    if (!identity) throw new Error("No identity available");

    await this.removeMember(domainId, identity.fingerprint);
    return true;
  }

  async getDomain(domainId: string): Promise<DomainDefinition | null> {
    const envelope = await this.bridge.get(`domains/${domainId}`) as SignedEnvelope<DomainDefinition>;
    return envelope ? envelope.payload : null;
  }
  
  async getDomainByHandle(handle: string): Promise<DomainDefinition | null> {
      const domainId = await this.bridge.get(`domains/by_handle/${handle}`);
      if (!domainId) return null;
      return this.getDomain(domainId);
  }

  async listDomains(_limit: number = 20): Promise<DomainDefinition[]> {
      // This is inefficient in Gun without a proper index or SEA list
      // For now, we'll assume there's a 'public_domains' list or we just scan known ones
      // Since we don't have a global list index yet, this might return empty or just local ones.
      // We should probably maintain a `domains/public` list.
      return []; 
  }

  async getMembers(domainId: string, _limit: number = 20): Promise<DomainMembership[]> {
      const membersMap = await this.bridge.get(`domains/${domainId}/members`);
      if (!membersMap) return [];
      
      // Convert map to array
      return Object.values(membersMap).filter((m: any) => m && m.userId) as DomainMembership[];
  }

  async getCommonDomains(userId: string): Promise<string[]> {
      const identity = await this.identityManager.getPublicIdentity();
      if (!identity) return [];
      
      const myDomainsMap = await this.bridge.get(`users/${identity.fingerprint}/domains`);
      const theirDomainsMap = await this.bridge.get(`users/${userId}/domains`);
      
      if (!myDomainsMap || !theirDomainsMap) return [];
      
      const myDomains = Object.keys(myDomainsMap).filter(k => k !== '_' && myDomainsMap[k]);
      const theirDomains = Object.keys(theirDomainsMap).filter(k => k !== '_' && theirDomainsMap[k]);
      
      return myDomains.filter(d => theirDomains.includes(d));
  }

  private async addMember(domainId: string, userId: string, role: DomainRole, status: MembershipStatus) {
    const membership: DomainMembership = {
      domainId,
      userId,
      role,
      status,
      joinedAt: Date.now()
    };
    
    // Store in domain's member list
    await this.bridge.put(`domains/${domainId}/members/${userId}`, membership);
    
    // Store in user's domain list
    await this.bridge.put(`users/${userId}/domains/${domainId}`, membership);
  }

  private async removeMember(domainId: string, userId: string) {
      await this.bridge.put(`domains/${domainId}/members/${userId}`, null);
      await this.bridge.put(`users/${userId}/domains/${domainId}`, null);
  }
}
