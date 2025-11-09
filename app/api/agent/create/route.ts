import { NextResponse } from 'next/server';
import { createAgent, getNextAvailableAgentId, reassignCall } from '@/lib/db/queries';

/**
 * Creates a new agent and automatically assigns it to a waiting call if available.
 * 
 * @route POST /api/agent/create
 * @param {Object} body - The request body
 * @param {string} body.type - The type of agent to create. Must be either 'AI' or 'HUMAN'
 * @returns {Promise<NextResponse>} Response containing the ID of the created agent
 * @throws {400} If type is missing or invalid
 * @throws {500} If agent creation fails
 * 
 * @example
 * // Create an AI agent
 * POST /api/agent/create
 * Body: { "type": "AI" }
 * Response: "AI-001"
 * 
 * @example
 * // Create a human agent
 * POST /api/agent/create
 * Body: { "type": "HUMAN" }
 * Response: "HUMAN-001"
 */
export async function POST(request: Request) {
  const { type } = await request.json();
  if (!type) {
    return NextResponse.json({ error: 'Type is required' }, { status: 400 });
  }
  if (type !== 'AI' && type !== 'HUMAN') {
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  }
  try {

    const agentId = await getNextAvailableAgentId();
    const agent = await createAgent({ id: agentId, type, status: 'IDLE' });

    console.log(`Created agent ${agent.id} with type ${agent.type} and status ${agent.status}`);

    await reassignCall(agent.id);

    return NextResponse.json(agent.id);
  } catch (error) {
    console.error('Failed to create agent:', error);
    return NextResponse.json({ error: 'Failed to create agent' }, { status: 500 });
  }
}
