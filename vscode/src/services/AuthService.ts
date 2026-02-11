/**
 * Authentication Service for Agent Control
 * Handles token validation and session management
 */

import * as crypto from 'crypto';
import { ClientSession, AuthChallenge, AuthRequest, AuthResult } from '../protocol/types';
import { logger } from '../utils/logger';
import { getConfig, getOrGenerateToken } from '../utils/config';
import type { PairingService } from './PairingService';

const SESSION_TIMEOUT_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Sliding window rate limiter using a circular buffer of timestamps.
 * Each call to `recordAndCheck()` adds the current timestamp and returns
 * whether the request is within the allowed rate.
 */
class SlidingWindowRateLimiter {
  private timestamps: number[] = [];
  private maxPerSecond: number;

  constructor(maxPerSecond: number) {
    this.maxPerSecond = maxPerSecond;
  }

  /** Record a new request and return whether the request is allowed. */
  recordAndCheck(): boolean {
    const now = Date.now();
    // Prune timestamps older than 1 second
    this.timestamps = this.timestamps.filter(t => now - t < 1000);
    if (this.timestamps.length >= this.maxPerSecond) {
      return false; // rate limited
    }
    this.timestamps.push(now);
    return true; // allowed
  }

  updateLimit(maxPerSecond: number): void {
    this.maxPerSecond = maxPerSecond;
  }
}

export class AuthService {
  private sessions: Map<string, ClientSession> = new Map();
  private pendingChallenges: Map<string, { nonce: string; timestamp: number }> = new Map();
  private rateLimiters: Map<string, SlidingWindowRateLimiter> = new Map();
  private configuredToken: string = '';
  private cleanupInterval: ReturnType<typeof setInterval>;
  private pairingService: PairingService | null = null;

  constructor() {
    // Cleanup expired sessions periodically
    this.cleanupInterval = setInterval(() => this.cleanupExpiredSessions(), 60 * 1000);
  }

  /**
   * Inject the PairingService for paired-device token validation.
   * Called after both services are constructed to avoid circular deps.
   */
  setPairingService(pairingService: PairingService): void {
    this.pairingService = pairingService;
  }

  /**
   * Initialize the auth service with the configured token
   */
  async initialize(): Promise<void> {
    this.configuredToken = await getOrGenerateToken();
    logger.info('AuthService initialized');
  }

  /**
   * Create an authentication challenge for a new connection
   */
  createChallenge(clientId: string): AuthChallenge {
    const nonce = crypto.randomBytes(16).toString('hex');
    
    this.pendingChallenges.set(clientId, {
      nonce,
      timestamp: Date.now(),
    });

    // Expire challenge after 30 seconds
    setTimeout(() => {
      this.pendingChallenges.delete(clientId);
    }, 30000);

    logger.debug(`Challenge created for client ${clientId}`);
    
    return { nonce };
  }

  /**
   * Authenticate a client with token and nonce
   */
  authenticate(clientId: string, request: AuthRequest, clientInfo?: ClientSession['clientInfo']): AuthResult {
    const challenge = this.pendingChallenges.get(clientId);
    
    if (!challenge) {
      logger.warn(`Authentication failed for ${clientId}: No pending challenge`);
      return {
        authenticated: false,
        error: 'No pending challenge. Please reconnect.',
      };
    }

    // Verify nonce matches
    if (challenge.nonce !== request.nonce) {
      logger.warn(`Authentication failed for ${clientId}: Nonce mismatch`);
      return {
        authenticated: false,
        error: 'Invalid nonce',
      };
    }

    // First, try paired device token validation
    let isPairedDevice = false;
    if (this.pairingService) {
      const device = this.pairingService.validatePairedToken(request.token);
      if (device) {
        isPairedDevice = true;
        logger.info(`Authenticated via paired device: ${device.name} (${device.id})`);
      }
    }

    // If not a paired device token, verify against the configured token
    if (!isPairedDevice) {
      if (!this.configuredToken || this.configuredToken.length === 0) {
        logger.warn(`Authentication failed for ${clientId}: No configured token and not a paired device`);
        return {
          authenticated: false,
          error: 'Invalid token',
        };
      }

      const tokenBuffer = Buffer.from(request.token);
      const configuredBuffer = Buffer.from(this.configuredToken);
      
      if (tokenBuffer.length !== configuredBuffer.length || 
          !crypto.timingSafeEqual(tokenBuffer, configuredBuffer)) {
        logger.warn(`Authentication failed for ${clientId}: Invalid token`);
        return {
          authenticated: false,
          error: 'Invalid token',
        };
      }
    }

    // Clean up the challenge
    this.pendingChallenges.delete(clientId);

    // Create session
    const sessionId = crypto.randomBytes(16).toString('hex');
    const session: ClientSession = {
      id: sessionId,
      authenticated: true,
      connectedAt: Date.now(),
      lastActivity: Date.now(),
      requestCount: 0,
      clientInfo,
    };

    this.sessions.set(clientId, session);

    // Create a rate limiter for this client
    const config = getConfig();
    this.rateLimiters.set(clientId, new SlidingWindowRateLimiter(config.rateLimit.requestsPerSecond));
    
    logger.info(`Client ${clientId} authenticated successfully`);

    return {
      authenticated: true,
      sessionId,
    };
  }

  /**
   * Check if a client is authenticated
   */
  isAuthenticated(clientId: string): boolean {
    const session = this.sessions.get(clientId);
    if (!session) {
      return false;
    }

    // Check if session has expired
    if (Date.now() - session.lastActivity > SESSION_TIMEOUT_MS) {
      this.sessions.delete(clientId);
      this.rateLimiters.delete(clientId);
      return false;
    }

    return session.authenticated;
  }

  /**
   * Get session for a client
   */
  getSession(clientId: string): ClientSession | undefined {
    return this.sessions.get(clientId);
  }

  /**
   * Update last activity time for a client
   */
  updateActivity(clientId: string): void {
    const session = this.sessions.get(clientId);
    if (session) {
      session.lastActivity = Date.now();
      session.requestCount++;
    }
  }

  /**
   * Remove a client session (on disconnect)
   */
  removeSession(clientId: string): void {
    this.sessions.delete(clientId);
    this.pendingChallenges.delete(clientId);
    this.rateLimiters.delete(clientId);
    logger.debug(`Session removed for client ${clientId}`);
  }

  /**
   * Get all active sessions
   */
  getActiveSessions(): ClientSession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Check rate limiting for a client using sliding window algorithm.
   * Returns true if the request is allowed, false if rate-limited.
   */
  checkRateLimit(clientId: string): boolean {
    const config = getConfig();
    if (!config.rateLimit.enabled) {
      return true;
    }

    const limiter = this.rateLimiters.get(clientId);
    if (!limiter) {
      return false;
    }

    // Update the limit in case config changed
    limiter.updateLimit(config.rateLimit.requestsPerSecond);

    const allowed = limiter.recordAndCheck();
    if (!allowed) {
      logger.warn(`Rate limit exceeded for client ${clientId}`);
    }
    return allowed;
  }

  /**
   * Clean up expired sessions
   */
  private cleanupExpiredSessions(): void {
    const now = Date.now();
    for (const [clientId, session] of this.sessions) {
      if (now - session.lastActivity > SESSION_TIMEOUT_MS) {
        this.sessions.delete(clientId);
        this.rateLimiters.delete(clientId);
        logger.debug(`Expired session removed for client ${clientId}`);
      }
    }

    // Also clean up stale challenges
    for (const [clientId, challenge] of this.pendingChallenges) {
      if (now - challenge.timestamp > 30000) {
        this.pendingChallenges.delete(clientId);
      }
    }
  }

  /**
   * Refresh the configured token (called when config changes)
   */
  async refreshToken(): Promise<void> {
    this.configuredToken = await getOrGenerateToken();
    logger.info('Token refreshed');
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    clearInterval(this.cleanupInterval);
    this.sessions.clear();
    this.pendingChallenges.clear();
    this.rateLimiters.clear();
  }
}
