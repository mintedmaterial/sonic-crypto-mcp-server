// Discord Community Intelligence Tool
// Monitors Discord channels for community activity and intelligence

import { MCPTool, ToolExecutionResult } from './types';
import { Env } from '../config/env';
import { DiscordCommunityService } from '../services/discord';

export const discordIntelToolDefinition: MCPTool = {
  name: "get_discord_community_intel",
  description: "Monitor Discord channels for community intelligence including NFT transactions and community tweets/sentiment",
  inputSchema: {
    type: "object",
    properties: {
      nft_channel_id: {
        type: "string",
        description: "Discord channel ID for NFT transaction notifications"
      },
      tweet_channel_id: {
        type: "string",
        description: "Discord channel ID for community tweets and posts"
      },
      limit: {
        type: "number",
        default: 50,
        description: "Number of messages to analyze per channel (max 100)"
      },
      intel_type: {
        type: "string",
        enum: ["all", "nft", "tweets", "summary"],
        default: "all",
        description: "Type of intelligence to fetch"
      }
    }
  }
};

export async function executeGetDiscordIntel(
  args: any,
  env: Env
): Promise<ToolExecutionResult> {
  const {
    nft_channel_id,
    tweet_channel_id,
    limit = 50,
    intel_type = "all"
  } = args;

  try {
    // Validate Discord bot token
    if (!env.DISCORD_BOT_TOKEN) {
      return {
        success: false,
        error: 'Discord bot token not configured',
        summary: 'Set DISCORD_BOT_TOKEN secret: wrangler secret put DISCORD_BOT_TOKEN',
        timestamp: new Date().toISOString()
      };
    }

    // Validate at least one channel provided
    if (!nft_channel_id && !tweet_channel_id) {
      return {
        success: false,
        error: 'No channels specified',
        summary: 'Provide nft_channel_id and/or tweet_channel_id',
        timestamp: new Date().toISOString()
      };
    }

    const discord = new DiscordCommunityService(env);

    // Handle different intel types
    if (intel_type === "nft" && nft_channel_id) {
      const nftIntel = await discord.getNFTChannelIntel(nft_channel_id, limit);
      
      return {
        success: true,
        data: nftIntel,
        summary: `Analyzed ${nftIntel.total_messages_analyzed} messages, found ${nftIntel.intel.length} NFT transactions`,
        timestamp: new Date().toISOString()
      };
    }

    if (intel_type === "tweets" && tweet_channel_id) {
      const tweetIntel = await discord.getTweetChannelIntel(tweet_channel_id, limit);
      
      const tweets = tweetIntel.intel as any[];
      const bullish = tweets.filter(t => t.sentiment === 'bullish').length;
      const bearish = tweets.filter(t => t.sentiment === 'bearish').length;
      
      return {
        success: true,
        data: tweetIntel,
        summary: `Analyzed ${tweetIntel.total_messages_analyzed} tweets: ${bullish} bullish, ${bearish} bearish`,
        timestamp: new Date().toISOString()
      };
    }

    // Get combined intelligence (default)
    const combined = await discord.getCombinedIntelligence({
      nft_channel_id,
      tweet_channel_id,
      limit
    });

    // Log to analytics
    if (env.ANALYTICS) {
      env.ANALYTICS.writeDataPoint({
        blobs: ['discord_intel'],
        doubles: [
          combined.summary.total_nft_transactions,
          combined.summary.total_tweets,
          combined.summary.bullish_sentiment
        ],
        indexes: ['discord']
      });
    }

    // Return summary if requested
    if (intel_type === "summary") {
      return {
        success: true,
        data: combined.summary,
        summary: `NFT: ${combined.summary.total_nft_transactions} txs, Volume: ${combined.summary.total_nft_volume?.toFixed(2)} ETH | Tweets: ${combined.summary.total_tweets} (${combined.summary.bullish_sentiment} bullish, ${combined.summary.bearish_sentiment} bearish)`,
        timestamp: new Date().toISOString()
      };
    }

    // Return full data
    return {
      success: true,
      data: combined,
      summary: `Discord Intel: ${combined.summary.total_nft_transactions} NFT transactions, ${combined.summary.total_tweets} community tweets`,
      timestamp: new Date().toISOString()
    };

  } catch (error: any) {
    console.error('Discord intel tool error:', error);
    
    return {
      success: false,
      error: error.message,
      summary: `Failed to fetch Discord intelligence: ${error.message}`,
      timestamp: new Date().toISOString()
    };
  }
}
