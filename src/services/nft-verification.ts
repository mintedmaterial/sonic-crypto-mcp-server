/**
 * NFT Verification Service for Bandit Kidz NFT Gating
 * Verifies wallet ownership of Bandit Kidz NFTs for dashboard access
 */

import { Env } from '../config/env';
import { SONIC_TOKENS } from '../lib/sonic-chains';

// ERC-721 ABI for NFT verification
const ERC721_ABI = [
  {
    inputs: [{ name: 'owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    name: 'ownerOf',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export interface NFTVerificationResult {
  isHolder: boolean;
  balance: number;
  contractAddress: string;
  chainId: number;
  walletAddress: string;
  error?: string;
}

export class NFTVerificationService {
  private contractAddress: string;
  private rpcUrl: string;

  constructor(private env: Env, chainId: number = 146) {
    this.contractAddress = env.BANDIT_KIDZ_CONTRACT;

    // Use dRPC for RPC calls
    this.rpcUrl = `${env.DRPC_HTTP_URL}${env.DRPC_API_KEY}`;
  }

  /**
   * Verify if wallet address holds any Bandit Kidz NFTs
   */
  async verifyHolder(walletAddress: string): Promise<NFTVerificationResult> {
    try {
      const address = walletAddress.toLowerCase();

      // Call balanceOf function via JSON-RPC
      const balance = await this.callBalanceOf(address);

      return {
        isHolder: balance > 0,
        balance,
        contractAddress: this.contractAddress,
        chainId: 146,
        walletAddress: address,
      };
    } catch (error) {
      console.error('NFT verification error:', error);
      return {
        isHolder: false,
        balance: 0,
        contractAddress: this.contractAddress,
        chainId: 146,
        walletAddress: walletAddress.toLowerCase(),
        error: error instanceof Error ? error.message : 'Verification failed',
      };
    }
  }

  /**
   * Call balanceOf function using JSON-RPC
   */
  private async callBalanceOf(address: string): Promise<number> {
    // Encode balanceOf(address) function call
    const functionSignature = '0x70a08231'; // balanceOf(address)
    const paddedAddress = address.slice(2).padStart(64, '0');
    const data = functionSignature + paddedAddress;

    const response = await fetch(this.rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_call',
        params: [
          {
            to: this.contractAddress,
            data,
          },
          'latest',
        ],
      }),
    });

    const result = await response.json() as any;

    if (result.error) {
      throw new Error(`RPC error: ${result.error.message}`);
    }

    // Decode uint256 result
    const balance = parseInt(result.result, 16);
    return balance;
  }

  /**
   * Batch verify multiple wallet addresses
   */
  async batchVerify(addresses: string[]): Promise<Record<string, NFTVerificationResult>> {
    const results: Record<string, NFTVerificationResult> = {};

    for (const address of addresses) {
      results[address.toLowerCase()] = await this.verifyHolder(address);
    }

    return results;
  }

  /**
   * Cache verification result in KV with 24h TTL
   */
  async cacheVerification(
    walletAddress: string,
    result: NFTVerificationResult
  ): Promise<void> {
    const cacheKey = `nft_verify:${walletAddress.toLowerCase()}`;
    const ttl = 24 * 60 * 60; // 24 hours

    await this.env.SONIC_CACHE.put(
      cacheKey,
      JSON.stringify(result),
      { expirationTtl: ttl }
    );
  }

  /**
   * Get cached verification result
   */
  async getCachedVerification(walletAddress: string): Promise<NFTVerificationResult | null> {
    const cacheKey = `nft_verify:${walletAddress.toLowerCase()}`;
    const cached = await this.env.SONIC_CACHE.get(cacheKey);

    if (!cached) return null;

    try {
      return JSON.parse(cached) as NFTVerificationResult;
    } catch {
      return null;
    }
  }

  /**
   * Verify with cache check first
   */
  async verifyWithCache(walletAddress: string): Promise<NFTVerificationResult> {
    // Check cache first
    const cached = await this.getCachedVerification(walletAddress);
    if (cached) {
      console.log(`✅ NFT verification cache hit for ${walletAddress}`);
      return cached;
    }

    // Verify on-chain
    const result = await this.verifyHolder(walletAddress);

    // Cache the result
    await this.cacheVerification(walletAddress, result);

    return result;
  }
}
