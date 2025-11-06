import { NextResponse } from 'next/server';
import { vapiClient } from '@/lib/vapi';
import { createVapiCallMapping, getVapiCallMapping, removeVapiCallMapping } from '@/lib/db/queries';
import { createCall, getCallById } from '@/lib/db/queries';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { assistantId, customerPhone, agentId } = body;

    if (!assistantId) {
      return NextResponse.json(
        { error: 'Assistant ID required' },
        { status: 400 }
      );
    }

    // Create call via Vapi
    const call = await vapiClient.createCall({
      assistantId,
      customer: customerPhone ? { number: customerPhone } : undefined,
    });

    // Store call with agent mapping in database
    if (agentId && call.id) {
      await createVapiCallMapping({
        agentId,
        vapiCallId: call.id,
        vapiAssistantId: assistantId,
      });

      // Also create a call record in the database
      const now = Math.floor(Date.now() / 1000);
      await createCall({
        id: call.id,
        customerPhone: customerPhone || '',
        agentId,
        status: 'active',
        callType: 'regular',
        startTime: now,
        waitTime: 0,
        vapiCallId: call.id,
      });
    }

    return NextResponse.json({
      success: true,
      call,
      agentId,
    });
  } catch (error: any) {
    console.error('Failed to create Vapi call:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create call' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const callId = searchParams.get('callId');
    const agentId = searchParams.get('agentId');

    if (callId) {
      const call = await vapiClient.getCall(callId);
      return NextResponse.json({ call });
    }

    if (agentId) {
      const mapping = await getVapiCallMapping(agentId);
      if (mapping) {
        const call = await vapiClient.getCall(mapping.vapiCallId);
        return NextResponse.json({ call });
      }
    }

    // Return all active calls for agents with VAPI mappings
    // This would require a more complex query in production
    return NextResponse.json({ calls: [] });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to get call' },
      { status: 500 }
    );
  }
}

// Export helper functions for use in other routes
export async function getCallForAgent(agentId: string) {
  const mapping = await getVapiCallMapping(agentId);
  if (mapping) {
    return {
      id: mapping.vapiCallId,
      assistantId: mapping.vapiAssistantId,
    };
  }
  return null;
}

export async function setCallForAgent(agentId: string, call: any) {
  if (call.id && call.assistantId) {
    await createVapiCallMapping({
      agentId,
      vapiCallId: call.id,
      vapiAssistantId: call.assistantId,
    });
  }
}

export async function removeCallForAgent(agentId: string) {
  await removeVapiCallMapping(agentId);
}
