import { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { calls, agents } from './schema';

/**
 * Call interface inferred from the database schema
 * Represents a call record from the calls table
 */
export type Call = InferSelectModel<typeof calls>;

/**
 * Call insert interface for creating new calls
 */
export type CallInsert = InferInsertModel<typeof calls>;

/**
 * Agent interface inferred from the database schema
 * Represents an agent record from the agents table
 */
export type Agent = InferSelectModel<typeof agents>;

/**
 * Agent insert interface for creating new agents
 */
export type AgentInsert = InferInsertModel<typeof agents>;

/**
 * Agent with current call - extends the base Agent type
 * Used in UI components that need to display agent's current call
 */
export interface AgentWithCall extends Agent {
  current_call: Call | null;
}

/**
 * Metrics data structure returned by the /api/metrics endpoint
 */
export interface MetricsData {
  waitingCalls: Call[];
  activeCalls: Call[];
  activeAgents: AgentWithCall[];
  idleAgents: Agent[];
  totalAgents: number;
  agents: Agent[];
  incidents: Array<{
    id: string;
    title: string;
  }>;
  chartData?: {
    data: Array<{
      time: string;
      calls: number;
      active: number;
      waiting: number;
      isCurrent?: boolean;
    }>;
    current: {
      total: number;
      active: number;
      waiting: number;
    };
  };
  waitingCallsDetails?: Array<{
    id: string;
    customerPhone: string;
    issue?: string | null;
    queuedAt: number;
    waitTime: number;
  }>;
  averageWaitTime: number;
  forecastData?: {
    anomaly_detection?: {
      detected: boolean;
      severity: 'CRITICAL' | 'HIGH' | 'NORMAL';
      incident_type: string;
      peak_time_minutes: number;
    };
    recent_incidents?: Array<{
      time: Date | string;
      description: string;
    }>;
  };
}

