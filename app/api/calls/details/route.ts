import { getCallById, getCallTranscript } from "@/lib/db/queries";
import { NextResponse } from "next/server";

/**
 * Retrieves detailed information about a specific call, including its transcript and summary.
 * 
 * @route GET /api/calls/details
 * @param {string} callId - The ID of the call to retrieve details for (required query parameter)
 * @returns {Promise<NextResponse>} Response containing call details including summary, transcript, customerPhone, and issue
 * @throws {400} If callId is missing
 * @throws {404} If the call is not found
 * @throws {500} If fetching call details fails
 * 
 * @example
 * // Get call details
 * GET /api/calls/details?callId=CALL-123
 * 
 * Response: {
 *   summary: "Customer called about billing issue...",
 *   transcript: "Agent: Hello, how can I help you?...",
 *   customerPhone: "+1234567890",
 *   issue: "billing"
 * }
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const callId = searchParams.get('callId');

    if (!callId) {
      return NextResponse.json({ error: 'callId is required' }, { status: 400 });
    }

    // Fetch call and transcript data
    const [call, transcriptData] = await Promise.all([
      getCallById(callId),
      getCallTranscript(callId),
    ]);

    if (!call) {
      return NextResponse.json({ error: 'Call not found' }, { status: 404 });
    }

    // Return the data in the format expected by the component
    return NextResponse.json({
      summary: transcriptData?.summary || null,
      transcript: transcriptData?.transcript || null,
      customerPhone: call.customerPhone,
      issue: call.issue || null,
    });
  } catch (error) {
    console.error('Failed to fetch call details:', error);
    return NextResponse.json({ error: 'Failed to fetch call details' }, { status: 500 });
  }
}
