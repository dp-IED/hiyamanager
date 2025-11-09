import { NextResponse } from 'next/server';
import { getAgentById } from '@/lib/db/queries';
import { Agent } from '@/lib/db/types';

/**
 * Retrieves a full agent object by its ID.
 * 
 * @route GET /api/agent/[id]
 * @param {Object} params - Route parameters
 * @param {string} params.id - The ID of the agent to retrieve
 * @returns {Promise<NextResponse>} Response containing the full agent object
 * @throws {400} If agent ID is missing
 * @throws {404} If the agent is not found
 * @throws {500} If fetching the agent fails
 * 
 * @example
 * // Get a specific agent
 * GET /api/agent/AI-001
 * 
 * Response: {
 *   id: "AI-001",
 *   type: "AI",
 *   status: "ACTIVE",
 *   callsHandled: 42,
 *   createdAt: 1234567890,
 *   updatedAt: 1234567890
 * }
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const agentId = (await params).id;

    if (!agentId) {
      return NextResponse.json({ error: 'Agent ID is required' }, { status: 400 });
    }

    const agent: Agent | null = await getAgentById(agentId);

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    return NextResponse.json(agent);
  } catch (error) {
    console.error('Failed to fetch agent:', error);
    return NextResponse.json({ error: 'Failed to fetch agent' }, { status: 500 });
  }
}

