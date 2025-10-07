# 📦 Deployment Guide

Complete guide for deploying the Sonic Crypto MCP Server to Cloudflare Workers with auto-deployment from GitHub.

## 🎯 Overview

This guide covers:
1. Initial Cloudflare setup
2. GitHub repository integration
3. Auto-deployment configuration
4. Custom domain setup (`ss.srvcflo.com`)
5. Secrets management
6. Post-deployment verification

## 📋 Prerequisites

Before you begin, ensure you have:
- [x] Cloudflare account (free or paid)
- [x] GitHub repository access
- [x] CoinDesk API key
- [x] Wrangler CLI installed (`npm install -g wrangler`)
- [x] Node.js 18+ and npm

## 🚀 Step-by-Step Deployment

### Step 1: Cloudflare Account Setup

1. **Create/Login to Cloudflare Account**
   - Go to [https://dash.cloudflare.com](https://dash.cloudflare.com)
   - Sign up or log in

2. **Enable Workers**
   - Navigate to **Workers & Pages** in the dashboard
   - If prompted, set up Workers (free tier available)

### Step 2: Create Worker

#### Option A: Via Cloudflare Dashboard

1. Go to **Workers & Pages** → **Create Application**
2. Select **Create Worker**
3. Name it: `sonic-crypto-mcp-server`
4. Click **Deploy** (default template is fine, we'll replace it)

#### Option B: Via Wrangler CLI

```bash
# Login to Cloudflare
wrangler login

# Deploy to create the worker
npm run deploy
```

### Step 3: Configure GitHub Integration

This enables auto-deployment on push to `main` branch.

1. **Connect Repository**
   - In Cloudflare Dashboard, go to your worker
   - Click **Settings** → **Builds**
   - Click **Connect** next to "Git Integration"
   - Authorize Cloudflare to access your GitHub account
   - Select repository: `mintedmaterial/sonic-crypto-mcp-server`
   - Select branch: `main`

2. **Verify Build Settings**
   - Build command: `npm run build` (auto-detected)
   - Build output directory: `dist` or root (Cloudflare handles this)
   - Environment variables: (we'll set these next)

3. **Save Configuration**
   - Click **Save and Deploy**
   - First deployment will trigger automatically

### Step 4: Set Secrets

Secrets are encrypted environment variables. Set them via Wrangler CLI:

```bash
# Required: CoinDesk API Key
wrangler secret put COINDESK_API_KEY
# When prompted, paste your API key

# Optional: AI Gateway Token
wrangler secret put AI_GATEWAY_TOKEN

# Optional: Anthropic API Key (if using Claude)
wrangler secret put ANTHROPIC_API_KEY
```

**Alternatively, via Dashboard:**
1. Go to worker → **Settings** → **Variables and Secrets**
2. Click **Add variable** → Select **Encrypt**
3. Add each secret:
   - Name: `COINDESK_API_KEY`
   - Value: Your API key
   - Click **Save**

### Step 5: Configure Bindings

Verify all Cloudflare service bindings are correctly configured in `wrangler.toml`:

```toml
# KV Namespaces
[[kv_namespaces]]
binding = "SONIC_CACHE"
id = "b3527f44e06e4fc8a78129b23055f3a1"

[[kv_namespaces]]
binding = "API_RATE_LIMIT"
id = "cb20ca89e760482cafdd9aa6ae896115"

# R2 Buckets
[[r2_buckets]]
binding = "HISTORICAL_DATA"
bucket_name = "sonic-crypto-historical"

[[r2_buckets]]
binding = "MARKET_REPORTS"
bucket_name = "sonic-market-reports"

# D1 Database
[[d1_databases]]
binding = "CONFIG_DB"
database_name = "sonic-crypto-config"
database_id = "1e47552e-03a8-420e-8365-58eb412d6040"

# Durable Objects
[[durable_objects.bindings]]
name = "CRYPTO_CACHE"
class_name = "CryptoDataCache"

[[durable_objects.bindings]]
name = "MCP_SESSION"
class_name = "MCPSessionManager"

# Analytics Engine
[[analytics_engine_datasets]]
binding = "ANALYTICS"

# Queue
[[queues.producers]]
binding = "CRYPTO_QUEUE"
queue = "sonic-crypto-processing"

# Workflows
[[workflows]]
binding = "DATA_UPDATE_WORKFLOW"
name = "sonic-data-update"
class_name = "DataUpdateWorkflow"

[[workflows]]
binding = "DATA_SEEDING_WORKFLOW"
name = "sonic-data-seeding"
class_name = "DataSeedingWorkflow"
```

**If any binding is missing, create it:**

```bash
# Create KV namespace
wrangler kv:namespace create "SONIC_CACHE"

# Create R2 bucket
wrangler r2 bucket create sonic-crypto-historical

# Create D1 database
wrangler d1 create sonic-crypto-config

# Create Queue
wrangler queues create sonic-crypto-processing
```

### Step 6: Custom Domain Setup

Configure `ss.srvcflo.com` to point to your worker.

#### Via Cloudflare Dashboard (Recommended)

1. **Add Domain to Cloudflare**
   - Go to **Websites** → **Add a site**
   - Enter: `srvcflo.com`
   - Follow DNS setup instructions

2. **Connect Worker to Domain**
   - Go to **Workers & Pages**
   - Select `sonic-crypto-mcp-server`
   - Go to **Settings** → **Domains & Routes**
   - Click **Add** → **Custom Domain**
   - Enter: `ss.srvcflo.com`
   - Click **Add Domain**
   - Cloudflare will automatically:
     - Create DNS record (CNAME or A)
     - Provision SSL certificate
     - Route traffic to your worker

#### Via Wrangler

Ensure `wrangler.toml` has the route configured:

```toml
[[routes]]
pattern = "ss.srvcflo.com/*"
zone_name = "srvcflo.com"
```

Then deploy:

```bash
npm run deploy
```

**DNS Propagation:** May take 5-60 minutes. Check status:
```bash
# Check DNS
nslookup ss.srvcflo.com

# Test endpoint
curl https://ss.srvcflo.com/health
```

### Step 7: Enable Workers Logs

Logs are crucial for debugging and monitoring.

1. **Via Dashboard:**
   - Go to worker → **Settings** → **Logs**
   - Enable **Workers Logs**
   - Set sampling rate: **100%**
   - Enable **Invocation logs**

2. **Verify in wrangler.toml:**
```toml
[observability.logs]
enabled = true
```

3. **View logs in real-time:**
```bash
wrangler tail
```

### Step 8: Initialize Database

After deployment, initialize the D1 database:

```bash
# Initialize schema
curl -X POST https://ss.srvcflo.com/api/init-db

# Seed historical data (optional, takes a few minutes)
curl -X POST https://ss.srvcflo.com/api/seed-data \
  -H "Content-Type: application/json" \
  -d '{
    "instruments": ["BTC-USD", "ETH-USD", "S-USD", "SONIC-USD"],
    "markets": ["cadli"],
    "daysOfHistory": 90
  }'
```

## ✅ Verification Checklist

After deployment, verify everything works:

### 1. Health Check
```bash
curl https://ss.srvcflo.com/health
```
Expected: `{"status":"healthy", ...}`

### 2. Dashboard
Visit: [https://ss.srvcflo.com](https://ss.srvcflo.com)
- [ ] Starfield animation loads
- [ ] Price data loads
- [ ] Sentiment analysis works
- [ ] News loads
- [ ] Chat responds

### 3. MCP Endpoints
```bash
# List tools
curl https://ss.srvcflo.com/mcp/tools/list

# Call tool
curl -X POST https://ss.srvcflo.com/mcp/tools/call \
  -H "Content-Type: application/json" \
  -d '{
    "name": "get_latest_index_tick",
    "arguments": {
      "market": "cadli",
      "instruments": ["BTC-USD"]
    }
  }'
```

### 4. API Endpoints
```bash
# Price data
curl https://ss.srvcflo.com/api/price

# Sentiment
curl -X POST https://ss.srvcflo.com/api/sentiment \
  -H "Content-Type: application/json" \
  -d '{
    "sentiment_sources": ["price_action"],
    "timeframe": "1d"
  }'

# Chat
curl -X POST https://ss.srvcflo.com/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"What is the price of Bitcoin?"}'
```

### 5. Check Analytics
- Go to Cloudflare Dashboard → Analytics → Workers
- Verify requests are being logged

## 🔄 Auto-Deployment Workflow

Once GitHub integration is set up:

```bash
# 1. Make changes locally
git add .
git commit -m "feat: Add new feature"

# 2. Push to GitHub
git push origin main

# 3. Cloudflare automatically:
#    - Detects push to main branch
#    - Pulls latest code
#    - Runs npm install
#    - Runs npm run build
#    - Deploys to Workers
#    - Updates ss.srvcflo.com

# 4. Verify deployment
curl https://ss.srvcflo.com/health
```

**Monitor build:**
- Cloudflare Dashboard → Your Worker → **Deployments**
- View build logs and deployment history

## 🐛 Troubleshooting

### Build Fails

**Issue:** TypeScript errors or missing dependencies

**Solution:**
```bash
# Test build locally first
npm run build

# Check for type errors
npm run lint

# Ensure dependencies are in package.json
npm install
```

### Secrets Not Working

**Issue:** API returns 401 or "API key missing"

**Solution:**
```bash
# Re-set secret
wrangler secret put COINDESK_API_KEY

# Verify in dashboard
# Go to Settings → Variables and Secrets
```

### Domain Not Working

**Issue:** `ss.srvcflo.com` returns 404 or connection refused

**Solution:**
1. Check DNS propagation: `nslookup ss.srvcflo.com`
2. Verify route in wrangler.toml matches domain
3. Check Cloudflare Dashboard → DNS → Verify CNAME/A record exists
4. Wait 5-60 minutes for DNS propagation

### AI Responses Empty

**Issue:** Chat or sentiment returns empty/error

**Solution:**
1. Check AI binding in wrangler.toml: `[ai] binding = "AI"`
2. Verify in dashboard: Settings → Bindings → AI should be listed
3. Try redeploying: `npm run deploy`

### Database Errors

**Issue:** "Table not found" or D1 errors

**Solution:**
```bash
# Initialize database
curl -X POST https://ss.srvcflo.com/api/init-db

# Check D1 database exists
wrangler d1 list

# If missing, create it
wrangler d1 create sonic-crypto-config
# Update database_id in wrangler.toml with returned ID
```

## 📊 Monitoring

### Real-Time Logs
```bash
# Stream all logs
wrangler tail

# Filter by status
wrangler tail --status error

# Filter by method
wrangler tail --method POST
```

### Analytics Dashboard
- Go to: Cloudflare Dashboard → Analytics → Workers
- View:
  - Requests per second
  - Error rate
  - CPU usage
  - Response times

### Health Monitoring
Set up automated health checks:
```bash
# Use cron or monitoring service to ping
curl https://ss.srvcflo.com/health
```

## 🔒 Security Best Practices

1. **Never commit secrets** - Use Wrangler secrets or environment variables
2. **Use custom domains** - Avoid exposing `*.workers.dev` URLs
3. **Enable rate limiting** - Configured via `API_RATE_LIMIT` KV
4. **Monitor logs** - Watch for suspicious activity
5. **Keep dependencies updated** - Run `npm update` regularly

## 📚 Additional Resources

- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Wrangler CLI Docs](https://developers.cloudflare.com/workers/wrangler/)
- [D1 Database Docs](https://developers.cloudflare.com/d1/)
- [R2 Storage Docs](https://developers.cloudflare.com/r2/)
- [Workers AI Docs](https://developers.cloudflare.com/workers-ai/)

---

**Questions?** Open an issue on [GitHub](https://github.com/mintedmaterial/sonic-crypto-mcp-server/issues)
