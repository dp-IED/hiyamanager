import { NextResponse } from 'next/server';
import { getActiveCalls, updateCallStatus } from '@/lib/db/queries';
import { updateAgentStatus } from '@/lib/db/queries';
import { db } from '@/lib/db/index';
import { calls } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function POST() {
  try {
    const now = Math.floor(Date.now() / 1000);
    const activeCalls = await getActiveCalls();
    
    const completedCalls: string[] = [];
    
    // Check each active call
    for (const call of activeCalls) {
      if (call.startTime && call.expectedDuration) {
        const elapsed = now - call.startTime;
        const timeRemaining = call.expectedDuration - elapsed;
        
        // If call has exceeded its expected duration, mark as ended
        if (timeRemaining <= 0) {
          await updateCallStatus(call.id, 'ended', { endTime: now });
          
          // Update agent status to IDLE if agent exists
          if (call.agentId) {
            await updateAgentStatus(call.agentId, 'IDLE');
          }
          
          completedCalls.push(call.id);
          console.log(`[auto-complete] Call ${call.id} completed (duration: ${call.expectedDuration}s, elapsed: ${elapsed}s)`);
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      completedCalls,
      count: completedCalls.length,
    });
  } catch (error) {
    console.error('Failed to auto-complete calls:', error);
    return NextResponse.json(
      { error: 'Failed to auto-complete calls' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const now = Math.floor(Date.now() / 1000);
    const activeCalls = await getActiveCalls();
    
    const callsFinishingSoon: Array<{
      callId: string;
      agentId: string | null;
      timeRemaining: number;
    }> = [];
    
    // Check each active call
    for (const call of activeCalls) {
      if (call.startTime && call.expectedDuration) {
        const elapsed = now - call.startTime;
        const timeRemaining = call.expectedDuration - elapsed;
        
        // Calls finishing soon (< 2 minutes remaining)
        if (timeRemaining > 0 && timeRemaining < 120) {
          callsFinishingSoon.push({
            callId: call.id,
            agentId: call.agentId,
            timeRemaining,
          });
        }
      }
    }
    
    return NextResponse.json({
      callsFinishingSoon,
      count: callsFinishingSoon.length,
    });
  } catch (error) {
    console.error('Failed to get calls finishing soon:', error);
    return NextResponse.json(
      { error: 'Failed to get calls finishing soon' },
      { status: 500 }
    );
  }
}

