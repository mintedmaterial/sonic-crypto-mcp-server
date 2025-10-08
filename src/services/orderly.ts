// Orderly Network DEX Integration Service
// Provides broker-level market data from dex.srvcflo.com

import { Env, API_ENDPOINTS } from '../config/env';

export interface OrderlyMarket {
  symbol: string;
  base_token: string;
  quote_token: string;
  price: number;
  mark_price: number;
  index_price: number;
  volume_24h: number;
  open_interest: number;
  funding_rate: number;
}

export interface OrderlyOrderBook {
  symbol: string;
  bids: [number, number][]; // [price, quantity]
  asks: [number, number][];
  timestamp: number;
}

export interface OrderlyTicker {
  symbol: string;
  last_price: number;
  bid_price: number;
  ask_price: number;
  spread: number;
  volume_24h: number;
  change_24h: number;
  high_24h: number;
  low_24h: number;
}

export class OrderlyService {
  private baseUrl: string;

  constructor(private env: Env) {
    this.baseUrl = API_ENDPOINTS.ORDERLY_BASE;
  }

  /**
   * Get all available markets
   */
  async getMarkets(): Promise<OrderlyMarket[]> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/public/futures`, {
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Orderly API error: ${response.status}`);
      }

      const data = await response.json() as any;
      return data.rows || [];
    } catch (error) {
      console.error('Orderly getMarkets error:', error);
      return [];
    }
  }

  /**
   * Get ticker data for a specific symbol
   */
  async getTicker(symbol: string): Promise<OrderlyTicker | null> {
    try {
      // Orderly API uses /v1/public/futures for all market data
      const response = await fetch(
        `${this.baseUrl}/v1/public/futures`,
        {
          headers: {
            'Accept': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Orderly API error: ${response.status}`);
      }

      const data = await response.json() as any;
      const rows = data.data?.rows || [];

      // Find the specific symbol
      const ticker = rows.find((r: any) => r.symbol === symbol);

      if (!ticker) {
        throw new Error(`Symbol ${symbol} not found in Orderly markets`);
      }

      const changePercent = ticker['24h_close'] && ticker['24h_open']
        ? ((ticker['24h_close'] - ticker['24h_open']) / ticker['24h_open']) * 100
        : 0;

      return {
        symbol,
        last_price: parseFloat(ticker.mark_price || ticker['24h_close'] || 0),
        bid_price: parseFloat(ticker.mark_price || ticker['24h_close'] || 0),
        ask_price: parseFloat(ticker.mark_price || ticker['24h_close'] || 0),
        spread: 0, // Not provided in futures endpoint
        volume_24h: parseFloat(ticker['24h_amount'] || 0),
        change_24h: changePercent,
        high_24h: parseFloat(ticker['24h_high'] || 0),
        low_24h: parseFloat(ticker['24h_low'] || 0),
      };
    } catch (error) {
      console.error(`Orderly getTicker error for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Get order book data for a symbol
   */
  async getOrderBook(symbol: string, depth: number = 10): Promise<OrderlyOrderBook | null> {
    try {
      const response = await fetch(
        `${this.baseUrl}/v1/public/orderbook/${symbol}`,
        {
          headers: {
            'Accept': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Orderly API error: ${response.status}`);
      }

      const data = await response.json() as any;

      return {
        symbol,
        bids: (data.bids || []).slice(0, depth).map((b: any) => [
          parseFloat(b.price),
          parseFloat(b.quantity)
        ]),
        asks: (data.asks || []).slice(0, depth).map((a: any) => [
          parseFloat(a.price),
          parseFloat(a.quantity)
        ]),
        timestamp: data.timestamp || Date.now(),
      };
    } catch (error) {
      console.error(`Orderly getOrderBook error for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Get mark price for a symbol
   */
  async getMarkPrice(symbol: string): Promise<number | null> {
    try {
      const response = await fetch(
        `${this.baseUrl}/v1/public/funding_rate/${symbol}`,
        {
          headers: {
            'Accept': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Orderly API error: ${response.status}`);
      }

      const data = await response.json() as any;
      return parseFloat(data.mark_price);
    } catch (error) {
      console.error(`Orderly getMarkPrice error for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Get multiple ticker prices at once
   */
  async getMultiplePrices(symbols: string[]): Promise<Record<string, OrderlyTicker>> {
    const results: Record<string, OrderlyTicker> = {};

    await Promise.all(
      symbols.map(async (symbol) => {
        const ticker = await this.getTicker(symbol);
        if (ticker) {
          results[symbol] = ticker;
        }
      })
    );

    return results;
  }

  /**
   * Convert common symbols to Orderly format
   */
  static normalizeSymbol(symbol: string): string {
    // Map common symbols to Orderly format
    const symbolMap: Record<string, string> = {
      'BTC-USD': 'PERP_BTC_USDC',
      'ETH-USD': 'PERP_ETH_USDC',
      'S-USD': 'PERP_S_USDC',
      'SONIC-USD': 'PERP_SONIC_USDC',
      'USDC-USD': 'SPOT_USDC_USDT',
      'USDT-USD': 'SPOT_USDT_USDC',
    };

    return symbolMap[symbol] || symbol;
  }
}
