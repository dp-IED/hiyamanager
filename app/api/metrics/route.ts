import { NextResponse } from 'next/server';
import { getActiveCalls, getAgents, getWaitingCalls, getAverageWaitTime } from '@/lib/db/queries';
import { Call, AgentWithCall, Agent, MetricsData } from '@/lib/db/types';

export async function GET() {
  try {
    const activeCalls: Call[] = await getActiveCalls();
    const waitingCalls: Call[] = await getWaitingCalls();
    const agents: Agent[] = await getAgents();
    const activeAgents: AgentWithCall[] = agents.filter((agent) => agent.status === 'ACTIVE').map((agent) => {
      const currentCall = activeCalls.find((call) => call.agentId === agent.id) || null;
      return {
        ...agent,
        current_call: currentCall,
      };
    });
    const idleAgents: Agent[] = agents.filter((agent) => agent.status === 'IDLE');
    const totalAgents = agents.length;

    const averageWaitTime = await getAverageWaitTime();

    const now = Date.now();
    const chartData = Array.from({ length: 48 }, (_, i) => {
      const minutesOffset = (47 - i) * 15; // 15 minutes per point
      const time = new Date(now - minutesOffset * 60 * 1000).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
      return {
        time,
        calls: i === 47 ? activeCalls.length + waitingCalls.length : Math.floor(Math.random() * 30) + 10,
        active: i === 47 ? activeCalls.length : Math.floor(Math.random() * 20) + 5,
        waiting: i === 47 ? waitingCalls.length : Math.floor(Math.random() * 10),
        isCurrent: i === 47,
      };
    });

    // Prepare waiting calls details
    const waitingCallsDetails = waitingCalls.map(call => ({
      id: call.id,
      customerPhone: call.customerPhone,
      issue: call.issue,
      queuedAt: call.createdAt, // Use createdAt as queuedAt
      waitTime: Math.floor(Date.now() / 1000) - call.createdAt,
    }));

    // Default incident:
    const incidents = [
      {
        id: '1',
        title: 'Database failover incident',
      },
      {
        id: '2',
        title: 'API service unavailable',
      },
      {
        id: '3',
        title: 'Connection pool exhaustion',
      },
      {
        id: '4',
        title: 'Read replica lag causing data inconsistency',
      },
    ];

    // Generate forecast data with anomaly detection
    const totalCalls = activeCalls.length + waitingCalls.length;
    const hasHighLoad = totalCalls > 15 || waitingCalls.length > 5;
    const hasCriticalLoad = totalCalls > 25 || waitingCalls.length > 10;

    const forecastData = {
      anomaly_detection: {
        detected: hasHighLoad || hasCriticalLoad,
        severity: hasCriticalLoad ? 'CRITICAL' as const : hasHighLoad ? 'HIGH' as const : 'NORMAL' as const,
        incident_type: hasCriticalLoad
          ? 'Critical call volume spike detected'
          : hasHighLoad
            ? 'High call volume warning'
            : 'Normal operations',
        peak_time_minutes: hasHighLoad ? Math.floor(Math.random() * 30) + 15 : 0,
      },
      recent_incidents: hasHighLoad ? [
        {
          time: new Date().toISOString(),
          description: hasCriticalLoad
            ? '🔴 CRITICAL: Call volume exceeding capacity'
            : '⚠️ HIGH: Elevated call volume detected',
        },
      ] : [],
    };

    const metrics: MetricsData = {
      waitingCalls: waitingCalls,
      activeCalls: activeCalls,
      activeAgents: activeAgents,
      agents: agents,
      idleAgents: idleAgents,
      totalAgents: agents.length,
      incidents,
      chartData: {
        data: chartData,
        current: {
          total: activeCalls.length + waitingCalls.length,
          active: activeCalls.length,
          waiting: waitingCalls.length,
        },
      },
      waitingCallsDetails,
      averageWaitTime,
      forecastData,
    };
    return NextResponse.json(metrics);
  } catch (error) {
    console.error('Failed to fetch metrics:', error);
    return NextResponse.json({ error: 'Failed to fetch metrics' }, { status: 500 });
  }
}