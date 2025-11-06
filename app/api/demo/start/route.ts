import { NextResponse } from 'next/server';
import { updateDemoState } from '../state/route';

export async function POST(request: Request) {
  try {
    // Initialize demo state
    updateDemoState({
      isActive: true,
      callState: 'calling',
      queuePosition: 5,
      waitTime: 0,
      agentName: null,
    });

    return NextResponse.json({
      success: true,
      message: 'Demo started',
      state: {
        isActive: true,
        callState: 'calling',
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to start demo' },
      { status: 500 }
    );
  }
}

