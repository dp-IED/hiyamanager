import { NextResponse } from 'next/server';

// Demo state (in-memory for demo)
let demoState = {
  isActive: false,
  callState: 'idle' as 'idle' | 'calling' | 'queued' | 'connecting' | 'active' | 'ended',
  queuePosition: null as number | null,
  waitTime: 0,
  agentName: null as string | null,
};

export async function GET() {
  return NextResponse.json(demoState);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    demoState = {
      ...demoState,
      ...body,
    };
    return NextResponse.json({ success: true, state: demoState });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update demo state' },
      { status: 500 }
    );
  }
}

// Export for use in other routes
export function getDemoState() {
  return demoState;
}

export function updateDemoState(updates: Partial<typeof demoState>) {
  demoState = { ...demoState, ...updates };
}

