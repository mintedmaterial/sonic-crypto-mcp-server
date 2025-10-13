/**
 * Intelligence Agent - Social Intelligence & Market Reports
 *
 * Aggregates data from multiple sources:
 * - Discord NFT feed (channel: 1333603176762576966)
 * - Discord Twitter feed (channel: 1333615004305330348)
 * - Brave Search news
 * - On-chain data
 * - Market sentiment
 *
 * Generates automated reports:
 * - Morning report (8:00 AM UTC)
 * - Midday report (12:00 PM UTC)
 * - Evening report (8:00 PM UTC)
 *
 * Features:
 * - Discord pipeline integration
 * - Social sentiment analysis
 * - News aggregation
 * - Automated report generation
 * - R2 storage for historical reports
 */

import { BaseAgent } from './core/base-agent';
import { Env } from '../config/env';
import { BaseAgentState } from './core/agent-state';
import { OperationResult } from './core/types';
import { AIService } from '../services/ai';

// Discord message from pipeline
interface DiscordMessage {
  id: string;
  channelId: string;
  content: string;
  author: {
    id: string;
    username: string;
    bot: boolean;
  };
  timestamp: string;
  attachments?: string[];
  embeds?: any[];
}

// News article from Brave Search
interface NewsArticle {
  title: string;
  description: string;
  url: string;
  source: string;
  publishedAt: string;
  sentiment?: 'bullish' | 'bearish' | 'neutral';
  relevance?: number;
}

// Social sentiment data
interface SocialSentiment {
  source: 'discord' | 'twitter' | 'news';
  sentiment: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
  topics: string[];
  mentions: {
    symbol: string;
    count: number;
    sentiment: number; // -1 to 1
  }[];
  timestamp: number;
}

// Market report
interface MarketReport {
  reportId: string;
  reportType: 'morning' | 'midday' | 'evening' | 'daily' | 'custom';
  timestamp: number;
  summary: string;
  sections: {
    marketOverview: {
      topMovers: Array<{ symbol: string; change: number; volume: number }>;
      marketSentiment: 'bullish' | 'bearish' | 'neutral';
      totalVolume24h: number;
    };
    socialIntelligence: {
      trendingTopics: string[];
      sentimentScore: number; // -1 to 1
      topMentions: Array<{ symbol: string; mentions: number }>;
    };
    news: {
      topStories: NewsArticle[];
      keyEvents: string[];
    };
    opportunities: {
      type: string;
      description: string;
      confidence: number;
    }[];
    risks: {
      type: string;
      description: string;
      severity: 'low' | 'medium' | 'high';
    }[];
  };
  aiAnalysis: string;
}

export class IntelligenceAgent extends BaseAgent {
  protected agentType: BaseAgentState['agentType'] = 'intelligence';
  private aiService!: AIService;
  private braveApiKey!: string;
  private nftChannelId!: string;
  private tweetChannelId!: string;

  protected async onInitialize(params: any): Promise<void> {
    this.aiService = new AIService(this.env);
    this.braveApiKey = this.env.BRAVE_API_KEY;
    this.nftChannelId = this.env.NFT_DISCORD_CHANNEL_ID;
    this.tweetChannelId = this.env.TWEET_DISCORD_CHANNEL_ID;

    await this.scheduleReportGeneration();
    console.log(`[IntelligenceAgent] Initialized for session ${params.sessionId}`);
  }

  /**
   * Search cryptocurrency news using Brave Search API
   */
  async searchNews(
    query: string,
    limit: number = 10
  ): Promise<OperationResult<NewsArticle[]>> {
    return this.executeOperation(async () => {
      const url = new URL('https://api.search.brave.com/res/v1/web/search');
      url.searchParams.set('q', query);
      url.searchParams.set('count', limit.toString());
      url.searchParams.set('freshness', 'pd'); // Past day

      const response = await fetch(url.toString(), {
        headers: {
          'X-Subscription-Token': this.braveApiKey,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Brave Search API error: ${response.statusText}`);
      }

      const data = await response.json() as any;
      const articles: NewsArticle[] = [];

      if (data.web?.results) {
        for (const result of data.web.results.slice(0, limit)) {
          articles.push({
            title: result.title || '',
            description: result.description || '',
            url: result.url || '',
            source: new URL(result.url).hostname,
            publishedAt: result.age || new Date().toISOString(),
          });
        }
      }

      // Analyze sentiment for each article using AI
      for (const article of articles) {
        const sentiment = await this.analyzeSentiment(
          `${article.title} ${article.description}`
        );
        article.sentiment = sentiment;
      }

      this.broadcast({
        type: 'data_update',
        agentId: this.stateManager.getState().agentId,
        data: { type: 'news_update', articles },
        timestamp: Date.now(),
      });

      return articles;
    }, `news:${query}`);
  }

  /**
   * Analyze sentiment of text using AI
   */
  private async analyzeSentiment(
    text: string
  ): Promise<'bullish' | 'bearish' | 'neutral'> {
    try {
      const prompt = `Analyze the sentiment of this cryptocurrency-related text and respond with ONLY one word: "bullish", "bearish", or "neutral".

Text: ${text}

Sentiment:`;

      const response = await this.aiService.chat(prompt, '');
      const sentiment = response.toLowerCase().trim();

      if (sentiment.includes('bullish')) return 'bullish';
      if (sentiment.includes('bearish')) return 'bearish';
      return 'neutral';
    } catch (error) {
      console.error('[IntelligenceAgent] Sentiment analysis failed', error);
      return 'neutral';
    }
  }

  /**
   * Process Discord messages from pipelines
   */
  async processDiscordFeed(
    channelId: string,
    limit: number = 100
  ): Promise<OperationResult<SocialSentiment>> {
    return this.executeOperation(async () => {
      // Check if Discord pipelines are configured
      const pipeline =
        channelId === this.nftChannelId
          ? this.env.DISCORD_NFT_PIPELINE
          : this.env.DISCORD_TWITTER_PIPELINE;

      if (!pipeline) {
        throw new Error('Discord pipeline not configured');
      }

      // Read messages from pipeline
      // Note: Cloudflare Pipelines API will be used here when available
      // For now, we'll simulate with stored data
      const messages: DiscordMessage[] = await this.getRecentDiscordMessages(
        channelId,
        limit
      );

      // Aggregate sentiment from messages
      const tokenMentions = new Map<string, { count: number; sentiment: number }>();
      const topics: string[] = [];
      let overallSentiment = 0;
      let messageCount = 0;

      for (const message of messages) {
        if (message.author.bot) continue;

        // Extract token mentions (e.g., $BTC, $ETH, $S, $SONIC)
        const mentions = message.content.match(/\$[A-Z]{1,10}/g) || [];
        for (const mention of mentions) {
          const symbol = mention.substring(1);
          const existing = tokenMentions.get(symbol) || { count: 0, sentiment: 0 };

          // Analyze sentiment of this message
          const sentiment = await this.analyzeSentiment(message.content);
          const sentimentScore =
            sentiment === 'bullish' ? 1 : sentiment === 'bearish' ? -1 : 0;

          tokenMentions.set(symbol, {
            count: existing.count + 1,
            sentiment: existing.sentiment + sentimentScore,
          });

          overallSentiment += sentimentScore;
          messageCount++;
        }

        // Extract topics (hashtags)
        const hashtags = message.content.match(/#[a-zA-Z0-9_]+/g) || [];
        topics.push(...hashtags.map((h) => h.substring(1)));
      }

      const avgSentiment = messageCount > 0 ? overallSentiment / messageCount : 0;
      const sentiment: SocialSentiment = {
        source: channelId === this.tweetChannelId ? 'twitter' : 'discord',
        sentiment:
          avgSentiment > 0.2 ? 'bullish' : avgSentiment < -0.2 ? 'bearish' : 'neutral',
        confidence: Math.min(messageCount / 50, 1), // More messages = higher confidence
        topics: [...new Set(topics)].slice(0, 10),
        mentions: Array.from(tokenMentions.entries())
          .map(([symbol, data]) => ({
            symbol,
            count: data.count,
            sentiment: data.sentiment / data.count,
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10),
        timestamp: Date.now(),
      };

      this.broadcast({
        type: 'data_update',
        agentId: this.stateManager.getState().agentId,
        data: { type: 'social_sentiment', sentiment },
        timestamp: Date.now(),
      });

      return sentiment;
    }, `discord:${channelId}`);
  }

  /**
   * Get recent Discord messages (placeholder for pipeline integration)
   */
  private async getRecentDiscordMessages(
    channelId: string,
    limit: number
  ): Promise<DiscordMessage[]> {
    // TODO: Implement actual Discord pipeline reading when Cloudflare Pipelines are created
    // For now, return empty array
    // When pipelines are set up, this will read from the pipeline binding
    return [];
  }

  /**
   * Generate market report
   */
  async generateReport(
    reportType: MarketReport['reportType']
  ): Promise<OperationResult<MarketReport>> {
    return this.executeOperation(async () => {
      console.log(`[IntelligenceAgent] Generating ${reportType} report`);

      // Fetch data from multiple sources in parallel
      const [newsResult, nftSentimentResult, tweetSentimentResult] =
        await Promise.all([
          this.searchNews('cryptocurrency market Sonic S token', 20),
          this.processDiscordFeed(this.nftChannelId, 100),
          this.processDiscordFeed(this.tweetChannelId, 100),
        ]);

      const news = newsResult.data || [];
      const nftSentiment = nftSentimentResult.data;
      const tweetSentiment = tweetSentimentResult.data;

      // Aggregate social intelligence
      const allMentions = [
        ...(nftSentiment?.mentions || []),
        ...(tweetSentiment?.mentions || []),
      ];
      const mentionMap = new Map<string, number>();
      for (const m of allMentions) {
        mentionMap.set(m.symbol, (mentionMap.get(m.symbol) || 0) + m.count);
      }
      const topMentions = Array.from(mentionMap.entries())
        .map(([symbol, mentions]) => ({ symbol, mentions }))
        .sort((a, b) => b.mentions - a.mentions)
        .slice(0, 5);

      const allTopics = [
        ...(nftSentiment?.topics || []),
        ...(tweetSentiment?.topics || []),
      ];
      const trendingTopics = [...new Set(allTopics)].slice(0, 10);

      // Calculate overall sentiment score
      const sentiments = [nftSentiment, tweetSentiment].filter(Boolean);
      const sentimentScore =
        sentiments.reduce((sum, s) => {
          const score = s!.sentiment === 'bullish' ? 1 : s!.sentiment === 'bearish' ? -1 : 0;
          return sum + score * s!.confidence;
        }, 0) / (sentiments.length || 1);

      // Generate AI analysis
      const aiPrompt = `Generate a comprehensive market intelligence report based on the following data:

News Headlines:
${news.map((n) => `- ${n.title} (${n.source})`).join('\n')}

Social Sentiment:
- Overall sentiment score: ${sentimentScore.toFixed(2)} (-1 to 1)
- Trending topics: ${trendingTopics.join(', ')}
- Top mentions: ${topMentions.map((m) => `${m.symbol} (${m.mentions})`).join(', ')}

Provide:
1. Market overview and key insights
2. Potential opportunities
3. Risk factors to watch
4. Actionable recommendations

Keep the analysis concise and focused on cryptocurrency markets, especially the Sonic ecosystem.`;

      const aiAnalysis = await this.aiService.chat(aiPrompt, '');

      // Create report structure
      const report: MarketReport = {
        reportId: `${reportType}-${Date.now()}`,
        reportType,
        timestamp: Date.now(),
        summary: this.generateSummary(news, sentimentScore, trendingTopics),
        sections: {
          marketOverview: {
            topMovers: [], // Would fetch from Overview Agent
            marketSentiment:
              sentimentScore > 0.2
                ? 'bullish'
                : sentimentScore < -0.2
                ? 'bearish'
                : 'neutral',
            totalVolume24h: 0, // Would fetch from Trading Agent
          },
          socialIntelligence: {
            trendingTopics,
            sentimentScore,
            topMentions,
          },
          news: {
            topStories: news.slice(0, 5),
            keyEvents: this.extractKeyEvents(news),
          },
          opportunities: this.identifyOpportunities(news, sentimentScore),
          risks: this.identifyRisks(news, sentimentScore),
        },
        aiAnalysis,
      };

      // Store report in R2
      await this.storeReport(report);

      // Broadcast report
      this.broadcast({
        type: 'data_update',
        agentId: this.stateManager.getState().agentId,
        data: { type: 'report_generated', report },
        timestamp: Date.now(),
      });

      console.log(`[IntelligenceAgent] ${reportType} report generated`, {
        reportId: report.reportId,
        newsCount: news.length,
        topicsCount: trendingTopics.length,
      });

      return report;
    }, `report:${reportType}`);
  }

  /**
   * Store report in R2 bucket
   */
  private async storeReport(report: MarketReport): Promise<void> {
    const key = `reports/${new Date().toISOString().split('T')[0]}/${report.reportId}.json`;
    await this.env.MARKET_REPORTS.put(key, JSON.stringify(report, null, 2), {
      httpMetadata: {
        contentType: 'application/json',
      },
    });
  }

  /**
   * Get recent reports from R2
   */
  async getRecentReports(limit: number = 10): Promise<OperationResult<MarketReport[]>> {
    return this.executeOperation(async () => {
      const list = await this.env.MARKET_REPORTS.list({
        prefix: 'reports/',
        limit,
      });

      const reports: MarketReport[] = [];
      for (const object of list.objects) {
        const data = await this.env.MARKET_REPORTS.get(object.key);
        if (data) {
          const report = JSON.parse(await data.text()) as MarketReport;
          reports.push(report);
        }
      }

      return reports.sort((a, b) => b.timestamp - a.timestamp);
    }, 'recent-reports');
  }

  /**
   * Generate summary text
   */
  private generateSummary(
    news: NewsArticle[],
    sentimentScore: number,
    topics: string[]
  ): string {
    const sentiment =
      sentimentScore > 0.2 ? 'bullish' : sentimentScore < -0.2 ? 'bearish' : 'neutral';
    return `Market sentiment is ${sentiment} (${sentimentScore.toFixed(2)}). ${
      news.length
    } news articles analyzed. Trending topics: ${topics.slice(0, 3).join(', ')}.`;
  }

  /**
   * Extract key events from news
   */
  private extractKeyEvents(news: NewsArticle[]): string[] {
    return news
      .filter((n) => n.sentiment !== 'neutral')
      .slice(0, 5)
      .map((n) => n.title);
  }

  /**
   * Identify opportunities
   */
  private identifyOpportunities(
    news: NewsArticle[],
    sentimentScore: number
  ): MarketReport['sections']['opportunities'] {
    const opportunities: MarketReport['sections']['opportunities'] = [];

    if (sentimentScore > 0.5) {
      opportunities.push({
        type: 'Strong bullish sentiment',
        description: 'High positive sentiment detected across social channels and news',
        confidence: Math.min(sentimentScore, 1),
      });
    }

    const bullishNews = news.filter((n) => n.sentiment === 'bullish');
    if (bullishNews.length > 5) {
      opportunities.push({
        type: 'Positive news momentum',
        description: `${bullishNews.length} bullish news articles in the past 24 hours`,
        confidence: Math.min(bullishNews.length / 10, 1),
      });
    }

    return opportunities;
  }

  /**
   * Identify risks
   */
  private identifyRisks(
    news: NewsArticle[],
    sentimentScore: number
  ): MarketReport['sections']['risks'] {
    const risks: MarketReport['sections']['risks'] = [];

    if (sentimentScore < -0.5) {
      risks.push({
        type: 'Negative market sentiment',
        description: 'Strong bearish sentiment detected across channels',
        severity: 'high',
      });
    }

    const bearishNews = news.filter((n) => n.sentiment === 'bearish');
    if (bearishNews.length > 5) {
      risks.push({
        type: 'Negative news flow',
        description: `${bearishNews.length} bearish news articles detected`,
        severity: bearishNews.length > 10 ? 'high' : 'medium',
      });
    }

    return risks;
  }

  /**
   * Schedule report generation (called by cron triggers)
   */
  private async scheduleReportGeneration(): Promise<void> {
    // Cron triggers will call handleCron, which determines report type based on time
    console.log('[IntelligenceAgent] Report generation scheduled via cron triggers');
  }

  /**
   * Handle cron trigger events
   */
  async handleCron(scheduledTime: Date): Promise<void> {
    const hour = scheduledTime.getUTCHours();
    let reportType: MarketReport['reportType'] = 'custom';

    if (hour === 8) reportType = 'morning';
    else if (hour === 12) reportType = 'midday';
    else if (hour === 20) reportType = 'evening';
    else if (hour === 0) reportType = 'daily';

    if (reportType !== 'custom') {
      console.log(`[IntelligenceAgent] Generating ${reportType} report via cron`);
      await this.generateReport(reportType);
    }
  }

  /**
   * REST endpoint handlers
   */
  protected async handleRequest(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // GET /news?query=...&limit=10
    if (path === '/news' && request.method === 'GET') {
      const query = url.searchParams.get('query') || 'cryptocurrency';
      const limit = parseInt(url.searchParams.get('limit') || '10');
      const result = await this.searchNews(query, limit);
      return Response.json(result);
    }

    // GET /sentiment/discord/:channelId?limit=100
    if (path.startsWith('/sentiment/discord/') && request.method === 'GET') {
      const channelId = path.split('/').pop()!;
      const limit = parseInt(url.searchParams.get('limit') || '100');
      const result = await this.processDiscordFeed(channelId, limit);
      return Response.json(result);
    }

    // POST /report/generate
    if (path === '/report/generate' && request.method === 'POST') {
      const body = await request.json() as any;
      const reportType = body.reportType || 'custom';
      const result = await this.generateReport(reportType);
      return Response.json(result);
    }

    // GET /reports/recent?limit=10
    if (path === '/reports/recent' && request.method === 'GET') {
      const limit = parseInt(url.searchParams.get('limit') || '10');
      const result = await this.getRecentReports(limit);
      return Response.json(result);
    }

    return new Response('Not Found', { status: 404 });
  }
}
