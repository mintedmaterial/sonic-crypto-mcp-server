// Agent State Management
// Manages persistent state for Durable Object agents

import { AgentConfig, AgentMetrics, WorkflowStep } from './types';

/**
 * Base state interface for all agents
 */
export interface BaseAgentState {
  // Identity
  agentId: string;
  agentType: 'overview' | 'charts' | 'trading' | 'intelligence' | 'chat';
  sessionId: string;
  userId?: string;

  // Configuration
  config: AgentConfig;

  // Lifecycle
  initialized: boolean;
  createdAt: number;
  lastActive: number;

  // Metrics
  metrics: AgentMetrics;

  // WebSocket connections
  activeConnections: number;

  // Workflow state
  activeWorkflows: Map<string, WorkflowStep[]>;

  // Cache
  cachedData: Map<string, { data: any; expiry: number }>;

  // Agent-specific state
  customState?: Record<string, any>;
}

/**
 * State manager utility class
 */
export class AgentStateManager {
  constructor(private state: BaseAgentState) {}

  /**
   * Initialize fresh state
   */
  static createInitialState(
    agentId: string,
    agentType: BaseAgentState['agentType'],
    sessionId: string,
    userId?: string,
    config?: AgentConfig
  ): BaseAgentState {
    return {
      agentId,
      agentType,
      sessionId,
      userId,
      config: config || {
        cacheTTL: 300000, // 5 minutes default
        enableCache: true,
        maxRequestsPerMinute: 60,
      },
      initialized: false,
      createdAt: Date.now(),
      lastActive: Date.now(),
      metrics: {
        agentId,
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
        cacheHitRate: 0,
        lastActive: Date.now(),
      },
      activeConnections: 0,
      activeWorkflows: new Map(),
      cachedData: new Map(),
      customState: {},
    };
  }

  /**
   * Update last active timestamp
   */
  touch() {
    this.state.lastActive = Date.now();
    this.state.metrics.lastActive = Date.now();
  }

  /**
   * Record request metrics
   */
  recordRequest(success: boolean, responseTime: number, cacheHit: boolean = false) {
    this.state.metrics.totalRequests++;
    if (success) {
      this.state.metrics.successfulRequests++;
    } else {
      this.state.metrics.failedRequests++;
    }

    // Update average response time
    const totalRequests = this.state.metrics.totalRequests;
    const currentAvg = this.state.metrics.averageResponseTime;
    this.state.metrics.averageResponseTime =
      (currentAvg * (totalRequests - 1) + responseTime) / totalRequests;

    // Update cache hit rate
    if (cacheHit) {
      const hits = this.state.metrics.cacheHitRate * (totalRequests - 1) + 1;
      this.state.metrics.cacheHitRate = hits / totalRequests;
    } else {
      const hits = this.state.metrics.cacheHitRate * (totalRequests - 1);
      this.state.metrics.cacheHitRate = hits / totalRequests;
    }

    this.touch();
  }

  /**
   * Get cached data if valid
   */
  getCache<T>(key: string): T | null {
    const cached = this.state.cachedData.get(key);
    if (!cached) return null;

    if (Date.now() > cached.expiry) {
      this.state.cachedData.delete(key);
      return null;
    }

    return cached.data as T;
  }

  /**
   * Set cached data with TTL
   */
  setCache(key: string, data: any, ttl?: number) {
    const cacheTTL = ttl || this.state.config.cacheTTL || 300000;
    this.state.cachedData.set(key, {
      data,
      expiry: Date.now() + cacheTTL,
    });
  }

  /**
   * Clear expired cache entries
   */
  cleanExpiredCache() {
    const now = Date.now();
    for (const [key, value] of this.state.cachedData.entries()) {
      if (now > value.expiry) {
        this.state.cachedData.delete(key);
      }
    }
  }

  /**
   * Start a workflow
   */
  startWorkflow(workflowId: string, steps: WorkflowStep[]) {
    this.state.activeWorkflows.set(workflowId, steps);
    this.touch();
  }

  /**
   * Update workflow step
   */
  updateWorkflowStep(
    workflowId: string,
    stepId: string,
    updates: Partial<WorkflowStep>
  ) {
    const workflow = this.state.activeWorkflows.get(workflowId);
    if (!workflow) return;

    const stepIndex = workflow.findIndex((s) => s.id === stepId);
    if (stepIndex === -1) return;

    workflow[stepIndex] = { ...workflow[stepIndex], ...updates };
    this.state.activeWorkflows.set(workflowId, workflow);
    this.touch();
  }

  /**
   * Complete workflow
   */
  completeWorkflow(workflowId: string) {
    this.state.activeWorkflows.delete(workflowId);
    this.touch();
  }

  /**
   * Get workflow status
   */
  getWorkflow(workflowId: string): WorkflowStep[] | undefined {
    return this.state.activeWorkflows.get(workflowId);
  }

  /**
   * Update custom state
   */
  updateCustomState(key: string, value: any) {
    if (!this.state.customState) {
      this.state.customState = {};
    }
    this.state.customState[key] = value;
    this.touch();
  }

  /**
   * Get custom state
   */
  getCustomState<T>(key: string): T | undefined {
    return this.state.customState?.[key] as T;
  }

  /**
   * Increment connection count
   */
  addConnection() {
    this.state.activeConnections++;
    this.touch();
  }

  /**
   * Decrement connection count
   */
  removeConnection() {
    this.state.activeConnections = Math.max(0, this.state.activeConnections - 1);
    this.touch();
  }

  /**
   * Mark agent as initialized
   */
  markInitialized() {
    this.state.initialized = true;
    this.touch();
  }

  /**
   * Get current state (for persistence)
   */
  getState(): BaseAgentState {
    return this.state;
  }

  /**
   * Get metrics
   */
  getMetrics(): AgentMetrics {
    return { ...this.state.metrics };
  }

  /**
   * Check if agent is healthy
   */
  isHealthy(): boolean {
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;

    // Healthy if:
    // 1. Initialized
    // 2. Active within last 5 minutes OR has active connections
    // 3. Success rate > 50% if has requests
    const isActive = (now - this.state.lastActive) < fiveMinutes || this.state.activeConnections > 0;
    const successRate = this.state.metrics.totalRequests > 0
      ? this.state.metrics.successfulRequests / this.state.metrics.totalRequests
      : 1;

    return this.state.initialized && isActive && successRate > 0.5;
  }

  /**
   * Serialize state for storage
   */
  serialize(): string {
    return JSON.stringify({
      ...this.state,
      activeWorkflows: Array.from(this.state.activeWorkflows.entries()),
      cachedData: Array.from(this.state.cachedData.entries()),
    });
  }

  /**
   * Deserialize state from storage
   */
  static deserialize(json: string): BaseAgentState {
    const parsed = JSON.parse(json);
    return {
      ...parsed,
      activeWorkflows: new Map(parsed.activeWorkflows || []),
      cachedData: new Map(parsed.cachedData || []),
    };
  }
}
