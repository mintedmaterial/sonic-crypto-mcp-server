# Cloudflare Containers - Python ML for Charts Agent

This document explains how to enable Cloudflare Containers for the Charts Agent when they become available in your Cloudflare account.

## Overview

The Charts Agent uses a Python ML container for advanced technical analysis with:
- **TA-Lib**: 50+ technical indicators (RSI, MACD, Bollinger Bands, etc.)
- **pandas/numpy**: High-performance data processing
- **scikit-learn**: Machine learning models for pattern recognition
- **plotly/matplotlib**: Chart generation (future feature)

## Container Status

**Current Status**: ⏳ **Waiting for Availability**

Cloudflare Containers are not yet available in all accounts. When they become available:
1. You'll receive notification from Cloudflare
2. Follow the activation steps below
3. Charts Agent will automatically use Python ML for analysis

## Prerequisites

- **Paid Workers Plan**: Containers require Workers Paid plan ($5/month minimum)
- **Container Access**: Wait for Cloudflare to enable Containers in your account
- **Python ML Stack**: Already configured in `ChartsAgentDockerfile`

## Activation Steps

### Step 1: Verify Container Availability

Check if containers are available in your account:

```bash
# Try to deploy a test container
wrangler deploy --dry-run

# Look for container-related errors
# If no errors about "containers not available", you're ready!
```

### Step 2: Uncomment Container Configuration

In `wrangler.toml`, uncomment the containers section (lines 91-99):

```toml
# FROM (commented):
# [[containers]]
# name = "CHARTS_CONTAINER"
# image = "./ChartsAgentDockerfile"
# max_instances = 10
# instance_type = { vcpu = 4, memory_mib = 4096, disk_mb = 6144 }
# rollout_step_percentage = 100

# TO (uncommented):
[[containers]]
name = "CHARTS_CONTAINER"
image = "./ChartsAgentDockerfile"
max_instances = 10
instance_type = { vcpu = 4, memory_mib = 4096, disk_mb = 6144 }
rollout_step_percentage = 100
```

### Step 3: Update Environment TypeScript

In `src/config/env.ts`, change CHARTS_CONTAINER from optional to required:

```typescript
// FROM:
CHARTS_CONTAINER?: DurableObjectNamespace; // Optional - not all accounts have access

// TO:
CHARTS_CONTAINER: DurableObjectNamespace; // Python ML container for technical analysis
```

### Step 4: Update Charts Agent

In `src/agents/charts-agent.ts`, update the initialization to make containers required:

```typescript
// FROM (line 112-117):
if (this.env.CHARTS_CONTAINER) {
  this.containerStub = this.getContainerStub(params.sessionId);
  await this.checkContainerHealth();
} else {
  console.log('[ChartsAgent] Python container not available - using Worker AI fallback');
  this.containerHealthy = false;
}

// TO:
// Get container stub (required)
this.containerStub = this.getContainerStub(params.sessionId);
await this.checkContainerHealth();

if (!this.containerHealthy) {
  throw new Error('Charts Agent requires Python ML container');
}
```

### Step 5: Deploy Container

Deploy with containers enabled:

```bash
# Build TypeScript first
npm run build

# Deploy to production
npm run deploy

# Monitor deployment
npm run tail
```

### Step 6: Verify Container Health

Test the Charts Agent container:

```bash
# Test container health via API
curl https://ss.srvcflo.com/api/user-worker/create \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user",
    "userAddress": "0xYourBanditKidzNFTAddress"
  }'

# Expected response:
# {
#   "success": true,
#   "data": {
#     "userId": "test-user",
#     "workerName": "user-abc123",
#     "isNFTHolder": true,
#     "containerHealthy": true
#   }
# }
```

## Container Configuration Details

### Instance Type

```toml
instance_type = { vcpu = 4, memory_mib = 4096, disk_mb = 6144 }
```

- **vCPU**: 4 cores (sufficient for TA-Lib calculations)
- **Memory**: 4GB RAM (handles 200+ candles with 50+ indicators)
- **Disk**: 6GB storage (Python libs + dependencies)

### Max Instances

```toml
max_instances = 10
```

Configurable via `MAX_CHART_CONTAINERS` environment variable in `wrangler.toml`:

```toml
[vars]
MAX_CHART_CONTAINERS = "10"  # Increase for higher concurrency
```

### Rollout Strategy

```toml
rollout_step_percentage = 100
```

100% rollout = immediate activation for all user workers.

## Python ML Stack

The container includes:

```dockerfile
# Technical Analysis
ta-lib==0.4.28         # 50+ indicators
pandas==2.1.4          # Data manipulation
numpy==1.26.2          # Numerical computing

# Visualization (future)
plotly==5.18.0         # Interactive charts
matplotlib==3.8.2      # Static charts

# Machine Learning
scikit-learn==1.3.2    # Pattern recognition

# API
fastapi==0.109.0       # REST API
uvicorn==0.27.0        # ASGI server
```

## Technical Analysis Features

Once containers are enabled, Charts Agent provides:

### 50+ Technical Indicators
- **Trend**: SMA, EMA, DEMA, TEMA, WMA, KAMA
- **Momentum**: RSI, Stochastic, Williams %R, ROC, MFI
- **Volatility**: Bollinger Bands, ATR, Keltner Channels
- **Volume**: OBV, Volume Oscillator, VWAP
- **Oscillators**: MACD, PPO, Aroon, ADX

### Pattern Recognition
- **Candlestick Patterns**: 60+ patterns (Doji, Engulfing, Hammer, etc.)
- **Chart Patterns**: Support/Resistance, Trend Lines, Channels
- **AI-Powered**: Machine learning pattern strength scoring

### Advanced Analysis
- **Trend Analysis**: Multi-timeframe trend detection
- **Support/Resistance**: Dynamic level calculation
- **Pivot Points**: Standard, Fibonacci, Camarilla
- **Trading Signals**: Buy/Sell/Hold with confidence scores

## Fallback Behavior

**Before Container Activation**:
Charts Agent uses Cloudflare AI (@cf/meta/llama-3.1-8b-instruct) for basic technical analysis.

**After Container Activation**:
Charts Agent uses Python ML container for advanced TA-Lib analysis.

## Monitoring

### Container Health

Check container status:

```bash
# Via API
curl https://ss.srvcflo.com/api/user-worker/stats

# Expected response:
# {
#   "success": true,
#   "data": {
#     "totalWorkers": 15,
#     "nftHolders": 10,
#     "containersHealthy": 10,
#     "containersUnhealthy": 0
#   }
# }
```

### Container Logs

View container logs:

```bash
# Real-time logs
npm run tail

# Filter for Charts Agent
npm run tail | grep "ChartsAgent"
```

### Analytics

Monitor container usage in Cloudflare Dashboard:
1. Navigate to Workers & Pages
2. Select `sonic-crypto-mcp-server`
3. Go to **Analytics** tab
4. View container metrics (CPU, Memory, Requests)

## Cost Estimation

### Container Pricing (estimated)

- **Base**: Workers Paid plan ($5/month)
- **Container vCPU**: ~$0.02/million vCPU-seconds
- **Container Memory**: ~$0.000003/MB-second
- **Network**: Included in Workers plan

### Example Monthly Cost

Assuming 10 active NFT holders, 100 chart requests/day:

```
Requests/month: 10 users × 100 req/day × 30 days = 30,000 requests
Avg analysis time: 2 seconds per request
Total vCPU-seconds: 30,000 × 2 = 60,000 vCPU-seconds

vCPU cost: 60,000 ÷ 1,000,000 × $0.02 = $0.0012
Memory cost: Negligible
Total: ~$5.01/month (Workers plan + containers)
```

## Troubleshooting

### Container Not Starting

```bash
# Check wrangler.toml syntax
npm run build

# Verify Dockerfile exists
ls -la ChartsAgentDockerfile

# Check container logs
npm run tail | grep "CHARTS_CONTAINER"
```

### Container Health Check Failing

Common issues:
1. **Port mismatch**: Ensure container listens on port 3001
2. **Python dependencies**: Rebuild container with `--no-cache`
3. **Memory limit**: Increase `memory_mib` if OOM errors occur

### NFT Verification Issues

Ensure NFT verification works before testing containers:

```bash
# Test NFT verification
curl https://ss.srvcflo.com/api/verify-nft \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"walletAddress": "0xYourAddress"}'
```

## Support

- **Cloudflare Docs**: https://developers.cloudflare.com/workers/runtime-apis/durable-objects/
- **Container Docs**: https://developers.cloudflare.com/cloudflare-for-platforms/workers-for-platforms/
- **GitHub Issues**: https://github.com/mintedmaterial/sonic-crypto-mcp-server/issues

## Next Steps

Once containers are activated:
1. ✅ Enable containers in wrangler.toml
2. ✅ Deploy with `npm run deploy`
3. ✅ Verify container health
4. ✅ Test technical analysis with real market data
5. ✅ Monitor performance and costs
6. 🚀 Launch Charts Agent for NFT holders!
