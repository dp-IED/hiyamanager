import { NextResponse } from 'next/server';
import { vapiClient } from '@/lib/vapi';
import { getActiveCallbacks } from '../../calls/queue/route';
import { getVapiCallMapping, removeVapiCallMapping } from '@/lib/db/queries';
import { getActiveCalls, updateCallStatus } from '@/lib/db/queries';
import { updateAgentStatus } from '@/lib/db/queries';

// In-memory store for signaled agents (demo only - could be moved to DB if needed)
const signaledAgents = new Set<string>();

// Store hangup timers to prevent duplicate hangups
const hangupTimers = new Map<string, NodeJS.Timeout>();

// Helper to get call ID for an agent
async function getCallIdForAgent(agentId: string): Promise<string | null> {
  // Check if agent has a VAPI call (for AI agents)
  const vapiMapping = await getVapiCallMapping(agentId);
  if (vapiMapping?.vapiCallId) {
    return vapiMapping.vapiCallId;
  }

  // For human agents or callbacks, check active callbacks
  const activeCallbacks = await getActiveCallbacks();
  const callback = activeCallbacks.find((cb) => cb.assignedAgentId === agentId);
  if (callback) {
    // For callbacks, we use the callback ID as the call identifier
    return callback.id;
  }

  // Check active calls
  const activeCalls = await getActiveCalls();
  const call = activeCalls.find((c) => c.agentId === agentId);
  if (call) {
    return call.id;
  }

  return null;
}

// Helper to end call and clean up state, then auto-assign waiting call
async function endCallForAgent(agentId: string) {
  try {
    const callId = await getCallIdForAgent(agentId);

    // Determine if this is an AI agent (has VAPI call)
    const isAIAgent = agentId.startsWith('AI-');
    const vapiMapping = await getVapiCallMapping(agentId);

    if (isAIAgent && vapiMapping?.vapiCallId) {
      // For AI agents, end the VAPI call
      try {
        await vapiClient.endCall(vapiMapping.vapiCallId);
        console.log(`[signal] Ended VAPI call ${vapiMapping.vapiCallId} for agent ${agentId}`);
        // Remove from VAPI call storage
        await removeVapiCallMapping(agentId);
      } catch (error) {
        console.error(`[signal] Failed to end VAPI call for agent ${agentId}:`, error);
      }
    }

    // Update call status to ended in database
    if (callId) {
      try {
        const now = Math.floor(Date.now() / 1000);
        await updateCallStatus(callId, 'ended', { endTime: now });
        console.log(`[signal] Updated call ${callId} status to ended for agent ${agentId}`);
      } catch (error) {
        console.error(`[signal] Failed to update call status for agent ${agentId}:`, error);
      }
    }

    // Update agent status to IDLE
    try {
      await updateAgentStatus(agentId, 'IDLE');
      console.log(`[signal] Updated agent ${agentId} status to IDLE`);
    } catch (error) {
      console.error(`[signal] Failed to update agent status for ${agentId}:`, error);
    }

    // Auto-assign a waiting call to this agent
    try {
      const { getWaitingCalls, assignQueueItem, createCall } = await import('@/lib/db/queries');
      const waitingCalls = await getWaitingCalls();

      if (waitingCalls.length > 0) {
        // Get the oldest waiting call (last in array since ordered by desc)
        const nextCall = waitingCalls[waitingCalls.length - 1];

        // Create active call
        const newCallId = `CALL-${nextCall.id}`;
        const now = Math.floor(Date.now() / 1000);
        await createCall({
          id: newCallId,
          customerPhone: nextCall.customerPhone,
          agentId,
          status: 'active',
          callType: 'callback',
          issue: nextCall.issue || undefined,
          startTime: now,
          waitTime: nextCall.waitTime,
        });

        // Assign queue item
        await assignQueueItem(nextCall.id, agentId, newCallId);

        // Update agent status back to ACTIVE
        await updateAgentStatus(agentId, 'ACTIVE');

        console.log(`[signal] Auto-assigned waiting call ${nextCall.id} to agent ${agentId}`);
      }
    } catch (error) {
      console.error(`[signal] Failed to auto-assign waiting call to agent ${agentId}:`, error);
    }

    // Remove from signaled agents
    signaledAgents.delete(agentId);

    // Clear hangup timer
    hangupTimers.delete(agentId);

    console.log(`[signal] Successfully ended call for agent ${agentId}`);
  } catch (error) {
    console.error(`[signal] Error ending call for agent ${agentId}:`, error);
    // Still clean up state even if ending failed
    signaledAgents.delete(agentId);
    hangupTimers.delete(agentId);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { agentId } = body;

    if (!agentId) {
      return NextResponse.json(
        { error: 'Agent ID required' },
        { status: 400 }
      );
    }

    // Check if already signaled
    const alreadySignaled = signaledAgents.has(agentId);
    if (alreadySignaled) {
      // If already signaled and timer exists, return early
      if (hangupTimers.has(agentId)) {
        return NextResponse.json({
          success: true,
          alreadySignaled: true,
          message: `Agent ${agentId} is already scheduled for hangup`,
          agentId,
        });
      }
    }

    // Mark as signaled
    signaledAgents.add(agentId);

    // Hang up with random delay between 10-30 seconds
    const delaySeconds = 10 + Math.floor(Math.random() * 21); // 10-30 seconds
    const delayMs = delaySeconds * 1000;

    // Schedule hangup
    const timer = setTimeout(() => {
      endCallForAgent(agentId);
    }, delayMs);

    hangupTimers.set(agentId, timer);

    console.log(`[signal] Scheduled hangup for agent ${agentId} in ${delaySeconds} seconds (${delayMs}ms)`);

    return NextResponse.json({
      success: true,
      alreadySignaled: false,
      message: `Call will be hung up in ${delaySeconds} seconds and agent will be available. Waiting call will be auto-assigned if available.`,
      agentId,
      hangupDelaySeconds: delaySeconds,
    });
  } catch (error) {
    console.error('Failed to signal agent:', error);
    return NextResponse.json(
      { error: 'Failed to signal agent' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agentId');

    if (agentId) {
      return NextResponse.json({
        isSignaled: signaledAgents.has(agentId),
      });
    }

    return NextResponse.json({
      signaledAgents: Array.from(signaledAgents),
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to get signaled agents' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agentId');

    if (agentId) {
      signaledAgents.delete(agentId);
      if (hangupTimers.has(agentId)) {
        clearTimeout(hangupTimers.get(agentId)!);
        hangupTimers.delete(agentId);
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: 'Agent ID required' },
      { status: 400 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to clear signal' },
      { status: 500 }
    );
  }
}
