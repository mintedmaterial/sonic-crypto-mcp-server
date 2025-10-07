// Cloudflare Workflow for automated data fetching and UI updates

import { WorkflowEntrypoint, WorkflowStep, WorkflowEvent } from 'cloudflare:workers';
import { Env } from '../tools/types';
import { seedHistoricalData, refreshRecentData, DEFAULT_SEEDING_CONFIG } from './data-seeding';

/**
 * Data Update Workflow
 * Runs on schedule to keep data fresh
 */
export class DataUpdateWorkflow extends WorkflowEntrypoint<Env, any> {
  async run(event: WorkflowEvent<any>, step: WorkflowStep) {
    // Step 1: Refresh price data
    const priceData = await step.do('refresh-prices', async () => {
      console.log('Refreshing latest price data...');
      await refreshRecentData(this.env);
      return { status: 'completed', timestamp: new Date().toISOString() };
    });

    // Step 2: Update sentiment analysis
    const sentimentData = await step.do('update-sentiment', async () => {
      console.log('Updating sentiment analysis...');
      // This would call the sentiment tool
      return { status: 'completed', timestamp: new Date().toISOString() };
    });

    // Step 3: Generate market report (if needed)
    await step.do('generate-report', async () => {
      const now = new Date();
      const hour = now.getUTCHours();

      // Generate reports at 8 AM, 12 PM, and 8 PM UTC
      if ([8, 12, 20].includes(hour)) {
        console.log('Generating market report...');
        // Report generation logic here
      }

      return { status: 'completed', timestamp: new Date().toISOString() };
    });

    return {
      success: true,
      steps: {
        priceData,
        sentimentData
      }
    };
  }
}

/**
 * Initial Data Seeding Workflow
 * Run once to populate historical data
 */
export class DataSeedingWorkflow extends WorkflowEntrypoint<Env, any> {
  async run(event: WorkflowEvent<any>, step: WorkflowStep) {
    // Step 1: Initialize database schema
    await step.do('init-schema', async () => {
      console.log('Initializing database schema...');
      const { initializeD1Schema } = await import('./data-seeding');
      await initializeD1Schema(this.env);
      return { status: 'completed' };
    });

    // Step 2: Seed historical data
    const seedResult = await step.do('seed-historical', async () => {
      console.log('Seeding historical data...');
      const result = await seedHistoricalData(DEFAULT_SEEDING_CONFIG, this.env);
      return result;
    });

    // Step 3: Verify seeding
    await step.do('verify-seeding', async () => {
      console.log('Verifying data seeding...');

      // Query D1 to check record counts
      const result = await this.env.CONFIG_DB.prepare(
        'SELECT COUNT(*) as count FROM price_snapshots'
      ).first<{ count: number }>();

      return {
        status: 'completed',
        recordsInDB: result?.count || 0
      };
    });

    return {
      success: seedResult.success,
      recordsSeeded: seedResult.recordsSeeded,
      errors: seedResult.errors
    };
  }
}

/**
 * Export workflow bindings for wrangler.toml
 */
export const workflows = {
  DATA_UPDATE: DataUpdateWorkflow,
  DATA_SEEDING: DataSeedingWorkflow
};
