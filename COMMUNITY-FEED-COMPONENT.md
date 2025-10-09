# 💬 Community Feed UI Component - Documentation

## Overview

Real-time community feed component that displays Discord channel activity directly in the dashboard Intelligence tab. Shows tweets, posts, NFT transactions, and sentiment analysis from your Discord server.

## Features

### Display Modes
1. **Tweets & Posts** - Community member tweets and social posts
2. **NFT Activity** - NFT sales, mints, transfers with prices
3. **All Activity** - Combined view of all intelligence

### Data Displayed

#### Tweet Feed Items
- Author avatar (initials)
- Author username
- Post content
- Timestamp (relative: "2m ago", "5h ago")
- Sentiment indicator (bullish/bearish/neutral)
- Token mentions ($BTC, $ETH, etc.)
- Keywords (moon, pump, breakout, etc.)
- Image indicator
- Twitter URL link (if available)

#### NFT Activity Items
- NFT image thumbnail (80x80px)
- Collection name
- Token ID
- Price (ETH/currency)
- Transaction type (Sale, Mint, Transfer, Listing)
- Marketplace name
- Transaction hash with Etherscan link
- Timestamp

#### Community Stats Panel
- Total community posts
- Total NFT transactions
- NFT volume (in ETH)
- Sentiment breakdown (% bullish vs bearish)
- Top mentioned tokens (top 5)

## Configuration

### Browser LocalStorage Setup

The component uses browser localStorage for Discord channel configuration:

```javascript
// Set your Discord channel IDs
localStorage.setItem('discord_nft_channel', 'YOUR_NFT_CHANNEL_ID');
localStorage.setItem('discord_tweet_channel', 'YOUR_TWEET_CHANNEL_ID');

// Reload page
location.reload();
```

**To get Discord channel IDs**:
1. Enable Developer Mode in Discord (Settings → Advanced → Developer Mode)
2. Right-click on channel → "Copy Channel ID"
3. Paste into localStorage commands above

### Alternative: Update Dashboard Code

Edit `src/ui/dashboard-enhanced.ts` line ~930:

```javascript
const DISCORD_CONFIG = {
  nft_channel_id: 'YOUR_NFT_CHANNEL_ID_HERE',    // Replace with your NFT channel ID
  tweet_channel_id: 'YOUR_TWEET_CHANNEL_ID_HERE' // Replace with your tweet channel ID
};
```

## UI Components

### Feed Item Card (Tweet)
```html
<div class="feed-item {sentiment-class}">
  <div class="feed-avatar">JD</div>
  <div class="feed-content">
    <div class="feed-header">
      <span class="feed-author">JohnDoe#1234</span>
      <span class="feed-time">5m ago</span>
    </div>
    <div class="feed-text">$BTC breaking resistance! 🚀</div>
    <div class="feed-meta">
      <span class="feed-tag bullish">BULLISH</span>
      <span class="feed-tag token">$BTC</span>
      <span class="feed-tag">🐦 View Tweet</span>
    </div>
  </div>
</div>
```

### NFT Item Card
```html
<div class="nft-item">
  <img src="nft-image.jpg" class="nft-image">
  <div class="nft-details">
    <div class="nft-collection">💰 Bored Ape Yacht Club #1234</div>
    <div class="nft-price">45.5 ETH</div>
    <div class="nft-meta">
      SALE • 10m ago
      Marketplace: OpenSea
      <a href="etherscan-link">View TX</a>
    </div>
  </div>
</div>
```

### Stats Panel
```html
<div class="stat-box">
  <div class="stat-box-label">Community Posts</div>
  <div class="stat-box-value">38</div>
</div>

<div class="stat-box">
  <div class="stat-box-label">Sentiment</div>
  <div class="sentiment-gauge">
    <div class="sentiment-bar bullish" style="flex: 65"></div>
    <div class="sentiment-bar bearish" style="flex: 21"></div>
  </div>
  <div>25 Bullish • 8 Bearish</div>
</div>
```

## CSS Styling

### Key Classes

```css
.feed-item - Container for tweet/post items
.feed-item.bullish - Green left border for bullish posts
.feed-item.bearish - Red left border for bearish posts
.feed-avatar - Circular avatar with initials
.feed-content - Main content area
.feed-header - Author and timestamp
.feed-text - Post content text
.feed-meta - Tags and metadata
.feed-tag - Individual tag badge
.feed-tag.token - Blue token mention badge
.feed-tag.bullish - Green sentiment badge
.feed-tag.bearish - Red sentiment badge

.nft-item - Container for NFT items
.nft-image - 80x80px NFT thumbnail
.nft-details - NFT information
.nft-collection - Collection name and token ID
.nft-price - Large price display
.nft-meta - Transaction metadata

.stat-box - Statistics display box
.stat-box-label - Stat label text
.stat-box-value - Large stat number
.sentiment-gauge - Horizontal sentiment bar
.sentiment-bar - Individual sentiment bar segment
```

## JavaScript Functions

### Main Functions

```javascript
refreshCommunityFeed() - Fetches and displays community feed
  → Checks configuration
  → Calls API endpoint
  → Renders feed based on selected type
  → Updates stats panel

renderTweetFeed(data, container) - Renders tweet items
  → Parses tweet data
  → Creates feed item HTML
  → Adds sentiment indicators
  → Links to Twitter if available

renderNFTFeed(data, container) - Renders NFT items
  → Parses NFT transaction data
  → Displays images
  → Shows prices and metadata
  → Links to Etherscan

renderCommunityStats(data, container) - Renders stats
  → Calculates sentiment percentages
  → Displays post/transaction counts
  → Shows top tokens
  → Renders sentiment gauge

getTimeAgo(timestamp) - Formats relative time
  → "Just now" for <1min
  → "5m ago" for minutes
  → "2h ago" for hours
  → "3d ago" for days

escapeHtml(text) - Sanitizes user content
  → Prevents XSS attacks
  → Escapes HTML entities
```

### Helper Functions

```javascript
// Get configuration from localStorage
DISCORD_CONFIG = {
  nft_channel_id: localStorage.getItem('discord_nft_channel') || '',
  tweet_channel_id: localStorage.getItem('discord_tweet_channel') || ''
};

// Check if configured
if (!DISCORD_CONFIG.nft_channel_id && !DISCORD_CONFIG.tweet_channel_id) {
  // Show configuration instructions
}
```

## API Integration

### Endpoint
```
POST /api/discord/intel
```

### Request Body
```json
{
  "nft_channel_id": "1234567890",
  "tweet_channel_id": "0987654321",
  "limit": 30,
  "intel_type": "all" // or "tweets", "nft"
}
```

### Response Format
```json
{
  "success": true,
  "data": {
    "tweet_intel": {
      "intel": [/* tweet objects */],
      "total_messages_analyzed": 30
    },
    "nft_intel": {
      "intel": [/* nft objects */],
      "total_messages_analyzed": 30
    },
    "summary": {
      "total_tweets": 25,
      "total_nft_transactions": 12,
      "total_nft_volume": 245.8,
      "bullish_sentiment": 16,
      "bearish_sentiment": 5,
      "neutral_sentiment": 4,
      "top_tokens_mentioned": ["BTC", "ETH", "SONIC"],
      "trending_keywords": ["moon", "bullish"],
      "high_value_nfts": [/* top 5 */]
    }
  }
}
```

## User Experience

### First Load (Not Configured)
1. User clicks "Intelligence" tab
2. Community feed shows configuration instructions
3. Instructions include:
   - How to get channel IDs
   - localStorage commands to set IDs
   - Link to full documentation

### Configured & Working
1. User clicks "Intelligence" tab
2. Feed automatically loads from Discord
3. Shows last 30 messages/transactions
4. Updates stats panel
5. User can:
   - Switch between tweet/NFT/all views
   - Click refresh to update
   - Click Twitter links to view original tweets
   - Click transaction hashes to view on Etherscan
   - See relative timestamps
   - View sentiment indicators

### Auto-Refresh
- Feed does NOT auto-refresh (user-initiated only)
- Prevents excessive API calls
- User clicks 🔄 refresh button to update
- Recommended: Refresh every 2-5 minutes

## Performance

### Caching
- Discord messages cached for 2 minutes (server-side KV)
- Reduces Discord API calls
- Improves response time

### Loading States
- Shows spinner while fetching
- Graceful error handling
- Fallback messages if no data

### Optimization
- Lazy loading (only loads when tab clicked)
- Image lazy loading with error fallback
- Efficient DOM updates (innerHTML replacement)
- No heavy JavaScript frameworks

## Error Handling

### Not Configured
```
"Discord Community Feed not configured"
+ Instructions to set localStorage
+ Link to documentation
```

### API Error
```
"Failed to fetch community intel"
+ Error message from API
+ Link to troubleshooting guide
```

### Bot Token Missing
```
"Discord bot token not configured"
+ Instructions to set secret
+ Link to setup guide
```

### No Data
```
"No recent community posts"
or
"No recent NFT activity"
```

## Security

### XSS Prevention
- All user content escaped via `escapeHtml()`
- HTML entities sanitized
- Safe innerHTML usage

### Token Security
- Discord bot token stored as Cloudflare secret
- Never exposed to frontend
- Not in localStorage
- Only channel IDs stored client-side (public information)

### CORS
- API endpoints have proper CORS headers
- Secure against CSRF attacks

## Customization

### Change Refresh Rate
Edit line ~930 in dashboard-enhanced.ts:
```javascript
// Change cache TTL (server-side)
// See src/services/discord.ts line ~45
expirationTtl: 120 // 2 minutes
```

### Change Item Limit
Edit line ~960:
```javascript
body: JSON.stringify({
  // ...
  limit: 50, // Change from 30 to 50
  // ...
})
```

### Change Displayed Fields
Edit `renderTweetFeed()` or `renderNFTFeed()` functions to show/hide fields

### Styling
All styles in `<style>` section:
- `.feed-item` - Tweet styling
- `.nft-item` - NFT styling
- `.stat-box` - Stats styling
- Colors via CSS variables (--accent-orange, etc.)

## Browser Compatibility

**Supported**:
- ✅ Chrome/Edge 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

**Features Used**:
- LocalStorage API
- Fetch API
- Template literals
- Arrow functions
- CSS Grid & Flexbox
- CSS Variables

## Troubleshooting

### Feed Not Loading
1. Check browser console (F12) for errors
2. Verify Discord bot token set: `wrangler secret list`
3. Check channel IDs correct in localStorage
4. Test API directly: `curl -X POST /api/discord/intel`

### Images Not Showing
1. Check image URLs valid
2. Verify no CORS blocks
3. Fallback to placeholder works

### Stats Not Calculating
1. Verify data structure from API
2. Check for division by zero
3. Ensure summary object exists

### Timestamps Wrong
1. Check browser timezone
2. Verify timestamp format from API
3. getTimeAgo() function working

## Future Enhancements

Potential improvements:
- [ ] Real-time updates via WebSocket
- [ ] Infinite scroll / pagination
- [ ] Filter by specific tokens
- [ ] Export feed to CSV
- [ ] Share specific posts
- [ ] Reactions/engagement tracking
- [ ] User avatars from Discord
- [ ] Rich embeds support
- [ ] Video/GIF support
- [ ] Search functionality

## Testing

### Manual Test Steps
1. Set Discord channel IDs in localStorage
2. Click Intelligence tab
3. Verify feed loads
4. Check stats display
5. Switch between views
6. Click refresh button
7. Click external links
8. Test on mobile

### Test Data
Use test Discord channels with known posts/NFTs to verify parsing

## Documentation Links

- Setup Guide: `DISCORD-COMMUNITY-INTEL.md`
- API Docs: `https://ss.srvcflo.com/api/docs`
- Technical Docs: `DISCORD-IMPLEMENTATION-SUMMARY.md`
- Quick Reference: `QUICK-REFERENCE.md`

---

**Community feed component complete and production-ready!** 🎉

Shows real-time Discord activity directly in your dashboard with beautiful UI and comprehensive intelligence.
