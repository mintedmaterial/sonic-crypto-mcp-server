// Trading Agent - Orderly DEX Integration & Trade Signal Generation
// Tracks perpetuals positions, analyzes order books, generates NFT-gated trading signals

import { BaseAgent } from './core/base-agent';
import { Env } from '../config/env';
import { BaseAgentState } from './core/agent-state';
import { OperationResult } from './core/types';
import { AIService } from '../services/ai';
import { NFTVerificationService } from '../services/nft-verification';

/**
 * Orderly DEX market info
 */
interface OrderlyMarket {
  symbol: string;
  base_currency: string;
  quote_currency: string;
  min_notional: number;
  price_range: number;
  created_time: number;
  updated_time: number;
  base_min: number;
  base_max: number;
  base_tick: number;
  quote_min: number;
  quote_max: number;
  quote_tick: number;
}

/**
 * Order book entry
 */
interface OrderBookEntry {
  price: number;
  quantity: number;
  total: number; // Cumulative total at this level
}

/**
 * Order book data
 */
interface OrderBook {
  symbol: string;
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
  timestamp: number;
  spread: number;
  spreadPercent: number;
  midPrice: number;
}

/**
 * Trading position
 */
interface Position {
  symbol: string;
  side: 'long' | 'short';
  size: number;
  entryPrice: number;
  currentPrice: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  liquidationPrice?: number;
  timestamp: number;
  userId: string;
}

/**
 * Trading signal
 */
interface TradingSignal {
  symbol: string;
  action: 'buy' | 'sell' | 'hold';
  strength: 'strong' | 'moderate' | 'weak';
  confidence: number;
  reasoning: string[];
  suggestedEntry?: number;
  suggestedStop?: number;
  suggestedTarget?: number;
  riskReward?: number;
  timestamp: number;
  nftGated: boolean; // Premium signals for NFT holders only
}

/**
 * Risk management settings
 */
interface RiskSettings {
  maxPositionSize: number; // Max position size as percentage of portfolio
  maxLeverage: number; // Maximum leverage multiplier
  stopLossPercent: number; // Default stop loss percentage
  takeProfitPercent: number; // Default take profit percentage
  riskPerTrade: number; // Max risk per trade as percentage
}

/**
 * Market ticker data
 */
interface MarketTicker {
  symbol: string;
  price: number;
  priceChange24h: number;
  priceChangePercent24h: number;
  volume24h: number;
  high24h: number;
  low24h: number;
  timestamp: number;
}

/**
 * Trading Agent
 * Responsible for Orderly DEX integration, position tracking, and signal generation
 */
export class TradingAgent extends BaseAgent {
  protected agentType: BaseAgentState['agentType'] = 'trading';
  private aiService!: AIService;
  private nftVerification!: NFTVerificationService;
  private orderlyBaseUrl = 'https://api-evm.orderly.org'; // Orderly Mainnet

  // Default risk settings
  private defaultRiskSettings: RiskSettings = {
    maxPositionSize: 20, // 20% of portfolio max
    maxLeverage: 5, // 5x max leverage
    stopLossPercent: 2, // 2% stop loss
    takeProfitPercent: 6, // 6% take profit (3:1 R:R)
    riskPerTrade: 1, // 1% risk per trade
  };

  /**
   * Initialize the Trading Agent
   */
  protected async onInitialize(params: any): Promise<void> {
    this.aiService = new AIService(this.env);
    this.nftVerification = new NFTVerificationService(this.env);

    // Load user's risk settings from D1
    if (params.userId) {
      await this.loadRiskSettings(params.userId);
    }

    // Schedule automatic position monitoring
    await this.schedulePositionMonitoring();

    console.log(`[TradingAgent] Initialized for session ${params.sessionId}`);
  }

  /**
   * Schedule automatic position monitoring (every hour)
   */
  private async schedulePositionMonitoring() {
    await this.ctx.storage.setAlarm(Date.now() + 60 * 60 * 1000); // 1 hour
  }

  /**
   * Alarm handler - automatically monitor positions
   */
  async alarm() {
    await super.alarm(); // Call base class alarm for cache cleanup

    try {
      console.log('[TradingAgent] Auto position monitoring triggered');

      // Get all tracked positions
      const positions = this.stateManager.getCustomState<Position[]>('positions') || [];

      // Update prices and P&L for each position
      for (const position of positions) {
        await this.updatePositionPnL(position);
      }

      // Schedule next monitoring
      await this.schedulePositionMonitoring();
    } catch (error) {
      console.error('[TradingAgent] Position monitoring error:', error);
      await this.schedulePositionMonitoring();
    }
  }

  /**
   * Get available Orderly markets
   */
  async getMarkets(): Promise<OperationResult<OrderlyMarket[]>> {
    return this.executeOperation(async () => {
      const response = await fetch(`${this.orderlyBaseUrl}/v1/public/info`);

      if (!response.ok) {
        throw new Error(`Orderly API error: ${response.statusText}`);
      }

      const data = await response.json() as any;
      return data.data.rows || [];
    }, 'markets');
  }

  /**
   * Get market ticker
   */
  async getMarketTicker(symbol: string): Promise<OperationResult<MarketTicker>> {
    return this.executeOperation(async () => {
      const response = await fetch(
        `${this.orderlyBaseUrl}/v1/public/ticker/${symbol}`
      );

      if (!response.ok) {
        throw new Error(`Orderly ticker error: ${response.statusText}`);
      }

      const data = await response.json() as any;
      const ticker = data.data;

      const marketTicker: MarketTicker = {
        symbol: ticker.symbol,
        price: parseFloat(ticker.close),
        priceChange24h: parseFloat(ticker.change),
        priceChangePercent24h: parseFloat(ticker.change_percent) * 100,
        volume24h: parseFloat(ticker.volume),
        high24h: parseFloat(ticker.high),
        low24h: parseFloat(ticker.low),
        timestamp: Date.now(),
      };

      // Broadcast price update
      this.broadcast({
        type: 'data_update',
        agentId: this.stateManager.getState().agentId,
        data: {
          type: 'ticker_update',
          ticker: marketTicker,
        },
        timestamp: Date.now(),
      });

      return marketTicker;
    }, `ticker:${symbol}`);
  }

  /**
   * Get order book for a symbol
   */
  async getOrderBook(symbol: string, depth: number = 20): Promise<OperationResult<OrderBook>> {
    return this.executeOperation(async () => {
      const response = await fetch(
        `${this.orderlyBaseUrl}/v1/public/orderbook/${symbol}?max_level=${depth}`
      );

      if (!response.ok) {
        throw new Error(`Orderly orderbook error: ${response.statusText}`);
      }

      const data = await response.json() as any;
      const ob = data.data;

      // Process bids (buy orders) - sorted descending by price
      const bids: OrderBookEntry[] = (ob.bids || []).map((b: any, index: number) => {
        const price = parseFloat(b[0]);
        const quantity = parseFloat(b[1]);
        const previousTotal = index > 0 ? bids[index - 1].total : 0;
        return {
          price,
          quantity,
          total: previousTotal + (price * quantity),
        };
      });

      // Process asks (sell orders) - sorted ascending by price
      const asks: OrderBookEntry[] = (ob.asks || []).map((a: any, index: number) => {
        const price = parseFloat(a[0]);
        const quantity = parseFloat(a[1]);
        const previousTotal = index > 0 ? asks[index - 1].total : 0;
        return {
          price,
          quantity,
          total: previousTotal + (price * quantity),
        };
      });

      const bestBid = bids[0]?.price || 0;
      const bestAsk = asks[0]?.price || 0;
      const spread = bestAsk - bestBid;
      const midPrice = (bestBid + bestAsk) / 2;
      const spreadPercent = (spread / midPrice) * 100;

      const orderBook: OrderBook = {
        symbol,
        bids,
        asks,
        timestamp: ob.timestamp,
        spread,
        spreadPercent,
        midPrice,
      };

      return orderBook;
    }, `orderbook:${symbol}:${depth}`);
  }

  /**
   * Analyze order book for trading opportunities
   */
  async analyzeOrderBook(symbol: string): Promise<OperationResult<any>> {
    return this.executeOperation(async () => {
      const orderBookResult = await this.getOrderBook(symbol, 50);
      if (!orderBookResult.success || !orderBookResult.data) {
        throw new Error('Failed to fetch order book');
      }

      const ob = orderBookResult.data;

      // Calculate liquidity metrics
      const bidLiquidity = ob.bids.reduce((sum, b) => sum + b.total, 0);
      const askLiquidity = ob.asks.reduce((sum, a) => sum + a.total, 0);
      const liquidityRatio = bidLiquidity / askLiquidity;

      // Identify support/resistance levels (large orders)
      const avgBidSize = bidLiquidity / ob.bids.length;
      const avgAskSize = askLiquidity / ob.asks.length;

      const supportLevels = ob.bids
        .filter(b => b.quantity > avgBidSize * 3) // 3x average = significant
        .map(b => b.price)
        .slice(0, 5);

      const resistanceLevels = ob.asks
        .filter(a => a.quantity > avgAskSize * 3)
        .map(a => a.price)
        .slice(0, 5);

      // Detect order book imbalance
      const imbalance = (bidLiquidity - askLiquidity) / (bidLiquidity + askLiquidity);

      const analysis = {
        symbol,
        spread: ob.spread,
        spreadPercent: ob.spreadPercent,
        midPrice: ob.midPrice,
        bidLiquidity,
        askLiquidity,
        liquidityRatio,
        imbalance,
        imbalanceSignal:
          imbalance > 0.2
            ? 'bullish'
            : imbalance < -0.2
            ? 'bearish'
            : 'neutral',
        supportLevels,
        resistanceLevels,
        timestamp: ob.timestamp,
      };

      return analysis;
    });
  }

  /**
   * Generate trading signal using AI and order book analysis
   */
  async generateTradingSignal(
    symbol: string,
    userAddress?: string
  ): Promise<OperationResult<TradingSignal>> {
    return this.executeOperation(async () => {
      // Check NFT status for premium signals
      let isNFTHolder = false;
      if (userAddress) {
        const nftCheck = await this.nftVerification.verifyWithCache(userAddress);
        isNFTHolder = nftCheck.isHolder;
      }

      // Get market data
      const [tickerResult, obAnalysis] = await Promise.all([
        this.getMarketTicker(symbol),
        this.analyzeOrderBook(symbol),
      ]);

      if (!tickerResult.success || !tickerResult.data) {
        throw new Error('Failed to fetch ticker');
      }
      if (!obAnalysis.success || !obAnalysis.data) {
        throw new Error('Failed to analyze order book');
      }

      const ticker = tickerResult.data;
      const analysis = obAnalysis.data;

      // Build AI prompt for signal generation
      const prompt = `Analyze the following ${symbol} perpetual futures data and generate a trading signal:

Market Data:
- Current Price: $${ticker.price.toFixed(4)}
- 24h Change: ${ticker.priceChangePercent24h.toFixed(2)}%
- 24h Volume: $${ticker.volume24h.toLocaleString()}
- 24h High: $${ticker.high24h.toFixed(4)}
- 24h Low: $${ticker.low24h.toFixed(4)}

Order Book Analysis:
- Spread: ${analysis.spreadPercent.toFixed(3)}%
- Bid Liquidity: $${analysis.bidLiquidity.toLocaleString()}
- Ask Liquidity: $${analysis.askLiquidity.toLocaleString()}
- Liquidity Ratio: ${analysis.liquidityRatio.toFixed(2)}
- Order Book Imbalance: ${analysis.imbalance.toFixed(3)} (${analysis.imbalanceSignal})
- Support Levels: ${analysis.supportLevels.join(', ')}
- Resistance Levels: ${analysis.resistanceLevels.join(', ')}

Provide a trading recommendation as JSON:
{
  "action": "buy|sell|hold",
  "strength": "strong|moderate|weak",
  "confidence": 85,
  "reasoning": ["reason1", "reason2", "reason3"],
  "suggestedEntry": 1234.56,
  "suggestedStop": 1200.00,
  "suggestedTarget": 1300.00
}`;

      const aiResponse = await this.aiService.chat(prompt, '');

      // Parse AI response
      let signalData: any;
      try {
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          signalData = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No JSON in AI response');
        }
      } catch (error) {
        // Fallback to simple signal based on indicators
        const action =
          analysis.imbalance > 0.2 && ticker.priceChangePercent24h > 0
            ? 'buy'
            : analysis.imbalance < -0.2 && ticker.priceChangePercent24h < 0
            ? 'sell'
            : 'hold';

        signalData = {
          action,
          strength: 'moderate',
          confidence: 60,
          reasoning: [
            `Order book shows ${analysis.imbalanceSignal} bias`,
            `Price ${ticker.priceChangePercent24h > 0 ? 'up' : 'down'} ${Math.abs(ticker.priceChangePercent24h).toFixed(2)}% in 24h`,
          ],
          suggestedEntry: ticker.price,
          suggestedStop: ticker.price * (action === 'buy' ? 0.98 : 1.02),
          suggestedTarget: ticker.price * (action === 'buy' ? 1.06 : 0.94),
        };
      }

      // Calculate risk/reward
      const riskReward = signalData.suggestedTarget && signalData.suggestedStop
        ? Math.abs((signalData.suggestedTarget - signalData.suggestedEntry) /
            (signalData.suggestedEntry - signalData.suggestedStop))
        : undefined;

      const signal: TradingSignal = {
        symbol,
        action: signalData.action,
        strength: signalData.strength,
        confidence: signalData.confidence,
        reasoning: signalData.reasoning,
        suggestedEntry: signalData.suggestedEntry,
        suggestedStop: signalData.suggestedStop,
        suggestedTarget: signalData.suggestedTarget,
        riskReward,
        timestamp: Date.now(),
        nftGated: isNFTHolder && signalData.confidence > 80, // Premium signals for NFT holders
      };

      // Broadcast signal
      this.broadcast({
        type: 'analysis_complete',
        agentId: this.stateManager.getState().agentId,
        data: {
          type: 'trading_signal',
          signal,
        },
        timestamp: Date.now(),
      });

      return signal;
    });
  }

  /**
   * Track a new position
   */
  async addPosition(
    userId: string,
    symbol: string,
    side: 'long' | 'short',
    size: number,
    entryPrice: number
  ): Promise<OperationResult<Position>> {
    return this.executeOperation(async () => {
      const tickerResult = await this.getMarketTicker(symbol);
      if (!tickerResult.success || !tickerResult.data) {
        throw new Error('Failed to fetch current price');
      }

      const currentPrice = tickerResult.data.price;

      // Calculate unrealized P&L
      const priceDiff = side === 'long'
        ? currentPrice - entryPrice
        : entryPrice - currentPrice;
      const unrealizedPnL = priceDiff * size;
      const unrealizedPnLPercent = (priceDiff / entryPrice) * 100;

      const position: Position = {
        symbol,
        side,
        size,
        entryPrice,
        currentPrice,
        unrealizedPnL,
        unrealizedPnLPercent,
        timestamp: Date.now(),
        userId,
      };

      // Store in D1
      await this.env.CONFIG_DB.prepare(
        `INSERT INTO trading_positions (user_id, symbol, side, size, entry_price, current_price, unrealized_pnl, timestamp)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
        .bind(
          userId,
          symbol,
          side,
          size,
          entryPrice,
          currentPrice,
          unrealizedPnL,
          Date.now()
        )
        .run();

      // Update custom state
      const positions = this.stateManager.getCustomState<Position[]>('positions') || [];
      positions.push(position);
      this.stateManager.updateCustomState('positions', positions);

      // Broadcast update
      this.broadcast({
        type: 'data_update',
        agentId: this.stateManager.getState().agentId,
        data: {
          type: 'position_opened',
          position,
        },
        timestamp: Date.now(),
      });

      return position;
    });
  }

  /**
   * Update position P&L
   */
  private async updatePositionPnL(position: Position): Promise<void> {
    try {
      const tickerResult = await this.getMarketTicker(position.symbol);
      if (!tickerResult.success || !tickerResult.data) {
        return;
      }

      const currentPrice = tickerResult.data.price;
      const priceDiff = position.side === 'long'
        ? currentPrice - position.entryPrice
        : position.entryPrice - currentPrice;

      position.currentPrice = currentPrice;
      position.unrealizedPnL = priceDiff * position.size;
      position.unrealizedPnLPercent = (priceDiff / position.entryPrice) * 100;

      // Broadcast P&L update
      this.broadcast({
        type: 'data_update',
        agentId: this.stateManager.getState().agentId,
        data: {
          type: 'position_update',
          position,
        },
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error('[TradingAgent] Update position error:', error);
    }
  }

  /**
   * Get user's positions
   */
  async getPositions(userId: string): Promise<OperationResult<Position[]>> {
    return this.executeOperation(async () => {
      const result = await this.env.CONFIG_DB.prepare(
        'SELECT * FROM trading_positions WHERE user_id = ? ORDER BY timestamp DESC'
      )
        .bind(userId)
        .all();

      const positions: Position[] = await Promise.all(
        result.results.map(async (row: any) => {
          const position: Position = {
            symbol: row.symbol,
            side: row.side,
            size: row.size,
            entryPrice: row.entry_price,
            currentPrice: row.current_price,
            unrealizedPnL: row.unrealized_pnl,
            unrealizedPnLPercent: 0,
            timestamp: row.timestamp,
            userId: row.user_id,
          };

          // Update with current price
          await this.updatePositionPnL(position);

          return position;
        })
      );

      return positions;
    }, `positions:${userId}`);
  }

  /**
   * Load risk settings for user
   */
  private async loadRiskSettings(userId: string): Promise<void> {
    try {
      const result = await this.env.CONFIG_DB.prepare(
        'SELECT * FROM risk_settings WHERE user_id = ?'
      )
        .bind(userId)
        .first();

      if (result) {
        this.stateManager.updateCustomState('riskSettings', {
          maxPositionSize: result.max_position_size,
          maxLeverage: result.max_leverage,
          stopLossPercent: result.stop_loss_percent,
          takeProfitPercent: result.take_profit_percent,
          riskPerTrade: result.risk_per_trade,
        });
      } else {
        this.stateManager.updateCustomState('riskSettings', this.defaultRiskSettings);
      }
    } catch (error) {
      console.error('[TradingAgent] Load risk settings error:', error);
      this.stateManager.updateCustomState('riskSettings', this.defaultRiskSettings);
    }
  }

  /**
   * Get risk settings
   */
  async getRiskSettings(userId: string): Promise<OperationResult<RiskSettings>> {
    return this.executeOperation(async () => {
      await this.loadRiskSettings(userId);
      const settings = this.stateManager.getCustomState<RiskSettings>('riskSettings');
      return settings || this.defaultRiskSettings;
    });
  }

  /**
   * Update risk settings
   */
  async updateRiskSettings(userId: string, settings: Partial<RiskSettings>): Promise<OperationResult<RiskSettings>> {
    return this.executeOperation(async () => {
      const current = this.stateManager.getCustomState<RiskSettings>('riskSettings') || this.defaultRiskSettings;
      const updated = { ...current, ...settings };

      // Store in D1
      await this.env.CONFIG_DB.prepare(
        `INSERT OR REPLACE INTO risk_settings (user_id, max_position_size, max_leverage, stop_loss_percent, take_profit_percent, risk_per_trade)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
        .bind(
          userId,
          updated.maxPositionSize,
          updated.maxLeverage,
          updated.stopLossPercent,
          updated.takeProfitPercent,
          updated.riskPerTrade
        )
        .run();

      this.stateManager.updateCustomState('riskSettings', updated);

      return updated;
    });
  }

  /**
   * Handle custom request endpoints
   */
  protected async handleRequest(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // GET /markets
      if (path === '/markets' && request.method === 'GET') {
        const result = await this.getMarkets();
        return Response.json(result);
      }

      // GET /ticker/:symbol
      if (path.startsWith('/ticker/') && request.method === 'GET') {
        const symbol = path.split('/')[2];
        const result = await this.getMarketTicker(symbol);
        return Response.json(result);
      }

      // GET /orderbook/:symbol
      if (path.startsWith('/orderbook/') && request.method === 'GET') {
        const symbol = path.split('/')[2];
        const depth = parseInt(url.searchParams.get('depth') || '20');
        const result = await this.getOrderBook(symbol, depth);
        return Response.json(result);
      }

      // GET /analyze/:symbol
      if (path.startsWith('/analyze/') && request.method === 'GET') {
        const symbol = path.split('/')[2];
        const result = await this.analyzeOrderBook(symbol);
        return Response.json(result);
      }

      // POST /signal
      if (path === '/signal' && request.method === 'POST') {
        const body = await request.json() as { symbol: string; userAddress?: string };
        const result = await this.generateTradingSignal(body.symbol, body.userAddress);
        return Response.json(result);
      }

      // POST /position/add
      if (path === '/position/add' && request.method === 'POST') {
        const body = await request.json() as {
          userId: string;
          symbol: string;
          side: 'long' | 'short';
          size: number;
          entryPrice: number;
        };
        const result = await this.addPosition(
          body.userId,
          body.symbol,
          body.side,
          body.size,
          body.entryPrice
        );
        return Response.json(result);
      }

      // GET /positions?userId=xxx
      if (path === '/positions' && request.method === 'GET') {
        const userId = url.searchParams.get('userId');
        if (!userId) {
          return Response.json({ error: 'userId required' }, { status: 400 });
        }
        const result = await this.getPositions(userId);
        return Response.json(result);
      }

      // GET /risk-settings?userId=xxx
      if (path === '/risk-settings' && request.method === 'GET') {
        const userId = url.searchParams.get('userId');
        if (!userId) {
          return Response.json({ error: 'userId required' }, { status: 400 });
        }
        const result = await this.getRiskSettings(userId);
        return Response.json(result);
      }

      // POST /risk-settings
      if (path === '/risk-settings' && request.method === 'POST') {
        const body = await request.json() as { userId: string; settings: Partial<RiskSettings> };
        const result = await this.updateRiskSettings(body.userId, body.settings);
        return Response.json(result);
      }

      return await super.handleRequest(request);
    } catch (error: any) {
      console.error('[TradingAgent] Request error:', error);
      return Response.json({ error: error.message }, { status: 500 });
    }
  }
}
