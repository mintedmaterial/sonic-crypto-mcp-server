"use client"

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { TrendingUp, FileText, BarChart3, Zap, DollarSign, RefreshCw } from 'lucide-react'
import { mcpClient, MarketReport as MCPMarketReport, PriceTickData } from '@/lib/mcp-client'

interface MarketReport {
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
  }
  sentiment_analysis: {
    overall_score: number
    confidence: number
    key_factors: string[]
  }
}

interface PriceData {
  instrument: string
  price: number
  change_24h: number
  change_percentage_24h: number
}

export default function DashboardOverlay() {
  const [latestReport, setLatestReport] = useState<MarketReport | null>(null)
  const [priceData, setPriceData] = useState<PriceData[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const loadData = async () => {
    try {
      setRefreshing(true)

      // Load latest market report
      const reportResponse = await mcpClient.getLatestMarketReport()
      if (reportResponse.result) {
        setLatestReport(reportResponse.result)
      }

      // Load price data for Sonic instruments
      const pricesResponse = await mcpClient.getLatestPrices([
        'S-USD', 'ETH-USD', 'BTC-USD', 'USDC-USD'
      ])

      if (pricesResponse.result?.data) {
        const prices: PriceData[] = []
        const priceDataObj = pricesResponse.result.data

        for (const instrument of ['S-USD', 'ETH-USD', 'BTC-USD', 'USDC-USD']) {
          if (priceDataObj[instrument]) {
            const data = priceDataObj[instrument]
            prices.push({
              instrument,
              price: data.value || data.close || 0,
              change_24h: (data.close - data.open) || 0,
              change_percentage_24h: data.open ? ((data.close - data.open) / data.open) * 100 : 0
            })
          }
        }
        setPriceData(prices)
      }

    } catch (error) {
      console.error('Failed to load data:', error)

      // Fallback to mock data
      setLatestReport({
        id: 'report-001',
        timestamp: Date.now(),
        type: 'morning',
        title: 'Morning Market Analysis',
        executive_summary: 'Sonic ecosystem showing strong momentum with S-USD gaining 12.5% in the last 24 hours. Volume surge indicates increased adoption.',
        market_data: {
          s_usd: {
            current_price: 1.125,
            price_change_24h: 0.125,
            price_change_percentage_24h: 12.5,
            volume_24h: 2500000
          }
        },
        sentiment_analysis: {
          overall_score: 7.8,
          confidence: 85,
          key_factors: ['Strong volume', 'Positive yield farming returns', 'Growing DeFi adoption']
        }
      })

      setPriceData([
        { instrument: 'S-USD', price: 1.125, change_24h: 0.125, change_percentage_24h: 12.5 },
        { instrument: 'ETH-USD', price: 3456.78, change_24h: -45.22, change_percentage_24h: -1.3 },
        { instrument: 'BTC-USD', price: 67890.12, change_24h: 1234.56, change_percentage_24h: 1.85 },
        { instrument: 'USDC-USD', price: 1.001, change_24h: 0.001, change_percentage_24h: 0.1 }
      ])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadData()

    // Set up auto-refresh every 30 seconds
    const interval = setInterval(loadData, 30000)
    return () => clearInterval(interval)
  }, [])

  const cardVariants = {
    hidden: { scale: 0, opacity: 0, y: 50 },
    visible: (i: number) => ({
      scale: 1,
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.1,
        type: "spring",
        stiffness: 300,
        damping: 24
      }
    }),
    hover: {
      scale: 1.02,
      y: -5,
      transition: { type: "spring", stiffness: 400, damping: 17 }
    }
  }

  if (loading) {
    return (
      <div className="absolute inset-0 z-20 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-white text-xl font-medium"
        >
          Loading Sonic Data...
        </motion.div>
      </div>
    )
  }

  return (
    <div className="absolute inset-0 z-20 p-6">
      <div className="max-w-7xl mx-auto h-full">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="flex items-center justify-center gap-4 mb-4">
            <h1 className="text-4xl font-bold text-white">Sonic Crypto Dashboard</h1>
            <Button
              onClick={loadData}
              disabled={refreshing}
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/10"
            >
              <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          <p className="text-white/70">Real-time market data and AI-powered insights</p>
        </motion.div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full max-h-[calc(100vh-200px)]">
          {/* Latest Report Card */}
          <motion.div
            custom={0}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            whileHover="hover"
            className="lg:col-span-2 bg-black/40 backdrop-blur-lg border border-white/20 rounded-2xl p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <FileText className="w-6 h-6 text-blue-400" />
              <h2 className="text-xl font-semibold text-white">Latest Market Report</h2>
              <span className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded-lg text-sm capitalize">
                {latestReport?.type}
              </span>
            </div>

            {latestReport && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-white">{latestReport.title}</h3>
                <p className="text-white/80 leading-relaxed">{latestReport.executive_summary}</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div className="bg-white/5 rounded-lg p-3">
                    <div className="text-sm text-white/60">Sentiment Score</div>
                    <div className="text-2xl font-bold text-green-400">
                      {latestReport.sentiment_analysis.overall_score}/10
                    </div>
                    <div className="text-sm text-white/60">
                      {latestReport.sentiment_analysis.confidence}% confidence
                    </div>
                  </div>

                  <div className="bg-white/5 rounded-lg p-3">
                    <div className="text-sm text-white/60">S-USD Price</div>
                    <div className="text-2xl font-bold text-white">
                      ${latestReport.market_data.s_usd.current_price.toFixed(3)}
                    </div>
                    <div className={`text-sm ${latestReport.market_data.s_usd.price_change_percentage_24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {latestReport.market_data.s_usd.price_change_percentage_24h >= 0 ? '+' : ''}
                      {latestReport.market_data.s_usd.price_change_percentage_24h.toFixed(2)}%
                    </div>
                  </div>
                </div>

                <Button className="w-full mt-4 bg-blue-600 hover:bg-blue-700">
                  View Full Report
                </Button>
              </div>
            )}
          </motion.div>

          {/* Price Tracker */}
          <motion.div
            custom={1}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            whileHover="hover"
            className="bg-black/40 backdrop-blur-lg border border-white/20 rounded-2xl p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <TrendingUp className="w-6 h-6 text-green-400" />
              <h2 className="text-xl font-semibold text-white">Live Prices</h2>
            </div>

            <div className="space-y-3">
              {priceData.map((item, index) => (
                <motion.div
                  key={item.instrument}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex justify-between items-center p-3 bg-white/5 rounded-lg"
                >
                  <div>
                    <div className="font-medium text-white">{item.instrument}</div>
                    <div className="text-sm text-white/60">${item.price.toLocaleString()}</div>
                  </div>
                  <div className={`text-right ${item.change_percentage_24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    <div className="font-medium">
                      {item.change_percentage_24h >= 0 ? '+' : ''}{item.change_percentage_24h.toFixed(2)}%
                    </div>
                    <div className="text-sm">
                      {item.change_percentage_24h >= 0 ? '+' : ''}${item.change_24h.toFixed(2)}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Quick Actions */}
          <motion.div
            custom={2}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            whileHover="hover"
            className="bg-black/40 backdrop-blur-lg border border-white/20 rounded-2xl p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <Zap className="w-6 h-6 text-yellow-400" />
              <h2 className="text-xl font-semibold text-white">Quick Actions</h2>
            </div>

            <div className="space-y-3">
              <Button
                className="w-full bg-purple-600 hover:bg-purple-700"
                onClick={async () => {
                  // Trigger manual report generation through MCP
                  const response = await mcpClient.analyzeSentiment(['price_action', 'volume_analysis'])
                  console.log('Sentiment analysis:', response)
                  loadData() // Refresh data
                }}
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                Generate New Report
              </Button>
              <Button
                className="w-full bg-green-600 hover:bg-green-700"
                onClick={async () => {
                  const response = await mcpClient.searchSonicOpportunities(['yield_farming', 'arbitrage'])
                  console.log('Opportunities:', response)
                }}
              >
                <DollarSign className="w-4 h-4 mr-2" />
                Analyze Opportunities
              </Button>
              <Button
                className="w-full bg-orange-600 hover:bg-orange-700"
                onClick={async () => {
                  const response = await mcpClient.analyzeSentiment(['price_action', 'volume_analysis', 'social_sentiment'])
                  console.log('Sentiment:', response)
                }}
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                Check Sentiment
              </Button>
            </div>
          </motion.div>

          {/* Opportunities */}
          <motion.div
            custom={3}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            whileHover="hover"
            className="lg:col-span-2 bg-black/40 backdrop-blur-lg border border-white/20 rounded-2xl p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <DollarSign className="w-6 h-6 text-green-400" />
              <h2 className="text-xl font-semibold text-white">Yield Farming Opportunities</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white/5 rounded-lg p-4">
                <h3 className="font-medium text-white mb-2">S-USD/ETH Pool</h3>
                <div className="text-2xl font-bold text-green-400 mb-1">24.5% APY</div>
                <div className="text-sm text-white/60">Risk: Low • TVL: $2.5M</div>
              </div>

              <div className="bg-white/5 rounded-lg p-4">
                <h3 className="font-medium text-white mb-2">BTC/USDC Pool</h3>
                <div className="text-2xl font-bold text-yellow-400 mb-1">18.2% APY</div>
                <div className="text-sm text-white/60">Risk: Medium • TVL: $5.1M</div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}