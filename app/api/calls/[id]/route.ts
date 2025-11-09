import { NextResponse } from 'next/server';
import { getCallById } from '@/lib/db/queries';
import { Call } from '@/lib/db/types';

/**
 * Retrieves a full call object by its ID.
 * 
 * @route GET /api/calls/[id]
 * @param {Object} params - Route parameters
 * @param {string} params.id - The ID of the call to retrieve
 * @returns {Promise<NextResponse>} Response containing the full call object
 * @throws {400} If call ID is missing
 * @throws {404} If the call is not found
 * @throws {500} If fetching the call fails
 * 
 * @example
 * // Get a specific call
 * GET /api/calls/CALL-123
 * 
 * Response: {
 *   id: "CALL-123",
 *   customerPhone: "+1234567890",
 *   status: "active",
 *   agentId: "AI-001",
 *   issue: "billing",
 *   createdAt: 1234567890,
 *   ...
 * }
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const callId = (await params).id;

    if (!callId) {
      return NextResponse.json({ error: 'Call ID is required' }, { status: 400 });
    }

    const call: Call | null = await getCallById(callId);

    if (!call) {
      return NextResponse.json({ error: 'Call not found' }, { status: 404 });
    }

    return NextResponse.json(call);
  } catch (error) {
    console.error('Failed to fetch call:', error);
    return NextResponse.json({ error: 'Failed to fetch call' }, { status: 500 });
  }
}

