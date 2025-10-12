#!/usr/bin/env bun
/**
 * Charts Agent Container Entry Point
 * Runs Python technical analysis service with HTTP API
 */

import { spawn } from 'child_process';
import { promisify } from 'util';

const exec = promisify(spawn);

interface OHLCVData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface TechnicalAnalysisRequest {
  symbol: string;
  ohlcv: OHLCVData[];
}

interface TechnicalAnalysisResponse {
  symbol: string;
  timestamp: number;
  current_price: number;
  indicators: any;
  patterns: any;
  trend: any;
  signals: any;
  confidence: number;
}

/**
 * Execute Python technical analysis
 */
async function runTechnicalAnalysis(data: OHLCVData[]): Promise<TechnicalAnalysisResponse> {
  return new Promise((resolve, reject) => {
    const python = spawn('python3', [
      '/app/charts-agent/technical_analysis.py',
      JSON.stringify(data)
    ]);

    let stdout = '';
    let stderr = '';

    python.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    python.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    python.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Python process exited with code ${code}: ${stderr}`));
        return;
      }

      try {
        const result = JSON.parse(stdout);
        if (result.error) {
          reject(new Error(result.error));
        } else {
          resolve(result);
        }
      } catch (error) {
        reject(new Error(`Failed to parse Python output: ${error}`));
      }
    });

    python.on('error', (error) => {
      reject(new Error(`Failed to start Python process: ${error.message}`));
    });
  });
}

/**
 * HTTP Server for Charts Agent
 */
const server = Bun.serve({
  port: parseInt(process.env.CHARTS_AGENT_PORT || '3001'),
  async fetch(req) {
    const url = new URL(req.url);

    // Health check
    if (url.pathname === '/health') {
      return Response.json({
        status: 'healthy',
        service: 'charts-agent',
        version: '1.0.0',
        timestamp: Date.now()
      });
    }

    // Technical analysis endpoint
    if (url.pathname === '/analyze' && req.method === 'POST') {
      try {
        const body = await req.json() as TechnicalAnalysisRequest;

        if (!body.ohlcv || !Array.isArray(body.ohlcv)) {
          return Response.json({
            error: 'Missing or invalid OHLCV data',
            required: 'ohlcv: OHLCVData[]'
          }, { status: 400 });
        }

        // Add symbol to OHLCV data
        const ohlcvWithSymbol = body.ohlcv.map(d => ({
          ...d,
          symbol: body.symbol
        }));

        // Run Python analysis
        const result = await runTechnicalAnalysis(ohlcvWithSymbol);

        return Response.json({
          success: true,
          data: result
        });

      } catch (error: any) {
        console.error('[ChartsAgent] Analysis error:', error);
        return Response.json({
          error: error.message || 'Analysis failed',
          details: error.stack
        }, { status: 500 });
      }
    }

    // Chart generation endpoint (future implementation)
    if (url.pathname === '/chart' && req.method === 'POST') {
      return Response.json({
        error: 'Chart generation not yet implemented',
        status: 'coming_soon'
      }, { status: 501 });
    }

    // 404
    return Response.json({
      error: 'Not found',
      endpoints: {
        '/health': 'GET - Health check',
        '/analyze': 'POST - Technical analysis',
        '/chart': 'POST - Chart generation (coming soon)'
      }
    }, { status: 404 });
  }
});

console.log(`🚀 Charts Agent Container listening on port ${server.port}`);
console.log(`📊 Technical Analysis Service ready`);
console.log(`🔬 Python ML Stack: TA-Lib, pandas, numpy, scikit-learn`);
