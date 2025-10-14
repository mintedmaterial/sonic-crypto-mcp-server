// Sonic Crypto MCP Server - Main Entry Point
// Refactored following MCP TypeScript template patterns

import { Env } from './config/env';
import { CacheService } from './services/cache';
import { AIService } from './services/ai';
import { R2StorageService } from './storage/r2';
import { D1StorageService } from './storage/d1';
import { getSonicDashboardHTML } from './ui/dashboard';
import { getEnhancedDashboardHTML } from './ui/dashboard-enhanced';
import { getVibeSDKDashboard } from './ui/dashboard-vibesdk';
import { CryptoDataCache } from './durable-objects/crypto-cache';
import { MCPSessionManager } from './durable-objects/session-manager';
import { ALL_TOOLS, executeTool } from './tools/index';
import { seedHistoricalData, refreshRecentData, initializeD1Schema, DEFAULT_SEEDING_CONFIG } from './workflows/data-seeding';
import { DataUpdateWorkflow, DataSeedingWorkflow } from './workflows/data-workflow';

// Export Durable Objects - Core
export { CryptoDataCache, MCPSessionManager };

// Export Durable Objects - AI Agents
export { OverviewAgent } from './agents/overview-agent';
export { ChartsAgent, ChartsContainer } from './agents/charts-agent';
export { TradingAgent } from './agents/trading-agent';
export { IntelligenceAgent } from './agents/intelligence-agent';
export { ChatAgent } from './agents/chat-agent';

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
      // ===== Static Assets (React Dashboard) =====
      // Try to serve from static assets binding if available
      if (env.ASSETS && !path.startsWith('/api/') && !path.startsWith('/mcp/') && !path.startsWith('/health')) {
        try {
          const assetResponse = await env.ASSETS.fetch(request);

          // If asset found, return it
          if (assetResponse.status === 200) {
            return new Response(assetResponse.body, {
              headers: { ...corsHeaders, ...Object.fromEntries(assetResponse.headers) }
            });
          }

          // If 404 and path is /, fall through to dashboard HTML
          if (assetResponse.status === 404 && path === '/') {
            // Fall through to enhanced dashboard below
          } else if (assetResponse.status === 404) {
            // For SPA routing, serve index.html for non-API routes
            const indexResponse = await env.ASSETS.fetch(new Request(new URL('/', request.url)));
            if (indexResponse.status === 200) {
              return new Response(indexResponse.body, {
                headers: { ...corsHeaders, ...Object.fromEntries(indexResponse.headers) }
              });
            }
          }
        } catch (assetError) {
          console.warn('Asset fetch error:', assetError);
          // Fall through to dashboard HTML
        }
      }

      // ===== Root path - Enhanced Dashboard UI (Fallback) =====
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
          : { 
              limit: parseInt(url.searchParams.get('limit') || '10'),
              source: url.searchParams.get('source') || 'sonic'
            };

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

      // NFT verification endpoint
      if (path === '/api/verify-nft' && request.method === 'POST') {
        try {
          const { walletAddress, skipCache } = await request.json() as any;

          if (!walletAddress) {
            return new Response(JSON.stringify({ error: 'walletAddress required' }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }

          const { NFTVerificationService } = await import('./services/nft-verification');
          const nftService = new NFTVerificationService(env, 146);

          // Use skipCache parameter to bypass cache for testing
          const result = skipCache
            ? await nftService.verifyHolder(walletAddress)
            : await nftService.verifyWithCache(walletAddress);

          return new Response(JSON.stringify(result, null, 2), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        } catch (error: any) {
          return new Response(JSON.stringify({
            error: error.message || 'Verification failed',
            isHolder: false,
            balance: 0
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }

      // ===== Workers for Platforms - User Worker Management =====

      // Create or get user worker
      if (path === '/api/user-worker/create' && request.method === 'POST') {
        try {
          const { userId, userAddress } = await request.json() as any;

          if (!userId || !userAddress) {
            return new Response(JSON.stringify({
              error: 'userId and userAddress required'
            }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }

          const { UserWorkerManager } = await import('./services/user-worker-manager');
          const manager = new UserWorkerManager(env);

          const config = await manager.getOrCreateUserWorker(userId, userAddress);

          return new Response(JSON.stringify({
            success: true,
            data: config
          }, null, 2), {
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

      // Dispatch request to user worker
      if (path === '/api/user-worker/dispatch' && request.method === 'POST') {
        try {
          const { userId, path: workerPath, method, body } = await request.json() as any;

          if (!userId || !workerPath) {
            return new Response(JSON.stringify({
              error: 'userId and path required'
            }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }

          const { UserWorkerManager } = await import('./services/user-worker-manager');
          const manager = new UserWorkerManager(env);

          const response = await manager.dispatchToUserWorker(userId, workerPath, {
            method: method || 'GET',
            body: body ? JSON.stringify(body) : undefined
          });

          // Return the response from user worker
          return response;
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

      // Update user worker NFT status
      if (path === '/api/user-worker/update-nft' && request.method === 'POST') {
        try {
          const { userId, userAddress } = await request.json() as any;

          if (!userId || !userAddress) {
            return new Response(JSON.stringify({
              error: 'userId and userAddress required'
            }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }

          const { UserWorkerManager } = await import('./services/user-worker-manager');
          const manager = new UserWorkerManager(env);

          const config = await manager.updateWorkerNFTStatus(userId, userAddress);

          return new Response(JSON.stringify({
            success: true,
            data: config
          }, null, 2), {
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

      // Get worker stats (monitoring)
      if (path === '/api/user-worker/stats') {
        try {
          const { UserWorkerManager } = await import('./services/user-worker-manager');
          const manager = new UserWorkerManager(env);

          const stats = await manager.getWorkerStats();

          return new Response(JSON.stringify({
            success: true,
            data: stats
          }, null, 2), {
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

      // List user workers (admin)
      if (path === '/api/user-worker/list') {
        try {
          const limit = parseInt(url.searchParams.get('limit') || '100');

          const { UserWorkerManager } = await import('./services/user-worker-manager');
          const manager = new UserWorkerManager(env);

          const workers = await manager.listUserWorkers(limit);

          return new Response(JSON.stringify({
            success: true,
            data: workers,
            count: workers.length
          }, null, 2), {
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

      // Delete user worker
      if (path === '/api/user-worker/delete' && request.method === 'POST') {
        try {
          const { userId } = await request.json() as any;

          if (!userId) {
            return new Response(JSON.stringify({ error: 'userId required' }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }

          const { UserWorkerManager } = await import('./services/user-worker-manager');
          const manager = new UserWorkerManager(env);

          await manager.deleteUserWorker(userId);

          return new Response(JSON.stringify({
            success: true,
            message: 'User worker deleted successfully'
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

      // ===== Data Management Endpoints =====

      // Initialize database
      if (path === '/api/init-db' && request.method === 'POST') {
        try {
          console.log('Initializing D1 schema...');
          await initializeD1Schema(env);
          console.log('✅ D1 schema initialized');
          
          // Also initialize credit tracking table
          console.log('Initializing credit tracking table...');
          await d1.initializeCreditTable();
          console.log('✅ Credit tracking table initialized');

          return new Response(JSON.stringify({
            success: true,
            message: 'Database and credit tracking initialized successfully',
            tables_created: ['instruments', 'price_snapshots', 'api_credit_usage']
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        } catch (error: any) {
          console.error('Init-db error:', error);
          return new Response(JSON.stringify({
            success: false,
            error: error.message,
            stack: error.stack
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
            "/api/user-worker/create": "Create or get user-specific worker (POST, NFT-gated)",
            "/api/user-worker/dispatch": "Dispatch request to user worker (POST)",
            "/api/user-worker/update-nft": "Update user worker NFT status (POST)",
            "/api/user-worker/stats": "Get user worker statistics (monitoring)",
            "/api/user-worker/list": "List all user workers (admin)",
            "/api/user-worker/delete": "Delete user worker (POST)",
            "/api/verify-nft": "Verify Bandit Kidz NFT ownership (POST)",
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
