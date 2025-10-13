/**
 * User Worker Manager - Workers for Platforms Integration
 *
 * Manages user-specific worker instances via dispatch namespace.
 * Each NFT holder gets an isolated worker instance with personalized agents.
 * Shared with Vibe SDK for cross-platform user experiences.
 *
 * Features:
 * - NFT-gated worker creation
 * - User-specific agent isolation
 * - Request routing to user workers
 * - Worker lifecycle management
 * - Cross-platform namespace sharing (Sonic MCP + Vibe SDK)
 */

import { Env } from '../config/env';
import { NFTVerificationService } from './nft-verification';

export interface UserWorkerConfig {
  userId: string;
  userAddress: string;
  isNFTHolder: boolean;
  workerName: string;
  createdAt: number;
  lastAccessedAt: number;
}

export interface DispatchOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: string | ArrayBuffer | ReadableStream;
}

/**
 * User Worker Manager
 *
 * Manages user-specific worker instances through Cloudflare's Workers for Platforms.
 * Provides isolated execution environments for each user with NFT-gated access.
 */
export class UserWorkerManager {
  private env: Env;
  private nftVerification: NFTVerificationService;

  constructor(env: Env) {
    this.env = env;
    this.nftVerification = new NFTVerificationService(env);
  }

  /**
   * Get or create a user-specific worker instance
   *
   * NFT holders get enhanced workers with all agents enabled.
   * Non-holders get limited worker with basic features only.
   */
  async getOrCreateUserWorker(
    userId: string,
    userAddress: string
  ): Promise<UserWorkerConfig> {
    // Verify NFT ownership
    const nftCheck = await this.nftVerification.verifyWithCache(userAddress);

    // Generate worker name (deterministic based on userId)
    const workerName = `user-${this.hashUserId(userId)}`;

    // Check if worker already exists in KV
    const existingConfig = await this.getUserWorkerConfig(userId);
    if (existingConfig) {
      // Update last accessed timestamp
      existingConfig.lastAccessedAt = Date.now();
      await this.saveUserWorkerConfig(existingConfig);
      return existingConfig;
    }

    // Create new user worker configuration
    const config: UserWorkerConfig = {
      userId,
      userAddress,
      isNFTHolder: nftCheck.isHolder,
      workerName,
      createdAt: Date.now(),
      lastAccessedAt: Date.now(),
    };

    // Save configuration
    await this.saveUserWorkerConfig(config);

    console.log('[UserWorkerManager] Created user worker', {
      userId,
      workerName,
      isNFTHolder: nftCheck.isHolder,
    });

    return config;
  }

  /**
   * Dispatch a request to a user-specific worker
   */
  async dispatchToUserWorker(
    userId: string,
    path: string,
    options: DispatchOptions = {}
  ): Promise<Response> {
    // Get user worker config
    const config = await this.getUserWorkerConfig(userId);
    if (!config) {
      return new Response(
        JSON.stringify({
          error: 'User worker not found. Please create a worker first.',
        }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create request for user worker
    const url = new URL(path, 'https://user-worker');
    const request = new Request(url, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': userId,
        'X-User-Address': config.userAddress,
        'X-NFT-Holder': config.isNFTHolder.toString(),
        ...options.headers,
      },
      body: options.body,
    });

    // Check if dispatch namespace is available
    if (!this.env.DISPATCHER) {
      return new Response(
        JSON.stringify({
          error: 'Dispatch namespace not configured. Please create sonic-user-workers namespace first.',
          instructions: 'Run: wrangler dispatch-namespace create sonic-user-workers'
        }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );
    }

    try {
      // Dispatch to user worker via namespace
      const worker = this.env.DISPATCHER.get(config.workerName);
      const response = await worker.fetch(request);

      // Update last accessed timestamp
      config.lastAccessedAt = Date.now();
      await this.saveUserWorkerConfig(config);

      return response;
    } catch (error) {
      console.error('[UserWorkerManager] Dispatch failed', {
        userId,
        workerName: config.workerName,
        error,
      });

      return new Response(
        JSON.stringify({
          error: 'Failed to dispatch request to user worker',
          details: error instanceof Error ? error.message : 'Unknown error',
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  /**
   * Get user worker configuration from KV
   */
  private async getUserWorkerConfig(
    userId: string
  ): Promise<UserWorkerConfig | null> {
    const key = `user-worker:${userId}`;
    const data = await this.env.SONIC_CACHE.get(key, 'json');
    return data as UserWorkerConfig | null;
  }

  /**
   * Save user worker configuration to KV
   */
  private async saveUserWorkerConfig(config: UserWorkerConfig): Promise<void> {
    const key = `user-worker:${config.userId}`;
    // Store for 30 days (workers auto-cleanup after inactivity)
    await this.env.SONIC_CACHE.put(key, JSON.stringify(config), {
      expirationTtl: 30 * 24 * 60 * 60,
    });
  }

  /**
   * Delete user worker (cleanup)
   */
  async deleteUserWorker(userId: string): Promise<boolean> {
    const key = `user-worker:${userId}`;
    await this.env.SONIC_CACHE.delete(key);

    console.log('[UserWorkerManager] Deleted user worker', { userId });

    return true;
  }

  /**
   * List all user workers (admin function)
   */
  async listUserWorkers(limit: number = 100): Promise<UserWorkerConfig[]> {
    const prefix = 'user-worker:';
    const list = await this.env.SONIC_CACHE.list({ prefix, limit });

    const configs: UserWorkerConfig[] = [];
    for (const key of list.keys) {
      const data = await this.env.SONIC_CACHE.get(key.name, 'json');
      if (data) {
        configs.push(data as UserWorkerConfig);
      }
    }

    return configs;
  }

  /**
   * Check NFT status and upgrade/downgrade worker features
   */
  async updateWorkerNFTStatus(
    userId: string,
    userAddress: string
  ): Promise<UserWorkerConfig | null> {
    const config = await this.getUserWorkerConfig(userId);
    if (!config) {
      return null;
    }

    // Re-verify NFT ownership
    const nftCheck = await this.nftVerification.verifyWithCache(userAddress);

    // Update NFT holder status
    if (config.isNFTHolder !== nftCheck.isHolder) {
      config.isNFTHolder = nftCheck.isHolder;
      config.lastAccessedAt = Date.now();
      await this.saveUserWorkerConfig(config);

      console.log('[UserWorkerManager] Updated NFT status', {
        userId,
        isNFTHolder: nftCheck.isHolder,
      });
    }

    return config;
  }

  /**
   * Hash user ID for deterministic worker naming
   */
  private hashUserId(userId: string): string {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Get worker stats for monitoring
   */
  async getWorkerStats(): Promise<{
    totalWorkers: number;
    nftHolders: number;
    nonHolders: number;
    activeToday: number;
  }> {
    const allWorkers = await this.listUserWorkers(1000);
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;

    return {
      totalWorkers: allWorkers.length,
      nftHolders: allWorkers.filter((w) => w.isNFTHolder).length,
      nonHolders: allWorkers.filter((w) => !w.isNFTHolder).length,
      activeToday: allWorkers.filter((w) => w.lastAccessedAt >= oneDayAgo)
        .length,
    };
  }
}
