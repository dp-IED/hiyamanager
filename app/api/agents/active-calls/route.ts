import { NextResponse } from 'next/server';
import { getActiveCallbacks } from '../../calls/queue/route';
import { getActiveCalls, getAgents } from '@/lib/db/queries';
import { eq } from 'drizzle-orm';
import { agents } from '@/lib/db/schema';

/**
 * Find the next available agent (human or AI) that has no active calls
 * Returns agent ID or null if none available
 * Prefers human agents over AI agents
 */
export async function findAvailableAgent(): Promise<string | null> {
  try {
    // Get all active calls to determine which agents are busy
    const activeCallsList = await getActiveCalls();
    const activeCallbacks = await getActiveCallbacks();
    const allAgents = await getAgents();
    
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
    
    // Get all agents (human first, then AI)
    const humanAgents = allAgents.filter((a) => a.type === 'HUMAN');
    const aiAgents = allAgents.filter((a) => a.type === 'AI');
    
    // Check human agents first
    for (const agent of humanAgents) {
      if (!agentsWithCalls.has(agent.id)) {
        return agent.id;
      }
    }
    
    // Then check AI agents
    for (const agent of aiAgents) {
      if (!agentsWithCalls.has(agent.id)) {
        return agent.id;
      }
    }
    
    // No available agents
    return null;
  } catch (error) {
    console.error('Failed to find available agent:', error);
    return null;
  }
}

export async function GET() {
  try {
    const allAgents = await getAgents();
    const activeAgents = allAgents.filter((a) => a.status === 'ACTIVE');
    const activeCallbacks = await getActiveCallbacks();
    
    // Debug logging
    console.log(`[active-calls] Found ${activeCallbacks.length} active callbacks:`, 
      activeCallbacks.map(cb => ({ id: cb.id, agentId: cb.assignedAgentId })));

    // Get regular active calls first to use for expectedDuration lookup
    const regularActiveCalls = await getActiveCalls();
    
    // Build active calls with start timestamps
    const activeCallsList: Array<{
      id: string;
      customerPhone: string;
      agentId: string;
      agentType: 'HUMAN' | 'AI';
      callStartTime: number;
      isCallback: boolean;
      issue?: string;
      expectedDuration?: number;
    }> = [];

    // Track which agent IDs already have calls (to avoid duplicates)
    const agentsWithCalls = new Set<string>();

    // Add active callbacks FIRST - these take priority and include new AI agents
    activeCallbacks.forEach((callback) => {
      if (!callback.assignedAgentId) return; // Skip invalid callbacks
      
      // Handle assignedAt - it might be a number (timestamp) or Date
      let assignedAt: number;
      if (typeof callback.assignedAt === 'number') {
        assignedAt = callback.assignedAt;
      } else if (callback.assignedAt instanceof Date) {
        assignedAt = Math.floor(callback.assignedAt.getTime() / 1000);
      } else {
        assignedAt = Math.floor(Date.now() / 1000);
      }
      
      // Determine agent type from agentId (AI-xxx = AI, HUMAN-xxx = HUMAN)
      const agentType = callback.assignedAgentId?.startsWith('AI-') ? 'AI' : 'HUMAN';
      
      // Get the call record to find expectedDuration
      // Try to find by callId first (if callback has a callId), then by customerPhone
      const callRecord = callback.callId 
        ? regularActiveCalls.find(c => c.id === callback.callId)
        : regularActiveCalls.find(c => c.customerPhone === callback.customerPhone);
      
      activeCallsList.push({
        id: callback.id,
        customerPhone: callback.customerPhone,
        agentId: callback.assignedAgentId,
        agentType: agentType,
        callStartTime: assignedAt * 1000, // Convert to milliseconds
        isCallback: true,
        issue: callback.issue || undefined,
        expectedDuration: callRecord?.expectedDuration,
      });
      
      // Mark this agent as having a call
      agentsWithCalls.add(callback.assignedAgentId);
    });

    // Add regular active calls for agents without callbacks
    regularActiveCalls.forEach((call) => {
      if (call.agentId && !agentsWithCalls.has(call.agentId)) {
        const callStartTime = call.startTime ? call.startTime * 1000 : Date.now() - (30 * 60 * 1000);
        
        // Determine agent type
        const agent = allAgents.find(a => a.id === call.agentId);
        const agentType = agent?.type === 'AI' ? 'AI' : 'HUMAN';

        activeCallsList.push({
          id: call.id,
          customerPhone: call.customerPhone,
          agentId: call.agentId,
          agentType: agentType,
          callStartTime,
          isCallback: false,
          issue: call.issue || undefined,
          expectedDuration: call.expectedDuration,
        });
      }
    });

    // Debug logging
    console.log(`[active-calls] Returning ${activeCallsList.length} total calls. Callbacks: ${activeCallsList.filter(c => c.isCallback).length}, Regular: ${activeCallsList.filter(c => !c.isCallback).length}`);
    console.log(`[active-calls] AI agent calls:`, activeCallsList.filter(c => c.agentType === 'AI').map(c => ({ id: c.id, agentId: c.agentId, isCallback: c.isCallback })));

    return NextResponse.json({ activeCalls: activeCallsList });
  } catch (error) {
    console.error('Failed to fetch active calls:', error);
    return NextResponse.json(
      { error: 'Failed to fetch active calls' },
      { status: 500 }
    );
  }
}
