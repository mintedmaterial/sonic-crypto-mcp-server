#!/bin/bash
# Test all API endpoints after deployment

BASE_URL="https://ss.srvcflo.com"

echo "🧪 Testing Sonic Crypto MCP Server Endpoints..."
echo "================================================"
echo ""

# 1. Health Check
echo "1. Health Check..."
curl -s "$BASE_URL/health" | jq '.' || echo "❌ Health check failed"
echo ""

# 2. Initialize Database
echo "2. Initialize Database..."
curl -s -X POST "$BASE_URL/api/init-db" | jq '.' || echo "❌ Database init failed"
echo ""

# 3. Get Trending (Sonic)
echo "3. Get Trending Sonic Tokens..."
curl -s "$BASE_URL/api/trending?source=sonic&limit=5" | jq '.data.gainers | .[] | {symbol, name, percent_change_24h, price}' || echo "❌ Trending failed"
echo ""

# 4. Get Latest Prices
echo "4. Get Latest Prices..."
curl -s "$BASE_URL/api/price" | jq '.' || echo "❌ Price fetch failed"
echo ""

# 5. Get Global Market Metrics
echo "5. Get Global Market Metrics..."
curl -s "$BASE_URL/api/global-metrics" | jq '{total_market_cap, total_volume_24h, btc_dominance}' || echo "❌ Global metrics failed"
echo ""

# 6. Test Discord Intel (may fail if token not set)
echo "6. Test Discord Intelligence..."
curl -s "$BASE_URL/api/discord-intel?type=tweets&limit=5" | jq '.' || echo "⚠️  Discord intel unavailable (token may not be set)"
echo ""

# 7. Test Dashboard
echo "7. Test Dashboard..."
curl -s -I "$BASE_URL/" | head -n 1 || echo "❌ Dashboard failed"
echo ""

# 8. Test Chat Endpoint
echo "8. Test AI Chat..."
curl -s -X POST "$BASE_URL/api/chat" \
  -H "Content-Type: application/json" \
  -d '{"message":"What is Bitcoin?","history":[]}' \
  | jq '.response' || echo "❌ Chat failed"
echo ""

echo "================================================"
echo "✅ Test suite complete!"
echo ""
echo "View live dashboard at: $BASE_URL"
echo "Monitor logs with: wrangler tail"
