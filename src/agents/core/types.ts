// Agent Core Types
// Based on patterns from s3vcflo-vibesdk-production

import { Env } from '../../config/env';

/**
 * Base message interface for agent communication
 */
export interface AgentMessage {
  id: string;
  type: 'user' | 'agent' | 'system';
  content: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

/**
 * WebSocket message types for real-time updates
 */
export type WebSocketMessageType =
  | 'agent_status'
  | 'data_update'
  | 'analysis_complete'
  | 'error'
  | 'workflow_status'
  | 'human_input_required';

export interface WebSocketMessage {
  type: WebSocketMessageType;
  agentId: string;
  data: any;
  timestamp: number;
}

/**
 * Agent operation context
 */
export interface AgentContext {
  env: Env;
  agentId: string;
  sessionId: string;
  userId?: string;
  metadata?: Record<string, any>;
}

/**
 * Operation result wrapper
 */
export interface OperationResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
  cacheHit?: boolean;
}

/**
 * Agent initialization parameters
 */
export interface AgentInitParams {
  agentId: string;
  sessionId: string;
  userId?: string;
  config?: AgentConfig;
}

/**
 * Agent configuration
 */
export interface AgentConfig {
  // AI Model preferences
  preferredModel?: string;
  fallbackModels?: string[];

  // Caching strategy
  cacheTTL?: number;
  enableCache?: boolean;

  // Rate limiting
  maxRequestsPerMinute?: number;

  // Custom settings per agent type
  customSettings?: Record<string, any>;
}

/**
 * Data source configuration
 */
export interface DataSourceConfig {
  name: string;
  priority: number; // Lower = higher priority
  timeout?: number;
  retryCount?: number;
  enableFallback?: boolean;
}

/**
 * Workflow step definition
 */
export interface WorkflowStep {
  id: string;
  name: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'awaiting_input';
  startTime?: number;
  endTime?: number;
  error?: string;
  data?: any;
}

/**
 * Human-in-Loop request
 */
export interface HumanInputRequest {
  workflowId: string;
  stepId: string;
  prompt: string;
  inputType: 'approval' | 'text' | 'selection' | 'file';
  options?: string[];
  timeout: number; // milliseconds
  defaultValue?: any;
}

/**
 * Human-in-Loop response
 */
export interface HumanInputResponse {
  workflowId: string;
  stepId: string;
  approved?: boolean;
  value?: any;
  timestamp: number;
}

/**
 * Agent capability definition
 */
export interface AgentCapability {
  name: string;
  description: string;
  requiredTools: string[];
  dataSourcesDependencies: string[];
}

/**
 * Multi-agent coordination message
 */
export interface InterAgentMessage {
  fromAgent: string;
  toAgent: string;
  type: 'request' | 'response' | 'notification';
  action: string;
  payload: any;
  timestamp: number;
  correlationId?: string;
}

/**
 * Agent performance metrics
 */
export interface AgentMetrics {
  agentId: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  cacheHitRate: number;
  lastActive: number;
}

/**
 * Scheduled task definition
 */
export interface ScheduledTask {
  id: string;
  agentId: string;
  cronExpression: string;
  action: string;
  params?: any;
  enabled: boolean;
  lastRun?: number;
  nextRun?: number;
}
