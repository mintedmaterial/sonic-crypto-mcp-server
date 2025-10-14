// Sentiment analysis tool - analyze_sonic_market_sentiment

import { Env, MCPTool, ToolExecutionResult } from './types';
import { DexScreenerService } from '../services/dexscreener';

export const sentimentToolDefinition: MCPTool = {
  name: "analyze_sonic_market_sentiment",
  description: "Analyze market sentiment for Sonic ecosystem using AI-powered analysis of trending tokens, price action, and volume data from DexScreener",
  inputSchema: {
    type: "object",
    properties: {
      sentiment_sources: {
        type: "array",
        items: {
          type: "string",
          enum: ["price_action", "volume_analysis", "defi_metrics", "news"]
        },
        default: ["price_action", "volume_analysis"],
        description: "Sources to analyze for sentiment"
      },
      timeframe: {
        type: "string",
        enum: ["1h", "4h", "1d", "7d"],
        default: "1d",
        description: "Timeframe for analysis"
      },
      limit: {
        type: "number",
        default: 10,
        description: "Number of trending tokens to analyze"
      }
    }
  }
};

export async function executeAnalyzeSentiment(
  args: any,
  env: Env
): Promise<ToolExecutionResult> {
  const {
    sentiment_sources = ['price_action', 'volume_analysis'],
    timeframe = '1d',
    limit = 10
  } = args;

  try {
    // Get trending Sonic tokens from DexScreener
    const dex = new DexScreenerService(env);
    const trendingData = await dex.getTrendingSonicTokens(limit);

    // Calculate market statistics
    const totalGainers = trendingData.gainers.length;
    const totalLosers = trendingData.losers.length;
    const avgGainerChange = totalGainers > 0
      ? trendingData.gainers.reduce((sum, t) => sum + t.percent_change_24h, 0) / totalGainers
      : 0;
    const avgLoserChange = totalLosers > 0
      ? trendingData.losers.reduce((sum, t) => sum + t.percent_change_24h, 0) / totalLosers
      : 0;
    const topGainer = trendingData.gainers[0];
    const topLoser = trendingData.losers[0];

    // Build AI prompt for sentiment analysis
    const prompt = `You are a cryptocurrency market analyst specializing in the Sonic blockchain ecosystem.

Analyze the following trending Sonic tokens data and provide a comprehensive sentiment analysis:

Top Gainers (24h):
${trendingData.gainers.slice(0, 5).map(t =>
  `- ${t.symbol}: +${t.percent_change_24h.toFixed(2)}% | Volume: $${t.volume_24h.toLocaleString()} | Liquidity: $${t.liquidity.toLocaleString()}`
).join('\n')}

Top Losers (24h):
${trendingData.losers.slice(0, 5).map(t =>
  `- ${t.symbol}: ${t.percent_change_24h.toFixed(2)}% | Volume: $${t.volume_24h.toLocaleString()} | Liquidity: $${t.liquidity.toLocaleString()}`
).join('\n')}

Market Statistics:
- Total Gainers: ${totalGainers}
- Total Losers: ${totalLosers}
- Average Gainer Change: +${avgGainerChange.toFixed(2)}%
- Average Loser Change: ${avgLoserChange.toFixed(2)}%
- Gainers/Losers Ratio: ${(totalGainers / Math.max(totalLosers, 1)).toFixed(2)}
${topGainer ? `- Top Gainer: ${topGainer.symbol} (+${topGainer.percent_change_24h.toFixed(2)}%)` : ''}
${topLoser ? `- Top Loser: ${topLoser.symbol} (${topLoser.percent_change_24h.toFixed(2)}%)` : ''}

Analysis Parameters:
- Sources: ${sentiment_sources.join(', ')}
- Timeframe: ${timeframe}
- Data Source: DexScreener (Sonic Blockchain)

Provide a brief 2-3 sentence analysis of the Sonic market sentiment based on this data. Be concise and actionable.`;

    // Use Cloudflare AI for sentiment analysis
    const aiResponse = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: [
        {
          role: 'system',
          content: 'You are a professional cryptocurrency market analyst specializing in the Sonic blockchain. Provide concise, actionable insights.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 512,
      temperature: 0.7
    });

    // Extract AI analysis text
    const aiAnalysis = typeof aiResponse.response === 'string'
      ? aiResponse.response
      : JSON.stringify(aiResponse.response);

    // Determine overall sentiment from the data
    const sentimentScore = avgGainerChange + avgLoserChange;
    const overallSentiment = sentimentScore > 5 ? 'bullish' : sentimentScore < -5 ? 'bearish' : 'neutral';

    // Log analytics
    if (env.ANALYTICS) {
      env.ANALYTICS.writeDataPoint({
        blobs: ['sentiment_analysis', timeframe, 'sonic'],
        doubles: [sentimentScore],
        indexes: [overallSentiment]
      });
    }

    return {
      success: true,
      data: {
        ai_analysis: aiAnalysis,
        market_stats: {
          total_gainers: totalGainers,
          total_losers: totalLosers,
          avg_gainer_change: avgGainerChange,
          avg_loser_change: avgLoserChange,
          sentiment_score: sentimentScore,
          overall_sentiment: overallSentiment,
          top_gainer: topGainer ? {
            symbol: topGainer.symbol,
            change: topGainer.percent_change_24h
          } : null,
          top_loser: topLoser ? {
            symbol: topLoser.symbol,
            change: topLoser.percent_change_24h
          } : null
        },
        trending_data: trendingData,
        analysis_params: {
          sources: sentiment_sources,
          timeframe,
          data_source: 'DexScreener (Sonic Blockchain)'
        }
      },
      summary: `Sonic market sentiment: ${overallSentiment} | ${totalGainers} gainers (avg +${avgGainerChange.toFixed(1)}%) vs ${totalLosers} losers (avg ${avgLoserChange.toFixed(1)}%)`,
      timestamp: new Date().toISOString()
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      summary: `Failed to analyze sentiment: ${error.message}`,
      timestamp: new Date().toISOString()
    };
  }
}
