// Web search tool for crypto news and sentiment

import { Env, MCPTool, ToolExecutionResult } from './types';

export const webSearchToolDefinition: MCPTool = {
  name: "search_crypto_news",
  description: "Search the web for latest cryptocurrency news and updates about specific tokens or the Sonic ecosystem",
  inputSchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Search query (e.g., 'Sonic blockchain news', 'BTC price analysis')"
      },
      tokens: {
        type: "array",
        items: { type: "string" },
        default: ["Sonic", "S-USD"],
        description: "Specific tokens to focus on"
      },
      max_results: {
        type: "number",
        default: 5,
        description: "Maximum number of results to return"
      }
    },
    required: ["query"]
  }
};

export async function executeWebSearch(
  args: any,
  env: Env
): Promise<ToolExecutionResult> {
  const {
    query,
    tokens = ["Sonic", "S-USD"],
    max_results = 5
  } = args;

  try {
    // Build enhanced search query
    const enhancedQuery = `${query} ${tokens.join(' ')} cryptocurrency blockchain`;

    // Use Cloudflare AI to fetch and analyze web content
    const prompt = `You are a cryptocurrency news aggregator. Based on your knowledge, provide a summary of recent news and developments for: ${enhancedQuery}

Provide ${max_results} key news items in JSON format:
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

    const aiResponse = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: [
        {
          role: 'system',
          content: 'You are a cryptocurrency news analyst. Provide factual, recent information. Respond only with valid JSON.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 2048,
      temperature: 0.5
    });

    // Parse response
    let newsData: any;
    try {
      const responseText = typeof aiResponse.response === 'string'
        ? aiResponse.response
        : JSON.stringify(aiResponse.response);
      newsData = JSON.parse(responseText);
    } catch (e) {
      newsData = {
        news_items: [],
        overall_market_sentiment: "neutral",
        key_trends: ["Unable to parse news data"],
        raw_response: aiResponse
      };
    }

    // Log analytics
    if (env.ANALYTICS) {
      env.ANALYTICS.writeDataPoint({
        blobs: ['web_search', query, tokens.join(',')],
        doubles: [newsData.news_items?.length || 0],
        indexes: [newsData.overall_market_sentiment || 'neutral']
      });
    }

    return {
      success: true,
      data: newsData,
      summary: `Found ${newsData.news_items?.length || 0} news items for ${query}`,
      timestamp: new Date().toISOString()
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      summary: `Failed to search news: ${error.message}`,
      timestamp: new Date().toISOString()
    };
  }
}
