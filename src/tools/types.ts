// Shared types for Sonic Crypto MCP Server tools

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface ToolExecutionResult {
  success: boolean;
  data?: any;
  error?: string;
  summary?: string;
  timestamp?: string;
}

export interface CoinDeskPriceData {
  INSTRUMENT: string;
  VALUE: {
    PRICE: number;
    CHANGE: number;
    CHANGE_PERCENTAGE: number;
  };
  CURRENT_DAY: {
    OPEN: number;
    HIGH: number;
    LOW: number;
    CHANGE_PERCENTAGE: number;
  };
}

export interface SentimentAnalysis {
  overall: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
  observations: string[];
  risk_factors: string[];
  news_summary?: string[];
}
