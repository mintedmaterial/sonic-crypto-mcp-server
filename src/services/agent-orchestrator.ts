// Agent Orchestrator Service
// Routes requests to appropriate specialized agents

import { Env } from '../config/env';
import { BaseAgentState } from '../agents/core/agent-state';
import { OperationResult } from '../agents/core/types';

/**
 * Agent registry entry
 */
interface AgentRegistryEntry {
  agentType: BaseAgentState['agentType'];
  binding: keyof Env;
  description: string;
  capabilities: string[];
}

/**
 * Agent Orchestrator
 * Manages agent lifecycle and routes requests
 */
export class AgentOrchestrator {
  private registry: Map<string, AgentRegistryEntry> = new Map();

  constructor(private env: Env) {
    this.initializeRegistry();
  }

  /**
   * Initialize agent registry
   */
  private initializeRegistry() {
    const agents: AgentRegistryEntry[] = [
      {
        agentType: 'overview',
        binding: 'OVERVIEW_AGENT',
        description: 'Market overview and trending pairs monitoring',
        capabilities: [
          'track_trending_pairs',
          'monitor_price_changes',
          'manage_user_assets',
          'generate_market_heatmap',
          'analyze_sentiment',
        ],
      },
      {
        agentType: 'charts',
        binding: 'CHARTS_AGENT',
        description: 'Technical analysis and chart generation',
        capabilities: [
          'generate_charts',
          'technical_analysis',
          'screenshot_analysis',
          'suggest_trading_zones',
          'pattern_recognition',
        ],
      },
      {
        agentType: 'trading',
        binding: 'TRADING_AGENT',
        description: 'Orderly DEX integration and trading data',
        capabilities: [
          'fetch_orderbook',
          'get_funding_rates',
          'monitor_perpetuals',
          'track_positions',
          'execute_trades',
        ],
      },
      {
        agentType: 'intelligence',
        binding: 'INTELLIGENCE_AGENT',
        description: 'Social intelligence and report generation',
        capabilities: [
          'process_discord_feed',
          'generate_reports',
          'community_analytics',
          'news_aggregation',
          'sentiment_tracking',
        ],
      },
      {
        agentType: 'chat',
        binding: 'CHAT_AGENT',
        description: 'Conversational interface and workflow orchestration',
        capabilities: [
          'natural_language_understanding',
          'multi_agent_coordination',
          'workflow_execution',
          'human_in_loop',
          'context_management',
        ],
      },
    ];

    for (const agent of agents) {
      this.registry.set(agent.agentType, agent);
    }
  }

  /**
   * Get agent stub by type
   */
  private getAgentStub(agentType: BaseAgentState['agentType'], agentId: string) {
    const entry = this.registry.get(agentType);
    if (!entry) {
      throw new Error(`Unknown agent type: ${agentType}`);
    }

    const binding = this.env[entry.binding] as DurableObjectNamespace;
    if (!binding) {
      throw new Error(`Agent binding not found: ${entry.binding}`);
    }

    const id = binding.idFromName(agentId);
    return binding.get(id);
  }

  /**
   * Initialize an agent
   */
  async initializeAgent(
    agentType: BaseAgentState['agentType'],
    agentId: string,
    sessionId: string,
    userId?: string
  ): Promise<OperationResult> {
    try {
      const stub = this.getAgentStub(agentType, agentId);

      const response = await stub.fetch(new Request('http://internal/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId, sessionId, userId }),
      }));

      return await response.json();
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Route request to appropriate agent based on intent
   */
  async routeRequest(request: {
    query: string;
    context?: any;
    userId?: string;
    sessionId?: string;
  }): Promise<{
    agentType: BaseAgentState['agentType'];
    confidence: number;
    reasoning: string;
  }> {
    const query = request.query.toLowerCase();

    // Simple intent detection (can be enhanced with AI)
    const intents: Array<{
      agentType: BaseAgentState['agentType'];
      keywords: string[];
      weight: number;
    }> = [
      {
        agentType: 'overview',
        keywords: ['price', 'trending', 'gainer', 'loser', 'market', 'overview', 'heatmap'],
        weight: 1.0,
      },
      {
        agentType: 'charts',
        keywords: ['chart', 'analysis', 'technical', 'indicator', 'pattern', 'ta'],
        weight: 1.0,
      },
      {
        agentType: 'trading',
        keywords: ['trade', 'order', 'perp', 'perpetual', 'funding', 'orderly'],
        weight: 1.0,
      },
      {
        agentType: 'intelligence',
        keywords: ['news', 'report', 'social', 'community', 'sentiment', 'intelligence'],
        weight: 1.0,
      },
      {
        agentType: 'chat',
        keywords: ['help', 'how', 'what', 'explain', 'tell'],
        weight: 0.5, // Lower weight, fallback agent
      },
    ];

    let bestMatch: { agentType: BaseAgentState['agentType']; score: number } = {
      agentType: 'chat',
      score: 0,
    };

    for (const intent of intents) {
      let score = 0;
      for (const keyword of intent.keywords) {
        if (query.includes(keyword)) {
          score += intent.weight;
        }
      }

      if (score > bestMatch.score) {
        bestMatch = { agentType: intent.agentType, score };
      }
    }

    const confidence = Math.min(bestMatch.score / 3, 1.0); // Normalize to 0-1

    return {
      agentType: bestMatch.agentType,
      confidence,
      reasoning: `Matched ${bestMatch.score} keywords for ${bestMatch.agentType}`,
    };
  }

  /**
   * Execute request on specific agent
   */
  async executeOnAgent(
    agentType: BaseAgentState['agentType'],
    agentId: string,
    action: string,
    params: any
  ): Promise<OperationResult> {
    try {
      const stub = this.getAgentStub(agentType, agentId);

      const response = await stub.fetch(new Request(`http://internal/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      }));

      return await response.json();
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Get agent status
   */
  async getAgentStatus(
    agentType: BaseAgentState['agentType'],
    agentId: string
  ): Promise<OperationResult> {
    try {
      const stub = this.getAgentStub(agentType, agentId);

      const response = await stub.fetch(new Request('http://internal/status'));
      return await response.json();
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Get all registered agents
   */
  getRegisteredAgents(): AgentRegistryEntry[] {
    return Array.from(this.registry.values());
  }

  /**
   * Get agent capabilities
   */
  getAgentCapabilities(agentType: BaseAgentState['agentType']): string[] {
    const entry = this.registry.get(agentType);
    return entry?.capabilities || [];
  }

  /**
   * Health check all agents
   */
  async healthCheckAll(sessionId: string): Promise<Record<string, any>> {
    const results: Record<string, any> = {};

    for (const [agentType, entry] of this.registry.entries()) {
      try {
        const agentId = `${sessionId}-${agentType}`;
        const status = await this.getAgentStatus(entry.agentType, agentId);
        results[agentType] = status;
      } catch (error: any) {
        results[agentType] = {
          success: false,
          error: error.message,
        };
      }
    }

    return results;
  }
}
