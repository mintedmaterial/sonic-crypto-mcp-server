// MCP Client for connecting to our Sonic Crypto MCP Server

const MCP_SERVER_URL = process.env.NEXT_PUBLIC_MCP_SERVER_URL || 'https://sonic-crypto-mcp-server.your-subdomain.workers.dev'

export interface MCPTool {
  name: string
  description: string
  inputSchema: any
}

export interface MCPResponse<T = any> {
  result?: T
  error?: {
    code: number
    message: string
  }
}

export class MCPClient {
  private baseUrl: string

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || MCP_SERVER_URL
  }

  async listTools(): Promise<MCPTool[]> {
    try {
      const response = await fetch(`${this.baseUrl}/mcp/tools/list`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      return data.result?.tools || []
    } catch (error) {
      console.error('Failed to list MCP tools:', error)
      return []
    }
  }

  async callTool(name: string, arguments_?: any): Promise<MCPResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/mcp/tools/call`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          arguments: arguments_ || {}
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error(`Failed to call MCP tool ${name}:`, error)
      return {
        error: {
          code: -1,
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    }
  }

  // Convenience methods for specific tools
  async getLatestPrices(instruments: string[]) {
    return this.callTool('get_latest_index_tick', {
      market: 'cadli',
      instruments: instruments
    })
  }

  async getLatestMarketReport() {
    return this.callTool('get_latest_market_report', {})
  }

  async getMarketReportsByDate(date: string) {
    return this.callTool('get_market_reports_by_date', { date })
  }

  async searchSonicOpportunities(opportunityTypes: string[]) {
    return this.callTool('search_sonic_opportunities', {
      opportunity_types: opportunityTypes,
      risk_tolerance: 'medium',
      min_yield: 10
    })
  }

  async analyzeSentiment(sources: string[]) {
    return this.callTool('analyze_sonic_market_sentiment', {
      sentiment_sources: sources
    })
  }

  async getHistoricalDaily(instrument: string, daysBack: number = 30) {
    const endDate = new Date()
    const startDate = new Date(endDate.getTime() - (daysBack * 24 * 60 * 60 * 1000))

    return this.callTool('get_historical_ohlcv_daily', {
      market: 'cadli',
      instrument: instrument,
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0]
    })
  }
}

// Export singleton instance
export const mcpClient = new MCPClient()

// Type definitions for our data
export interface PriceTickData {
  instrument: string
  value: number
  timestamp: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface MarketReport {
  id: string
  timestamp: number
  type: 'morning' | 'lunch' | 'evening'
  title: string
  executive_summary: string
  market_data: {
    s_usd: {
      current_price: number
      price_change_24h: number
      price_change_percentage_24h: number
      volume_24h: number
    }
    major_cryptos: { [key: string]: any }
  }
  sentiment_analysis: {
    overall_score: number
    confidence: number
    key_factors: string[]
  }
  opportunities: {
    yield_farming: any[]
    arbitrage: any[]
    risk_assessment: string
  }
  technical_analysis: string
  outlook: string
  generated_by: string
  formats: {
    json: string
    markdown: string
    summary: string
  }
}

export interface YieldOpportunity {
  protocol: string
  pool_name: string
  apy: number
  tvl: number
  risk_level: 'low' | 'medium' | 'high'
  description: string
}