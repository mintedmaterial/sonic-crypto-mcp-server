// Discord Community Intelligence Service
// Monitors Discord channels for NFT transactions and community tweets
// Extracts actionable intelligence from member-posted content

import { Env } from '../config/env';

export interface DiscordMessage {
  id: string;
  channel_id: string;
  author: {
    id: string;
    username: string;
    discriminator: string;
    bot: boolean;
  };
  content: string;
  timestamp: string;
  embeds?: DiscordEmbed[];
  attachments?: DiscordAttachment[];
}

export interface DiscordEmbed {
  title?: string;
  description?: string;
  url?: string;
  color?: number;
  author?: {
    name?: string;
    url?: string;
    icon_url?: string;
  };
  fields?: Array<{
    name: string;
    value: string;
    inline?: boolean;
  }>;
  image?: {
    url: string;
  };
  thumbnail?: {
    url: string;
  };
  footer?: {
    text: string;
    icon_url?: string;
  };
  timestamp?: string;
}

export interface DiscordAttachment {
  id: string;
  filename: string;
  url: string;
  content_type?: string;
}

// Parsed intelligence types
export interface NFTTransaction {
  source: 'nft_channel';
  type: 'sale' | 'mint' | 'transfer' | 'listing';
  collection_name?: string;
  token_id?: string;
  price?: number;
  currency?: string;
  from_address?: string;
  to_address?: string;
  transaction_hash?: string;
  marketplace?: string;
  timestamp: string;
  raw_message: string;
  image_url?: string;
}

export interface CommunityTweet {
  source: 'tweet_channel';
  author: string;
  content: string;
  twitter_url?: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  tokens_mentioned: string[];
  keywords: string[];
  engagement_indicators: string[];
  timestamp: string;
  has_image: boolean;
}

export type CommunityIntel = NFTTransaction | CommunityTweet;

export interface ChannelIntelligence {
  channel_id: string;
  channel_name: string;
  intel: CommunityIntel[];
  total_messages_analyzed: number;
  time_range: {
    from: string;
    to: string;
  };
  last_fetched: string;
}

export class DiscordCommunityService {
  private baseUrl = 'https://discord.com/api/v10';
  private env: Env;

  constructor(env: Env) {
    this.env = env;
  }

  /**
   * Fetch recent messages from a Discord channel
   */
  async getChannelMessages(
    channelId: string,
    limit: number = 50
  ): Promise<DiscordMessage[]> {
    const cacheKey = `discord:channel:${channelId}:${limit}`;
    
    // Try cache first (2 min TTL for fresher data)
    const cached = await this.env.SONIC_CACHE.get(cacheKey, { type: 'json' });
    if (cached) {
      console.log(`✅ Discord messages from cache: ${channelId}`);
      return cached as DiscordMessage[];
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/channels/${channelId}/messages?limit=${Math.min(limit, 100)}`,
        {
          headers: {
            'Authorization': `Bot ${this.env.DISCORD_BOT_TOKEN}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Discord API error (${response.status}): ${errorText}`);
      }

      const messages = await response.json() as DiscordMessage[];

      // Cache for 2 minutes (fresh data for real-time intel)
      await this.env.SONIC_CACHE.put(cacheKey, JSON.stringify(messages), {
        expirationTtl: 120
      });

      console.log(`✅ Fetched ${messages.length} messages from channel ${channelId}`);
      return messages;

    } catch (error: any) {
      console.error('❌ Discord fetch error:', error.message);
      throw error;
    }
  }

  /**
   * Parse NFT transactions from channel messages
   * Handles bot posts and embedded transaction data
   */
  parseNFTTransactions(messages: DiscordMessage[]): NFTTransaction[] {
    const transactions: NFTTransaction[] = [];

    for (const msg of messages) {
      const tx: Partial<NFTTransaction> = {
        source: 'nft_channel',
        timestamp: msg.timestamp,
        raw_message: msg.content
      };

      // Parse from embeds (common for NFT bots/webhooks)
      if (msg.embeds && msg.embeds.length > 0) {
        const embed = msg.embeds[0];
        
        // Collection name from title or author
        tx.collection_name = embed.title || embed.author?.name;
        
        // Image
        tx.image_url = embed.image?.url || embed.thumbnail?.url;
        
        // Parse fields for transaction details
        if (embed.fields) {
          for (const field of embed.fields) {
            const fieldName = field.name.toLowerCase();
            const fieldValue = field.value;

            if (fieldName.includes('price') || fieldName.includes('amount')) {
              const priceMatch = fieldValue.match(/([\d,.]+)\s*([A-Z]+)?/);
              if (priceMatch) {
                tx.price = parseFloat(priceMatch[1].replace(/,/g, ''));
                tx.currency = priceMatch[2] || 'ETH';
              }
            }

            if (fieldName.includes('from') || fieldName.includes('seller')) {
              tx.from_address = this.extractAddress(fieldValue);
            }

            if (fieldName.includes('to') || fieldName.includes('buyer')) {
              tx.to_address = this.extractAddress(fieldValue);
            }

            if (fieldName.includes('token') && fieldName.includes('id')) {
              tx.token_id = fieldValue.trim();
            }

            if (fieldName.includes('marketplace') || fieldName.includes('platform')) {
              tx.marketplace = fieldValue.trim();
            }
          }
        }

        // Parse description for additional details
        if (embed.description) {
          const desc = embed.description;
          
          // Transaction hash
          const txHashMatch = desc.match(/0x[a-fA-F0-9]{64}/);
          if (txHashMatch) {
            tx.transaction_hash = txHashMatch[0];
          }

          // Price in description
          if (!tx.price) {
            const priceMatch = desc.match(/([\d,.]+)\s*(ETH|WETH|SOL|MATIC|USD|S)/i);
            if (priceMatch) {
              tx.price = parseFloat(priceMatch[1].replace(/,/g, ''));
              tx.currency = priceMatch[2].toUpperCase();
            }
          }
        }

        // Determine transaction type
        tx.type = this.determineNFTType(embed, msg.content);
      } 
      // Parse from plain text messages
      else if (msg.content) {
        const content = msg.content;
        
        // Look for sale patterns
        if (content.match(/sold|sale|bought|purchased/i)) {
          tx.type = 'sale';
          
          const priceMatch = content.match(/([\d,.]+)\s*(ETH|WETH|SOL|MATIC|USD|S)/i);
          if (priceMatch) {
            tx.price = parseFloat(priceMatch[1].replace(/,/g, ''));
            tx.currency = priceMatch[2].toUpperCase();
          }
        }
        
        // Look for mint patterns
        if (content.match(/minted|mint|new mint/i)) {
          tx.type = 'mint';
        }
        
        // Look for listing patterns
        if (content.match(/listed|listing|list for sale/i)) {
          tx.type = 'listing';
        }

        // Extract collection name (usually before "sold" or "#")
        const collectionMatch = content.match(/(\w+)\s+#?\d+\s+(sold|minted)/i);
        if (collectionMatch) {
          tx.collection_name = collectionMatch[1];
        }
      }

      // Only add if we identified a transaction type
      if (tx.type) {
        transactions.push(tx as NFTTransaction);
      }
    }

    return transactions;
  }

  /**
   * Parse community tweets and sentiment from channel messages
   */
  parseCommunityTweets(messages: DiscordMessage[]): CommunityTweet[] {
    const tweets: CommunityTweet[] = [];

    for (const msg of messages) {
      // Skip empty messages
      if (!msg.content && (!msg.embeds || msg.embeds.length === 0)) {
        continue;
      }

      const tweet: CommunityTweet = {
        source: 'tweet_channel',
        author: `${msg.author.username}#${msg.author.discriminator}`,
        content: msg.content,
        timestamp: msg.timestamp,
        tokens_mentioned: this.extractTokenMentions(msg.content),
        keywords: this.extractKeywords(msg.content),
        sentiment: this.analyzeSentiment(msg.content),
        engagement_indicators: this.detectEngagementSignals(msg.content),
        has_image: Boolean((msg.attachments && msg.attachments.length > 0) || 
                   (msg.embeds && msg.embeds.length > 0 && msg.embeds[0]?.image !== undefined))
      };

      // Extract Twitter URL if present
      const twitterUrlMatch = msg.content.match(/https?:\/\/(twitter\.com|x\.com)\/\w+\/status\/\d+/i);
      if (twitterUrlMatch) {
        tweet.twitter_url = twitterUrlMatch[0];
      }

      // Parse embeds for additional context
      if (msg.embeds && msg.embeds.length > 0) {
        const embed = msg.embeds[0];
        if (embed.description) {
          tweet.content = tweet.content + ' ' + embed.description;
          tweet.tokens_mentioned = this.extractTokenMentions(tweet.content);
          tweet.keywords = this.extractKeywords(tweet.content);
          tweet.sentiment = this.analyzeSentiment(tweet.content);
        }
      }

      tweets.push(tweet);
    }

    return tweets;
  }

  /**
   * Get intelligence from NFT channel
   */
  async getNFTChannelIntel(channelId: string, limit: number = 50): Promise<ChannelIntelligence> {
    const messages = await this.getChannelMessages(channelId, limit);
    const nftTransactions = this.parseNFTTransactions(messages);

    const timestamps = messages.map(m => new Date(m.timestamp).getTime());
    
    return {
      channel_id: channelId,
      channel_name: 'NFT Transactions',
      intel: nftTransactions,
      total_messages_analyzed: messages.length,
      time_range: {
        from: new Date(Math.min(...timestamps)).toISOString(),
        to: new Date(Math.max(...timestamps)).toISOString()
      },
      last_fetched: new Date().toISOString()
    };
  }

  /**
   * Get intelligence from Tweet channel
   */
  async getTweetChannelIntel(channelId: string, limit: number = 50): Promise<ChannelIntelligence> {
    const messages = await this.getChannelMessages(channelId, limit);
    const communityTweets = this.parseCommunityTweets(messages);

    const timestamps = messages.map(m => new Date(m.timestamp).getTime());
    
    return {
      channel_id: channelId,
      channel_name: 'Community Tweets',
      intel: communityTweets,
      total_messages_analyzed: messages.length,
      time_range: {
        from: new Date(Math.min(...timestamps)).toISOString(),
        to: new Date(Math.max(...timestamps)).toISOString()
      },
      last_fetched: new Date().toISOString()
    };
  }

  /**
   * Get combined intelligence summary
   */
  async getCombinedIntelligence(config: {
    nft_channel_id?: string;
    tweet_channel_id?: string;
    limit?: number;
  }): Promise<{
    nft_intel?: ChannelIntelligence;
    tweet_intel?: ChannelIntelligence;
    summary: {
      total_nft_transactions: number;
      total_nft_volume?: number;
      total_tweets: number;
      bullish_sentiment: number;
      bearish_sentiment: number;
      neutral_sentiment: number;
      top_tokens_mentioned: string[];
      trending_keywords: string[];
      high_value_nfts: NFTTransaction[];
    };
  }> {
    const { nft_channel_id, tweet_channel_id, limit = 50 } = config;
    
    let nftIntel: ChannelIntelligence | undefined;
    let tweetIntel: ChannelIntelligence | undefined;

    // Fetch both channels in parallel
    const promises: Promise<any>[] = [];
    
    if (nft_channel_id) {
      promises.push(this.getNFTChannelIntel(nft_channel_id, limit));
    }
    
    if (tweet_channel_id) {
      promises.push(this.getTweetChannelIntel(tweet_channel_id, limit));
    }

    const results = await Promise.all(promises);
    
    if (nft_channel_id) nftIntel = results[0];
    if (tweet_channel_id) tweetIntel = nft_channel_id ? results[1] : results[0];

    // Calculate summary statistics
    const summary = this.calculateSummary(nftIntel, tweetIntel);

    return {
      nft_intel: nftIntel,
      tweet_intel: tweetIntel,
      summary
    };
  }

  // ===== Helper Methods =====

  private extractAddress(text: string): string | undefined {
    const match = text.match(/0x[a-fA-F0-9]{40}/);
    return match ? match[0] : undefined;
  }

  private determineNFTType(embed: DiscordEmbed, content: string): 'sale' | 'mint' | 'transfer' | 'listing' | undefined {
    const combined = `${embed.title} ${embed.description} ${content}`.toLowerCase();
    
    if (combined.match(/sold|sale|bought|purchased/)) return 'sale';
    if (combined.match(/minted|mint/)) return 'mint';
    if (combined.match(/listed|listing/)) return 'listing';
    if (combined.match(/transfer|sent/)) return 'transfer';
    
    return undefined;
  }

  private extractTokenMentions(text: string): string[] {
    const matches = text.match(/\$([A-Z]{2,10})\b/g) || [];
    return [...new Set(matches.map(m => m.substring(1)))];
  }

  private extractKeywords(text: string): string[] {
    const keywords = [
      'moon', 'bullish', 'bearish', 'pump', 'dump', 'buy', 'sell',
      'long', 'short', 'breakout', 'support', 'resistance', 'ath', 'dip',
      'fomo', 'hodl', 'whale', 'rug', 'gem', 'alpha'
    ];
    
    const lowerText = text.toLowerCase();
    return keywords.filter(kw => lowerText.includes(kw));
  }

  private analyzeSentiment(text: string): 'bullish' | 'bearish' | 'neutral' {
    const bullishWords = ['bull', 'moon', 'pump', 'long', 'buy', 'up', 'gain', 'profit', 'gem', 'alpha', '🚀', '📈', '💎'];
    const bearishWords = ['bear', 'dump', 'short', 'sell', 'down', 'loss', 'crash', 'rug', 'scam', '📉', '💩'];
    
    const lowerText = text.toLowerCase();
    
    let bullishScore = bullishWords.filter(w => lowerText.includes(w)).length;
    let bearishScore = bearishWords.filter(w => lowerText.includes(w)).length;
    
    if (bullishScore > bearishScore) return 'bullish';
    if (bearishScore > bullishScore) return 'bearish';
    return 'neutral';
  }

  private detectEngagementSignals(text: string): string[] {
    const signals: string[] = [];
    
    if (text.includes('🚀')) signals.push('rocket_emoji');
    if (text.includes('💎')) signals.push('diamond_hands');
    if (text.includes('🔥')) signals.push('fire');
    if (text.match(/!{2,}/)) signals.push('excitement');
    if (text.match(/\b(HUGE|MASSIVE|INCREDIBLE)\b/i)) signals.push('emphasis');
    if (text.match(/\b(NFA|DYOR)\b/i)) signals.push('disclaimer');
    
    return signals;
  }

  private calculateSummary(
    nftIntel?: ChannelIntelligence,
    tweetIntel?: ChannelIntelligence
  ) {
    const summary = {
      total_nft_transactions: 0,
      total_nft_volume: 0,
      total_tweets: 0,
      bullish_sentiment: 0,
      bearish_sentiment: 0,
      neutral_sentiment: 0,
      top_tokens_mentioned: [] as string[],
      trending_keywords: [] as string[],
      high_value_nfts: [] as NFTTransaction[]
    };

    // Process NFT intel
    if (nftIntel) {
      const nftTransactions = nftIntel.intel as NFTTransaction[];
      summary.total_nft_transactions = nftTransactions.length;
      
      for (const tx of nftTransactions) {
        if (tx.price && tx.currency === 'ETH') {
          summary.total_nft_volume += tx.price;
        }
      }

      // High value NFTs (> 1 ETH)
      summary.high_value_nfts = nftTransactions
        .filter(tx => tx.price && tx.price > 1)
        .sort((a, b) => (b.price || 0) - (a.price || 0))
        .slice(0, 5);
    }

    // Process Tweet intel
    if (tweetIntel) {
      const tweets = tweetIntel.intel as CommunityTweet[];
      summary.total_tweets = tweets.length;

      const tokenMap = new Map<string, number>();
      const keywordMap = new Map<string, number>();

      for (const tweet of tweets) {
        // Count sentiment
        if (tweet.sentiment === 'bullish') summary.bullish_sentiment++;
        if (tweet.sentiment === 'bearish') summary.bearish_sentiment++;
        if (tweet.sentiment === 'neutral') summary.neutral_sentiment++;

        // Count tokens
        for (const token of tweet.tokens_mentioned) {
          tokenMap.set(token, (tokenMap.get(token) || 0) + 1);
        }

        // Count keywords
        for (const keyword of tweet.keywords) {
          keywordMap.set(keyword, (keywordMap.get(keyword) || 0) + 1);
        }
      }

      // Top tokens
      summary.top_tokens_mentioned = Array.from(tokenMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([token]) => token);

      // Trending keywords
      summary.trending_keywords = Array.from(keywordMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([kw]) => kw);
    }

    return summary;
  }
}
