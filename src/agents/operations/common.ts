// Common operation utilities for agents
// Based on patterns from s3vcflo-vibesdk-production

import { Env } from '../../config/env';
import { AgentContext, OperationResult } from '../core/types';

/**
 * Base operation context
 */
export interface OperationContext {
  env: Env;
  agentContext: AgentContext;
  cacheKey?: string;
}

/**
 * Base operation class
 * All agent operations extend this
 */
export abstract class BaseOperation<TInput, TOutput> {
  /**
   * Execute the operation
   */
  abstract execute(input: TInput, context: OperationContext): Promise<OperationResult<TOutput>>;

  /**
   * Validate input before execution
   * Override in derived classes
   */
  protected validate(input: TInput): { valid: boolean; error?: string } {
    return { valid: true };
  }

  /**
   * Execute with automatic validation
   */
  async run(input: TInput, context: OperationContext): Promise<OperationResult<TOutput>> {
    const startTime = Date.now();

    try {
      // Validate input
      const validation = this.validate(input);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error || 'Invalid input',
          timestamp: Date.now(),
        };
      }

      // Execute operation
      const result = await this.execute(input, context);

      // Add timing info
      const executionTime = Date.now() - startTime;
      console.log(
        `[Operation] ${this.constructor.name} completed in ${executionTime}ms (cache: ${result.cacheHit || false})`
      );

      return result;
    } catch (error: any) {
      console.error(`[Operation] ${this.constructor.name} failed:`, error);
      return {
        success: false,
        error: error.message,
        timestamp: Date.now(),
      };
    }
  }
}

/**
 * Retry utility for operations
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      console.warn(`[Retry] Attempt ${attempt}/${maxRetries} failed:`, error.message);

      if (attempt < maxRetries) {
        // Exponential backoff
        const delay = delayMs * Math.pow(2, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('Operation failed after retries');
}

/**
 * Timeout utility for operations
 */
export async function withTimeout<T>(
  operation: Promise<T>,
  timeoutMs: number,
  errorMessage: string = 'Operation timed out'
): Promise<T> {
  return Promise.race([
    operation,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    ),
  ]);
}

/**
 * Fallback chain utility for multi-source data fetching
 */
export async function fallbackChain<T>(
  sources: Array<{
    name: string;
    fetch: () => Promise<T>;
    priority: number;
  }>,
  validator?: (data: T) => boolean
): Promise<{ data: T; source: string } | null> {
  // Sort by priority (lower = higher priority)
  const sortedSources = sources.sort((a, b) => a.priority - b.priority);

  for (const source of sortedSources) {
    try {
      console.log(`[Fallback] Trying source: ${source.name}`);
      const data = await source.fetch();

      // Validate if validator provided
      if (validator && !validator(data)) {
        console.warn(`[Fallback] ${source.name} returned invalid data`);
        continue;
      }

      console.log(`[Fallback] ✅ ${source.name} succeeded`);
      return { data, source: source.name };
    } catch (error: any) {
      console.warn(`[Fallback] ${source.name} failed:`, error.message);
      continue;
    }
  }

  console.error('[Fallback] All sources failed');
  return null;
}

/**
 * Batch processor utility
 */
export async function processBatch<TInput, TOutput>(
  items: TInput[],
  processor: (item: TInput) => Promise<TOutput>,
  batchSize: number = 10,
  concurrency: number = 3
): Promise<TOutput[]> {
  const results: TOutput[] = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);

    // Process batch with limited concurrency
    const batchResults = await Promise.all(
      batch.slice(0, concurrency).map((item) => processor(item))
    );

    results.push(...batchResults);
  }

  return results;
}

/**
 * Cache key generator
 */
export function generateCacheKey(prefix: string, params: Record<string, any>): string {
  const sortedParams = Object.keys(params)
    .sort()
    .map((key) => `${key}=${JSON.stringify(params[key])}`)
    .join('&');

  return `${prefix}:${sortedParams}`;
}

/**
 * Data source configuration helper
 */
export interface DataSourceDefinition {
  name: string;
  priority: number;
  timeout?: number;
  retryCount?: number;
}

/**
 * Create data source with retry and timeout
 */
export function createDataSource<T>(
  definition: DataSourceDefinition,
  fetcher: () => Promise<T>
): () => Promise<T> {
  return async () => {
    const operation = async () => {
      if (definition.timeout) {
        return withTimeout(
          fetcher(),
          definition.timeout,
          `${definition.name} timed out`
        );
      }
      return fetcher();
    };

    if (definition.retryCount && definition.retryCount > 1) {
      return retryOperation(operation, definition.retryCount);
    }

    return operation();
  };
}
