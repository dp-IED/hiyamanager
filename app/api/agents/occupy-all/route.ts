import { NextResponse } from 'next/server';
import { getAgents, getActiveCalls, createCall, updateAgentStatus } from '@/lib/db/queries';
import { getActiveCallbacks } from '../../calls/queue/route';

const issues = [
  'Database failover incident',
  'API service unavailable',
  'Primary database connection timeout',
  'Read replica lag causing data inconsistency',
  'Connection pool exhaustion',
  'Transaction rollback errors',
  'Authentication service down',
  'Payment processing failures',
  'Data sync failure',
  'Query timeout errors',
  'Service degradation',
  'High latency issues',
];

function generatePhoneNumber(): string {
  return `+1${Math.floor(Math.random() * 9000000000) + 1000000000}`;
}

/**
 * Ensures all human agents have active calls
 * Creates active calls for any human agents that don't currently have one
 */
export async function POST() {
  try {
    const allAgents = await getAgents();
    const humanAgents = allAgents.filter((a) => a.type === 'HUMAN');
    const activeCallsList = await getActiveCalls();
    const activeCallbacks = await getActiveCallbacks();

    // Build set of agents with active calls
    const agentsWithCalls = new Set<string>();

    // Add agents from active callbacks
    activeCallbacks.forEach((callback) => {
      if (callback.assignedAgentId) {
        agentsWithCalls.add(callback.assignedAgentId);
      }
    });

    // Add agents from regular active calls
    activeCallsList.forEach((call) => {
      if (call.agentId) {
        agentsWithCalls.add(call.agentId);
      }
    });

    const now = Date.now();
    const timestamp = Math.floor(now / 1000);
    const createdCalls = [];

    // Create active calls for human agents without calls
    for (const agent of humanAgents) {
      if (!agentsWithCalls.has(agent.id)) {
        // Set agent status to ACTIVE if not already
        if (agent.status !== 'ACTIVE') {
          await updateAgentStatus(agent.id, 'ACTIVE');
        }

        // Create active call (30-40 minutes ago to show long duration)
        const minutesAgo = 30 + Math.floor(Math.random() * 10); // 30-40 minutes
        const callStartTime = now - minutesAgo * 60 * 1000;
        const callId = `CALL-${agent.id}-${timestamp}`;
        // Set expectedDuration longer than elapsed time (45-60 min) so calls don't auto-complete
        const expectedDuration = (45 + Math.floor(Math.random() * 15)) * 60; // 45-60 minutes = 2700-3600 seconds

        await createCall({
          id: callId,
          customerPhone: generatePhoneNumber(),
          agentId: agent.id,
          status: 'active',
          callType: 'regular',
          issue: issues[Math.floor(Math.random() * issues.length)],
          startTime: Math.floor(callStartTime / 1000),
          waitTime: 0,
          expectedDuration,
        });

        createdCalls.push({
          callId,
          agentId: agent.id,
          startTime: callStartTime,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Created ${createdCalls.length} active calls for human agents`,
      createdCalls,
      totalHumanAgents: humanAgents.length,
      agentsWithCalls: agentsWithCalls.size,
    });
  } catch (error) {
    console.error('Failed to occupy all human agents:', error);
    return NextResponse.json(
      { error: 'Failed to occupy all human agents', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to check status of human agent occupation
 */
export async function GET() {
  try {
    const allAgents = await getAgents();
    const humanAgents = allAgents.filter((a) => a.type === 'HUMAN');
    const activeCallsList = await getActiveCalls();
    const activeCallbacks = await getActiveCallbacks();

    // Build set of agents with active calls
    const agentsWithCalls = new Set<string>();

    activeCallbacks.forEach((callback) => {
      if (callback.assignedAgentId) {
        agentsWithCalls.add(callback.assignedAgentId);
      }
    });

    activeCallsList.forEach((call) => {
      if (call.agentId) {
        agentsWithCalls.add(call.agentId);
      }
    });

    const agentsWithoutCalls = humanAgents.filter((a) => !agentsWithCalls.has(a.id));

    return NextResponse.json({
      totalHumanAgents: humanAgents.length,
      agentsWithCalls: agentsWithCalls.size,
      agentsWithoutCalls: agentsWithoutCalls.length,
      agentsWithoutCallsList: agentsWithoutCalls.map((a) => ({
        id: a.id,
        status: a.status,
      })),
    });
  } catch (error) {
    console.error('Failed to check human agent occupation:', error);
    return NextResponse.json(
      { error: 'Failed to check human agent occupation' },
      { status: 500 }
    );
  }
}

