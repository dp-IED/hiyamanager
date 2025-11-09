import { checkAndHandleExpiredCalls } from "@/lib/db/queries";
import { NextResponse } from "next/server";

/**
 * Checks for expired calls in the queue and handles them appropriately.
 * This endpoint processes calls that have exceeded their maximum wait time.
 * 
 * @route POST /api/calls/check-expired
 * @returns {Promise<NextResponse>} Response indicating success or failure
 * @throws {500} If checking expired calls fails
 * 
 * @example
 * // Check and handle expired calls
 * POST /api/calls/check-expired
 * 
 * Response: { "success": true }
 */
export async function POST() {
  try {
    await checkAndHandleExpiredCalls();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to check expired calls:', error);
    return NextResponse.json({ error: 'Failed to check expired calls' }, { status: 500 });
  }
}
