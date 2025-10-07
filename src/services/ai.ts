// AI service for Cloudflare AI operations

import { Env } from '../config/env';

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIResponse {
  response: string;
  [key: string]: any;
}

export class AIService {
  constructor(private env: Env) {}

  /**
   * Run AI model with messages
   */
  async run(
    model: string,
    messages: AIMessage[],
    options: {
      max_tokens?: number;
      temperature?: number;
      [key: string]: any;
    } = {}
  ): Promise<AIResponse> {
    try {
      const response = await this.env.AI.run(model, {
        messages,
        max_tokens: options.max_tokens || 1024,
        temperature: options.temperature || 0.7,
        ...options,
      });

      return response as AIResponse;
    } catch (error) {
      console.error('AI service error:', error);
      throw new Error(`AI service failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Chat with Hermes model
   */
  async chat(userMessage: string, context?: string): Promise<string> {
    const systemPrompt = `You are a helpful cryptocurrency and DeFi assistant specializing in the Sonic blockchain ecosystem.
You have access to real-time market data and can provide insights on:
- Cryptocurrency prices and trends
- Market sentiment analysis
- DeFi opportunities
- Sonic ecosystem projects
- Trading strategies

Provide concise, accurate, and helpful responses. When discussing prices or data, use the context provided.

${context ? `Context: ${context}` : ''}`;

    const response = await this.run('@cf/thebloke/hermes-2-pro-mistral-7b', [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ], {
      max_tokens: 512,
      temperature: 0.7,
    });

    return response.response || 'I apologize, but I couldn\'t generate a response.';
  }

  /**
   * Analyze sentiment using Llama model
   */
  async analyzeSentiment(priceData: any, sources: string[], timeframe: string): Promise<any> {
    const prompt = `You are a cryptocurrency market analyst specializing in the Sonic blockchain ecosystem.

Analyze the following market data and provide a comprehensive sentiment analysis:

Market Data:
${JSON.stringify(priceData, null, 2)}

Analysis Parameters:
- Sources: ${sources.join(', ')}
- Timeframe: ${timeframe}

Provide your analysis in the following JSON format:
{
  "overall_sentiment": "bullish|bearish|neutral",
  "confidence": 0-100,
  "key_observations": ["observation1", "observation2", ...],
  "risk_factors": ["risk1", "risk2", ...],
  "opportunities": ["opportunity1", "opportunity2", ...],
  "recommendation": "brief recommendation"
}

Focus on actionable insights for DeFi users and traders in the Sonic ecosystem.`;

    const response = await this.run('@cf/meta/llama-3.1-8b-instruct', [
      {
        role: 'system',
        content: 'You are a professional cryptocurrency market analyst. Respond only with valid JSON.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ], {
      max_tokens: 1024,
      temperature: 0.7,
    });

    try {
      const responseText = typeof response.response === 'string'
        ? response.response
        : JSON.stringify(response.response);
      return JSON.parse(responseText);
    } catch (e) {
      return {
        overall_sentiment: 'neutral',
        confidence: 50,
        key_observations: ['AI analysis unavailable, using raw data'],
        risk_factors: ['Unable to parse AI response'],
        raw_response: response,
      };
    }
  }

  /**
   * Generate news summary
   */
  async generateNewsSummary(query: string, tokens: string[], maxResults: number = 5): Promise<any> {
    const enhancedQuery = `${query} ${tokens.join(' ')} cryptocurrency blockchain`;

    const prompt = `You are a cryptocurrency news aggregator. Based on your knowledge, provide a summary of recent news and developments for: ${enhancedQuery}

Provide ${maxResults} key news items in JSON format:
{
  "news_items": [
    {
      "title": "headline",
      "summary": "brief summary",
      "sentiment": "positive|negative|neutral",
      "relevance": 0-100,
      "source": "source name",
      "date": "approximate date"
    }
  ],
  "overall_market_sentiment": "bullish|bearish|neutral",
  "key_trends": ["trend1", "trend2"]
}`;

    const response = await this.run('@cf/meta/llama-3.1-8b-instruct', [
      {
        role: 'system',
        content: 'You are a cryptocurrency news analyst. Provide factual, recent information. Respond only with valid JSON.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ], {
      max_tokens: 2048,
      temperature: 0.5,
    });

    try {
      const responseText = typeof response.response === 'string'
        ? response.response
        : JSON.stringify(response.response);
      return JSON.parse(responseText);
    } catch (e) {
      return {
        news_items: [],
        overall_market_sentiment: 'neutral',
        key_trends: ['Unable to parse news data'],
        raw_response: response,
      };
    }
  }
}
