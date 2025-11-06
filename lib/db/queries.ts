import { db } from './index';
import { agents, calls, callQueue, callTranscripts, vapiCallMappings } from './schema';
import { eq, and, desc, sql } from 'drizzle-orm';

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
  vapiAssistantId?: string;
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
export async function getActiveCalls() {
  return await db.select().from(calls).where(eq(calls.status, 'active'));
}

export async function getCallById(callId: string) {
  const result = await db.select().from(calls).where(eq(calls.id, callId)).limit(1);
  return result[0] || null;
}

// Helper function to generate random duration (5-15 minutes = 300-900 seconds)
function generateRandomDuration(): number {
  return Math.floor(Math.random() * 600) + 300; // 300-900 seconds
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
  expectedDuration?: number; // Optional, will generate if not provided
  vapiCallId?: string;
}) {
  const now = Math.floor(Date.now() / 1000);
  // Set expectedDuration if not provided (for active calls)
  const expectedDuration = data.expectedDuration ?? (data.status === 'active' ? generateRandomDuration() : undefined);
  
  await db.insert(calls).values({
    ...data,
    expectedDuration,
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

// Call queue queries
export async function getWaitingCalls() {
  return await db.select()
    .from(callQueue)
    .where(eq(callQueue.status, 'queued'))
    .orderBy(desc(callQueue.queuedAt));
}

export async function getAverageWaitTime() {
  const queuedCalls = await getWaitingCalls();
  if (queuedCalls.length === 0) return 0;
  
  const now = Math.floor(Date.now() / 1000);
  const totalWaitTime = queuedCalls.reduce((sum, call) => {
    const waitTime = now - call.queuedAt;
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

// VAPI call mapping queries
export async function getVapiCallMapping(agentId: string) {
  const result = await db.select()
    .from(vapiCallMappings)
    .where(eq(vapiCallMappings.agentId, agentId))
    .limit(1);
  return result[0] || null;
}

export async function createVapiCallMapping(data: {
  agentId: string;
  vapiCallId: string;
  vapiAssistantId: string;
}) {
  const now = Math.floor(Date.now() / 1000);
  await db.insert(vapiCallMappings).values({
    ...data,
    createdAt: now,
  });
  return getVapiCallMapping(data.agentId);
}

export async function removeVapiCallMapping(agentId: string) {
  await db.delete(vapiCallMappings).where(eq(vapiCallMappings.agentId, agentId));
}

