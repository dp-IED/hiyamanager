import { NextResponse } from 'next/server';
import { createAgent } from '@/lib/db/queries';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, type, status } = body;

    if (!id || !type || !status) {
      return NextResponse.json(
        { error: 'Agent id, type, and status are required' },
        { status: 400 }
      );
    }

    const agent = await createAgent({
      id,
      type: type as 'HUMAN' | 'AI',
      status: status as 'ACTIVE' | 'IDLE',
    });

    return NextResponse.json({
      success: true,
      agent,
    });
  } catch (error: any) {
    console.error('Failed to create agent:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create agent' },
      { status: 500 }
    );
  }
}

