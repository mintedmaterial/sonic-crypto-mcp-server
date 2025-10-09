# 🤖 Discord Community Intelligence Integration

## Overview

Monitor your Discord server channels to extract crypto intelligence from:
- **NFT Transaction Channel** - Track sales, mints, transfers with prices and metadata
- **Community Tweet Channel** - Analyze member posts for sentiment and trending tokens

## 🚀 Quick Start

### 1. Create Discord Bot (5 minutes)

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click **"New Application"** → Name it "Sonic Intel Bot"
3. Go to **"Bot"** section → Click **"Add Bot"**
4. **Copy the Bot Token** (save for step 3)
5. Enable **"MESSAGE CONTENT INTENT"** under Privileged Gateway Intents
6. Save Changes

### 2. Invite Bot to Your Server

1. Go to **"OAuth2"** → **"URL Generator"**
2. Select Scopes:
   - ✅ `bot`
3. Select Bot Permissions:
   - ✅ View Channels
   - ✅ Read Messages/View History
4. Copy generated URL and open in browser
5. Select your server and authorize

### 3. Get Channel IDs

1. Enable Developer Mode in Discord:
   - **Settings** → **Advanced** → **Developer Mode** ✅
2. Right-click your channels → **"Copy Channel ID"**

**Example**:
```
NFT Channel: 1234567890123456789
Tweet Channel: 9876543210987654321
```

### 4. Configure Cloudflare Secret

```bash
# Set Discord bot token
wrangler secret put DISCORD_BOT_TOKEN
# Paste your bot token when prompted
```

## 📡 API Usage

### Get Combined Intelligence

```bash
POST https://ss.srvcflo.com/api/discord/intel
Content-Type: application/json

{
  "nft_channel_id": "1234567890123456789",
  "tweet_channel_id": "9876543210987654321",
  "limit": 50,
  "intel_type": "all"
}
```

### Response Format

```json
{
  "success": true,
  "data": {
    "nft_intel": {
      "channel_id": "1234567890123456789",
      "channel_name": "NFT Transactions",
      "intel": [
        {
          "source": "nft_channel",
          "type": "sale",
          "collection_name": "Bored Ape Yacht Club",
          "token_id": "#1234",
          "price": 45.5,
          "currency": "ETH",
          "from_address": "0x123...",
          "to_address": "0x456...",
          "marketplace": "OpenSea",
          "transaction_hash": "0xabc...",
          "timestamp": "2024-01-15T10:30:00Z",
          "image_url": "https://..."
        }
      ],
      "total_messages_analyzed": 50
    },
    "tweet_intel": {
      "channel_id": "9876543210987654321",
      "channel_name": "Community Tweets",
      "intel": [
        {
          "source": "tweet_channel",
          "author": "CryptoTrader#1234",
          "content": "$BTC breaking resistance! 🚀 Time to long",
          "twitter_url": "https://twitter.com/...",
          "sentiment": "bullish",
          "tokens_mentioned": ["BTC"],
          "keywords": ["breakout", "long"],
          "engagement_indicators": ["rocket_emoji", "excitement"],
          "timestamp": "2024-01-15T10:25:00Z",
          "has_image": true
        }
      ],
      "total_messages_analyzed": 50
    },
    "summary": {
      "total_nft_transactions": 12,
      "total_nft_volume": 245.8,
      "total_tweets": 38,
      "bullish_sentiment": 25,
      "bearish_sentiment": 8,
      "neutral_sentiment": 5,
      "top_tokens_mentioned": ["BTC", "ETH", "SONIC", "S"],
      "trending_keywords": ["moon", "bullish", "breakout"],
      "high_value_nfts": [...]
    }
  },
  "summary": "Discord Intel: 12 NFT transactions, 38 community tweets"
}
```

### Get NFT Intel Only

```bash
POST /api/discord/intel
{
  "nft_channel_id": "1234567890123456789",
  "intel_type": "nft",
  "limit": 100
}
```

### Get Tweet Intel Only

```bash
POST /api/discord/intel
{
  "tweet_channel_id": "9876543210987654321",
  "intel_type": "tweets",
  "limit": 100
}
```

### Get Summary Only

```bash
POST /api/discord/intel
{
  "nft_channel_id": "1234567890123456789",
  "tweet_channel_id": "9876543210987654321",
  "intel_type": "summary"
}
```

## 🧰 MCP Tool Usage

```json
{
  "name": "get_discord_community_intel",
  "arguments": {
    "nft_channel_id": "1234567890123456789",
    "tweet_channel_id": "9876543210987654321",
    "limit": 50,
    "intel_type": "all"
  }
}
```

## 📊 What Gets Parsed

### NFT Channel Intelligence

**Detects**:
- ✅ Sale transactions with prices
- ✅ Mint events
- ✅ Listings
- ✅ Transfers
- ✅ Collection names
- ✅ Token IDs
- ✅ Wallet addresses (from/to)
- ✅ Transaction hashes
- ✅ Marketplace names
- ✅ NFT images

**Supports**:
- Bot embeds (OpenSea, Blur, etc.)
- Webhook notifications
- Custom NFT alert formats
- Plain text messages

### Tweet Channel Intelligence

**Extracts**:
- ✅ Token mentions ($BTC, $ETH, etc.)
- ✅ Sentiment (bullish/bearish/neutral)
- ✅ Keywords (moon, pump, dump, etc.)
- ✅ Engagement signals (🚀, 💎, emphasis)
- ✅ Twitter URLs
- ✅ Author information
- ✅ Images/attachments

**Sentiment Keywords**:
- **Bullish**: moon, pump, long, buy, gain, profit, gem, alpha, 🚀, 📈, 💎
- **Bearish**: dump, short, sell, crash, loss, rug, scam, 📉
- **Neutral**: Everything else

## 🎨 Dashboard Integration

The Discord intel automatically appears in your Enhanced Dashboard:

**Intelligence Tab** shows:
- Recent NFT transactions with prices
- High-value NFT sales (> 1 ETH)
- Community sentiment breakdown
- Top mentioned tokens
- Trending keywords
- Social activity heatmap

## ⚡ Performance

### Caching
- **2-minute cache** for message fetches
- Reduces Discord API calls
- Fresh data for real-time monitoring

### Rate Limits
- Discord API: 50 requests/second
- Message limit: 100 per request
- Recommended: Poll every 2-5 minutes

## 🔒 Security

### Minimal Permissions
Bot only needs:
- ✅ View Channels
- ✅ Read Message History
- ❌ NO admin/moderation permissions

### Token Security
- Stored as Cloudflare encrypted secret
- Never logged or exposed
- Cannot be accessed via API

## 💡 Use Cases

### 1. NFT Market Tracking
```
Monitor high-value sales → Identify trending collections → 
Track whale activity → Spot emerging opportunities
```

### 2. Community Sentiment Analysis
```
Aggregate member posts → Analyze sentiment shifts → 
Identify trending tokens → Detect FOMO/FUD signals
```

### 3. Trading Signals
```
Combine social sentiment + price action + NFT volume → 
Generate trading opportunities → Alert on anomalies
```

### 4. Market Research
```
Track token mentions over time → Identify emerging projects → 
Monitor community engagement → Spot early trends
```

## 📈 Example Workflows

### Morning Intel Report

```typescript
// Fetch overnight activity
const intel = await fetch('/api/discord/intel', {
  method: 'POST',
  body: JSON.stringify({
    nft_channel_id: "xxx",
    tweet_channel_id: "yyy",
    intel_type: "summary"
  })
});

const data = await intel.json();

// Analysis
console.log(`
  NFT Volume: ${data.summary.total_nft_volume} ETH
  Community Sentiment: ${data.summary.bullish_sentiment}/${data.summary.bearish_sentiment}
  Top Tokens: ${data.summary.top_tokens_mentioned.join(', ')}
  Trending: ${data.summary.trending_keywords.join(', ')}
`);
```

### Real-Time Sentiment Monitoring

```typescript
// Poll every 3 minutes
setInterval(async () => {
  const response = await fetch('/api/discord/intel', {
    method: 'POST',
    body: JSON.stringify({
      tweet_channel_id: "yyy",
      intel_type: "tweets",
      limit: 20 // Just recent messages
    })
  });
  
  const data = await response.json();
  const recentTweets = data.data.intel.slice(0, 10);
  
  // Check for bullish SONIC mentions
  const sonicBullish = recentTweets.filter(t => 
    t.tokens_mentioned.includes('SONIC') && 
    t.sentiment === 'bullish'
  );
  
  if (sonicBullish.length >= 3) {
    alert('Strong bullish SONIC sentiment detected!');
  }
}, 3 * 60 * 1000);
```

### Whale NFT Tracking

```typescript
const response = await fetch('/api/discord/intel', {
  method: 'POST',
  body: JSON.stringify({
    nft_channel_id: "xxx",
    intel_type: "nft",
    limit: 50
  })
});

const data = await response.json();

// Find whales (> 10 ETH sales)
const whaleSales = data.data.intel.filter(tx => 
  tx.type === 'sale' && tx.price > 10
);

for (const sale of whaleSales) {
  console.log(`🐋 Whale Alert: ${sale.collection_name} sold for ${sale.price} ETH`);
  // Notify team, log to database, etc.
}
```

## 🐛 Troubleshooting

### Bot Can't Read Messages
**Solution**: Enable "MESSAGE CONTENT INTENT" in bot settings

### No Intel Being Parsed
**Check**:
- Message format matches expected patterns
- Channel IDs are correct
- Bot has access to channels
- Try with `intel_type: "all"` to see raw data

### Rate Limit Errors
**Solution**:
- Increase cache TTL
- Reduce polling frequency
- Lower message limit per request

### Authentication Errors
**Solution**:
- Verify bot token is correct
- Re-generate token if compromised
- Check token has no extra spaces

## 🎯 Best Practices

1. **Start with small limits** (20-30 messages) while testing
2. **Cache aggressively** - Discord data doesn't change instantly
3. **Monitor credit usage** - Track API calls in analytics
4. **Combine with AI** - Use sentiment analysis for better insights
5. **Set up alerts** - React to important events automatically

## 📚 Channel Setup Recommendations

### NFT Channel
- Set up webhooks from OpenSea, Blur, etc.
- Use bot that posts transaction embeds
- Include: price, collection, marketplace, tx hash

### Tweet Channel
- Encourage members to share Twitter links
- Use $TOKEN mentions consistently
- Include context and analysis in posts

## 🚀 Next Steps

1. ✅ Create Discord bot and get token
2. ✅ Set DISCORD_BOT_TOKEN secret
3. ✅ Get your channel IDs
4. ✅ Test with `/api/discord/intel`
5. ✅ View intel in dashboard
6. ✅ Set up automated workflows
7. 🎉 Start monitoring your community!

---

**Your crypto intelligence platform now has real-time community insights!** Monitor NFT market activity and social sentiment directly from your Discord server. 🚀
