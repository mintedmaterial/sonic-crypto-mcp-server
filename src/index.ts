// Sonic Crypto MCP Server - Main Entry Point
// Refactored following MCP TypeScript template patterns

import { Env } from './config/env';
import { CacheService } from './services/cache';
import { AIService } from './services/ai';
import { R2StorageService } from './storage/r2';
import { D1StorageService } from './storage/d1';
import { getSonicDashboardHTML } from './ui/dashboard';
import { CryptoDataCache } from './durable-objects/crypto-cache';
import { MCPSessionManager } from './durable-objects/session-manager';
import { ALL_TOOLS, executeTool } from './tools/index';
import { seedHistoricalData, refreshRecentData, initializeD1Schema, DEFAULT_SEEDING_CONFIG } from './workflows/data-seeding';
import { DataUpdateWorkflow, DataSeedingWorkflow } from './workflows/data-workflow';

// Export Durable Objects
export { CryptoDataCache, MCPSessionManager };

// Export Workflows
export { DataUpdateWorkflow, DataSeedingWorkflow };

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Main Worker Handler
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // Initialize services
    const cache = new CacheService(env);
    const ai = new AIService(env);
    const r2 = new R2StorageService(env);
    const d1 = new D1StorageService(env);

    // Handle OPTIONS for CORS
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // ===== Dashboard =====
      if (path === '/' || path === '/dashboard') {
        return new Response(getSonicDashboardHTML(), {
          headers: { ...corsHeaders, 'Content-Type': 'text/html' }
        });
      }

      // ===== MCP Protocol Endpoints =====

      // List MCP tools
      if (path === '/mcp/tools/list') {
        return new Response(JSON.stringify(ALL_TOOLS, null, 2), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Call MCP tool
      if (path === '/mcp/tools/call' && request.method === 'POST') {
        const body = await request.json() as any;
        const { name, arguments: args } = body;

        if (!name) {
          return new Response(JSON.stringify({ error: 'Tool name required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const result = await executeTool(name, args || {}, env);

        // Log to analytics
        if (env.ANALYTICS) {
          env.ANALYTICS.writeDataPoint({
            blobs: ['mcp_tool_call', name],
            doubles: [result.success ? 1 : 0],
            indexes: [name]
          });
        }

        return new Response(JSON.stringify(result, null, 2), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // ===== AI Chat Endpoint =====
      if (path === '/api/chat' && request.method === 'POST') {
        const { message } = await request.json() as any;

        if (!message) {
          return new Response(JSON.stringify({ error: 'Message required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // Build context from user message
        const lowerMessage = message.toLowerCase();
        let context = '';

        // Auto-fetch relevant data
        if (lowerMessage.includes('price') || lowerMessage.includes('cost')) {
          const priceResult = await executeTool('get_latest_index_tick', {
            market: 'cadli',
            instruments: ['BTC-USD', 'ETH-USD', 'S-USD', 'SONIC-USD']
          }, env);
          context += `\\nCurrent Prices: ${JSON.stringify(priceResult.data)}`;
        }

        if (lowerMessage.includes('sentiment') || lowerMessage.includes('market')) {
          const sentimentResult = await executeTool('analyze_sonic_market_sentiment', {
            sentiment_sources: ['price_action', 'volume_analysis'],
            timeframe: '1d'
          }, env);
          context += `\\nMarket Sentiment: ${JSON.stringify(sentimentResult.data)}`;
        }

        const response = await ai.chat(message, context);

        // Log to analytics
        if (env.ANALYTICS) {
          env.ANALYTICS.writeDataPoint({
            blobs: ['ai_chat', message.substring(0, 50)],
            doubles: [response.length],
            indexes: ['chat']
          });
        }

        return new Response(JSON.stringify({
          success: true,
          response,
          context_used: context ? true : false
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // ===== Direct API Endpoints =====

      // Get latest prices
      if (path === '/api/price') {
        const args = request.method === 'POST'
          ? await request.json()
          : { market: 'cadli', instruments: ['BTC-USD', 'ETH-USD', 'S-USD', 'SONIC-USD'] };

        const result = await executeTool('get_latest_index_tick', args, env);
        return new Response(JSON.stringify(result, null, 2), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Get sentiment analysis
      if (path === '/api/sentiment') {
        const args = request.method === 'POST'
          ? await request.json()
          : {
              sentiment_sources: ['price_action', 'volume_analysis'],
              timeframe: '1d',
              instruments: ['S-USD', 'BTC-USD', 'ETH-USD']
            };

        const result = await executeTool('analyze_sonic_market_sentiment', args, env);
        return new Response(JSON.stringify(result, null, 2), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Search crypto news
      if (path === '/api/news') {
        const args = request.method === 'POST'
          ? await request.json()
          : {
              query: 'Sonic blockchain cryptocurrency',
              tokens: ['Sonic', 'S-USD'],
              max_results: 5
            };

        const result = await executeTool('search_crypto_news', args, env);
        return new Response(JSON.stringify(result, null, 2), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // ===== Data Management Endpoints =====

      // Initialize database
      if (path === '/api/init-db' && request.method === 'POST') {
        await initializeD1Schema(env);

        return new Response(JSON.stringify({
          success: true,
          message: 'Database initialized successfully'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Seed historical data
      if (path === '/api/seed-data' && request.method === 'POST') {
        const config = (await request.json().catch(() => ({})) as any) || DEFAULT_SEEDING_CONFIG;
        const result = await seedHistoricalData(config, env);

        return new Response(JSON.stringify({
          success: result.success,
          message: `Seeded ${result.recordsSeeded} records`,
          errors: result.errors
        }, null, 2), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Refresh recent data
      if (path === '/api/refresh-data' && request.method === 'POST') {
        await refreshRecentData(env);

        return new Response(JSON.stringify({
          success: true,
          message: 'Data refreshed successfully'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // ===== System Endpoints =====

      // Health check
      if (path === '/health') {
        const instrumentCount = await d1.getInstrumentCount();
        const priceSnapshotCount = await d1.getPriceSnapshotCount();

        const health = {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          services: {
            ai: !!env.AI,
            kv: !!env.SONIC_CACHE,
            r2: !!env.HISTORICAL_DATA,
            d1: !!env.CONFIG_DB,
            analytics: !!env.ANALYTICS,
          },
          database: {
            instruments: instrumentCount,
            price_snapshots: priceSnapshotCount,
          }
        };

        return new Response(JSON.stringify(health, null, 2), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // API documentation
      if (path === '/docs') {
        return new Response(JSON.stringify({
          name: "Sonic Crypto MCP Server",
          version: "2.0.0",
          description: "Advanced MCP server for cryptocurrency data and AI analysis",
          endpoints: {
            "/": "Sonic-themed Dashboard with AI Chat",
            "/mcp/tools/list": "List all MCP tools",
            "/mcp/tools/call": "Execute MCP tool (POST)",
            "/api/price": "Get latest cryptocurrency prices",
            "/api/sentiment": "Market sentiment analysis",
            "/api/news": "Search crypto news",
            "/api/chat": "AI chat with context-aware responses (POST)",
            "/api/seed-data": "Seed historical data (POST)",
            "/api/refresh-data": "Refresh recent data (POST)",
            "/api/init-db": "Initialize database schema (POST)",
            "/health": "Health check with service status",
            "/docs": "API documentation (this page)"
          },
          tools: ALL_TOOLS.map(t => ({
            name: t.name,
            description: t.description
          })),
          repository: "https://github.com/mintedmaterial/sonic-crypto-mcp-server",
          domain: "ss.srvcflo.com"
        }, null, 2), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // 404 Not Found
      return new Response(JSON.stringify({
        error: 'Not Found',
        message: `Endpoint ${path} not found`,
        documentation: '/docs'
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (error: any) {
      console.error('Worker error:', error);

      // Log error to analytics
      if (env.ANALYTICS) {
        env.ANALYTICS.writeDataPoint({
          blobs: ['error', path, error.message],
          doubles: [1],
          indexes: ['error']
        });
      }

      return new Response(JSON.stringify({
        error: error.message,
        stack: error.stack,
        path
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  },

  // Scheduled handler for cron triggers
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    console.log('Running scheduled task:', event.cron);

    try {
      // Refresh recent data
      await refreshRecentData(env);

      // Log to analytics
      if (env.ANALYTICS) {
        env.ANALYTICS.writeDataPoint({
          blobs: ['cron_run', event.cron],
          doubles: [1],
          indexes: ['cron']
        });
      }

      console.log('Scheduled task completed successfully');
    } catch (error) {
      console.error('Scheduled task error:', error);
    }
  }
};
