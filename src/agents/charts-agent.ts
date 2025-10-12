/**
 * Charts Agent - Container-Based Technical Analysis
 *
 * Provides advanced chart analysis and technical indicators using Python ML stack.
 * Runs in Cloudflare Container with TA-Lib, pandas, numpy, scikit-learn.
 *
 * Features:
 * - Technical indicators (RSI, MACD, Bollinger Bands, etc.)
 * - Candlestick pattern recognition
 * - Trend analysis and support/resistance levels
 * - AI-powered trading signals
 * - Chart generation (future)
 *
 * NFT Gating: Only Bandit Kidz NFT holders can request chart analysis
 */

import { Env } from '../config/env';
import { BaseAgent } from './core/base-agent';
import { AgentInitParams, OperationResult } from './core/types';
import { BaseAgentState } from './core/agent-state';
import { NFTVerificationService } from '../services/nft-verification';
import { DexScreenerEnhancedService } from '../services/dexscreener-enhanced';

// Container SDK types
interface ContainerStub {
  fetch(request: Request): Promise<Response>;
}

interface OHLCVData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface TechnicalIndicators {
  sma_20?: number;
  sma_50?: number;
  sma_200?: number;
  ema_12?: number;
  ema_26?: number;
  rsi_14?: number;
  macd?: number;
  macd_signal?: number;
  macd_histogram?: number;
  stoch_k?: number;
  stoch_d?: number;
  bb_upper?: number;
  bb_middle?: number;
  bb_lower?: number;
  atr_14?: number;
  obv?: number;
  vwap?: number;
}

interface PatternRecognition {
  patterns_found: string[];
  bullish_patterns: string[];
  bearish_patterns: string[];
  strength: 'weak' | 'moderate' | 'strong';
}

interface TrendAnalysis {
  trend_direction: 'bullish' | 'bearish' | 'neutral' | 'sideways';
  trend_strength: number;
  support_levels: number[];
  resistance_levels: number[];
  pivot_points: Record<string, number>;
}

export interface TechnicalAnalysisResult {
  symbol: string;
  timestamp: number;
  current_price: number;
  indicators: TechnicalIndicators;
  patterns: PatternRecognition;
  trend: TrendAnalysis;
  signals: Record<string, 'buy' | 'sell' | 'hold'>;
  confidence: number;
}

export interface ChartRequest {
  symbol: string;
  chain?: string;
  timeframe?: '1m' | '5m' | '15m' | '1h' | '4h' | '1d';
  indicators?: string[];
  includePatterns?: boolean;
}

/**
 * Charts Agent - Container-based technical analysis
 */
export class ChartsAgent extends BaseAgent {
  protected agentType: BaseAgentState['agentType'] = 'charts';

  private nftVerification!: NFTVerificationService;
  private dexScreener!: DexScreenerEnhancedService;
  private containerStub!: ContainerStub;
  private containerHealthy: boolean = false;

  async initialize(params: AgentInitParams): Promise<OperationResult> {
    const result = await super.initialize(params);
    if (!result.success) return result;

    // Initialize services
    this.nftVerification = new NFTVerificationService(this.env);
    this.dexScreener = new DexScreenerEnhancedService(this.env);

    // Get container stub
    this.containerStub = this.getContainerStub(params.sessionId);

    // Check container health
    await this.checkContainerHealth();

    console.log('[ChartsAgent] Initialized', {
      agentId: params.agentId,
      sessionId: params.sessionId,
      containerHealthy: this.containerHealthy,
    });

    return { success: true, timestamp: Date.now() };
  }

  /**
   * Get or create container stub for this session
   */
  private getContainerStub(sessionId: string): ContainerStub {
    // Use consistent hashing to assign sessions to containers
    // Similar to VibeSDK's getAutoAllocatedSandbox
    const maxInstances = parseInt(this.env.MAX_CHART_CONTAINERS || '10');

    let hash = 0;
    for (let i = 0; i < sessionId.length; i++) {
      const char = sessionId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    hash = Math.abs(hash);

    const containerIndex = hash % maxInstances;
    const containerId = `charts-container-${containerIndex}`;

    console.log('[ChartsAgent] Container allocation', {
      sessionId,
      containerId,
      containerIndex,
    });

    // Get Durable Object stub for the container
    const id = this.env.CHARTS_CONTAINER.idFromName(containerId);
    return this.env.CHARTS_CONTAINER.get(id) as any;
  }

  /**
   * Check if container is healthy
   */
  private async checkContainerHealth(): Promise<boolean> {
    try {
      const response = await this.containerStub.fetch(
        new Request('http://container/health', { method: 'GET' })
      );

      if (response.ok) {
        const health = await response.json() as any;
        this.containerHealthy = health.status === 'healthy';
        console.log('[ChartsAgent] Container health check:', health);
        return this.containerHealthy;
      }

      this.containerHealthy = false;
      return false;
    } catch (error) {
      console.error('[ChartsAgent] Container health check failed:', error);
      this.containerHealthy = false;
      return false;
    }
  }

  /**
   * Perform technical analysis on a symbol
   */
  async analyzeTechnicals(params: {
    symbol: string;
    chain?: string;
    timeframe?: string;
    userAddress: string;
  }): Promise<OperationResult<TechnicalAnalysisResult>> {
    return this.executeOperation(async () => {
      // Verify NFT ownership
      const nftCheck = await this.nftVerification.verifyWithCache(params.userAddress);
      if (!nftCheck.isHolder) {
        throw new Error('Charts Agent access requires Bandit Kidz NFT ownership');
      }

      // Check container health
      if (!this.containerHealthy) {
        const healthy = await this.checkContainerHealth();
        if (!healthy) {
          throw new Error('Charts Agent container is unavailable');
        }
      }

      // Fetch OHLCV data from DexScreener
      const chain = params.chain || 'sonic';
      const timeframe = params.timeframe || '1h';

      console.log('[ChartsAgent] Fetching OHLCV data', {
        symbol: params.symbol,
        chain,
        timeframe,
      });

      // Search for the pair on DexScreener
      const searchResult = await this.dexScreener.searchPairs(params.symbol);
      if (!searchResult || searchResult.length === 0) {
        throw new Error(`No trading pairs found for ${params.symbol}`);
      }

      // Get the first matching pair (prioritize Sonic chain)
      const pair = searchResult.find((p: any) => p.chainId === chain) || searchResult[0];

      // Convert DexScreener data to OHLCV format
      // Note: DexScreener API doesn't provide full OHLCV, so we'll use current price data
      // In production, you'd fetch from a dedicated OHLCV provider
      const ohlcv: OHLCVData[] = this.generateMockOHLCV(pair);

      // Send to Python container for analysis
      const analysisRequest = {
        symbol: params.symbol,
        ohlcv,
      };

      const response = await this.containerStub.fetch(
        new Request('http://container/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(analysisRequest),
        })
      );

      if (!response.ok) {
        const error = await response.json() as any;
        throw new Error(error.error || 'Technical analysis failed');
      }

      const result = await response.json() as any;

      // Record successful request (no need to calculate response time, it's handled in executeOperation)
      return result.data as TechnicalAnalysisResult;

    }, `technical_analysis:${params.symbol}`);
  }

  /**
   * Generate chart image (future implementation)
   */
  async generateChart(params: ChartRequest & { userAddress: string }): Promise<OperationResult<string>> {
    return this.executeOperation(async () => {
      // Verify NFT ownership
      const nftCheck = await this.nftVerification.verifyWithCache(params.userAddress);
      if (!nftCheck.isHolder) {
        throw new Error('Charts Agent access requires Bandit Kidz NFT ownership');
      }

      // TODO: Implement chart generation with Plotly/Matplotlib
      throw new Error('Chart generation not yet implemented');

    }, `chart:${params.symbol}`);
  }

  /**
   * Generate mock OHLCV data from DexScreener pair
   * TODO: Replace with real OHLCV data provider
   */
  private generateMockOHLCV(pair: any): OHLCVData[] {
    const currentPrice = parseFloat(pair.priceUsd || '0');
    const volume24h = pair.volume?.h24 || 0;
    const priceChange24h = pair.priceChange?.h24 || 0;

    const now = Date.now();
    const ohlcv: OHLCVData[] = [];

    // Generate 200 hourly candles (minimum for reliable TA)
    for (let i = 200; i >= 0; i--) {
      const timestamp = now - (i * 60 * 60 * 1000); // hourly
      const volatility = 0.02; // 2% volatility
      const randomWalk = (Math.random() - 0.5) * volatility;

      const open = currentPrice * (1 + randomWalk);
      const high = open * (1 + Math.random() * volatility);
      const low = open * (1 - Math.random() * volatility);
      const close = low + (Math.random() * (high - low));
      const volume = volume24h / 24; // hourly volume estimate

      ohlcv.push({
        timestamp,
        open,
        high,
        low,
        close,
        volume,
      });
    }

    return ohlcv;
  }

  /**
   * Handle agent-specific alarm logic
   */
  protected async handleAlarmLogic(): Promise<void> {
    // Check container health periodically
    await this.checkContainerHealth();

    // Note: Cache cleanup is handled by BaseAgent.cleanupCache()
    // which is called automatically by the alarm
  }
}

// Stub export for ChartsContainer - actual implementation is in charts-agent/index.ts
// The container runs as a separate Cloudflare Container instance
export class ChartsContainer {
  // This is just a placeholder export to satisfy TypeScript
  // The actual container runs from ChartsAgentDockerfile
}
