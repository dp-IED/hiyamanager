import { NextResponse } from 'next/server';
import { getWaitingCalls } from '@/lib/db/queries';

/**
 * Retrieves all waiting call IDs in the queue.
 * 
 * @route GET /api/calls/waiting
 * @returns {Promise<NextResponse>} Response containing an array of waiting call IDs
 * @throws {500} If fetching waiting calls fails
 * 
 * @example
 * // Get all waiting call IDs
 * GET /api/calls/waiting
 * 
 * Response: ["CALL-123", "CALL-456", "CALL-789"]
 */
export async function GET() {
  try {
    const waitingCalls = await getWaitingCalls();
    const callIds = waitingCalls.map(call => call.id);
    return NextResponse.json(callIds);
  } catch (error) {
    console.error('Failed to fetch waiting calls:', error);
    return NextResponse.json({ error: 'Failed to fetch waiting calls' }, { status: 500 });
  }
}

