import { getActiveCalls, getAgents } from "@/lib/db/queries";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const [activeCalls, agents] = await Promise.all([
      getActiveCalls(),
      getAgents(),
    ]);

    const agentMap = new Map(agents.map(agent => [agent.id, agent]));

    const callsWithAgents = activeCalls.map(call => ({
      ...call,
      agent: call.agentId ? (agentMap.get(call.agentId) || null) : null,
    }));

    return NextResponse.json(callsWithAgents);
  } catch (error) {
    console.error('Failed to fetch active calls:', error);
    return NextResponse.json({ error: 'Failed to fetch active calls' }, { status: 500 });
  }
}