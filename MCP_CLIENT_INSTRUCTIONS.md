# Private MCP Server Client Instructions

**Server URL**: `https://sonic-crypto-mcp-server.serviceflowagi.workers.dev/`

## Quick Reference

### Server Information
- **Name**: sonic-crypto-mcp-server
- **Version**: 1.0.0
- **Protocol**: MCP (Model Context Protocol)
- **Supported Tokens**: S-USD, ETH-USD, BTC-USD, USDC-USD, USDT-USD

## Method 1: Direct HTTP API Calls

### List All Available Tools
```bash
curl https://sonic-crypto-mcp-server.serviceflowagi.workers.dev/mcp/tools/list
```

### Execute a Tool (MCP Protocol)
```bash
curl -X POST "https://sonic-crypto-mcp-server.serviceflowagi.workers.dev/mcp/tools/call" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "get_latest_index_tick",
    "arguments": {
      "market": "cadli",
      "instruments": ["S-USD"],
      "groups": ["VALUE", "CURRENT_DAY", "MOVING_24_HOUR"]
    }
  }'
```

### Direct API Endpoints (Simplified)
```bash
# Get current S-USD price
curl -X POST "https://sonic-crypto-mcp-server.serviceflowagi.workers.dev/api/price" \
  -H "Content-Type: application/json" \
  -d '{"market": "cadli", "instruments": ["S-USD"]}'

# Get sentiment analysis
curl -X POST "https://sonic-crypto-mcp-server.serviceflowagi.workers.dev/api/sentiment" \
  -H "Content-Type: application/json" \
  -d '{"sentiment_sources": ["price_action", "volume_analysis"]}'

# Get yield opportunities
curl -X POST "https://sonic-crypto-mcp-server.serviceflowagi.workers.dev/api/opportunities" \
  -H "Content-Type: application/json" \
  -d '{"analysis_type": "yield_farming", "risk_level": "medium"}'
```

## Method 2: MCP Client Integration

### Python MCP Client Example
```python
import json
import requests

class SonicMCPClient:
    def __init__(self):
        self.base_url = "https://sonic-crypto-mcp-server.serviceflowagi.workers.dev"
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json'
        })
    
    def list_tools(self):
        """List all available MCP tools"""
        response = self.session.get(f"{self.base_url}/mcp/tools/list")
        return response.json()
    
    def call_tool(self, tool_name, arguments):
        """Execute an MCP tool"""
        payload = {
            "name": tool_name,
            "arguments": arguments
        }
        response = self.session.post(f"{self.base_url}/mcp/tools/call", json=payload)
        return response.json()
    
    def get_sonic_price(self):
        """Get current S-USD price"""
        return self.call_tool("get_latest_index_tick", {
            "market": "cadli",
            "instruments": ["S-USD"],
            "groups": ["VALUE", "CURRENT_DAY", "MOVING_24_HOUR"]
        })

# Usage
client = SonicMCPClient()
tools = client.list_tools()
price_data = client.get_sonic_price()
```

### JavaScript/Node.js Example
```javascript
class SonicMCPClient {
    constructor() {
        this.baseUrl = 'https://sonic-crypto-mcp-server.serviceflowagi.workers.dev';
    }

    async listTools() {
        const response = await fetch(`${this.baseUrl}/mcp/tools/list`);
        return await response.json();
    }

    async callTool(toolName, arguments) {
        const response = await fetch(`${this.baseUrl}/mcp/tools/call`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: toolName, arguments })
        });
        return await response.json();
    }

    async getSonicPrice() {
        return this.callTool('get_latest_index_tick', {
            market: 'cadli',
            instruments: ['S-USD'],
            groups: ['VALUE', 'CURRENT_DAY', 'MOVING_24_HOUR']
        });
    }
}

// Usage
const client = new SonicMCPClient();
const tools = await client.listTools();
const priceData = await client.getSonicPrice();
```

## Method 3: Claude Code Integration

### .mcp.json Configuration
Add to your Claude Code `.mcp.json` file:
```json
{
  "mcpServers": {
    "sonic-crypto": {
      "command": "npx",
      "args": ["mcp-remote", "https://sonic-crypto-mcp-server.serviceflowagi.workers.dev/mcp/"]
    }
  }
}
```

## Available Tools

| Tool Name | Description | Key Parameters |
|-----------|-------------|----------------|
| `get_latest_index_tick` | Real-time crypto prices | `market`, `instruments`, `groups` |
| `get_historical_ohlcv_daily` | Daily OHLCV data | `market`, `instrument`, `limit` |
| `get_historical_ohlcv_hourly` | Hourly OHLCV data | `market`, `instrument`, `limit` |
| `get_historical_ohlcv_minutes` | Minute OHLCV data | `market`, `instrument`, `limit`, `aggregate` |
| `get_da_fixings` | End-of-day fixings | `instrument`, `timezone`, `close_time` |
| `get_index_updates_by_timestamp` | Tick updates | `market`, `instrument`, `after_ts` |
| `get_instrument_metadata` | Token metadata | `market`, `instruments` |
| `get_available_markets` | Market info | `market` (optional) |
| `search_sonic_opportunities` | AI yield analysis | `analysis_type`, `risk_level` |
| `analyze_sonic_market_sentiment` | AI sentiment | `sentiment_sources`, `timeframe` |

## Direct API Endpoint Mapping

| Direct Endpoint | MCP Tool Equivalent |
|----------------|-------------------|
| `/api/price` | `get_latest_index_tick` |
| `/api/historical-daily` | `get_historical_ohlcv_daily` |
| `/api/historical-hourly` | `get_historical_ohlcv_hourly` |
| `/api/historical-minutes` | `get_historical_ohlcv_minutes` |
| `/api/fixings` | `get_da_fixings` |
| `/api/updates` | `get_index_updates_by_timestamp` |
| `/api/metadata` | `get_instrument_metadata` |
| `/api/markets` | `get_available_markets` |
| `/api/opportunities` | `search_sonic_opportunities` |
| `/api/sentiment` | `analyze_sonic_market_sentiment` |

## Common Use Cases

### 1. Get Current S Token Price
```bash
curl -X POST "https://sonic-crypto-mcp-server.serviceflowagi.workers.dev/mcp/tools/call" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "get_latest_index_tick",
    "arguments": {
      "market": "cadli",
      "instruments": ["S-USD"],
      "groups": ["VALUE", "CURRENT_DAY", "MOVING_24_HOUR"]
    }
  }'
```

### 2. Get Historical Data (Last 7 Days)
```bash
curl -X POST "https://sonic-crypto-mcp-server.serviceflowagi.workers.dev/mcp/tools/call" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "get_historical_ohlcv_daily",
    "arguments": {
      "market": "cadli",
      "instrument": "S-USD",
      "limit": 7
    }
  }'
```

### 3. AI-Powered Yield Farming Analysis
```bash
curl -X POST "https://sonic-crypto-mcp-server.serviceflowagi.workers.dev/mcp/tools/call" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "search_sonic_opportunities",
    "arguments": {
      "analysis_type": "yield_farming",
      "timeframe": "7d",
      "risk_level": "medium"
    }
  }'
```

### 4. Market Sentiment Analysis
```bash
curl -X POST "https://sonic-crypto-mcp-server.serviceflowagi.workers.dev/mcp/tools/call" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "analyze_sonic_market_sentiment",
    "arguments": {
      "sentiment_sources": ["price_action", "volume_analysis", "defi_metrics"],
      "timeframe": "1d"
    }
  }'
```

## Response Format

All responses follow this structure:
```json
{
  "success": true,
  "tool": "tool_name",
  "data": { ... },
  "summary": "Human-readable summary",
  "timestamp": "2025-09-11T23:46:40.579Z"
}
```

Error responses:
```json
{
  "success": false,
  "error": "Error message",
  "tool": "tool_name",
  "timestamp": "2025-09-11T23:46:40.579Z"
}
```

## Authentication

No authentication required for basic usage. The server uses Cloudflare's built-in security.

## Rate Limits

- Standard Cloudflare Worker limits apply
- Approximately 100,000 requests per day on free tier
- Burst capacity: 1000 requests per minute

## Health Check

Monitor server status:
```bash
curl https://sonic-crypto-mcp-server.serviceflowagi.workers.dev/health
```

## Support

For issues or questions:
- Check server health endpoint
- Review error messages in response
- Server logs available via Cloudflare dashboard