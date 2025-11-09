import { NextResponse } from 'next/server';
import { getActiveCalls, getAgents } from '@/lib/db/queries';

/**
 * Retrieves all idle agent IDs (agents not currently assigned to any call).
 * 
 * @route GET /api/agents/idle
 * @returns {Promise<NextResponse>} Response containing an array of idle agent IDs
 * @throws {500} If fetching idle agents fails
 * 
 * @example
 * // Get all idle agent IDs
 * GET /api/agents/idle
 * 
 * Response: ["AI-003", "HUMAN-001"]
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

    const idleAgents = agents
      .filter((agent) => !agentCallMap.has(agent.id))
      .map(agent => agent.id);

    return NextResponse.json(idleAgents);
  } catch (error) {
    console.error('Failed to fetch idle agents:', error);
    return NextResponse.json({ error: 'Failed to fetch idle agents' }, { status: 500 });
  }
}

