import { NextResponse } from 'next/server';
import { getActiveCalls, getAgents, getWaitingCalls, getAverageWaitTime } from '@/lib/db/queries';

/**
 * Retrieves summary metrics and status numbers for the call center system.
 * Answers the question "What's the status?" with key counts and averages.
 * 
 * @route GET /api/metrics
 * @returns {Promise<NextResponse>} Response containing summary metrics including:
 *   - waitingCallsCount: Number of calls waiting in the queue
 *   - activeCallsCount: Number of currently active calls
 *   - totalAgents: Total number of agents in the system
 *   - activeAgentsCount: Number of agents currently handling calls
 *   - idleAgentsCount: Number of agents not currently assigned to calls
 *   - averageWaitTime: Average wait time for calls in the queue (in seconds)
 * @throws {500} If fetching metrics fails
 * 
 * @example
 * // Get summary metrics
 * GET /api/metrics
 * 
 * Response: {
 *   waitingCallsCount: 5,
 *   activeCallsCount: 8,
 *   totalAgents: 10,
 *   activeAgentsCount: 8,
 *   idleAgentsCount: 2,
 *   averageWaitTime: 120
 * }
 */
export async function GET() {
  try {
    const [activeCalls, waitingCalls, agents] = await Promise.all([
      getActiveCalls(),
      getWaitingCalls(),
      getAgents(),
    ]);

    const agentCallMap = new Map<string, boolean>();
    activeCalls.forEach(call => {
      if (call.agentId) {
        agentCallMap.set(call.agentId, true);
      }
    });

    const activeAgentsCount = agents.filter((agent) => {
      const hasActiveCall = agentCallMap.has(agent.id);
      return agent.status === 'ACTIVE' || hasActiveCall;
    }).length;

    const idleAgentsCount = agents.filter((agent) => {
      return !agentCallMap.has(agent.id);
    }).length;

    const averageWaitTime = await getAverageWaitTime();

    const metrics = {
      waitingCallsCount: waitingCalls.length,
      activeCallsCount: activeCalls.length,
      totalAgents: agents.length,
      activeAgentsCount,
      idleAgentsCount,
      averageWaitTime,
    };

    return NextResponse.json(metrics);
  } catch (error) {
    console.error('Failed to fetch metrics:', error);
    return NextResponse.json({ error: 'Failed to fetch metrics' }, { status: 500 });
  }
}
