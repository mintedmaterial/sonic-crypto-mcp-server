// Agentic AI Service - Autonomous tool calling for intelligent chat
// Enables AI to determine which tools to use based on user intent

import { Env } from '../config/env';
import { ALL_TOOLS, executeTool } from '../tools/index';

export interface UserIntent {
  intent: string;
  entities: string[];
  timeframe?: string;
  comparison?: boolean;
}

export interface ToolCall {
  name: string;
  arguments: Record<string, any>;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AgentResponse {
  message: string;
  tools_used: string[];
  data: Record<string, any>;
  citations: Citation[];
}

export interface Citation {
  source: string;
  data: any;
  timestamp: string;
}

export class AgentService {
  constructor(private env: Env) {}

  /**
   * Main chat endpoint with autonomous tool calling
   */
  async chat(userMessage: string, conversationHistory: ChatMessage[] = []): Promise<AgentResponse> {
    console.log(`🤖 Agent processing: "${userMessage}"`);

    try {
      // Step 1: Analyze user intent
      const intent = await this.analyzeIntent(userMessage);
      console.log(`📊 Intent detected:`, intent);

      // Step 2: Select appropriate tools
      const toolCalls = await this.selectTools(userMessage, intent);
      console.log(`🔧 Tools selected:`, toolCalls.map(t => t.name));

      // Step 3: Execute tools in parallel
      const toolResults = await this.executeTools(toolCalls);
      console.log(`✅ Tool execution complete`);

      // Step 4: Generate response with tool context
      const response = await this.generateResponse(userMessage, toolResults, conversationHistory);

      // Step 5: Extract citations
      const citations = this.extractCitations(toolResults);

      return {
        message: response,
        tools_used: toolCalls.map(t => t.name),
        data: toolResults,
        citations
      };
    } catch (error: any) {
      console.error('❌ Agent error:', error);
      
      // Fallback to simple response without tools
      return {
        message: `I encountered an issue: ${error.message}. Let me try to help you anyway based on general knowledge.`,
        tools_used: [],
        data: {},
        citations: []
      };
    }
  }

  /**
   * Analyze user intent to determine what they're asking for
   */
  private async analyzeIntent(message: string): Promise<UserIntent> {
    const systemPrompt = `Analyze the user's message and determine their intent.

Available intents:
- price_query: User wants current prices or price information
- sentiment_analysis: User wants market sentiment or should buy/sell advice
- news_search: User wants latest news or updates
- trending_query: User wants to know what's trending or popular
- knowledge_query: User wants insights from research reports or predictions
- general_question: General crypto question
- comparison: Compare multiple assets
- historical: Historical data or charts

Extract:
- intent: The primary intent from the list above
- entities: List of crypto symbols mentioned (BTC, ETH, S, SONIC, etc.)
- timeframe: Time period if mentioned (1h, 4h, 1d, 7d, etc.)
- comparison: true if comparing multiple assets

Examples:
User: "What's the price of BTC?"
{intent":"price_query","entities":["BTC"],"timeframe":null}

User: "Should I buy S token now?"
{"intent":"sentiment_analysis","entities":["S"],"timeframe":"1d"}

User: "What's trending today?"
{"intent":"trending_query","entities":[],"timeframe":"1d"}

User: "Compare BTC and ETH sentiment"
{"intent":"sentiment_analysis","entities":["BTC","ETH"],"comparison":true}

Respond ONLY with valid JSON. No other text.`;

    try {
      const response = await this.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        max_tokens: 256,
        temperature: 0.3 // Low temp for consistent parsing
      });

      const responseText = response.response as string;
      
      // Extract JSON from response (handle if AI adds extra text)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      // Fallback
      return {
        intent: 'general_question',
        entities: [],
        timeframe: '1d'
      };
    } catch (error) {
      console.error('Intent analysis error:', error);
      return {
        intent: 'general_question',
        entities: [],
        timeframe: '1d'
      };
    }
  }

  /**
   * Select appropriate tools based on intent and message
   */
  private async selectTools(message: string, intent: UserIntent): Promise<ToolCall[]> {
    // Map intent to likely tools
    const intentToolMap: Record<string, string[]> = {
      'price_query': ['get_latest_index_tick'],
      'sentiment_analysis': ['get_latest_index_tick', 'analyze_sonic_market_sentiment'],
      'news_search': ['search_crypto_news'],
      'trending_query': [], // Will add get_trending_crypto in Phase 1
      'knowledge_query': [], // Will add search_knowledge_base in Phase 2
      'comparison': ['get_latest_index_tick', 'analyze_sonic_market_sentiment'],
      'general_question': []
    };

    const suggestedTools = intentToolMap[intent.intent] || [];
    const toolCalls: ToolCall[] = [];

    // Build tool calls based on intent
    if (suggestedTools.includes('get_latest_index_tick') && intent.entities.length > 0) {
      const instruments = intent.entities.map(e => {
        // Normalize entity to instrument format
        if (e.toUpperCase() === 'BTC') return 'BTC-USD';
        if (e.toUpperCase() === 'ETH') return 'ETH-USD';
        if (e.toUpperCase() === 'S') return 'S-USD';
        if (e.toUpperCase() === 'SONIC') return 'SONIC-USD';
        return `${e.toUpperCase()}-USD`;
      });

      toolCalls.push({
        name: 'get_latest_index_tick',
        arguments: {
          market: 'orderly',
          instruments
        }
      });
    }

    if (suggestedTools.includes('analyze_sonic_market_sentiment') && intent.entities.length > 0) {
      const instruments = intent.entities.map(e => {
        if (e.toUpperCase() === 'BTC') return 'BTC-USD';
        if (e.toUpperCase() === 'ETH') return 'ETH-USD';
        if (e.toUpperCase() === 'S') return 'S-USD';
        if (e.toUpperCase() === 'SONIC') return 'SONIC-USD';
        return `${e.toUpperCase()}-USD`;
      });

      toolCalls.push({
        name: 'analyze_sonic_market_sentiment',
        arguments: {
          sentiment_sources: ['price_action', 'volume_analysis'],
          timeframe: intent.timeframe || '1d',
          instruments
        }
      });
    }

    if (suggestedTools.includes('search_crypto_news')) {
      const query = intent.entities.length > 0
        ? `${intent.entities.join(' ')} cryptocurrency news`
        : 'cryptocurrency market news';

      toolCalls.push({
        name: 'search_crypto_news',
        arguments: {
          query,
          tokens: intent.entities.length > 0 ? intent.entities : ['Bitcoin', 'Ethereum', 'Sonic'],
          max_results: 5
        }
      });
    }

    // If no tools determined, use AI to decide (advanced)
    if (toolCalls.length === 0 && intent.intent !== 'general_question') {
      // For general questions, we don't need tools
      console.log('⚠️ No tools selected for intent:', intent.intent);
    }

    return toolCalls;
  }

  /**
   * Execute selected tools in parallel
   */
  private async executeTools(toolCalls: ToolCall[]): Promise<Record<string, any>> {
    const results: Record<string, any> = {};

    if (toolCalls.length === 0) {
      return results;
    }

    // Execute all tool calls in parallel
    const promises = toolCalls.map(async (call) => {
      try {
        console.log(`⚙️ Executing tool: ${call.name}`);
        const result = await executeTool(call.name, call.arguments, this.env);
        results[call.name] = result;
        console.log(`✅ Tool ${call.name} completed`);
      } catch (error: any) {
        console.error(`❌ Tool ${call.name} failed:`, error);
        results[call.name] = {
          success: false,
          error: error.message
        };
      }
    });

    await Promise.all(promises);

    return results;
  }

  /**
   * Generate final response with tool results as context
   */
  private async generateResponse(
    userMessage: string,
    toolResults: Record<string, any>,
    history: ChatMessage[]
  ): Promise<string> {
    // Build context from tool results
    let toolContext = '';

    if (Object.keys(toolResults).length > 0) {
      toolContext = '\n\nTool Results Available:\n';

      for (const [toolName, result] of Object.entries(toolResults)) {
        if (result.success) {
          toolContext += `\n${toolName}:\n${JSON.stringify(result.data, null, 2)}\n`;
        }
      }
    }

    const systemPrompt = `You are an expert cryptocurrency market analyst and advisor specializing in the Sonic blockchain ecosystem.

Your role:
- Provide accurate, data-driven insights using the tool results provided
- Cite your data sources (mention which tools provided the data)
- Be concise but thorough (2-4 paragraphs max)
- Use specific numbers and data points
- Warn about risks when discussing investment decisions
- Explain technical concepts in simple terms
- Use emojis sparingly for clarity (📊 📈 📉 ⚠️)

Guidelines:
- Always reference specific numbers from the data
- When discussing sentiment, mention the confidence level
- For price data, include source (Orderly, DexScreener, etc.)
- For investment questions, be cautious and mention risks
- If data is unavailable, be honest about limitations
${toolContext}

Be helpful and professional. Answer the user's question directly using the available data.`;

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...history.slice(-4), // Keep last 2 exchanges for context
      { role: 'user' as const, content: userMessage }
    ];

    try {
      const response = await this.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
        messages,
        max_tokens: 1024,
        temperature: 0.7
      });

      return response.response as string;
    } catch (error: any) {
      console.error('Response generation error:', error);
      return 'I apologize, but I encountered an error generating my response. Please try again.';
    }
  }

  /**
   * Extract citations from tool results
   */
  private extractCitations(toolResults: Record<string, any>): Citation[] {
    const citations: Citation[] = [];

    for (const [toolName, result] of Object.entries(toolResults)) {
      if (result.success && result.data) {
        citations.push({
          source: toolName.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
          data: result.data,
          timestamp: result.timestamp || new Date().toISOString()
        });
      }
    }

    return citations;
  }
}
