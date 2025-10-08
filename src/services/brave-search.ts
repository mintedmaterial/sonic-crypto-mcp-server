// Brave Search API Integration Service
// Real-time web search for cryptocurrency news and information

import { Env, API_ENDPOINTS } from '../config/env';

export interface BraveSearchResult {
  type: string;
  title: string;
  url: string;
  description: string;
  age?: string;
  page_age?: string;
  favicon?: string;
  language?: string;
  family_friendly?: boolean;
}

export interface BraveNewsItem {
  title: string;
  url: string;
  description: string;
  source: string;
  date: string;
  favicon?: string;
  age?: string;
}

export interface BraveSearchResponse {
  news_items: BraveNewsItem[];
  total_results: number;
  query: string;
}

export class BraveSearchService {
  private apiUrl: string;

  constructor(private env: Env) {
    this.apiUrl = API_ENDPOINTS.BRAVE_SEARCH;
  }

  /**
   * Search the web using Brave Search API
   */
  async search(query: string, count: number = 15, freshness?: string): Promise<BraveSearchResult[]> {
    try {
      const params = new URLSearchParams({
        q: query,
        count: count.toString(),
      });

      if (freshness) {
        params.append('freshness', freshness);
      }

      const response = await fetch(`${this.apiUrl}?${params}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip',
          'X-Subscription-Token': this.env.BRAVE_API_KEY,
        },
      });

      if (!response.ok) {
        throw new Error(`Brave Search API error: ${response.status}`);
      }

      const data = await response.json() as any;
      return data.web?.results || [];
    } catch (error) {
      console.error('Brave Search error:', error);
      return [];
    }
  }

  /**
   * Search for cryptocurrency news (2025+ only)
   */
  async searchCryptoNews(
    tokens: string[] = ['Sonic', 'Bitcoin', 'Ethereum'],
    maxResults: number = 15
  ): Promise<BraveNewsItem[]> {
    const queries = [
      'Sonic Labs crypto news',
      'Bitcoin price news',
      'DeFi yield farming news',
      'S-USD stablecoin updates',
      ...tokens.map(t => `${t} cryptocurrency news`),
    ];

    const allResults: BraveNewsItem[] = [];

    for (const query of queries) {
      try {
        const results = await this.search(query, 10, 'year'); // 'year' = last 12 months

        results.forEach(result => {
          // Parse date from age or page_age
          const dateMatch = result.page_age?.match(/(\d{4})/);
          const year = dateMatch ? parseInt(dateMatch[1]) : new Date().getFullYear();

          // Only include 2025+ articles
          if (year >= 2025) {
            allResults.push({
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

        // Respect rate limits
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`Brave Search error for query "${query}":`, error);
      }

      if (allResults.length >= maxResults) {
        break;
      }
    }

    // Remove duplicates based on URL
    const uniqueResults = Array.from(
      new Map(allResults.map(item => [item.url, item])).values()
    );

    // Sort by recency (newer first)
    return uniqueResults.slice(0, maxResults);
  }

  /**
   * Search for specific token news
   */
  async searchTokenNews(tokenSymbol: string, maxResults: number = 5): Promise<BraveNewsItem[]> {
    const query = `${tokenSymbol} cryptocurrency news latest`;

    try {
      const results = await this.search(query, maxResults, 'day'); // Last 24 hours

      return results
        .map(result => ({
          title: result.title,
          url: result.url,
          description: result.description,
          source: new URL(result.url).hostname.replace('www.', ''),
          date: result.page_age || result.age || 'Recent',
          favicon: result.favicon,
          age: result.age,
        }))
        .filter(item => {
          // Filter out articles older than 2025
          const dateMatch = item.date.match(/(\d{4})/);
          const year = dateMatch ? parseInt(dateMatch[1]) : new Date().getFullYear();
          return year >= 2025;
        });
    } catch (error) {
      console.error(`Brave Search error for token ${tokenSymbol}:`, error);
      return [];
    }
  }

  /**
   * Search for DeFi opportunities and yield farming news
   */
  async searchDeFiNews(maxResults: number = 10): Promise<BraveNewsItem[]> {
    const queries = [
      'DeFi yield farming 2025',
      'Sonic blockchain DeFi',
      'stablecoin yield opportunities',
      'liquidity mining rewards',
    ];

    const allResults: BraveNewsItem[] = [];

    for (const query of queries) {
      try {
        const results = await this.search(query, 5, 'month'); // Last month

        results.forEach(result => {
          const dateMatch = result.page_age?.match(/(\d{4})/);
          const year = dateMatch ? parseInt(dateMatch[1]) : new Date().getFullYear();

          if (year >= 2025) {
            allResults.push({
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

        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Brave Search DeFi error for "${query}":`, error);
      }

      if (allResults.length >= maxResults) {
        break;
      }
    }

    const uniqueResults = Array.from(
      new Map(allResults.map(item => [item.url, item])).values()
    );

    return uniqueResults.slice(0, maxResults);
  }

  /**
   * Format search results for MCP tool response
   */
  formatForMCP(newsItems: BraveNewsItem[]): BraveSearchResponse {
    return {
      news_items: newsItems,
      total_results: newsItems.length,
      query: 'crypto news',
    };
  }
}
