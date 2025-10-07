// D1 database service for metadata and configuration

import { Env } from '../config/env';

export class D1StorageService {
  constructor(private env: Env) {}

  /**
   * Execute a SQL query
   */
  async query<T = any>(sql: string, ...bindings: any[]): Promise<T[]> {
    try {
      const stmt = this.env.CONFIG_DB.prepare(sql);
      const bound = bindings.length > 0 ? stmt.bind(...bindings) : stmt;
      const result = await bound.all();
      return (result.results as T[]) || [];
    } catch (error) {
      console.error('D1 query error:', error);
      throw error;
    }
  }

  /**
   * Execute a SQL statement (INSERT, UPDATE, DELETE)
   */
  async execute(sql: string, ...bindings: any[]): Promise<void> {
    try {
      const stmt = this.env.CONFIG_DB.prepare(sql);
      const bound = bindings.length > 0 ? stmt.bind(...bindings) : stmt;
      await bound.run();
    } catch (error) {
      console.error('D1 execute error:', error);
      throw error;
    }
  }

  /**
   * Get first row from query
   */
  async first<T = any>(sql: string, ...bindings: any[]): Promise<T | null> {
    try {
      const stmt = this.env.CONFIG_DB.prepare(sql);
      const bound = bindings.length > 0 ? stmt.bind(...bindings) : stmt;
      const result = await bound.first();
      return (result as T) || null;
    } catch (error) {
      console.error('D1 first error:', error);
      return null;
    }
  }

  /**
   * Insert instrument metadata
   */
  async insertInstrument(
    symbol: string,
    name: string,
    market: string,
    metadata: Record<string, any>
  ): Promise<void> {
    await this.execute(
      `INSERT OR REPLACE INTO instruments (symbol, name, market, last_updated, metadata)
       VALUES (?, ?, ?, ?, ?)`,
      symbol,
      name,
      market,
      new Date().toISOString(),
      JSON.stringify(metadata)
    );
  }

  /**
   * Insert price snapshot
   */
  async insertPriceSnapshot(
    instrument: string,
    market: string,
    price: number,
    changePct: number,
    volume: number
  ): Promise<void> {
    await this.execute(
      `INSERT INTO price_snapshots (instrument, market, price, change_pct, volume, timestamp)
       VALUES (?, ?, ?, ?, ?, ?)`,
      instrument,
      market,
      price,
      changePct,
      volume,
      new Date().toISOString()
    );
  }

  /**
   * Get latest prices for instruments
   */
  async getLatestPrices(market: string, limit: number = 10): Promise<any[]> {
    return await this.query(
      `SELECT instrument, price, change_pct, volume, timestamp
       FROM price_snapshots
       WHERE market = ?
       ORDER BY timestamp DESC
       LIMIT ?`,
      market,
      limit
    );
  }

  /**
   * Log data fetch operation
   */
  async logDataFetch(
    dataType: string,
    market: string,
    instruments: string,
    status: 'success' | 'error',
    recordsFetched: number = 0,
    errorMessage?: string
  ): Promise<void> {
    await this.execute(
      `INSERT INTO data_fetch_log (data_type, market, instruments, status, records_fetched, error_message, fetch_timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      dataType,
      market,
      instruments,
      status,
      recordsFetched,
      errorMessage || null,
      new Date().toISOString()
    );
  }

  /**
   * Get data fetch history
   */
  async getDataFetchHistory(limit: number = 50): Promise<any[]> {
    return await this.query(
      `SELECT * FROM data_fetch_log
       ORDER BY fetch_timestamp DESC
       LIMIT ?`,
      limit
    );
  }

  /**
   * Get instrument count
   */
  async getInstrumentCount(): Promise<number> {
    const result = await this.first<{ count: number }>(
      'SELECT COUNT(*) as count FROM instruments'
    );
    return result?.count || 0;
  }

  /**
   * Get price snapshot count
   */
  async getPriceSnapshotCount(): Promise<number> {
    const result = await this.first<{ count: number }>(
      'SELECT COUNT(*) as count FROM price_snapshots'
    );
    return result?.count || 0;
  }
}
