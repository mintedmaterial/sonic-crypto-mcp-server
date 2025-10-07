// R2 storage service for historical data

import { Env } from '../config/env';

export class R2StorageService {
  constructor(private env: Env) {}

  /**
   * Store data in R2 bucket
   */
  async store(
    bucket: 'HISTORICAL_DATA' | 'MARKET_REPORTS',
    key: string,
    data: any,
    metadata?: Record<string, string>
  ): Promise<void> {
    try {
      const bucketBinding = this.env[bucket];
      await bucketBinding.put(key, JSON.stringify(data), {
        httpMetadata: {
          contentType: 'application/json',
        },
        customMetadata: metadata || {},
      });
    } catch (error) {
      console.error(`R2 store error for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Retrieve data from R2 bucket
   */
  async retrieve(
    bucket: 'HISTORICAL_DATA' | 'MARKET_REPORTS',
    key: string
  ): Promise<any | null> {
    try {
      const bucketBinding = this.env[bucket];
      const object = await bucketBinding.get(key);

      if (!object) {
        return null;
      }

      const text = await object.text();
      return JSON.parse(text);
    } catch (error) {
      console.error(`R2 retrieve error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Delete data from R2 bucket
   */
  async delete(
    bucket: 'HISTORICAL_DATA' | 'MARKET_REPORTS',
    key: string
  ): Promise<void> {
    try {
      const bucketBinding = this.env[bucket];
      await bucketBinding.delete(key);
    } catch (error) {
      console.error(`R2 delete error for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * List objects in R2 bucket with prefix
   */
  async list(
    bucket: 'HISTORICAL_DATA' | 'MARKET_REPORTS',
    prefix?: string
  ): Promise<string[]> {
    try {
      const bucketBinding = this.env[bucket];
      const listed = await bucketBinding.list({ prefix });

      return listed.objects.map((obj) => obj.key);
    } catch (error) {
      console.error(`R2 list error:`, error);
      return [];
    }
  }

  /**
   * Store historical data with standardized key format
   */
  async storeHistoricalData(
    market: string,
    instrument: string,
    dataType: 'daily' | 'hourly' | 'minutes',
    data: any
  ): Promise<void> {
    const date = new Date().toISOString().split('T')[0];
    const key = `historical/${dataType}/${market}/${instrument}/${date}.json`;

    await this.store('HISTORICAL_DATA', key, data, {
      market,
      instrument,
      dataType,
      fetchDate: new Date().toISOString(),
    });
  }

  /**
   * Store market report
   */
  async storeMarketReport(
    reportId: string,
    report: any
  ): Promise<void> {
    const timestamp = new Date().toISOString();
    const key = `reports/${timestamp.split('T')[0]}/${reportId}.json`;

    await this.store('MARKET_REPORTS', key, report, {
      reportId,
      timestamp,
    });
  }
}
