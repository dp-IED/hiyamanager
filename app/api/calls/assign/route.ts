import { NextResponse } from "next/server";
import { reassignCall } from "@/lib/db/queries";

/**
 * Assigns a waiting call to a specific agent and optionally assigns a conversation seed.
 * 
 * @route POST /api/calls/assign
 * @param {Object} body - The request body
 * @param {string} body.agentId - The ID of the agent to assign the call to (required)
 * @param {boolean} [body.assignConversation=true] - Whether to assign a conversation seed to the call (optional, defaults to true)
 * @returns {Promise<NextResponse>} Response containing the ID of the assigned call
 * @throws {404} If no waiting calls are available to assign
 * 
 * @example
 * // Assign a call with conversation seed (default)
 * POST /api/calls/assign
 * Body: { "agentId": "AGENT-123" }
 * Response: "CALL-456"
 * 
 * @example
 * // Assign a call without conversation seed
 * POST /api/calls/assign
 * Body: { "agentId": "AGENT-123", "assignConversation": false }
 * Response: "CALL-456"
 */
export async function POST(request: Request) {
  const { agentId, assignConversation = true } = await request.json();
  const assignedCallId = await reassignCall(agentId, assignConversation);
  if (!assignedCallId) {
    return NextResponse.json({ error: 'No waiting calls available' }, { status: 404 });
  }

  return NextResponse.json(assignedCallId);
}
