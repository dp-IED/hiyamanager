import { NextResponse } from 'next/server';

// Mock data generator for demo purposes
function generateMockData() {
  const callsBeingHandled = 45; // High call volume
  const activeAgents = 15; // All 15 humans are active
  const totalAgents = 15;
  const idleAgents = 0; // No idle agents initially

  // Generate 15 human agents, all with long calls (30+ minutes)
  const agents = [];
  for (let i = 1; i <= 15; i++) {
    const agentId = `HUMAN-${String(i).padStart(3, '0')}`;
    const callDurationMinutes = Math.floor(Math.random() * 10) + 30; // 30-40 minutes

    agents.push({
      id: agentId,
      type: 'HUMAN',
      status: 'ACTIVE',
      callsHandled: 1,
      sentiment: (Math.random() * 1.5 + 3.5).toFixed(1),
      duration: `${callDurationMinutes}m`,
      durationMinutes: callDurationMinutes,
    });
  }

  // Generate incidents - single incident reflecting database failover scenario
  const incidents = [
    { id: 'INC-2024-003', title: 'Database failover causing high call volume - all operators occupied' },
  ];

  return {
    callsBeingHandled,
    activeAgents,
    idleAgents,
    totalAgents,
    agents,
    incidents,
  };
}

export async function GET() {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500));

  const data = generateMockData();
  return NextResponse.json(data);
}
