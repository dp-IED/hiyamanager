import { NextResponse } from 'next/server';
import { getAgents } from '@/lib/db/queries';

/**
 * Retrieves all agent IDs in the system.
 * 
 * @route GET /api/agents
 * @returns {Promise<NextResponse>} Response containing an array of all agent IDs
 * @throws {500} If fetching agents fails
 * 
 * @example
 * // Get all agent IDs
 * GET /api/agents
 * 
 * Response: ["AI-001", "AI-002", "HUMAN-001"]
 */
export async function GET() {
  try {
    const agents = await getAgents();
    const agentIds = agents.map(agent => agent.id);
    return NextResponse.json(agentIds);
  } catch (error) {
    console.error('Failed to fetch agents:', error);
    return NextResponse.json({ error: 'Failed to fetch agents' }, { status: 500 });
  }
}

