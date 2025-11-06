import { NextResponse } from 'next/server';
import { getWaitingCalls, assignQueueItem, removeQueueItem } from '@/lib/db/queries';
import { createCall } from '@/lib/db/queries';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { agentId } = body;

    const queue = await getWaitingCalls();
    if (queue.length === 0) {
      return NextResponse.json(
        { error: 'No calls in queue' },
        { status: 404 }
      );
    }

    // Get the oldest call from queue (FIFO - first in queue)
    const nextCall = queue[queue.length - 1]; // Last item is oldest (ordered by desc queuedAt)
    
    // Create active call
    const callId = `CALL-${nextCall.id}`;
    const now = Math.floor(Date.now() / 1000);
    await createCall({
      id: callId,
      customerPhone: nextCall.customerPhone,
      agentId,
      status: 'active',
      callType: 'callback',
      issue: nextCall.issue || undefined,
      startTime: now,
      waitTime: nextCall.waitTime,
    });

    // Assign queue item
    await assignQueueItem(nextCall.id, agentId, callId);
    
    // Debug logging
    console.log(`[queue/assign] Assigned call ${nextCall.id} to agent ${agentId}. Callback added.`);

    // Mock Hiya Branded Call API (for demo)
    // In production, this would call the actual Hiya API
    const brandedCallResult = {
      success: true,
      callId: `BRANDED-${Date.now()}`,
      message: `Calling ${nextCall.customerPhone} via Hiya Branded Call`,
    };

    const assignedCall = {
      id: nextCall.id,
      customerPhone: nextCall.customerPhone,
      waitTime: nextCall.waitTime,
      timestamp: new Date(nextCall.queuedAt * 1000),
      queuedAt: new Date(nextCall.queuedAt * 1000),
      assignedAt: new Date(now * 1000),
      issue: nextCall.issue,
      assignedAgentId: agentId,
    };

    return NextResponse.json({
      success: true,
      assignedCall,
      brandedCall: brandedCallResult,
    });
  } catch (error) {
    console.error('Failed to assign call:', error);
    return NextResponse.json(
      { error: 'Failed to assign call' },
      { status: 500 }
    );
  }
}
