import { NextResponse } from 'next/server';
import { getAbandonedCalls, createCall, updateCallStatus } from '@/lib/db/queries';

export async function GET() {
  const calls = await getAbandonedCalls();
  // Transform database calls to match component expectations
  const transformedCalls = calls.map(call => ({
    id: call.id,
    customerPhone: call.customerPhone,
    waitTime: call.waitTime,
    timestamp: call.createdAt ? new Date(call.createdAt * 1000).toISOString() : new Date().toISOString(), // Convert Unix timestamp to ISO string
    issue: call.issue || undefined,
    status: call.status as 'abandoned' | 'queued' | 'assigned',
  }));
  return NextResponse.json({ calls: transformedCalls });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { customerPhone, waitTime, issue } = body;

    const callId = `ABANDONED-${String(Date.now()).slice(-8)}`;
    const now = Math.floor(Date.now() / 1000);

    await createCall({
      id: callId,
      customerPhone,
      status: 'abandoned',
      callType: 'regular',
      issue: issue || 'Unknown issue',
      waitTime,
    });

    const abandonedCall = {
      id: callId,
      customerPhone,
      waitTime,
      timestamp: new Date(now * 1000),
      issue: issue || 'Unknown issue',
      status: 'abandoned' as const,
    };

    return NextResponse.json({ success: true, call: abandonedCall });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to record abandoned call' },
      { status: 500 }
    );
  }
}

// Export function for shared state access (for backward compatibility during migration)
export { getAbandonedCalls };

export function updateAbandonedCallStatus(callId: string, status: 'abandoned' | 'queued' | 'assigned') {
  // This function is kept for backward compatibility but is now a no-op
  // The actual status updates are handled by the database queries
  // In the future, this could be removed once all callers are updated
  if (status === 'assigned') {
    updateCallStatus(callId, 'active').catch(console.error);
  }
}
