// Web search tool using Brave Search API for real crypto news
// Only returns 2025+ articles

import { MCPTool, ToolExecutionResult } from './types';
import { Env } from '../config/env';
import { BraveSearchService } from '../services/brave-search';

export const webSearchToolDefinition: MCPTool = {
  name: "search_crypto_news",
  description: "Search the web for latest cryptocurrency news and updates using Brave Search. Returns only recent articles from 2025+. Covers Sonic ecosystem, Bitcoin, DeFi, and market analysis.",
  inputSchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Search query (e.g., 'Sonic blockchain news', 'Bitcoin price analysis', 'DeFi yield farming')"
      },
      tokens: {
        type: "array",
        items: { type: "string" },
        default: ["Sonic", "Bitcoin", "Ethereum"],
        description: "Specific tokens to focus on for news"
      },
      max_results: {
        type: "number",
        default: 15,
        description: "Maximum number of news articles to return"
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
    tokens = ["Sonic", "Bitcoin", "Ethereum"],
    max_results = 15
  } = args;

  try {
    const braveSearch = new BraveSearchService(env);

    // Search for crypto news (automatically filters to 2025+)
    const newsItems = await braveSearch.searchCryptoNews(tokens, max_results);

    // If specific query provided, also search that
    if (query && !query.toLowerCase().includes('news')) {
      const queryResults = await braveSearch.search(`${query} news`, 5, 'year');

      queryResults.forEach(result => {
        // Only include 2025+ articles
        const dateMatch = result.page_age?.match(/(\d{4})/);
        const year = dateMatch ? parseInt(dateMatch[1]) : new Date().getFullYear();

        if (year >= 2025) {
          newsItems.push({
            title: result.title,
            url: result.url,
            description: result.description,
            source: new URL(result.url).hostname.replace('www.', ''),
            date: result.page_age || result.age || 'Recent',
            favicon: result.favicon,
            age: result.age,
          });
        }
      });
    }

    // Remove duplicates
    const uniqueNews = Array.from(
      new Map(newsItems.map(item => [item.url, item])).values()
    ).slice(0, max_results);

    // Calculate overall sentiment (simple heuristic)
    const sentimentKeywords = {
      positive: ['surge', 'rally', 'growth', 'adoption', 'partnership', 'launch', 'breakthrough'],
      negative: ['crash', 'decline', 'hack', 'scam', 'regulation', 'ban', 'fraud'],
    };

    const sentimentScores = uniqueNews.map(item => {
      const text = `${item.title} ${item.description}`.toLowerCase();
      const positiveCount = sentimentKeywords.positive.filter(word => text.includes(word)).length;
      const negativeCount = sentimentKeywords.negative.filter(word => text.includes(word)).length;

      if (positiveCount > negativeCount) return 'positive';
      if (negativeCount > positiveCount) return 'negative';
      return 'neutral';
    });

    const overall = sentimentScores.reduce((acc, s) => {
      acc[s] = (acc[s] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const overallSentiment =
      (overall.positive || 0) > (overall.negative || 0) ? 'bullish' :
      (overall.negative || 0) > (overall.positive || 0) ? 'bearish' : 'neutral';

    // Add sentiment to each news item
    const newsWithSentiment = uniqueNews.map((item, index) => ({
      ...item,
      sentiment: sentimentScores[index],
      relevance: 100 - (index * 2), // Decay relevance by position
    }));

    const result = {
      news_items: newsWithSentiment,
      overall_market_sentiment: overallSentiment,
      key_trends: extractKeyTrends(newsWithSentiment),
      total_results: newsWithSentiment.length,
      sources: [...new Set(newsWithSentiment.map(n => n.source))],
      date_range: {
        from: '2025-01-01',
        to: new Date().toISOString().split('T')[0],
      },
    };

    // Log analytics
    if (env.ANALYTICS) {
      env.ANALYTICS.writeDataPoint({
        blobs: ['brave_search', query, tokens.join(',')],
        doubles: [newsWithSentiment.length],
        indexes: [overallSentiment]
      });
    }

    return {
      success: true,
      data: result,
      summary: `Found ${newsWithSentiment.length} recent news articles from ${result.sources.length} sources. Market sentiment: ${overallSentiment}`,
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

/**
 * Extract key trends from news articles
 */
function extractKeyTrends(newsItems: any[]): string[] {
  const trendKeywords = [
    'DeFi', 'NFT', 'staking', 'yield farming', 'layer 2', 'L2',
    'stablecoin', 'DEX', 'liquidity', 'governance', 'DAO',
    'adoption', 'regulation', 'institutional', 'ETF',
    'Sonic', 'S-USD', 'cross-border', 'payments'
  ];

  const mentions: Record<string, number> = {};

  newsItems.forEach(item => {
    const text = `${item.title} ${item.description}`.toLowerCase();
    trendKeywords.forEach(keyword => {
      if (text.includes(keyword.toLowerCase())) {
        mentions[keyword] = (mentions[keyword] || 0) + 1;
      }
    });
  });

  // Return top 5 trending topics
  return Object.entries(mentions)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([keyword]) => keyword);
}
