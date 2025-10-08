# 🚀 Quick Deployment Guide

## **Run These Commands in Order:**

### 1️⃣ **Navigate to Project**
```bash
cd C:\Users\PC\sonic-crypto-mcp-server
```

### 2️⃣ **Set Brave API Key** (Required for News)
```bash
wrangler secret put BRAVE_API_KEY
```
When prompted, enter your Brave Search API key.  
**Get one here:** https://brave.com/search/api/

### 3️⃣ **Verify CoinDesk API Key** (Already set, but verify)
```bash
wrangler secret put COINDESK_API_KEY
```
Enter: `ca442ea5c36b83d626f45ed5a636161e65cce45c0541e92ee3aa904a76d029e8`

### 4️⃣ **Build TypeScript**
```bash
npm run build
```
This compiles `.ts` → `.js` files.

### 5️⃣ **Deploy to Production**
```bash
npm run deploy
```

### 6️⃣ **Monitor Logs**
```bash
wrangler tail
```
Look for:
- ✅ `Orderly: BTC-USD = $121661`
- ✅ `DexScreener: SONIC-USD = $0.00008488`
- ✅ `Refreshed {instrument} via {source}`

### 7️⃣ **Test Dashboard**
Visit: **https://ss.srvcflo.com/**

---

## 🧪 **Quick API Tests**

### Test Multi-Source Price Data:
```bash
curl https://ss.srvcflo.com/api/price
```

### Test Orderly DEX:
```bash
curl https://ss.srvcflo.com/api/orderly/markets
```

### Test Health Check:
```bash
curl https://ss.srvcflo.com/health
```

### Test MCP Tools:
```bash
curl https://ss.srvcflo.com/mcp/tools/list
```

---

## 📊 **Expected Results**

### ✅ **Working Now:**
- Prices from Orderly DEX
- Prices from DexScreener  
- Multi-source fallback
- AI chat
- Sentiment analysis

### ⚠️ **Needs API Key:**
- News search (requires BRAVE_API_KEY)

---

## 🔍 **Troubleshooting**

### If prices don't load:
```bash
# Check logs
wrangler tail

# Verify deployment
curl https://ss.srvcflo.com/health
```

### If news doesn't load:
```bash
# Set Brave API key
wrangler secret put BRAVE_API_KEY

# Redeploy
npm run deploy
```

### If dashboard shows errors:
1. Check browser console (F12)
2. Check worker logs: `wrangler tail`
3. Test API directly: `curl https://ss.srvcflo.com/api/price`

---

## 📚 **Documentation**

- **API Docs:** https://ss.srvcflo.com/api/docs
- **Full Fixes:** See `FIXES_APPLIED.md`
- **Original Docs:** See `CLAUDE.md` and `README.md`

---

## 🎯 **That's It!**

Your MCP server should now be working with:
- ✅ Real-time Orderly DEX prices
- ✅ DexScreener fallback
- ✅ CoinDesk fallback (when available)
- ✅ AI-powered chat
- ✅ Sentiment analysis
- ⏳ News (once BRAVE_API_KEY is set)
