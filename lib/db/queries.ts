import { db } from './index';
import { agents, calls, callQueue, callTranscripts, callConversationTurns } from './schema';
import { eq, and, desc, sql, asc } from 'drizzle-orm';
import { Call } from './types';

// Agent queries
export async function getAgents() {
  return await db.select().from(agents);
}

export async function getAgentById(agentId: string) {
  const result = await db.select().from(agents).where(eq(agents.id, agentId)).limit(1);
  return result[0] || null;
}

/**
 * Get the next available AI agent ID by checking existing agents
 * Returns a string like "AI-001", "AI-002", etc.
 */
export async function getNextAvailableAgentId(): Promise<string> {
  const allAgents = await getAgents();
  const aiAgents = allAgents.filter(a => a.id.startsWith('AI-'));

  if (aiAgents.length === 0) {
    return 'AI-001';
  }

  // Extract numbers from existing AI agent IDs
  const numbers = aiAgents
    .map(a => {
      const match = a.id.match(/AI-(\d+)/);
      return match ? parseInt(match[1], 10) : 0;
    })
    .filter(n => n > 0);

  if (numbers.length === 0) {
    return 'AI-001';
  }

  // Find the next available number
  const maxNumber = Math.max(...numbers);
  const nextNumber = maxNumber + 1;

  return `AI-${String(nextNumber).padStart(3, '0')}`;
}

export async function createAgent(data: {
  id: string;
  type: 'HUMAN' | 'AI';
  status: 'ACTIVE' | 'IDLE';
  callsHandled?: number;
}) {
  const now = Math.floor(Date.now() / 1000);
  await db.insert(agents).values({
    ...data,
    callsHandled: data.callsHandled || 0,
    createdAt: now,
    updatedAt: now,
  });
  return getAgentById(data.id);
}

export async function updateAgentStatus(agentId: string, status: 'ACTIVE' | 'IDLE') {
  const now = Math.floor(Date.now() / 1000);
  await db.update(agents)
    .set({ status, updatedAt: now })
    .where(eq(agents.id, agentId));
}

// Call queries
export async function getActiveCalls(): Promise<Call[]> {
  return await db.select().from(calls).where(eq(calls.status, 'active'));
}

export async function getCallById(callId: string) {
  const result = await db.select().from(calls).where(eq(calls.id, callId)).limit(1);
  return result[0] || null;
}

export async function createCall(data: {
  id: string;
  customerPhone: string;
  agentId?: string;
  status: 'queued' | 'active' | 'ended' | 'abandoned';
  callType: 'regular' | 'callback';
  issue?: string;
  startTime?: number;
  endTime?: number;
  waitTime: number;
  expectedDuration?: number; // Optional - will be set after generation completes
  generationStatus?: 'pending' | 'generating' | 'completed' | 'failed' | null;
  generationAttempts?: number;
  elevenlabsConversationId?: string;
}) {
  const now = Math.floor(Date.now() / 1000);
  // expected duration will be populated after background generation completes

  await db.insert(calls).values({
    ...data,
    expectedDuration: data.expectedDuration,
    generationStatus: data.generationStatus,
    generationAttempts: data.generationAttempts ?? 0,
    createdAt: now,
    updatedAt: now,
  });
  return getCallById(data.id);
}

export async function updateCallStatus(callId: string, status: 'queued' | 'active' | 'ended' | 'abandoned', updates?: {
  endTime?: number;
  agentId?: string;
  startTime?: number;
  callType?: 'regular' | 'callback';
}) {
  const now = Math.floor(Date.now() / 1000);

  if (status === 'ended') {
    // set agent as idle
    await updateAgentStatus(updates?.agentId || '', 'IDLE');
  }
  await db.update(calls)
    .set({
      status,
      updatedAt: now,
      ...(updates?.endTime && { endTime: updates.endTime }),
      ...(updates?.agentId && { agentId: updates.agentId }),
      ...(updates?.startTime && { startTime: updates.startTime }),
      ...(updates?.callType && { callType: updates.callType }),
    })
    .where(eq(calls.id, callId));
}

export async function getAbandonedCalls() {
  return await db.select().from(calls).where(eq(calls.status, 'abandoned'));
}

// Call queue queries - now using calls table with status='queued'
export async function getWaitingCalls() {
  return await db.select()
    .from(calls)
    .where(eq(calls.status, 'queued'))
    .orderBy(asc(calls.createdAt)); // Order by creation time (oldest first)
}

export async function getAverageWaitTime() {
  const queuedCalls = await getWaitingCalls();
  if (queuedCalls.length === 0) return 0;

  const now = Math.floor(Date.now() / 1000);
  const totalWaitTime = queuedCalls.reduce((sum, call) => {
    // Use createdAt as queuedAt since calls with status='queued' are in queue
    const waitTime = now - call.createdAt;
    return sum + waitTime;
  }, 0);

  return Math.floor(totalWaitTime / queuedCalls.length);
}

export async function getQueueItemById(queueId: string) {
  const result = await db.select().from(callQueue).where(eq(callQueue.id, queueId)).limit(1);
  return result[0] || null;
}

export async function createQueueItem(data: {
  id: string;
  customerPhone: string;
  issue?: string;
  waitTime: number;
  queuedAt: number;
}) {
  const now = Math.floor(Date.now() / 1000);
  await db.insert(callQueue).values({
    ...data,
    status: 'queued',
    createdAt: now,
    updatedAt: now,
  });
  return getQueueItemById(data.id);
}

export async function assignQueueItem(queueId: string, agentId: string, callId?: string) {
  const now = Math.floor(Date.now() / 1000);
  await db.update(callQueue)
    .set({
      assignedAgentId: agentId,
      assignedAt: now,
      status: 'assigned',
      callId,
      updatedAt: now,
    })
    .where(eq(callQueue.id, queueId));
}

export async function removeQueueItem(queueId: string) {
  await db.delete(callQueue).where(eq(callQueue.id, queueId));
}

export async function getActiveCallbacks() {
  return await db.select()
    .from(callQueue)
    .where(eq(callQueue.status, 'assigned'));
}

// Call transcript queries
export async function getCallTranscript(callId: string) {
  const result = await db.select()
    .from(callTranscripts)
    .where(eq(callTranscripts.callId, callId))
    .limit(1);
  return result[0] || null;
}

export async function saveCallTranscript(data: {
  callId: string;
  transcript: string;
  summary?: string;
}) {
  const now = Math.floor(Date.now() / 1000);
  const existing = await getCallTranscript(data.callId);

  if (existing) {
    await db.update(callTranscripts)
      .set({
        transcript: data.transcript,
        summary: data.summary,
        updatedAt: now,
      })
      .where(eq(callTranscripts.callId, data.callId));
    return getCallTranscript(data.callId);
  } else {
    await db.insert(callTranscripts).values({
      callId: data.callId,
      transcript: data.transcript,
      summary: data.summary,
      createdAt: now,
      updatedAt: now,
    });
    return getCallTranscript(data.callId);
  }
}

// Call conversation turns queries
export interface ConversationTurn {
  role: 'agent' | 'customer';
  content: string;
  estimatedDuration: number;
  predictedRemainingDuration: number;
}

export async function saveConversationTurns(callId: string, turns: ConversationTurn[]) {
  const now = Math.floor(Date.now() / 1000);

  // Delete existing turns for this call (in case of regeneration)
  await db.delete(callConversationTurns).where(eq(callConversationTurns.callId, callId));

  // Insert new turns
  const values = turns.map((turn, index) => ({
    callId,
    role: turn.role,
    content: turn.content,
    turnOrder: index,
    estimatedDuration: turn.estimatedDuration,
    predictedRemainingDuration: turn.predictedRemainingDuration,
    createdAt: now,
  }));

  if (values.length > 0) {
    await db.insert(callConversationTurns).values(values);
  }

  return getConversationTurns(callId);
}

export async function getConversationTurns(callId: string) {
  return await db.select()
    .from(callConversationTurns)
    .where(eq(callConversationTurns.callId, callId))
    .orderBy(asc(callConversationTurns.turnOrder));
}

export async function getConversationProgress(callId: string) {
  const call = await getCallById(callId);
  if (!call || !call.startTime) {
    return { currentTurnIndex: 0, totalTurns: 0 };
  }

  const turns = await getConversationTurns(callId);
  if (turns.length === 0) {
    return { currentTurnIndex: 0, totalTurns: 0 };
  }

  const now = Math.floor(Date.now() / 1000);
  const elapsed = now - call.startTime;

  let accumulatedDuration = 0;
  let currentTurnIndex = 0;

  for (let i = 0; i < turns.length; i++) {
    accumulatedDuration += turns[i].estimatedDuration;
    if (accumulatedDuration <= elapsed) {
      currentTurnIndex = i + 1;
    } else {
      break;
    }
  }

  // Cap at total turns
  currentTurnIndex = Math.min(currentTurnIndex, turns.length);

  return {
    currentTurnIndex,
    totalTurns: turns.length,
  };
}

// Generation status queries
export async function updateCallGenerationStatus(
  callId: string,
  generationStatus: 'pending' | 'generating' | 'completed' | 'failed',
  generationAttempts: number
) {
  const now = Math.floor(Date.now() / 1000);
  await db.update(calls)
    .set({
      generationStatus,
      generationAttempts,
      updatedAt: now,
    })
    .where(eq(calls.id, callId));
}

export async function updateCallExpectedDuration(callId: string, expectedDuration: number) {
  const now = Math.floor(Date.now() / 1000);
  await db.update(calls)
    .set({
      expectedDuration,
      updatedAt: now,
    })
    .where(eq(calls.id, callId));
}

export async function getCallsByGenerationStatus(generationStatus: 'pending' | 'generating' | 'completed' | 'failed') {
  return await db.select()
    .from(calls)
    .where(eq(calls.generationStatus, generationStatus));
}


export async function closeCall(callId: string, endTime?: number): Promise<string | null> {
  const now = endTime || Math.floor(Date.now() / 1000);

  const call = await getCallById(callId);
  if (!call) {
    throw new Error(`Call ${callId} not found`);
  }

  const agentId = call.agentId || null;

  // Update call status to 'ended' and set endTime
  await updateCallStatus(callId, 'ended', {
    endTime: now,
  });

  console.log(`[closeCall] Closed call ${callId}${agentId ? `, agent ${agentId} is now available` : ''}`);

  return agentId;
}

export async function reassignCall(agentId: string, assignConversation: boolean = true): Promise<string | null> {
  // First, check if the agent has an active call and close it
  const activeCalls = await getActiveCalls();
  const agentActiveCall = activeCalls.find(call => call.agentId === agentId);
  
  if (agentActiveCall) {
    console.log(`[reassignCall] Closing agent ${agentId}'s current active call ${agentActiveCall.id}`);
    await closeCall(agentActiveCall.id);
  }

  const waitingCalls = await getWaitingCalls();

  if (waitingCalls.length === 0) {
    console.log(`[reassignCall] No queued calls available for agent ${agentId}`);
    return null;
  }

  const nextCall = waitingCalls[0]; // Oldest queued call
  const now = Math.floor(Date.now() / 1000);

  await updateCallStatus(nextCall.id, 'active', {
    agentId: agentId,
    startTime: now,
  });

  // Optionally assign conversation to the new call
  if (assignConversation) {
    try {
      const { assignSeedConversationToCall } = await import('../assign-seed-conversation');
      await assignSeedConversationToCall(nextCall.id);
    } catch (error) {
      console.error(`[reassignCall] Failed to assign conversation to call ${nextCall.id}:`, error);
      // Continue even if conversation assignment fails
    }
  }

  console.log(`[reassignCall] ✓ Assigned agent ${agentId} to queued call ${nextCall.id}`);

  return nextCall.id;
}

/**
 * Checks for active calls with negative remaining duration and handles them
 * Uses the reusable closeCall and reassignCall functions
 */
export async function checkAndHandleExpiredCalls(): Promise<void> {
  const activeCalls = await getActiveCalls();
  const now = Math.floor(Date.now() / 1000);

  for (const call of activeCalls) {
    if (!call.startTime || !call.expectedDuration || !call.agentId) {
      continue;
    }

    const elapsedSeconds = now - call.startTime;
    const remainingSeconds = call.expectedDuration - elapsedSeconds;

    // If remaining duration is negative, the call has exceeded its expected duration
    if (remainingSeconds < 0) {
      console.log(`[checkAndHandleExpiredCalls] Call ${call.id} has exceeded expected duration (remaining: ${remainingSeconds}s). Closing and reassigning agent ${call.agentId}`);

      // Close the call and get the agent ID
      const agentId = await closeCall(call.id, now);

      // Reassign the agent to the next queued call
      if (agentId) {
        await reassignCall(agentId, true);
      }
    }
  }
}

