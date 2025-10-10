// Data seeding workflow - populate D1, KV, and R2 with historical data

import { Env } from '../tools/types';
import { fetchCoinDeskData } from '../tools/coindesk-api';

export interface SeedingConfig {
  instruments: string[];
  markets: string[];
  daysOfHistory: number;
}

export const DEFAULT_SEEDING_CONFIG: SeedingConfig = {
  instruments: [
    'BTC-USD',
    'ETH-USD',
    'S-USD',
    'SONIC-USD',
    'USDC-USD',
    'USDT-USD'
  ],
  markets: ['cadli'],
  daysOfHistory: 90 // 3 months of history
};

/**
 * Initialize D1 database schema
 */
export async function initializeD1Schema(env: Env): Promise<void> {
  // Create instruments table
  await env.CONFIG_DB.prepare(`
    CREATE TABLE IF NOT EXISTS instruments (
      symbol TEXT PRIMARY KEY,
      name TEXT,
      market TEXT,
      last_updated TIMESTAMP,
      metadata TEXT
    )
  `).run();

  // Create price_snapshots table
  await env.CONFIG_DB.prepare(`
    CREATE TABLE IF NOT EXISTS price_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      instrument TEXT,
      market TEXT,
      price REAL,
      change_pct REAL,
      volume REAL,
      timestamp TIMESTAMP,
      FOREIGN KEY (instrument) REFERENCES instruments(symbol)
    )
  `).run();

  // Create data_fetch_log table
  await env.CONFIG_DB.prepare(`
    CREATE TABLE IF NOT EXISTS data_fetch_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      data_type TEXT,
      market TEXT,
      instruments TEXT,
      status TEXT,
      records_fetched INTEGER,
      error_message TEXT,
      fetch_timestamp TIMESTAMP
    )
  `).run();

  // Create indexes
  await env.CONFIG_DB.prepare(`
    CREATE INDEX IF NOT EXISTS idx_price_snapshots_timestamp
      ON price_snapshots(timestamp)
  `).run();

  await env.CONFIG_DB.prepare(`
    CREATE INDEX IF NOT EXISTS idx_price_snapshots_instrument
      ON price_snapshots(instrument)
  `).run();
}

/**
 * Seed historical daily data into R2 and D1
 */
export async function seedHistoricalData(
  config: SeedingConfig,
  env: Env
): Promise<{ success: boolean; recordsSeeded: number; errors: string[] }> {
  const errors: string[] = [];
  let recordsSeeded = 0;

  try {
    // Initialize D1 schema first
    await initializeD1Schema(env);

    for (const market of config.markets) {
      for (const instrument of config.instruments) {
        try {
          console.log(`Seeding ${config.daysOfHistory} days of ${instrument} data from ${market}...`);

          // Fetch historical daily data
          const historicalData = await fetchCoinDeskData('/index/cc/v1/historical/days', {
            market,
            instruments: [instrument],
            limit: config.daysOfHistory
          }, env);

          // Store in R2 for long-term storage
          const r2Key = `seed/historical/daily/${market}/${instrument}.json`;
          await env.HISTORICAL_DATA.put(r2Key, JSON.stringify(historicalData), {
            httpMetadata: { contentType: 'application/json' },
            customMetadata: {
              market,
              instrument,
              dataType: 'daily',
              daysOfHistory: config.daysOfHistory.toString(),
              seedDate: new Date().toISOString()
            }
          });

          // Store metadata in D1
          await env.CONFIG_DB.prepare(`
            INSERT OR REPLACE INTO instruments (symbol, name, market, last_updated, metadata)
            VALUES (?, ?, ?, ?, ?)
          `).bind(
            instrument,
            instrument.replace('-USD', ''),
            market,
            new Date().toISOString(),
            JSON.stringify({ seeded: true, days: config.daysOfHistory })
          ).run();

          // Store price snapshots in D1 (sample every day)
          if (historicalData.data && Array.isArray(historicalData.data)) {
            for (const dataPoint of historicalData.data) {
              await env.CONFIG_DB.prepare(`
                INSERT INTO price_snapshots (instrument, market, price, change_pct, volume, timestamp)
                VALUES (?, ?, ?, ?, ?, ?)
              `).bind(
                instrument,
                market,
                dataPoint.PRICE || 0,
                dataPoint.CHANGE_PERCENTAGE || 0,
                dataPoint.VOLUME || 0,
                dataPoint.TIMESTAMP || new Date().toISOString()
              ).run();
              recordsSeeded++;
            }
          }

          // Log the fetch in D1
          await env.CONFIG_DB.prepare(`
            INSERT INTO data_fetch_log (data_type, market, instruments, status, records_fetched, fetch_timestamp)
            VALUES (?, ?, ?, ?, ?, ?)
          `).bind(
            'historical_seed',
            market,
            instrument,
            'success',
            recordsSeeded,
            new Date().toISOString()
          ).run();

          console.log(`✓ Seeded ${instrument} (${recordsSeeded} records)`);

          // Add delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));

        } catch (error: any) {
          errors.push(`${instrument}: ${error.message}`);
          console.error(`✗ Failed to seed ${instrument}:`, error.message);

          // Log error in D1
          await env.CONFIG_DB.prepare(`
            INSERT INTO data_fetch_log (data_type, market, instruments, status, error_message, fetch_timestamp)
            VALUES (?, ?, ?, ?, ?, ?)
          `).bind(
            'historical_seed',
            market,
            instrument,
            'error',
            error.message,
            new Date().toISOString()
          ).run();
        }
      }
    }

    return {
      success: errors.length === 0,
      recordsSeeded,
      errors
    };

  } catch (error: any) {
    errors.push(`Global error: ${error.message}`);
    return {
      success: false,
      recordsSeeded,
      errors
    };
  }
}

/**
 * Refresh recent data (last 7 days) - runs on schedule
 * NOW WITH MULTI-SOURCE FALLBACK (Orderly → DexScreener → CoinDesk)
 */
export async function refreshRecentData(env: Env): Promise<void> {
  const instruments = DEFAULT_SEEDING_CONFIG.instruments;
  const market = 'cadli';

  // Import the multi-source price fetching
  const { executeGetLatestIndexTick } = await import('../tools/price-tool');

  for (const instrument of instruments) {
    try {
      // Try multi-source price fetch first (Orderly → DexScreener → CoinDesk)
      const priceResult = await executeGetLatestIndexTick({ 
        market, 
        instruments: [instrument] 
      }, env);

      if (priceResult.success && priceResult.data?.data?.[0]) {
        const latest = priceResult.data.data[0];
        
        // Update KV cache with latest price (60 second TTL)
        const kvKey = `price:latest:${instrument}`;
        await env.SONIC_CACHE.put(kvKey, JSON.stringify(latest), {
          expirationTtl: 60
        });

        // Update D1 with latest prices
        await env.CONFIG_DB.prepare(`
          INSERT INTO price_snapshots (instrument, market, price, change_pct, volume, timestamp)
          VALUES (?, ?, ?, ?, ?, ?)
        `).bind(
          instrument,
          market,
          latest.VALUE?.PRICE || 0,
          latest.CURRENT_DAY?.CHANGE_PERCENTAGE || 0,
          latest.CURRENT_DAY?.VOLUME || 0,
          new Date().toISOString()
        ).run();

        console.log(`✅ Refreshed ${instrument} via ${latest.SOURCE}: $${latest.VALUE?.PRICE}`);
      } else {
        console.warn(`⚠️ No data available for ${instrument}`);
      }

    } catch (error: any) {
      console.error(`Failed to refresh ${instrument}: ${error}`);
      
      // Log to D1 for debugging
      await env.CONFIG_DB.prepare(`
        INSERT INTO data_fetch_log (data_type, market, instruments, status, error_message, fetch_timestamp)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(
        'refresh',
        market,
        instrument,
        'error',
        error.message,
        new Date().toISOString()
      ).run();
    }
  }
}
