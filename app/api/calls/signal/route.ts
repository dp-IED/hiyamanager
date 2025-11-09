import { getCallById, reassignCall, closeCall } from "@/lib/db/queries";
import { NextResponse } from "next/server";

/**
 * Signals that a call should be ended and automatically reassigns the agent to a new waiting call.
 * 
 * @route POST /api/calls/signal
 * @param {Object} body - The request body
 * @param {string} body.callId - The ID of the call to end (required)
 * @returns {Promise<NextResponse>} Response confirming the call was signaled and agent was reassigned
 * @throws {404} If the call or agent is not found
 * @throws {400} If the call is not in an active status
 * 
 * @example
 * // Signal a call to end
 * POST /api/calls/signal
 * Body: { "callId": "CALL-123" }
 * 
 * Response: { "message": "Call signaled and agent reassigned" }
 */
export async function POST(request: Request) {
  const { callId } = await request.json();
  

  const call = await getCallById(callId);
  if (!call) {
    return NextResponse.json({ error: "Call not found" }, { status: 404 });
  }

  if (call.status !== "active") {
    return NextResponse.json({ error: "Call is not active" }, { status: 400 });
  }

  const agentId = call.agentId;
  if (!agentId) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  // Use closeCall to properly end the call with endTime
  await closeCall(callId);

  // Reassign the agent to the next waiting call (reassignCall will handle closing any existing call)
  await reassignCall(agentId);

  return NextResponse.json({ message: "Call signaled and agent reassigned" });
}
