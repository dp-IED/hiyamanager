import { NextResponse } from 'next/server';
import { getQueue } from '../../calls/queue/route';

// In-memory store for agents assigned to backlog (demo only)
const agentsInBacklog = new Set<string>();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { callId, agentId } = body;

    if (!callId || !agentId) {
      return NextResponse.json(
        { error: 'Call ID and Agent ID required' },
        { status: 400 }
      );
    }

    // Add agent to backlog
    agentsInBacklog.add(agentId);

    // Get the queue to see if there are pending calls
    const queue = getQueue();
    const hasPendingCalls = queue.length > 0;

    return NextResponse.json({
      success: true,
      message: `Agent ${agentId} has been assigned to backlog`,
      agentId,
      callId,
      queueLength: queue.length,
      hasPendingCalls,
      nextCall: hasPendingCalls ? queue[0] : null,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to assign agent to backlog' },
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
        isInBacklog: agentsInBacklog.has(agentId),
      });
    }

    return NextResponse.json({
      agentsInBacklog: Array.from(agentsInBacklog),
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to get backlog agents' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agentId');

    if (agentId) {
      agentsInBacklog.delete(agentId);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: 'Agent ID required' },
      { status: 400 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to remove agent from backlog' },
      { status: 500 }
    );
  }
}

