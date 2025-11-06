import { NextResponse } from 'next/server';
import { getActiveCallbacks } from '@/app/api/calls/queue/route';
import { getCallTranscript, getCallById } from '@/lib/db/queries';

// Generate call details (summary and transcript) for active calls
// All related to database failover incident
function generateCallDetails(callId: string, issue?: string) {
  const summaries = [
    'Customer reporting complete service outage with database connection timeouts. Agent is explaining the ongoing primary database failover incident and providing estimated resolution time of 10-15 minutes. Customer is understanding and will monitor status page.',
    'Customer experiencing API 503 errors across all endpoints. Agent is confirming this is related to the database failover and that read replicas are being promoted. Providing workaround to use cached data endpoints temporarily.',
    'Customer unable to sync data between services due to database write restrictions during failover. Agent is explaining read-only mode is active and full write access will restore once primary database is back online.',
    'Customer reporting query timeouts on critical reports. Agent is identifying queries hitting the primary database during failover. Redirecting customer to use read replica endpoints which are functioning normally.',
    'Customer experiencing transaction rollback errors on payment processing. Agent is confirming database failover is causing temporary write restrictions. Providing alternative payment gateway as interim solution.',
    'Customer unable to access user authentication services. Agent is explaining database failover is affecting authentication database. Providing temporary API key access until primary database is restored.',
    'Customer reporting data inconsistency between production and staging environments. Agent is confirming this is due to read replica lag during the failover process. Explaining data will sync automatically once failover completes.',
    'Customer experiencing connection pool exhaustion errors. Agent is identifying high connection demand during failover. Recommending connection pooling optimization and providing temporary rate limiting workaround.',
  ];

  const transcripts = [
    `Agent: Thank you for calling support. I understand you're experiencing service issues?
Customer: Yes, everything is down! I can't connect to the database at all.
Agent: I apologize for the inconvenience. We're currently experiencing a primary database failover incident. This is affecting all database connections temporarily.
Customer: How long will this take? This is critical for our operations.
Agent: Our engineering team is actively working on this. The estimated resolution time is 10-15 minutes. In the meantime, you can use our read-only endpoints which are still functional.
Customer: Okay, I'll try the read-only mode. Will I lose any data?
Agent: No data loss is expected. Once the failover completes, all write operations will resume normally. I'll send you a status update email once services are restored.
Customer: Thank you for the quick response.
Agent: You're welcome. Is there anything else I can help with while we wait for the failover to complete?`,

    `Agent: Hello, this is technical support. How can I assist you today?
Customer: All my API calls are returning 503 errors. Nothing is working.
Agent: I see you're experiencing service unavailability. This is related to our ongoing database failover incident. The primary database is being switched to a backup instance.
Customer: What does that mean for me?
Agent: During the failover, write operations are temporarily suspended. However, read operations through our replica endpoints are still available. Would you like me to provide you with the read-only API endpoints?
Customer: Yes, please. I need to at least view my data.
Agent: I'm sending you an email right now with the read-only endpoint URLs and authentication details. These will work until the primary database is back online.
Customer: Perfect, thank you.
Agent: My pleasure. We expect full service restoration within 15 minutes. I'll keep you updated on the progress.`,

    `Agent: Good afternoon, support speaking. What can I help you with?
Customer: I'm getting transaction rollback errors on all my payment processing.
Agent: I understand your concern. The database failover is currently affecting write transactions, which includes payment processing. This is a temporary restriction during the failover process.
Customer: This is urgent! I have customers waiting.
Agent: I completely understand. As an immediate workaround, I can provide you access to our alternative payment gateway that uses a separate database cluster. This will allow you to continue processing payments.
Customer: That would be great. How do I access it?
Agent: I'm sending you the integration details via email right now. The alternative gateway uses the same API structure, so it should be a quick switch.
Customer: Thank you so much for the quick solution.
Agent: You're welcome. Once the primary database is restored, you can switch back or continue using the alternative gateway. I'm here if you need any help with the integration.`,

    `Agent: Thank you for calling. I see you're experiencing query timeout issues?
Customer: Yes, my reports are timing out. They usually take 30 seconds, now they're failing after 5 minutes.
Agent: This is happening because your queries are trying to hit the primary database, which is currently in failover mode. The primary database is read-only during this transition.
Customer: So what can I do?
Agent: I can redirect your queries to our read replica endpoints. These are optimized for read operations and should handle your reports much faster. The data will be slightly delayed, but it's the most current we can provide right now.
Customer: How delayed?
Agent: Typically less than 30 seconds. Once the failover completes, you'll have access to real-time data again.
Customer: That works for now. Can you help me switch?
Agent: Absolutely. I'm updating your API configuration right now to use the read replica endpoints. This should take effect immediately.
Customer: Perfect, thanks for your help.
Agent: You're welcome. I'll monitor the failover progress and let you know when you can switch back to the primary database.`,

    `Agent: Hello, support here. How may I assist you?
Customer: I can't authenticate any of my users. The authentication service is completely down.
Agent: I apologize for the disruption. The authentication database is part of the primary database cluster that's currently in failover. This is why authentication is temporarily unavailable.
Customer: This is a major problem. My entire application depends on this.
Agent: I understand the severity. As an immediate solution, I can provide you with temporary API key access that bypasses the authentication database. This will allow your application to continue functioning.
Customer: How secure is this?
Agent: The API keys are time-limited and will expire once the database is restored. They use the same security protocols as regular authentication. I'm sending you the keys and instructions via secure email right now.
Customer: Okay, that sounds reasonable. How long until normal authentication is back?
Agent: We expect the database failover to complete within 10-15 minutes. Once it's done, normal authentication will automatically resume.
Customer: Thank you for the quick response.
Agent: You're welcome. I'm monitoring the situation and will notify you as soon as services are restored.`,
  ];

  // Use callId hash to consistently assign details
  const hash = callId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const summaryIndex = hash % summaries.length;
  const transcriptIndex = hash % transcripts.length;

  return {
    summary: summaries[summaryIndex],
    transcript: transcripts[transcriptIndex],
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const callId = searchParams.get('callId');

    if (!callId) {
      return NextResponse.json(
        { error: 'Call ID required' },
        { status: 400 }
      );
    }

    // Try to get transcript from database first
    const transcript = await getCallTranscript(callId);
    const call = await getCallById(callId);

    if (transcript) {
      return NextResponse.json({
        callId,
        customerPhone: call?.customerPhone,
        agentId: call?.agentId,
        issue: call?.issue || 'Database failover incident',
        summary: transcript.summary || undefined,
        transcript: transcript.transcript,
        isCallback: call?.callType === 'callback',
      });
    }

    // Check if it's an active callback
    const activeCallbacks = await getActiveCallbacks();
    const callback = activeCallbacks.find((cb) => cb.id === callId);

    if (callback) {
      const details = generateCallDetails(callId, callback.issue || undefined);
      return NextResponse.json({
        callId,
        customerPhone: callback.customerPhone,
        agentId: callback.assignedAgentId,
        issue: callback.issue || 'Database failover incident',
        summary: details.summary,
        transcript: details.transcript,
        isCallback: true,
      });
    }

    // For regular active calls, generate details
    const details = generateCallDetails(callId);
    return NextResponse.json({
      callId,
      customerPhone: call?.customerPhone,
      agentId: call?.agentId,
      issue: call?.issue || 'Database failover incident',
      summary: details.summary,
      transcript: details.transcript,
      isCallback: false,
    });
  } catch (error) {
    console.error('Failed to fetch call details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch call details' },
      { status: 500 }
    );
  }
}
