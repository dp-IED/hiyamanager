import { NextResponse } from 'next/server';
import { findAvailableAgent } from '../../agents/active-calls/route';
import { vapiClient } from '@/lib/vapi';
import { createVapiCallMapping } from '@/lib/db/queries';
import { createAgent, getNextAvailableAgentId } from '@/lib/db/queries';
import {
  getWaitingCalls,
  getActiveCallbacks,
  assignQueueItem,
  removeQueueItem,
  createQueueItem,
} from '@/lib/db/queries';
import { createCall, updateCallStatus } from '@/lib/db/queries';
import { getAbandonedCalls } from '@/lib/db/queries';

export async function GET() {
  const queue = await getWaitingCalls();
  // Transform queue items to match frontend expectations
  const transformedQueue = queue.map(item => ({
    id: item.id,
    customerPhone: item.customerPhone,
    waitTime: item.waitTime,
    queuedAt: item.queuedAt, // Unix timestamp (number in seconds)
    issue: item.issue || undefined,
    status: item.status,
  }));
  return NextResponse.json({ queue: transformedQueue });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { callId, assignmentType } = body;

    if (!assignmentType || (assignmentType !== 'existing' && assignmentType !== 'new')) {
      return NextResponse.json(
        { error: 'assignmentType must be "existing" or "new"' },
        { status: 400 }
      );
    }

    // Find the abandoned call from database
    const abandonedCalls = await getAbandonedCalls();
    const abandonedCall = abandonedCalls.find((c) => c.id === callId);

    if (!abandonedCall) {
      return NextResponse.json(
        { error: 'Call not found' },
        { status: 404 }
      );
    }

    let assignedAgentId: string | null;
    let createdNewAgent = false;

    if (assignmentType === 'existing') {
      // Find next available agent
      assignedAgentId = await findAvailableAgent();

      if (!assignedAgentId) {
        return NextResponse.json(
          { error: 'No available agents found. Please create a new agent.' },
          { status: 404 }
        );
      }
    } else {
      // Create new AI agent - get next available ID from database
      assignedAgentId = await getNextAvailableAgentId();
      createdNewAgent = true;

      // Create agent in database
      await createAgent({
        id: assignedAgentId,
        type: 'AI',
        status: 'ACTIVE',
      });

      // Create VAPI assistant for the new agent
      try {
        const assistant = await vapiClient.createAssistant({
          name: `AI Agent ${assignedAgentId}`,
          model: {
            provider: 'openai',
            model: 'gpt-4',
            messages: [
              {
                role: 'system',
                content: `You are a helpful customer support agent for a tech company. 
                We're currently experiencing a database failover incident that's affecting some services.
                Be empathetic, provide clear information, and help customers with workarounds when possible.
                Keep responses concise and professional.`,
              },
            ],
          },
          voice: {
            provider: '11labs',
            voiceId: '21m00Tcm4TlvDq8ikWAM', // Default voice
          },
          firstMessage: 'Hello! Thank you for calling support. I understand you may be experiencing some service issues. How can I help you today?',
        });

        console.log(`[queue] Created new AI agent ${assignedAgentId} with assistant ${assistant.id}`);

        // Create the actual call via VAPI
        if (assistant.id) {
          const call = await vapiClient.createCall({
            assistantId: assistant.id,
            customer: { number: abandonedCall.customerPhone },
          });

          // Store the call mapping in database
          await createVapiCallMapping({
            agentId: assignedAgentId,
            vapiCallId: call.id || '',
            vapiAssistantId: assistant.id,
          });
          console.log(`[queue] Created VAPI call ${call.id} for new agent ${assignedAgentId}`);
        }
      } catch (error) {
        console.error(`[queue] Failed to create assistant/call for new agent ${assignedAgentId}:`, error);
        // Continue anyway - agent ID is still assigned
      }
    }

    const assignedAt = Math.floor(Date.now() / 1000);

    // Update the abandoned call to active status with assigned agent
    // The call already exists in the database, so we just update it
    // Set callType to 'callback' since this is a callback for an abandoned call
    await updateCallStatus(callId, 'active', { 
      agentId: assignedAgentId,
      startTime: assignedAt,
      callType: 'callback',
    });

    const activeCallId = abandonedCall.id;

    // Check if there's a queue item for this call and assign it
    const queueItems = await getWaitingCalls();
    const queueItem = queueItems.find((q) => q.customerPhone === abandonedCall.customerPhone);
    if (queueItem) {
      await assignQueueItem(queueItem.id, assignedAgentId!, activeCallId);
    }

    const activeCallback = {
      id: activeCallId,
      customerPhone: abandonedCall.customerPhone,
      waitTime: abandonedCall.waitTime,
      timestamp: new Date(abandonedCall.createdAt * 1000),
      queuedAt: new Date(assignedAt * 1000),
      assignedAt: new Date(assignedAt * 1000),
      issue: abandonedCall.issue || undefined,
      assignedAgentId: assignedAgentId!,
    };

    return NextResponse.json({
      success: true,
      activeCallback,
      assignmentType,
      createdNewAgent,
      agentId: assignedAgentId,
    });
  } catch (error) {
    console.error('Failed to trigger callback:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to trigger callback: ${errorMessage}` },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const callId = searchParams.get('callId');

    if (callId) {
      await removeQueueItem(callId);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: 'Call ID required' },
      { status: 400 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to remove call from queue' },
      { status: 500 }
    );
  }
}

// Export functions for use in other routes
export { getActiveCallbacks };
