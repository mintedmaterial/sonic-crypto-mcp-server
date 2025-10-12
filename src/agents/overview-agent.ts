// Overview Agent - Market Overview & Trending Pairs Monitoring
// Tracks DexScreener trending pairs, generates heatmaps, manages user asset lists

import { BaseAgent } from './core/base-agent';
import { Env } from '../config/env';
import { BaseAgentState } from './core/agent-state';
import { OperationResult } from './core/types';
import { DexScreenerEnhancedService, TrendingPair, HeatmapDataPoint } from '../services/dexscreener-enhanced';
import { AIService } from '../services/ai';

/**
 * Tracked asset (base S tokens or user-added)
 */
interface TrackedAsset {
  chain: string;
  address: string;
  symbol: string;
  name: string;
  addedAt: number;
  userId: string;
  isBaseAsset?: boolean; // True for default S tokens, false for user-added
}

/**
 * Core Sonic ecosystem tokens - Official Sonic Mainnet Addresses
 * Source: https://docs.soniclabs.com/sonic/build-on-sonic/contract-addresses
 */
const CORE_S_TOKENS = [
  { symbol: 'wS', address: '0x039e2fB66102314Ce7b64Ce5Ce3E5183bc94aD38', name: 'Wrapped S' },
  { symbol: 'WETH', address: '0x50c42dEAcD8Fc9773493ED674b675bE577f2634b', name: 'Wrapped Ether' },
  { symbol: 'USDC', address: '0x29219dd400f2Bf60E5a23d13Be72B486D4038894', name: 'USD Coin' },
  { symbol: 'USDT', address: '0x6047828dc181963ba44974801ff68e538da5eaf9', name: 'Tether USD (Bridged)' },
  { symbol: 'EURC', address: '0xe715cba7b5ccb33790cebff1436809d36cb17e57', name: 'EURC (Bridged)' },
];

/**
 * Number of trending pairs to include as base tracked assets
 */
const TRENDING_BASE_LIMIT = 30;

/**
 * Market sentiment analysis result
 */
interface MarketSentiment {
  overallSentiment: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
  indicators: {
    priceAction: string;
    volumeTrend: string;
    marketBreadth: string;
  };
  summary: string;
  timestamp: number;
}

/**
 * Overview Agent
 * Responsible for market overview, trending pairs, and asset tracking
 */
export class OverviewAgent extends BaseAgent {
  protected agentType: BaseAgentState['agentType'] = 'overview';
  private dexScreener!: DexScreenerEnhancedService;
  private aiService!: AIService;

  /**
   * Initialize the Overview Agent
   */
  protected async onInitialize(params: any): Promise<void> {
    this.dexScreener = new DexScreenerEnhancedService(this.env);
    this.aiService = new AIService(this.env);

    // Schedule automatic trending pairs refresh
    await this.scheduleAutomaticRefresh();

    console.log(`[OverviewAgent] Initialized for session ${params.sessionId}`);
  }

  /**
   * Schedule automatic refresh of trending pairs (every 5 minutes via cron)
   */
  private async scheduleAutomaticRefresh() {
    // Set alarm for next refresh
    await this.ctx.storage.setAlarm(Date.now() + 5 * 60 * 1000); // 5 minutes
  }

  /**
   * Alarm handler - automatically refresh trending pairs
   */
  async alarm() {
    await super.alarm(); // Call base class alarm for cache cleanup

    try {
      console.log('[OverviewAgent] Auto-refresh triggered');

      // Refresh trending pairs for Sonic
      await this.refreshTrendingPairs('sonic');

      // Schedule next refresh
      await this.scheduleAutomaticRefresh();
    } catch (error) {
      console.error('[OverviewAgent] Auto-refresh error:', error);
      // Still schedule next refresh even if this one failed
      await this.scheduleAutomaticRefresh();
    }
  }

  /**
   * Get trending pairs for a chain
   */
  async getTrendingPairs(chain: string = 'sonic', limit: number = 50): Promise<OperationResult<TrendingPair[]>> {
    return this.executeOperation(async () => {
      const trending = await this.dexScreener.getTrendingPairsBrowser(chain, limit);

      // Broadcast update to connected clients
      this.broadcast({
        type: 'data_update',
        agentId: this.stateManager.getState().agentId,
        data: {
          type: 'trending_pairs',
          chain,
          pairs: trending.slice(0, 10), // Send top 10 for UI update
          count: trending.length,
        },
        timestamp: Date.now(),
      });

      return trending;
    }, `trending:${chain}:${limit}`);
  }

  /**
   * Refresh trending pairs (called by cron or manually)
   */
  async refreshTrendingPairs(chain: string = 'sonic'): Promise<OperationResult> {
    return this.executeOperation(async () => {
      const result = await this.getTrendingPairs(chain, 50);

      if (result.success && result.data) {
        // Store in D1 for historical tracking
        await this.storeTrendingSnapshot(chain, result.data);

        return {
          message: 'Trending pairs refreshed',
          count: result.data.length,
        };
      }

      throw new Error('Failed to fetch trending pairs');
    });
  }

  /**
   * Get top gainers
   */
  async getTopGainers(chain: string = 'sonic', limit: number = 10): Promise<OperationResult<TrendingPair[]>> {
    return this.executeOperation(async () => {
      return this.dexScreener.getTopGainers(chain, limit);
    }, `gainers:${chain}:${limit}`);
  }

  /**
   * Get top losers
   */
  async getTopLosers(chain: string = 'sonic', limit: number = 10): Promise<OperationResult<TrendingPair[]>> {
    return this.executeOperation(async () => {
      return this.dexScreener.getTopLosers(chain, limit);
    }, `losers:${chain}:${limit}`);
  }

  /**
   * Generate market heatmap
   */
  async getMarketHeatmap(chain: string = 'sonic', limit: number = 30): Promise<OperationResult<HeatmapDataPoint[]>> {
    return this.executeOperation(async () => {
      return this.dexScreener.getMarketHeatmap(chain, limit);
    }, `heatmap:${chain}:${limit}`);
  }

  /**
   * Get live prices for tracked assets
   */
  async getLivePrices(chain: string, addresses: string[]): Promise<OperationResult<Record<string, TrendingPair>>> {
    return this.executeOperation(async () => {
      const priceMap = await this.dexScreener.getLivePrices(chain, addresses);
      return Object.fromEntries(priceMap);
    }, `prices:${chain}:${addresses.join(',')}`);
  }

  /**
   * Add asset to user's tracked list
   */
  async addTrackedAsset(
    userId: string,
    chain: string,
    address: string
  ): Promise<OperationResult<TrackedAsset>> {
    return this.executeOperation(async () => {
      // Search for the asset to get details
      const searchResults = await this.dexScreener.searchPairs(address);

      if (searchResults.length === 0) {
        throw new Error(`Asset not found: ${address}`);
      }

      const pair = searchResults[0];
      const asset: TrackedAsset = {
        chain,
        address,
        symbol: pair.baseToken.symbol,
        name: pair.baseToken.name,
        addedAt: Date.now(),
        userId,
      };

      // Store in D1
      await this.env.CONFIG_DB.prepare(
        `INSERT INTO user_tracked_assets (user_id, chain, address, symbol, name, added_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
        .bind(
          userId,
          chain,
          address,
          asset.symbol,
          asset.name,
          asset.addedAt
        )
        .run();

      // Update custom state
      const trackedAssets = this.stateManager.getCustomState<TrackedAsset[]>('trackedAssets') || [];
      trackedAssets.push(asset);
      this.stateManager.updateCustomState('trackedAssets', trackedAssets);

      // Broadcast update
      this.broadcast({
        type: 'data_update',
        agentId: this.stateManager.getState().agentId,
        data: {
          type: 'asset_added',
          asset,
        },
        timestamp: Date.now(),
      });

      return asset;
    });
  }

  /**
   * Remove asset from tracked list
   */
  async removeTrackedAsset(userId: string, address: string): Promise<OperationResult> {
    return this.executeOperation(async () => {
      await this.env.CONFIG_DB.prepare(
        'DELETE FROM user_tracked_assets WHERE user_id = ? AND address = ?'
      )
        .bind(userId, address)
        .run();

      // Update custom state
      const trackedAssets = this.stateManager.getCustomState<TrackedAsset[]>('trackedAssets') || [];
      const updated = trackedAssets.filter(a => a.address !== address);
      this.stateManager.updateCustomState('trackedAssets', updated);

      // Broadcast update
      this.broadcast({
        type: 'data_update',
        agentId: this.stateManager.getState().agentId,
        data: {
          type: 'asset_removed',
          address,
        },
        timestamp: Date.now(),
      });

      return { message: 'Asset removed', address };
    });
  }

  /**
   * Get user's tracked assets (core tokens + top 30 trending + user-added assets)
   */
  async getTrackedAssets(userId: string): Promise<OperationResult<TrackedAsset[]>> {
    return this.executeOperation(async () => {
      // 1. Core Sonic tokens (always included)
      const coreAssets: TrackedAsset[] = CORE_S_TOKENS.map(token => ({
        chain: 'sonic',
        address: token.address,
        symbol: token.symbol,
        name: token.name,
        addedAt: 0, // Base assets have timestamp 0
        userId,
        isBaseAsset: true,
      }));

      // 2. Top 30 trending pairs (dynamically fetched)
      let trendingAssets: TrackedAsset[] = [];
      try {
        const trending = await this.dexScreener.getTrendingPairsBrowser('sonic', TRENDING_BASE_LIMIT);

        // Deduplicate - don't include if already in core tokens
        const coreAddresses = new Set(CORE_S_TOKENS.map(t => t.address.toLowerCase()));

        trendingAssets = trending
          .filter(pair => !coreAddresses.has(pair.baseToken.address.toLowerCase()))
          .map(pair => ({
            chain: 'sonic',
            address: pair.baseToken.address,
            symbol: pair.baseToken.symbol,
            name: pair.baseToken.name,
            addedAt: 0, // Base assets have timestamp 0
            userId,
            isBaseAsset: true,
          }));
      } catch (error) {
        console.error('[OverviewAgent] Failed to fetch trending assets:', error);
        // Continue without trending assets if fetch fails
      }

      // 3. User-added assets
      const result = await this.env.CONFIG_DB.prepare(
        'SELECT * FROM user_tracked_assets WHERE user_id = ? ORDER BY added_at DESC'
      )
        .bind(userId)
        .all();

      const userAssets: TrackedAsset[] = result.results.map((row: any) => ({
        chain: row.chain,
        address: row.address,
        symbol: row.symbol,
        name: row.name,
        addedAt: row.added_at,
        userId: row.user_id,
        isBaseAsset: false,
      }));

      // Return: Core tokens → Trending tokens → User-added tokens
      return [...coreAssets, ...trendingAssets, ...userAssets];
    }, `tracked_assets:${userId}`);
  }

  /**
   * Analyze market sentiment using AI
   */
  async analyzeMarketSentiment(chain: string = 'sonic'): Promise<OperationResult<MarketSentiment>> {
    return this.executeOperation(async () => {
      // Get recent market data
      const [trending, gainers, losers] = await Promise.all([
        this.dexScreener.getTrendingPairsBrowser(chain, 20),
        this.dexScreener.getTopGainers(chain, 10),
        this.dexScreener.getTopLosers(chain, 10),
      ]);

      // Calculate market metrics
      const totalVolume = trending.reduce((sum, p) => sum + (p.volume.h24 || 0), 0);
      const avgPriceChange = trending.reduce((sum, p) => sum + (p.priceChange.h24 || 0), 0) / trending.length;
      const gainersCount = trending.filter(p => (p.priceChange.h24 || 0) > 0).length;
      const losersCount = trending.filter(p => (p.priceChange.h24 || 0) < 0).length;

      // Prepare data for AI analysis
      const marketData = {
        chain,
        totalVolume24h: totalVolume,
        avgPriceChange24h: avgPriceChange,
        gainersCount,
        losersCount,
        topGainers: gainers.slice(0, 5).map(p => ({
          symbol: p.baseToken.symbol,
          change: p.priceChange.h24,
        })),
        topLosers: losers.slice(0, 5).map(p => ({
          symbol: p.baseToken.symbol,
          change: p.priceChange.h24,
        })),
      };

      // Use AI to analyze sentiment
      const prompt = `Analyze the following ${chain} cryptocurrency market data and provide a sentiment analysis:

Market Data:
- 24h Volume: $${totalVolume.toLocaleString()}
- Average Price Change: ${avgPriceChange.toFixed(2)}%
- Gainers: ${gainersCount} | Losers: ${losersCount}

Top 5 Gainers:
${marketData.topGainers.map(g => `- ${g.symbol}: +${g.change.toFixed(2)}%`).join('\n')}

Top 5 Losers:
${marketData.topLosers.map(l => `- ${l.symbol}: ${l.change.toFixed(2)}%`).join('\n')}

Provide:
1. Overall sentiment (bullish/bearish/neutral)
2. Confidence level (0-100)
3. Key indicators analysis
4. Brief summary (2-3 sentences)

Format as JSON:
{
  "sentiment": "bullish|bearish|neutral",
  "confidence": 85,
  "priceAction": "description",
  "volumeTrend": "description",
  "marketBreadth": "description",
  "summary": "brief summary"
}`;

      const aiResponse = await this.aiService.chat(prompt, '');

      // Parse AI response
      let analysis: any;
      try {
        // Extract JSON from response
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          analysis = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No JSON found in response');
        }
      } catch (error) {
        // Fallback to simple analysis
        analysis = {
          sentiment: avgPriceChange > 0 ? 'bullish' : avgPriceChange < 0 ? 'bearish' : 'neutral',
          confidence: 70,
          priceAction: `Average change: ${avgPriceChange.toFixed(2)}%`,
          volumeTrend: `24h volume: $${totalVolume.toLocaleString()}`,
          marketBreadth: `${gainersCount} gainers vs ${losersCount} losers`,
          summary: `Market is ${avgPriceChange > 0 ? 'trending up' : 'trending down'} with ${gainersCount} assets gaining.`,
        };
      }

      const sentiment: MarketSentiment = {
        overallSentiment: analysis.sentiment,
        confidence: analysis.confidence,
        indicators: {
          priceAction: analysis.priceAction,
          volumeTrend: analysis.volumeTrend,
          marketBreadth: analysis.marketBreadth,
        },
        summary: analysis.summary,
        timestamp: Date.now(),
      };

      // Broadcast sentiment update
      this.broadcast({
        type: 'analysis_complete',
        agentId: this.stateManager.getState().agentId,
        data: {
          type: 'market_sentiment',
          sentiment,
        },
        timestamp: Date.now(),
      });

      return sentiment;
    }, `sentiment:${chain}`);
  }

  /**
   * Store trending snapshot in D1 for historical tracking
   */
  private async storeTrendingSnapshot(chain: string, pairs: TrendingPair[]): Promise<void> {
    try {
      const timestamp = Date.now();

      for (const pair of pairs.slice(0, 20)) { // Store top 20
        await this.env.CONFIG_DB.prepare(
          `INSERT INTO trending_snapshots (chain, pair_address, symbol, price_usd, price_change_24h, volume_24h, liquidity_usd, timestamp)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        )
          .bind(
            chain,
            pair.pairAddress,
            pair.baseToken.symbol,
            pair.priceUsd,
            pair.priceChange.h24 || 0,
            pair.volume.h24 || 0,
            pair.liquidity.usd || 0,
            timestamp
          )
          .run();
      }

      console.log(`[OverviewAgent] Stored ${pairs.length} trending pairs snapshot`);
    } catch (error) {
      console.error('[OverviewAgent] Store snapshot error:', error);
    }
  }

  /**
   * Get overview dashboard data (all-in-one endpoint)
   */
  async getOverviewDashboard(chain: string = 'sonic', userId?: string): Promise<OperationResult> {
    return this.executeOperation(async () => {
      const [trending, gainers, losers, heatmap, sentiment] = await Promise.all([
        this.getTrendingPairs(chain, 20),
        this.getTopGainers(chain, 5),
        this.getTopLosers(chain, 5),
        this.getMarketHeatmap(chain, 20),
        this.analyzeMarketSentiment(chain),
      ]);

      let trackedAssets: TrackedAsset[] = [];
      if (userId) {
        const assetsResult = await this.getTrackedAssets(userId);
        if (assetsResult.success && assetsResult.data) {
          trackedAssets = assetsResult.data;
        }
      }

      return {
        trending: trending.data?.slice(0, 10) || [],
        gainers: gainers.data || [],
        losers: losers.data || [],
        heatmap: heatmap.data || [],
        sentiment: sentiment.data,
        trackedAssets,
        timestamp: Date.now(),
      };
    });
  }

  /**
   * Handle custom request endpoints
   */
  protected async handleRequest(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // GET /trending?chain=sonic&limit=50
      if (path === '/trending' && request.method === 'GET') {
        const chain = url.searchParams.get('chain') || 'sonic';
        const limit = parseInt(url.searchParams.get('limit') || '50');
        const result = await this.getTrendingPairs(chain, limit);
        return Response.json(result);
      }

      // GET /gainers?chain=sonic&limit=10
      if (path === '/gainers' && request.method === 'GET') {
        const chain = url.searchParams.get('chain') || 'sonic';
        const limit = parseInt(url.searchParams.get('limit') || '10');
        const result = await this.getTopGainers(chain, limit);
        return Response.json(result);
      }

      // GET /losers?chain=sonic&limit=10
      if (path === '/losers' && request.method === 'GET') {
        const chain = url.searchParams.get('chain') || 'sonic';
        const limit = parseInt(url.searchParams.get('limit') || '10');
        const result = await this.getTopLosers(chain, limit);
        return Response.json(result);
      }

      // GET /heatmap?chain=sonic&limit=30
      if (path === '/heatmap' && request.method === 'GET') {
        const chain = url.searchParams.get('chain') || 'sonic';
        const limit = parseInt(url.searchParams.get('limit') || '30');
        const result = await this.getMarketHeatmap(chain, limit);
        return Response.json(result);
      }

      // GET /sentiment?chain=sonic
      if (path === '/sentiment' && request.method === 'GET') {
        const chain = url.searchParams.get('chain') || 'sonic';
        const result = await this.analyzeMarketSentiment(chain);
        return Response.json(result);
      }

      // POST /asset/add
      if (path === '/asset/add' && request.method === 'POST') {
        const body = await request.json() as { userId: string; chain: string; address: string };
        const result = await this.addTrackedAsset(body.userId, body.chain, body.address);
        return Response.json(result);
      }

      // POST /asset/remove
      if (path === '/asset/remove' && request.method === 'POST') {
        const body = await request.json() as { userId: string; address: string };
        const result = await this.removeTrackedAsset(body.userId, body.address);
        return Response.json(result);
      }

      // GET /assets?userId=xxx
      if (path === '/assets' && request.method === 'GET') {
        const userId = url.searchParams.get('userId');
        if (!userId) {
          return Response.json({ error: 'userId required' }, { status: 400 });
        }
        const result = await this.getTrackedAssets(userId);
        return Response.json(result);
      }

      // GET /dashboard?chain=sonic&userId=xxx
      if (path === '/dashboard' && request.method === 'GET') {
        const chain = url.searchParams.get('chain') || 'sonic';
        const userId = url.searchParams.get('userId') || undefined;
        const result = await this.getOverviewDashboard(chain, userId);
        return Response.json(result);
      }

      // POST /refresh
      if (path === '/refresh' && request.method === 'POST') {
        const body = await request.json() as { chain?: string };
        const result = await this.refreshTrendingPairs(body.chain || 'sonic');
        return Response.json(result);
      }

      return await super.handleRequest(request);
    } catch (error: any) {
      console.error('[OverviewAgent] Request error:', error);
      return Response.json({ error: error.message }, { status: 500 });
    }
  }
}
