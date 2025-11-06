import { NextResponse } from 'next/server';
import { saveCallTranscript } from '@/lib/db/queries';
import { getCallById, updateCallStatus } from '@/lib/db/queries';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Handle Vapi webhook events
    // Common events: call-status-update, function-call, transcript, end-of-call-report
    const { event, call } = body;

    if (!call?.id) {
      return NextResponse.json({ received: true });
    }

    const callId = call.id;

    // Handle different event types
    switch (event) {
      case 'call-status-update':
        if (call.status) {
          // Map VAPI status to our status
          let status: 'queued' | 'active' | 'ended' | 'abandoned' = 'active';
          if (call.status === 'ended' || call.status === 'completed') {
            status = 'ended';
          } else if (call.status === 'queued' || call.status === 'ringing') {
            status = 'queued';
          }
          
          await updateCallStatus(callId, status);
        }
        break;

      case 'transcript':
        if (call.transcript) {
          // Get existing transcript or create new
          const existingCall = await getCallById(callId);
          if (existingCall) {
            // Append to existing transcript
            // For simplicity, we'll just update with the latest transcript
            // In production, you might want to append
            await saveCallTranscript({
              callId,
              transcript: call.transcript,
            });
          }
        }
        break;

      case 'end-of-call-report':
        await updateCallStatus(callId, 'ended', { 
          endTime: Math.floor(Date.now() / 1000) 
        });
        if (call.summary) {
          await saveCallTranscript({
            callId,
            transcript: call.transcript || '',
            summary: call.summary,
          });
        }
        break;

      default:
        // Handle other events
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const callId = searchParams.get('callId');

    if (callId) {
      const { getCallTranscript } = await import('@/lib/db/queries');
      const transcript = await getCallTranscript(callId);
      if (transcript) {
        return NextResponse.json({ callData: transcript });
      }
      return NextResponse.json(
        { error: 'Call data not found' },
        { status: 404 }
      );
    }

    // Return all call data (could be limited in production)
    const { db } = await import('@/lib/db/index');
    const { callTranscripts } = await import('@/lib/db/schema');
    const allData = await db.select().from(callTranscripts);

    return NextResponse.json({ calls: allData });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to get call data' },
      { status: 500 }
    );
  }
}
