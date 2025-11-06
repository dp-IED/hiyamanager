import { NextResponse } from 'next/server';
import { getAgents, getActiveCalls } from '@/lib/db/queries';

export async function GET() {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500));

  const allAgents = await getAgents();
  const activeCallsList = await getActiveCalls();
  
  const callsBeingHandled = activeCallsList.length;
  const activeAgents = allAgents.filter(a => a.status === 'ACTIVE').length;
  const totalAgents = allAgents.length;
  const idleAgents = allAgents.filter(a => a.status === 'IDLE').length;

  // Build agents array with call durations
  const agents = allAgents.map((agent) => {
    // Find active call for this agent
    const activeCall = activeCallsList.find(c => c.agentId === agent.id);
    
    let durationMinutes = 0;
    let callStartTime: number | undefined;
    let expectedDurationSeconds: number | undefined;
    let remainingDurationSeconds: number | undefined;
    
    if (activeCall && activeCall.startTime) {
      const now = Math.floor(Date.now() / 1000);
      const elapsedSeconds = now - activeCall.startTime;
      durationMinutes = Math.floor(elapsedSeconds / 60);
      callStartTime = activeCall.startTime * 1000; // Convert to milliseconds
      
      // Calculate remaining duration if expectedDuration is available
      if (activeCall.expectedDuration) {
        expectedDurationSeconds = activeCall.expectedDuration;
        remainingDurationSeconds = Math.max(0, expectedDurationSeconds - elapsedSeconds);
      }
    }

    return {
      id: agent.id,
      type: agent.type,
      status: agent.status,
      callsHandled: agent.callsHandled,
      sentiment: activeCall ? (Math.random() * 1.5 + 3.5).toFixed(1) : null,
      duration: `${durationMinutes}m`,
      durationMinutes,
      callStartTime,
      expectedDurationSeconds,
      remainingDurationSeconds,
    };
  });

  // Generate incidents - single incident reflecting database failover scenario
  const incidents = [
    { id: 'INC-2024-003', title: 'Database failover causing high call volume - all operators occupied' },
  ];

  return NextResponse.json({
    callsBeingHandled,
    activeAgents,
    idleAgents,
    totalAgents,
    agents,
    incidents,
  });
}

// Export for backward compatibility
export function generateMockData() {
  // This is now just a wrapper that calls the database
  // Kept for backward compatibility with other routes
  return getAgents().then(agents => {
    return getActiveCalls().then(activeCalls => ({
      agents: agents.map(agent => {
        const activeCall = activeCalls.find(c => c.agentId === agent.id);
        return {
          id: agent.id,
          type: agent.type,
          status: agent.status,
          callsHandled: agent.callsHandled,
        };
      }),
      activeCalls,
    }));
  });
}
