// Base Agent Durable Object
// All specialized agents (Overview, Charts, Trading, Intelligence, Chat) extend this

import { DurableObject } from 'cloudflare:workers';
import { Env } from '../../config/env';
import {
  AgentMessage,
  WebSocketMessage,
  AgentContext,
  OperationResult,
  AgentInitParams,
  HumanInputRequest,
  HumanInputResponse,
  InterAgentMessage,
} from './types';
import { BaseAgentState, AgentStateManager } from './agent-state';

/**
 * BaseAgent - Foundation for all specialized agents
 *
 * Provides:
 * - State management with persistence
 * - WebSocket communication
 * - Caching strategies
 * - Metrics tracking
 * - Error handling
 * - Inter-agent communication
 */
export abstract class BaseAgent extends DurableObject<Env> {
  protected stateManager!: AgentStateManager;
  protected connections: Map<string, WebSocket> = new Map();
  protected abstract agentType: BaseAgentState['agentType'];

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
  }

  /**
   * Initialize agent state
   * Must be called before using the agent
   */
  async initialize(params: AgentInitParams): Promise<OperationResult> {
    try {
      // Try to load existing state
      let state = await this.ctx.storage.get<string>('state');

      if (state) {
        // Restore existing state
        const parsedState = AgentStateManager.deserialize(state);
        this.stateManager = new AgentStateManager(parsedState);
      } else {
        // Create new state
        const newState = AgentStateManager.createInitialState(
          params.agentId,
          this.agentType,
          params.sessionId,
          params.userId,
          params.config
        );
        this.stateManager = new AgentStateManager(newState);
      }

      // Mark as initialized
      this.stateManager.markInitialized();
      await this.persistState();

      // Call agent-specific initialization
      await this.onInitialize(params);

      return {
        success: true,
        data: { agentId: params.agentId, initialized: true },
        timestamp: Date.now(),
      };
    } catch (error: any) {
      console.error(`[${this.agentType}] Initialization error:`, error);
      return {
        success: false,
        error: error.message,
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Agent-specific initialization hook
   * Override in derived classes
   */
  protected async onInitialize(params: AgentInitParams): Promise<void> {
    // Override in derived classes
  }

  /**
   * Handle WebSocket connections for real-time updates
   */
  async handleWebSocket(request: Request): Promise<Response> {
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    this.ctx.acceptWebSocket(server);

    const connectionId = crypto.randomUUID();
    this.connections.set(connectionId, server);
    this.stateManager.addConnection();

    // Send initial status
    this.sendWebSocketMessage(server, {
      type: 'agent_status',
      agentId: this.stateManager.getState().agentId,
      data: {
        status: 'connected',
        metrics: this.stateManager.getMetrics(),
      },
      timestamp: Date.now(),
    });

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  /**
   * Handle WebSocket messages from clients
   */
  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    try {
      if (typeof message !== 'string') return;

      const parsed = JSON.parse(message);
      await this.onWebSocketMessage(ws, parsed);
    } catch (error) {
      console.error(`[${this.agentType}] WebSocket message error:`, error);
    }
  }

  /**
   * Handle WebSocket close events
   */
  async webSocketClose(ws: WebSocket, code: number, reason: string, wasClean: boolean) {
    // Remove connection
    for (const [id, socket] of this.connections.entries()) {
      if (socket === ws) {
        this.connections.delete(id);
        this.stateManager.removeConnection();
        break;
      }
    }
  }

  /**
   * Agent-specific WebSocket message handler
   * Override in derived classes
   */
  protected async onWebSocketMessage(ws: WebSocket, message: any): Promise<void> {
    // Override in derived classes
  }

  /**
   * Send message to specific WebSocket
   */
  protected sendWebSocketMessage(ws: WebSocket, message: WebSocketMessage) {
    try {
      ws.send(JSON.stringify(message));
    } catch (error) {
      console.error(`[${this.agentType}] Failed to send WebSocket message:`, error);
    }
  }

  /**
   * Broadcast message to all connected clients
   */
  protected broadcast(message: WebSocketMessage) {
    for (const ws of this.connections.values()) {
      this.sendWebSocketMessage(ws, message);
    }
  }

  /**
   * Execute operation with metrics tracking
   */
  protected async executeOperation<T>(
    operation: () => Promise<T>,
    cacheKey?: string
  ): Promise<OperationResult<T>> {
    const startTime = Date.now();
    let cacheHit = false;

    try {
      // Check cache if key provided
      if (cacheKey && this.stateManager.getState().config.enableCache) {
        const cached = this.stateManager.getCache<T>(cacheKey);
        if (cached !== null) {
          const responseTime = Date.now() - startTime;
          this.stateManager.recordRequest(true, responseTime, true);
          await this.persistState();

          return {
            success: true,
            data: cached,
            timestamp: Date.now(),
            cacheHit: true,
          };
        }
      }

      // Execute operation
      const result = await operation();

      // Cache result if key provided
      if (cacheKey) {
        this.stateManager.setCache(cacheKey, result);
      }

      const responseTime = Date.now() - startTime;
      this.stateManager.recordRequest(true, responseTime, cacheHit);
      await this.persistState();

      return {
        success: true,
        data: result,
        timestamp: Date.now(),
        cacheHit,
      };
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      this.stateManager.recordRequest(false, responseTime, false);
      await this.persistState();

      console.error(`[${this.agentType}] Operation error:`, error);

      return {
        success: false,
        error: error.message,
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Request data from another agent
   */
  protected async requestFromAgent(
    targetAgent: string,
    action: string,
    payload: any
  ): Promise<OperationResult> {
    try {
      const message: InterAgentMessage = {
        fromAgent: this.stateManager.getState().agentId,
        toAgent: targetAgent,
        type: 'request',
        action,
        payload,
        timestamp: Date.now(),
        correlationId: crypto.randomUUID(),
      };

      // Get target agent stub
      // (Implementation depends on how agents are registered)
      // For now, return placeholder
      return {
        success: false,
        error: 'Inter-agent communication not yet implemented',
        timestamp: Date.now(),
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Request human input (Human-in-Loop workflow)
   */
  protected async requestHumanInput(
    request: HumanInputRequest
  ): Promise<HumanInputResponse | null> {
    return new Promise((resolve) => {
      // Broadcast request to all connected clients
      this.broadcast({
        type: 'human_input_required',
        agentId: this.stateManager.getState().agentId,
        data: request,
        timestamp: Date.now(),
      });

      // Set timeout
      const timeout = setTimeout(() => {
        resolve(null); // Timeout - no response
      }, request.timeout);

      // Store resolver in state for when response comes back
      // (Simplified - full implementation would use workflow system)
      this.stateManager.updateCustomState(`human_input_${request.workflowId}_${request.stepId}`, {
        resolve,
        timeout,
      });
    });
  }

  /**
   * Handle human input response
   */
  protected resolveHumanInput(response: HumanInputResponse) {
    const key = `human_input_${response.workflowId}_${response.stepId}`;
    const pending = this.stateManager.getCustomState<{
      resolve: (value: HumanInputResponse) => void;
      timeout: number;
    }>(key);

    if (pending) {
      clearTimeout(pending.timeout);
      pending.resolve(response);
      this.stateManager.updateCustomState(key, undefined);
    }
  }

  /**
   * Get agent context for operations
   */
  protected getContext(): AgentContext {
    const state = this.stateManager.getState();
    return {
      env: this.env,
      agentId: state.agentId,
      sessionId: state.sessionId,
      userId: state.userId,
      metadata: state.customState,
    };
  }

  /**
   * Persist state to Durable Object storage
   */
  protected async persistState(): Promise<void> {
    try {
      const serialized = this.stateManager.serialize();
      await this.ctx.storage.put('state', serialized);
    } catch (error) {
      console.error(`[${this.agentType}] Failed to persist state:`, error);
    }
  }

  /**
   * Clean up expired cache entries
   * Should be called periodically
   */
  protected async cleanupCache(): Promise<void> {
    this.stateManager.cleanExpiredCache();
    await this.persistState();
  }

  /**
   * Get agent status
   */
  async getStatus(): Promise<OperationResult> {
    return {
      success: true,
      data: {
        agentType: this.agentType,
        metrics: this.stateManager.getMetrics(),
        healthy: this.stateManager.isHealthy(),
        activeConnections: this.stateManager.getState().activeConnections,
        activeWorkflows: this.stateManager.getState().activeWorkflows.size,
      },
      timestamp: Date.now(),
    };
  }

  /**
   * Get agent state (for debugging)
   */
  async getState(): Promise<BaseAgentState> {
    return this.stateManager.getState();
  }

  /**
   * Reset agent state
   * WARNING: Destroys all data
   */
  async reset(): Promise<OperationResult> {
    try {
      await this.ctx.storage.deleteAll();
      this.connections.clear();

      return {
        success: true,
        data: { message: 'Agent reset complete' },
        timestamp: Date.now(),
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Handle HTTP fetch requests
   * Override in derived classes for custom endpoints
   */
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // WebSocket upgrade
    if (request.headers.get('Upgrade') === 'websocket') {
      return this.handleWebSocket(request);
    }

    // Common endpoints
    if (url.pathname === '/status' && request.method === 'GET') {
      const status = await this.getStatus();
      return Response.json(status);
    }

    if (url.pathname === '/state' && request.method === 'GET') {
      const state = await this.getState();
      return Response.json(state);
    }

    if (url.pathname === '/reset' && request.method === 'POST') {
      const result = await this.reset();
      return Response.json(result);
    }

    // Delegate to agent-specific handler
    return this.handleRequest(request);
  }

  /**
   * Agent-specific request handler
   * Override in derived classes
   */
  protected async handleRequest(request: Request): Promise<Response> {
    return new Response('Not implemented', { status: 501 });
  }

  /**
   * Scheduled cleanup alarm
   */
  async alarm() {
    await this.cleanupCache();

    // Schedule next cleanup in 1 hour
    await this.ctx.storage.setAlarm(Date.now() + 60 * 60 * 1000);
  }
}
