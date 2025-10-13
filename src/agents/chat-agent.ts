/**
 * Chat Agent - Multi-Agent Orchestration & Conversational Interface
 *
 * Orchestrates communication between specialized agents:
 * - Overview Agent: Market overview, trending tokens
 * - Charts Agent: Technical analysis, chart patterns
 * - Trading Agent: Trade signals, order book analysis
 * - Intelligence Agent: News, social sentiment, reports
 *
 * Features:
 * - Intent detection and query routing
 * - Multi-agent response aggregation
 * - Conversation context management
 * - Streaming response support
 * - Natural language understanding
 * - Complex multi-step query handling
 */

import { BaseAgent } from './core/base-agent';
import { Env } from '../config/env';
import { BaseAgentState } from './core/agent-state';
import { OperationResult } from './core/types';
import { AIService } from '../services/ai';

// Conversation message
interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

// Chat history
interface ConversationHistory {
  sessionId: string;
  messages: Message[];
  context: Record<string, any>;
  lastUpdated: number;
}

// Agent response
interface AgentResponse {
  agentType: 'overview' | 'charts' | 'trading' | 'intelligence';
  success: boolean;
  data?: any;
  error?: string;
  executionTime: number;
}

// Chat response
interface ChatResponse {
  message: string;
  agentsConsulted: string[];
  data: Record<string, any>;
  suggestions?: string[];
  timestamp: number;
}

// Query intent
interface QueryIntent {
  primaryIntent: 'price' | 'chart' | 'trade' | 'news' | 'sentiment' | 'report' | 'general';
  entities: {
    symbols?: string[];
    timeframe?: string;
    indicators?: string[];
    topics?: string[];
  };
  requiresMultipleAgents: boolean;
  confidence: number;
}

export class ChatAgent extends BaseAgent {
  protected agentType: BaseAgentState['agentType'] = 'chat';
  private aiService!: AIService;

  protected async onInitialize(params: any): Promise<void> {
    this.aiService = new AIService(this.env);
    console.log(`[ChatAgent] Initialized for session ${params.sessionId}`);
  }

  /**
   * Process chat message and orchestrate agent responses
   */
  async chat(
    message: string,
    history: Message[] = [],
    userId?: string
  ): Promise<OperationResult<ChatResponse>> {
    return this.executeOperation(async () => {
      console.log(`[ChatAgent] Processing message: "${message.substring(0, 50)}..."`);

      // Detect intent
      const intent = await this.detectIntent(message, history);
      console.log('[ChatAgent] Intent detected:', intent);

      // Route to appropriate agents based on intent
      const agentResponses = await this.routeToAgents(intent, message, userId);

      // Aggregate and synthesize responses
      const response = await this.synthesizeResponse(
        message,
        intent,
        agentResponses,
        history
      );

      // Broadcast chat update
      this.broadcast({
        type: 'data_update',
        agentId: this.stateManager.getState().agentId,
        data: { type: 'chat_response', response },
        timestamp: Date.now(),
      });

      return response;
    }, 'chat');
  }

  /**
   * Detect user intent from message
   */
  private async detectIntent(
    message: string,
    history: Message[]
  ): Promise<QueryIntent> {
    const lowerMessage = message.toLowerCase();

    // Initialize intent
    const intent: QueryIntent = {
      primaryIntent: 'general',
      entities: {},
      requiresMultipleAgents: false,
      confidence: 0.5,
    };

    // Extract symbols (e.g., BTC, ETH, $S, SONIC)
    const symbolMatches = message.match(/\b(?:\$)?([A-Z]{2,10}(?:-USD)?)\b/g);
    if (symbolMatches) {
      intent.entities.symbols = symbolMatches.map((s) =>
        s.replace('$', '').toUpperCase()
      );
    }

    // Extract timeframes (e.g., 1h, 4h, 1d, 1w)
    const timeframeMatch = message.match(/\b(\d+[mhd]|week|month|year)\b/i);
    if (timeframeMatch) {
      intent.entities.timeframe = timeframeMatch[0];
    }

    // Detect primary intent
    if (
      lowerMessage.includes('price') ||
      lowerMessage.includes('cost') ||
      lowerMessage.includes('worth')
    ) {
      intent.primaryIntent = 'price';
      intent.confidence = 0.9;
    } else if (
      lowerMessage.includes('chart') ||
      lowerMessage.includes('technical') ||
      lowerMessage.includes('pattern') ||
      lowerMessage.includes('indicator')
    ) {
      intent.primaryIntent = 'chart';
      intent.confidence = 0.85;
    } else if (
      lowerMessage.includes('trade') ||
      lowerMessage.includes('buy') ||
      lowerMessage.includes('sell') ||
      lowerMessage.includes('signal')
    ) {
      intent.primaryIntent = 'trade';
      intent.confidence = 0.9;
    } else if (
      lowerMessage.includes('news') ||
      lowerMessage.includes('article') ||
      lowerMessage.includes('headline')
    ) {
      intent.primaryIntent = 'news';
      intent.confidence = 0.9;
    } else if (
      lowerMessage.includes('sentiment') ||
      lowerMessage.includes('feeling') ||
      lowerMessage.includes('bullish') ||
      lowerMessage.includes('bearish')
    ) {
      intent.primaryIntent = 'sentiment';
      intent.confidence = 0.85;
    } else if (
      lowerMessage.includes('report') ||
      lowerMessage.includes('summary') ||
      lowerMessage.includes('overview')
    ) {
      intent.primaryIntent = 'report';
      intent.confidence = 0.8;
    }

    // Check if multiple agents needed
    const intentTypes = [
      lowerMessage.includes('price'),
      lowerMessage.includes('chart'),
      lowerMessage.includes('trade'),
      lowerMessage.includes('news'),
      lowerMessage.includes('sentiment'),
    ].filter(Boolean).length;

    intent.requiresMultipleAgents = intentTypes > 1;

    return intent;
  }

  /**
   * Route query to appropriate agents
   */
  private async routeToAgents(
    intent: QueryIntent,
    message: string,
    userId?: string
  ): Promise<AgentResponse[]> {
    const responses: AgentResponse[] = [];
    const symbols = intent.entities.symbols || ['BTC', 'ETH', 'S', 'SONIC'];

    // Route to Overview Agent for price data
    if (
      intent.primaryIntent === 'price' ||
      intent.primaryIntent === 'general' ||
      intent.requiresMultipleAgents
    ) {
      const startTime = Date.now();
      try {
        // Get Overview Agent instance
        const overviewAgentId = this.env.OVERVIEW_AGENT.idFromName('default');
        const overviewAgent = this.env.OVERVIEW_AGENT.get(overviewAgentId);

        // Call Overview Agent
        const response = await overviewAgent.fetch('http://overview/prices', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ symbols }),
        });

        const data = await response.json() as any;

        responses.push({
          agentType: 'overview',
          success: true,
          data: data.data,
          executionTime: Date.now() - startTime,
        });
      } catch (error) {
        console.error('[ChatAgent] Overview Agent error:', error);
        responses.push({
          agentType: 'overview',
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          executionTime: Date.now() - startTime,
        });
      }
    }

    // Route to Charts Agent for technical analysis
    if (intent.primaryIntent === 'chart' || intent.requiresMultipleAgents) {
      const startTime = Date.now();
      try {
        const chartsAgentId = this.env.CHARTS_AGENT.idFromName('default');
        const chartsAgent = this.env.CHARTS_AGENT.get(chartsAgentId);

        const symbol = symbols[0] || 'BTC';
        const response = await chartsAgent.fetch(
          `http://charts/analyze/${symbol}?timeframe=${intent.entities.timeframe || '1d'}`,
          { method: 'GET' }
        );

        const data = await response.json() as any;

        responses.push({
          agentType: 'charts',
          success: true,
          data: data.data,
          executionTime: Date.now() - startTime,
        });
      } catch (error) {
        console.error('[ChatAgent] Charts Agent error:', error);
        responses.push({
          agentType: 'charts',
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          executionTime: Date.now() - startTime,
        });
      }
    }

    // Route to Trading Agent for trade signals
    if (intent.primaryIntent === 'trade' || intent.requiresMultipleAgents) {
      const startTime = Date.now();
      try {
        const tradingAgentId = this.env.TRADING_AGENT.idFromName('default');
        const tradingAgent = this.env.TRADING_AGENT.get(tradingAgentId);

        const symbol = symbols[0] || 'PERP_BTC_USDC';
        const response = await tradingAgent.fetch(
          `http://trading/signal/${symbol}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userAddress: userId }),
          }
        );

        const data = await response.json() as any;

        responses.push({
          agentType: 'trading',
          success: true,
          data: data.data,
          executionTime: Date.now() - startTime,
        });
      } catch (error) {
        console.error('[ChatAgent] Trading Agent error:', error);
        responses.push({
          agentType: 'trading',
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          executionTime: Date.now() - startTime,
        });
      }
    }

    // Route to Intelligence Agent for news/sentiment
    if (
      intent.primaryIntent === 'news' ||
      intent.primaryIntent === 'sentiment' ||
      intent.primaryIntent === 'report'
    ) {
      const startTime = Date.now();
      try {
        const intelligenceAgentId =
          this.env.INTELLIGENCE_AGENT.idFromName('default');
        const intelligenceAgent = this.env.INTELLIGENCE_AGENT.get(intelligenceAgentId);

        let endpoint = 'http://intelligence/news?query=cryptocurrency&limit=5';
        if (intent.primaryIntent === 'report') {
          endpoint = 'http://intelligence/report/generate';
        }

        const response = await intelligenceAgent.fetch(endpoint, {
          method: intent.primaryIntent === 'report' ? 'POST' : 'GET',
          headers: { 'Content-Type': 'application/json' },
          body:
            intent.primaryIntent === 'report'
              ? JSON.stringify({ reportType: 'custom' })
              : undefined,
        });

        const data = await response.json() as any;

        responses.push({
          agentType: 'intelligence',
          success: true,
          data: data.data,
          executionTime: Date.now() - startTime,
        });
      } catch (error) {
        console.error('[ChatAgent] Intelligence Agent error:', error);
        responses.push({
          agentType: 'intelligence',
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          executionTime: Date.now() - startTime,
        });
      }
    }

    return responses;
  }

  /**
   * Synthesize responses from multiple agents into coherent answer
   */
  private async synthesizeResponse(
    message: string,
    intent: QueryIntent,
    agentResponses: AgentResponse[],
    history: Message[]
  ): Promise<ChatResponse> {
    // Collect data from successful responses
    const data: Record<string, any> = {};
    const agentsConsulted: string[] = [];

    for (const response of agentResponses) {
      agentsConsulted.push(response.agentType);
      if (response.success && response.data) {
        data[response.agentType] = response.data;
      }
    }

    // Build context for AI synthesis
    const context = this.buildContext(intent, data);

    // Use AI to generate natural language response
    const systemPrompt = `You are an expert cryptocurrency analyst assistant for the Sonic blockchain ecosystem.

You have access to real-time data from multiple specialized agents:
${context}

Based on the user's question and the data provided, give a concise, helpful response.
Focus on the most relevant information and provide actionable insights.
Use specific numbers and data points from the agent responses.
Be conversational but professional.`;

    const conversationHistory = history
      .slice(-4)
      .map((m) => `${m.role}: ${m.content}`)
      .join('\n');

    const userPrompt = `${conversationHistory ? conversationHistory + '\n' : ''}user: ${message}`;

    const aiResponse = await this.aiService.chat(systemPrompt, userPrompt);

    // Generate suggestions for follow-up questions
    const suggestions = this.generateSuggestions(intent, data);

    return {
      message: aiResponse,
      agentsConsulted,
      data,
      suggestions,
      timestamp: Date.now(),
    };
  }

  /**
   * Build context string from agent data
   */
  private buildContext(intent: QueryIntent, data: Record<string, any>): string {
    const parts: string[] = [];

    if (data.overview) {
      parts.push(`Market Prices: ${JSON.stringify(data.overview, null, 2)}`);
    }

    if (data.charts) {
      parts.push(`Technical Analysis: ${JSON.stringify(data.charts, null, 2)}`);
    }

    if (data.trading) {
      parts.push(`Trading Signals: ${JSON.stringify(data.trading, null, 2)}`);
    }

    if (data.intelligence) {
      parts.push(`News & Sentiment: ${JSON.stringify(data.intelligence, null, 2)}`);
    }

    return parts.join('\n\n');
  }

  /**
   * Generate follow-up suggestions
   */
  private generateSuggestions(
    intent: QueryIntent,
    data: Record<string, any>
  ): string[] {
    const suggestions: string[] = [];

    if (intent.primaryIntent === 'price' && data.overview) {
      suggestions.push('Show me a technical analysis chart');
      suggestions.push('What are the trading signals?');
      suggestions.push('What is the market sentiment?');
    }

    if (intent.primaryIntent === 'chart' && data.charts) {
      suggestions.push('Should I buy or sell?');
      suggestions.push('What are the key support levels?');
      suggestions.push('Show me recent news');
    }

    if (intent.primaryIntent === 'trade' && data.trading) {
      suggestions.push('Explain the reasoning behind this signal');
      suggestions.push('What are the risks?');
      suggestions.push('Show me the order book');
    }

    if (intent.primaryIntent === 'news' && data.intelligence) {
      suggestions.push('Analyze the market sentiment');
      suggestions.push('Generate a full market report');
      suggestions.push('What are the current prices?');
    }

    return suggestions.slice(0, 3);
  }

  /**
   * Get conversation history
   */
  async getHistory(sessionId: string): Promise<OperationResult<ConversationHistory>> {
    return this.executeOperation(async () => {
      const key = `chat-history:${sessionId}`;
      const data = await this.env.SONIC_CACHE.get(key, 'json');

      if (!data) {
        return {
          sessionId,
          messages: [],
          context: {},
          lastUpdated: Date.now(),
        };
      }

      return data as ConversationHistory;
    }, `history:${sessionId}`);
  }

  /**
   * Save conversation history
   */
  async saveHistory(history: ConversationHistory): Promise<OperationResult<boolean>> {
    return this.executeOperation(async () => {
      const key = `chat-history:${history.sessionId}`;
      await this.env.SONIC_CACHE.put(key, JSON.stringify(history), {
        expirationTtl: 7 * 24 * 60 * 60, // 7 days
      });
      return true;
    }, `save-history:${history.sessionId}`);
  }

  /**
   * Clear conversation history
   */
  async clearHistory(sessionId: string): Promise<OperationResult<boolean>> {
    return this.executeOperation(async () => {
      const key = `chat-history:${sessionId}`;
      await this.env.SONIC_CACHE.delete(key);
      return true;
    }, `clear-history:${sessionId}`);
  }

  /**
   * REST endpoint handlers
   */
  protected async handleRequest(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // POST /chat
    if (path === '/chat' && request.method === 'POST') {
      const body = await request.json() as any;
      const { message, history = [], userId, sessionId } = body;

      if (!message) {
        return Response.json({ error: 'message required' }, { status: 400 });
      }

      // Get conversation history if sessionId provided
      let conversationHistory: Message[] = history;
      if (sessionId) {
        const historyResult = await this.getHistory(sessionId);
        if (historyResult.success && historyResult.data) {
          conversationHistory = historyResult.data.messages;
        }
      }

      // Process chat
      const result = await this.chat(message, conversationHistory, userId);

      // Save updated history
      if (sessionId && result.success) {
        const userMessage: Message = {
          role: 'user',
          content: message,
          timestamp: Date.now(),
        };
        const assistantMessage: Message = {
          role: 'assistant',
          content: result.data!.message,
          timestamp: Date.now(),
        };
        const updatedHistory: ConversationHistory = {
          sessionId,
          messages: [...conversationHistory, userMessage, assistantMessage].slice(
            -20
          ), // Keep last 20 messages
          context: result.data!.data,
          lastUpdated: Date.now(),
        };
        await this.saveHistory(updatedHistory);
      }

      return Response.json(result);
    }

    // GET /history/:sessionId
    if (path.startsWith('/history/') && request.method === 'GET') {
      const sessionId = path.split('/').pop()!;
      const result = await this.getHistory(sessionId);
      return Response.json(result);
    }

    // DELETE /history/:sessionId
    if (path.startsWith('/history/') && request.method === 'DELETE') {
      const sessionId = path.split('/').pop()!;
      const result = await this.clearHistory(sessionId);
      return Response.json(result);
    }

    return new Response('Not Found', { status: 404 });
  }
}
