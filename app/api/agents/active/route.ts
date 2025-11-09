import { NextResponse } from 'next/server';
import { getActiveCalls, getAgents } from '@/lib/db/queries';

/**
 * Retrieves all active agent IDs (agents currently handling calls or with ACTIVE status).
 * 
 * @route GET /api/agents/active
 * @returns {Promise<NextResponse>} Response containing an array of active agent IDs
 * @throws {500} If fetching active agents fails
 * 
 * @example
 * // Get all active agent IDs
 * GET /api/agents/active
 * 
 * Response: ["AI-001", "AI-002"]
 */
export async function GET() {
  try {
    const [activeCalls, agents] = await Promise.all([
      getActiveCalls(),
      getAgents(),
    ]);

    const agentCallMap = new Map<string, boolean>();
    activeCalls.forEach(call => {
      if (call.agentId) {
        agentCallMap.set(call.agentId, true);
      }
    });

    const activeAgents = agents
      .filter((agent) => {
        const hasActiveCall = agentCallMap.has(agent.id);
        return agent.status === 'ACTIVE' || hasActiveCall;
      })
      .map(agent => agent.id);

    return NextResponse.json(activeAgents);
  } catch (error) {
    console.error('Failed to fetch active agents:', error);
    return NextResponse.json({ error: 'Failed to fetch active agents' }, { status: 500 });
  }
}

