// Sonic Crypto MCP Server - Main Entry Point
// Refactored following MCP TypeScript template patterns

import { Env } from './config/env';
import { CacheService } from './services/cache';
import { AIService } from './services/ai';
import { R2StorageService } from './storage/r2';
import { D1StorageService } from './storage/d1';
import { getSonicDashboardHTML } from './ui/dashboard';
import { getEnhancedDashboardHTML } from './ui/dashboard-enhanced';
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
      // ===== Root path - Enhanced Dashboard UI =====
      if (path === '/') {
        return new Response(getEnhancedDashboardHTML(), {
          headers: { ...corsHeaders, 'Content-Type': 'text/html' }
        });
      }

      // Legacy dashboard route
      if (path === '/legacy' || path === '/chat') {
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

      // ===== AI Chat Endpoint with Streaming =====
      // ===== AI Chat Endpoint with Agentic Tool Calling =====
      if (path === '/api/chat' && request.method === 'POST') {
        const { message, history = [] } = await request.json() as any;

        if (!message) {
          return new Response(JSON.stringify({ error: 'Message required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        try {
          // Use agent service for intelligent, autonomous tool calling
          const { AgentService } = await import('./services/agent');
          const agent = new AgentService(env);
          const response = await agent.chat(message, history);

          // Log to analytics
          if (env.ANALYTICS) {
            env.ANALYTICS.writeDataPoint({
              blobs: ['agent_chat', message.substring(0, 50), ...response.tools_used],
              doubles: [response.tools_used.length],
              indexes: ['chat']
            });
          }

          return new Response(JSON.stringify(response), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        } catch (error: any) {
          console.error('Agent chat error:', error);
          return new Response(JSON.stringify({
            message: `I encountered an issue: ${error.message}. I'm having trouble accessing my tools right now, but I can try to help with general information.`,
            tools_used: [],
            data: {},
            citations: [],
            error: error.message
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }

      // ===== Streaming Chat Endpoint (for real-time responses) =====
      if (path === '/api/chat/stream' && request.method === 'POST') {
        const { message, history = [] } = await request.json() as any;

        if (!message) {
          return new Response(JSON.stringify({ error: 'Message required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        try {
          // Step 1: Get tool results using agent (non-streaming)
          const { AgentService } = await import('./services/agent');
          const agent = new AgentService(env);
          
          // Quick intent analysis
          const lowerMessage = message.toLowerCase();
          let context = '';

          // Auto-fetch relevant data for streaming context
          if (lowerMessage.includes('price') || lowerMessage.includes('cost')) {
            const priceResult = await executeTool('get_latest_index_tick', {
              market: 'orderly',
              instruments: ['BTC-USD', 'ETH-USD', 'S-USD', 'SONIC-USD']
            }, env);
            context += `\nCurrent Prices: ${JSON.stringify(priceResult.data)}`;
          }

          if (lowerMessage.includes('sentiment') || lowerMessage.includes('market')) {
            const sentimentResult = await executeTool('analyze_sonic_market_sentiment', {
              sentiment_sources: ['price_action', 'volume_analysis'],
              timeframe: '1d'
            }, env);
            context += `\nMarket Sentiment: ${JSON.stringify(sentimentResult.data)}`;
          }

          // Step 2: Stream AI response with tool context
          const systemPrompt = `You are an expert cryptocurrency analyst specializing in the Sonic blockchain.
          
You have access to real-time market data:
${context}

Provide concise, data-driven insights. Use specific numbers from the data when relevant.`;

          const messages = [
            { role: 'system', content: systemPrompt },
            ...history.slice(-4),
            { role: 'user', content: message }
          ];

          const stream = await env.AI.run('@hf/nousresearch/hermes-2-pro-mistral-7b', {
            messages,
            stream: true
          });

          // Log to analytics
          if (env.ANALYTICS) {
            env.ANALYTICS.writeDataPoint({
              blobs: ['ai_chat_stream', message.substring(0, 50)],
              doubles: [1],
              indexes: ['chat_stream']
            });
          }

          return new Response(stream, {
            headers: {
              ...corsHeaders,
              'Content-Type': 'text/event-stream',
              'Cache-Control': 'no-cache',
              'Connection': 'keep-alive'
            }
          });
        } catch (error: any) {
          console.error('Streaming chat error:', error);
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }

      // ===== Direct API Endpoints =====

      // Get latest prices with enhanced error handling
      if (path === '/api/price') {
        try {
          const args = request.method === 'POST'
            ? await request.json()
            : { market: 'orderly', instruments: ['BTC-USD', 'ETH-USD', 'S-USD', 'SONIC-USD'] };

          const result = await executeTool('get_latest_index_tick', args, env);
          
          // Log the data sources used
          if (result.success && result.data) {
            console.log(`✅ Price fetch: ${result.data.sources_used?.join(', ') || 'unknown sources'}`);
          }
          
          return new Response(JSON.stringify(result, null, 2), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        } catch (error: any) {
          console.error('Price API error:', error);
          return new Response(JSON.stringify({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
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

      // Get historical daily OHLCV data
      if (path === '/api/historical-daily') {
        const args = request.method === 'POST'
          ? await request.json()
          : {
              instruments: url.searchParams.get('instruments') ? JSON.parse(url.searchParams.get('instruments')!) : ['BTC-USD'],
              start_date: url.searchParams.get('start_date') || new Date(Date.now() - 30*24*60*60*1000).toISOString().split('T')[0],
              end_date: url.searchParams.get('end_date') || new Date().toISOString().split('T')[0]
            };

        const result = await executeTool('get_historical_ohlcv_daily', args, env);
        return new Response(JSON.stringify(result, null, 2), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Get historical hourly OHLCV data
      if (path === '/api/historical-hourly') {
        const args = request.method === 'POST'
          ? await request.json()
          : {
              instruments: url.searchParams.get('instruments') ? JSON.parse(url.searchParams.get('instruments')!) : ['BTC-USD'],
              start_date: url.searchParams.get('start_date') || new Date(Date.now() - 7*24*60*60*1000).toISOString(),
              end_date: url.searchParams.get('end_date') || new Date().toISOString()
            };

        const result = await executeTool('get_historical_ohlcv_hourly', args, env);
        return new Response(JSON.stringify(result, null, 2), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Get historical minutes OHLCV data
      if (path === '/api/historical-minutes') {
        const args = request.method === 'POST'
          ? await request.json()
          : {
              instruments: url.searchParams.get('instruments') ? JSON.parse(url.searchParams.get('instruments')!) : ['BTC-USD'],
              start_date: url.searchParams.get('start_date') || new Date(Date.now() - 24*60*60*1000).toISOString(),
              end_date: url.searchParams.get('end_date') || new Date().toISOString(),
              interval: url.searchParams.get('interval') || '5'
            };

        const result = await executeTool('get_historical_ohlcv_minutes', args, env);
        return new Response(JSON.stringify(result, null, 2), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // ===== Service-Specific Endpoints =====

      // Orderly DEX Markets
      if (path === '/api/orderly/markets') {
        try {
          const orderly = new (await import('./services/orderly')).OrderlyService(env);
          const markets = await orderly.getMarkets();
          return new Response(JSON.stringify({ success: true, data: markets }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        } catch (error: any) {
          return new Response(JSON.stringify({ success: false, error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }

      // Orderly DEX Ticker
      if (path.startsWith('/api/orderly/ticker/')) {
        try {
          const symbol = path.split('/').pop() || '';
          const orderly = new (await import('./services/orderly')).OrderlyService(env);
          const ticker = await orderly.getTicker(symbol);
          return new Response(JSON.stringify({ success: true, data: ticker }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        } catch (error: any) {
          return new Response(JSON.stringify({ success: false, error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }

      // DexScreener Search
      if (path === '/api/dexscreener/search') {
        try {
          const body = request.method === 'POST' 
            ? await request.json() as { query?: string }
            : { query: url.searchParams.get('q') || 'sonic' };
          const query = body.query || 'sonic';
          const dex = new (await import('./services/dexscreener')).DexScreenerService(env);
          const pairs = await dex.searchPairs(query);
          return new Response(JSON.stringify({ success: true, data: pairs }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        } catch (error: any) {
          return new Response(JSON.stringify({ success: false, error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }

      // DexScreener Sonic Prices
      if (path === '/api/dexscreener/sonic') {
        try {
          const body = request.method === 'POST'
            ? await request.json() as { symbols?: string[] }
            : { symbols: ['SONIC', 'S', 'USDC'] };
          const symbols = body.symbols || ['SONIC', 'S', 'USDC'];
          const dex = new (await import('./services/dexscreener')).DexScreenerService(env);
          const prices = await dex.getSonicPrices(symbols);
          return new Response(JSON.stringify({ success: true, data: prices }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        } catch (error: any) {
          return new Response(JSON.stringify({ success: false, error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }

      // ===== CoinMarketCap Endpoints =====

      // Get trending gainers/losers
      if (path === '/api/cmc/trending') {
        try {
          const limit = parseInt(url.searchParams.get('limit') || '10');
          const cmc = new (await import('./services/coinmarketcap')).CoinMarketCapService(env);
          const trending = await cmc.getTrendingGainersLosers(limit);
          return new Response(JSON.stringify({ success: true, data: trending }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        } catch (error: any) {
          return new Response(JSON.stringify({ success: false, error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }

      // Get global market metrics
      if (path === '/api/cmc/global') {
        try {
          const cmc = new (await import('./services/coinmarketcap')).CoinMarketCapService(env);
          const metrics = await cmc.getGlobalMetrics();
          return new Response(JSON.stringify({ success: true, data: metrics }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        } catch (error: any) {
          return new Response(JSON.stringify({ success: false, error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }

      // Get quotes for specific symbols
      if (path === '/api/cmc/quotes') {
        try {
          const symbolsParam = url.searchParams.get('symbols') || 'BTC,ETH,SOL';
          const symbols = symbolsParam.split(',').map(s => s.trim().toUpperCase());
          const cmc = new (await import('./services/coinmarketcap')).CoinMarketCapService(env);
          const quotes = await cmc.getQuotes(symbols);
          return new Response(JSON.stringify({ success: true, data: quotes }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        } catch (error: any) {
          return new Response(JSON.stringify({ success: false, error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }

      // Get credit usage
      if (path === '/api/cmc/credits') {
        try {
          const cmc = new (await import('./services/coinmarketcap')).CoinMarketCapService(env);
          const usedToday = await cmc.getCreditUsageToday();
          return new Response(JSON.stringify({ 
            success: true, 
            data: {
              used_today: usedToday,
              limit: 330,
              remaining: Math.max(0, 330 - usedToday),
              percentage: ((usedToday / 330) * 100).toFixed(1)
            }
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        } catch (error: any) {
          return new Response(JSON.stringify({ success: false, error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }

      // Get trending crypto (via MCP tool)
      if (path === '/api/trending') {
        const args = request.method === 'POST'
          ? await request.json()
          : { limit: 10, time_period: '24h' };

        const result = await executeTool('get_trending_crypto', args, env);
        return new Response(JSON.stringify(result, null, 2), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Get global market data (via MCP tool)
      if (path === '/api/global-market') {
        const result = await executeTool('get_global_market_data', {}, env);
        return new Response(JSON.stringify(result, null, 2), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Get opportunities (using sentiment tool as base)
      if (path === '/api/opportunities') {
        const args = request.method === 'POST'
          ? await request.json()
          : {
              sentiment_sources: ['price_action', 'volume_analysis', 'market_trends'],
              timeframe: '1d',
              instruments: ['S-USD', 'BTC-USD', 'ETH-USD', 'SONIC-USD']
            };

        const result = await executeTool('analyze_sonic_market_sentiment', args, env);
        return new Response(JSON.stringify(result, null, 2), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Get Discord community intelligence
      if (path === '/api/discord/intel') {
        const args = request.method === 'POST'
          ? await request.json()
          : {
              nft_channel_id: url.searchParams.get('nft_channel'),
              tweet_channel_id: url.searchParams.get('tweet_channel'),
              limit: parseInt(url.searchParams.get('limit') || '50'),
              intel_type: url.searchParams.get('type') || 'all'
            };

        const result = await executeTool('get_discord_community_intel', args, env);
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
        try {
          await initializeD1Schema(env);
          
          // Also initialize credit tracking table
          await d1.initializeCreditTable();

          return new Response(JSON.stringify({
            success: true,
            message: 'Database and credit tracking initialized successfully'
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        } catch (error: any) {
          return new Response(JSON.stringify({
            success: false,
            error: error.message
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
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
      if (path === '/api/docs') {
        return new Response(JSON.stringify({
          name: "Sonic Crypto MCP Server",
          version: "2.0.0",
          description: "Advanced MCP server for cryptocurrency data and AI analysis",
          dashboard: "https://ss.srvcflo.com/",
          endpoints: {
            "/": "Sonic-themed Dashboard with AI Chat (SPA)",
            "/mcp/tools/list": "List all MCP tools",
            "/mcp/tools/call": "Execute MCP tool (POST)",
            "/api/price": "Get latest cryptocurrency prices (multi-source: Orderly → DexScreener → CoinDesk)",
            "/api/sentiment": "Market sentiment analysis",
            "/api/news": "Search crypto news (requires BRAVE_API_KEY)",
            "/api/chat": "AI chat with context-aware responses (POST)",
            "/api/orderly/markets": "Get Orderly DEX markets",
            "/api/orderly/ticker/{symbol}": "Get Orderly DEX ticker for symbol",
            "/api/dexscreener/search": "Search DexScreener pairs",
            "/api/dexscreener/sonic": "Get Sonic chain token prices from DexScreener",
            "/api/seed-data": "Seed historical data (POST)",
            "/api/refresh-data": "Refresh recent data (POST)",
            "/api/init-db": "Initialize database schema (POST)",
            "/health": "Health check with service status",
            "/api/docs": "API documentation (this page)"
          },
          data_sources: {
            "Orderly DEX": "https://api.orderly.org - Real-time perpetuals and spot prices",
            "DexScreener": "https://api.dexscreener.com - Multi-chain DEX aggregator (Sonic focused)",
            "CoinDesk": "https://production.api.coindesk.com - Fallback for index data",
            "Brave Search": "https://api.search.brave.com - Crypto news (requires API key)"
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
  },

  // Queue handler for crypto data processing
  async queue(batch: MessageBatch<any>, env: Env, ctx: ExecutionContext): Promise<void> {
    console.log(`Processing queue batch with ${batch.messages.length} messages`);

    for (const message of batch.messages) {
      try {
        const { type, data } = message.body;

        switch (type) {
          case 'refresh_price':
            // Refresh price data for specific instruments
            console.log('Refreshing price data:', data);
            break;

          case 'seed_historical':
            // Seed historical data
            console.log('Seeding historical data:', data);
            await seedHistoricalData(data.config || {}, env);
            break;

          default:
            console.warn('Unknown queue message type:', type);
        }

        message.ack();
      } catch (error) {
        console.error('Queue message processing error:', error);
        message.retry();
      }
    }
  }
};
