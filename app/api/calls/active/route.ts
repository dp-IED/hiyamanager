import { getActiveCalls } from "@/lib/db/queries";
import { NextResponse } from "next/server";

/**
 * Retrieves all currently active call IDs.
 * 
 * @route GET /api/calls/active
 * @returns {Promise<NextResponse>} Response containing an array of active call IDs
 * @throws {500} If fetching active calls fails
 * 
 * @example
 * // Get all active call IDs
 * GET /api/calls/active
 * 
 * Response: ["CALL-123", "CALL-456", "CALL-789"]
 */
export async function GET() {
  try {
    const activeCalls = await getActiveCalls();
    const callIds = activeCalls.map(call => call.id);
    return NextResponse.json(callIds);
  } catch (error) {
    console.error('Failed to fetch active calls:', error);
    return NextResponse.json({ error: 'Failed to fetch active calls' }, { status: 500 });
  }
}
