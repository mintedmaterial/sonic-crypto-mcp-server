// Sentiment analysis tool - analyze_sonic_market_sentiment

import { Env, MCPTool, ToolExecutionResult } from './types';
import { fetchCoinDeskData } from './coindesk-api';

export const sentimentToolDefinition: MCPTool = {
  name: "analyze_sonic_market_sentiment",
  description: "Analyze market sentiment for Sonic ecosystem using AI-powered analysis of price action, volume, and news data",
  inputSchema: {
    type: "object",
    properties: {
      sentiment_sources: {
        type: "array",
        items: {
          type: "string",
          enum: ["price_action", "volume_analysis", "defi_metrics", "news"]
        },
        default: ["price_action", "volume_analysis"],
        description: "Sources to analyze for sentiment"
      },
      timeframe: {
        type: "string",
        enum: ["1h", "4h", "1d", "7d"],
        default: "1d",
        description: "Timeframe for analysis"
      },
      instruments: {
        type: "array",
        items: { type: "string" },
        default: ["S-USD", "BTC-USD", "ETH-USD"],
        description: "Instruments to analyze"
      }
    }
  }
};

export async function executeAnalyzeSentiment(
  args: any,
  env: Env
): Promise<ToolExecutionResult> {
  const {
    sentiment_sources = ['price_action', 'volume_analysis'],
    timeframe = '1d',
    instruments = ['S-USD', 'BTC-USD', 'ETH-USD']
  } = args;

  try {
    // Get price data for analysis
    const priceData = await fetchCoinDeskData('/indices/values', {
      assets: instruments,
      index_id: 'cadli'
    }, env);

    // Build AI prompt for sentiment analysis
    const prompt = `You are a cryptocurrency market analyst specializing in the Sonic blockchain ecosystem.

Analyze the following market data and provide a comprehensive sentiment analysis:

Market Data:
${JSON.stringify(priceData, null, 2)}

Analysis Parameters:
- Sources: ${sentiment_sources.join(', ')}
- Timeframe: ${timeframe}
- Instruments: ${instruments.join(', ')}

Provide your analysis in the following JSON format:
{
  "overall_sentiment": "bullish|bearish|neutral",
  "confidence": 0-100,
  "key_observations": ["observation1", "observation2", ...],
  "risk_factors": ["risk1", "risk2", ...],
  "opportunities": ["opportunity1", "opportunity2", ...],
  "recommendation": "brief recommendation"
}

Focus on actionable insights for DeFi users and traders in the Sonic ecosystem.`;

    // Use Cloudflare AI for sentiment analysis
    const aiResponse = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: [
        {
          role: 'system',
          content: 'You are a professional cryptocurrency market analyst. Respond only with valid JSON.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 1024,
      temperature: 0.7
    });

    // Parse AI response
    let sentimentAnalysis: any;
    try {
      const responseText = typeof aiResponse.response === 'string'
        ? aiResponse.response
        : JSON.stringify(aiResponse.response);
      sentimentAnalysis = JSON.parse(responseText);
    } catch (e) {
      // Fallback if AI doesn't return valid JSON
      sentimentAnalysis = {
        overall_sentiment: "neutral",
        confidence: 50,
        key_observations: ["AI analysis unavailable, using raw data"],
        risk_factors: ["Unable to parse AI response"],
        raw_response: aiResponse
      };
    }

    // Log analytics
    if (env.ANALYTICS) {
      env.ANALYTICS.writeDataPoint({
        blobs: ['sentiment_analysis', timeframe, instruments.join(',')],
        doubles: [sentimentAnalysis.confidence || 0],
        indexes: [sentimentAnalysis.overall_sentiment || 'neutral']
      });
    }

    return {
      success: true,
      data: {
        sentiment: sentimentAnalysis,
        price_data: priceData,
        analysis_params: {
          sources: sentiment_sources,
          timeframe,
          instruments
        }
      },
      summary: `Market sentiment: ${sentimentAnalysis.overall_sentiment || 'neutral'} (${sentimentAnalysis.confidence || 0}% confidence)`,
      timestamp: new Date().toISOString()
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      summary: `Failed to analyze sentiment: ${error.message}`,
      timestamp: new Date().toISOString()
    };
  }
}
