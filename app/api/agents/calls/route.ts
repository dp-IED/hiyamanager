import { NextResponse } from 'next/server';

// Generate recent calls for live feed with transcript and summary
// All calls are related to the database failover incident
function generateRecentCalls() {
  const types = ['Resolved', 'Escalated'];
  
  // All issues related to the database failover incident
  const issues = [
    'Database connection timeout',
    'API service unavailable',
    'Data sync failure',
    'Query timeout errors',
    'Primary database failover',
    'Read replica lag',
    'Connection pool exhaustion',
    'Transaction rollback errors',
  ];

  // Incident-specific summaries - each unique and related to database failover
  const summaries = [
    'Customer reported complete service outage with database connection timeouts. Agent explained the ongoing primary database failover incident and provided estimated resolution time of 10-15 minutes. Customer was understanding and will monitor status page.',
    'Customer experiencing API 503 errors across all endpoints. Agent confirmed this is related to the database failover and that read replicas are being promoted. Provided workaround to use cached data endpoints temporarily.',
    'Customer unable to sync data between services due to database write restrictions during failover. Agent explained read-only mode is active and full write access will restore once primary database is back online.',
    'Customer reporting query timeouts on critical reports. Agent identified queries hitting the primary database during failover. Redirected customer to use read replica endpoints which are functioning normally.',
    'Customer experiencing transaction rollback errors on payment processing. Agent confirmed database failover is causing temporary write restrictions. Provided alternative payment gateway as interim solution.',
    'Customer unable to access user authentication services. Agent explained database failover is affecting authentication database. Provided temporary API key access until primary database is restored.',
    'Customer reporting data inconsistency between production and staging environments. Agent confirmed this is due to read replica lag during the failover process. Explained data will sync automatically once failover completes.',
    'Customer experiencing connection pool exhaustion errors. Agent identified high connection demand during failover. Recommended connection pooling optimization and provided temporary rate limiting workaround.',
  ];

  // Incident-specific transcripts - each unique conversation about database failover
  const transcripts = [
    `Agent: Thank you for calling support. I understand you're experiencing service issues?
Customer: Yes, everything is down! I can't connect to the database at all.
Agent: I apologize for the inconvenience. We're currently experiencing a primary database failover incident. This is affecting all database connections temporarily.
Customer: How long will this take? This is critical for our operations.
Agent: Our engineering team is actively working on this. The estimated resolution time is 10-15 minutes. In the meantime, you can use our read-only endpoints which are still functional.
Customer: Okay, I'll try the read-only mode. Will I lose any data?
Agent: No data loss is expected. Once the failover completes, all write operations will resume normally. I'll send you a status update email once services are restored.
Customer: Thank you for the quick response.
Agent: You're welcome. Is there anything else I can help with?`,

    `Agent: Hello, this is technical support. How can I assist you today?
Customer: All my API calls are returning 503 errors. Nothing is working.
Agent: I see you're experiencing service unavailability. This is related to our ongoing database failover incident. The primary database is being switched to a backup instance.
Customer: What does that mean for me?
Agent: During the failover, write operations are temporarily suspended. However, read operations through our replica endpoints are still available. Would you like me to provide you with the read-only API endpoints?
Customer: Yes, please. I need to at least view my data.
Agent: I've sent you an email with the read-only endpoint URLs and authentication details. These will work until the primary database is back online.
Customer: Perfect, thank you.
Agent: My pleasure. We expect full service restoration within 15 minutes.`,

    `Agent: Good afternoon, support speaking. What can I help you with?
Customer: I'm getting transaction rollback errors on all my payment processing.
Agent: I understand your concern. The database failover is currently affecting write transactions, which includes payment processing. This is a temporary restriction during the failover process.
Customer: This is urgent! I have customers waiting.
Agent: I completely understand. As an immediate workaround, I can provide you access to our alternative payment gateway that uses a separate database cluster. This will allow you to continue processing payments.
Customer: That would be great. How do I access it?
Agent: I'll send you the integration details via email right now. The alternative gateway uses the same API structure, so it should be a quick switch.
Customer: Thank you so much for the quick solution.
Agent: You're welcome. Once the primary database is restored, you can switch back or continue using the alternative gateway.`,

    `Agent: Thank you for calling. I see you're experiencing query timeout issues?
Customer: Yes, my reports are timing out. They usually take 30 seconds, now they're failing after 5 minutes.
Agent: This is happening because your queries are trying to hit the primary database, which is currently in failover mode. The primary database is read-only during this transition.
Customer: So what can I do?
Agent: I can redirect your queries to our read replica endpoints. These are optimized for read operations and should handle your reports much faster. The data will be slightly delayed, but it's the most current we can provide right now.
Customer: How delayed?
Agent: Typically less than 30 seconds. Once the failover completes, you'll have access to real-time data again.
Customer: That works for now. Can you help me switch?
Agent: Absolutely. I'll update your API configuration to use the read replica endpoints. This should take effect immediately.
Customer: Perfect, thanks for your help.`,

    `Agent: Hello, support here. How may I assist you?
Customer: I can't authenticate any of my users. The authentication service is completely down.
Agent: I apologize for the disruption. The authentication database is part of the primary database cluster that's currently in failover. This is why authentication is temporarily unavailable.
Customer: This is a major problem. My entire application depends on this.
Agent: I understand the severity. As an immediate solution, I can provide you with temporary API key access that bypasses the authentication database. This will allow your application to continue functioning.
Customer: How secure is this?
Agent: The API keys are time-limited and will expire once the database is restored. They use the same security protocols as regular authentication. I'll send you the keys and instructions via secure email.
Customer: Okay, that sounds reasonable. How long until normal authentication is back?
Agent: We expect the database failover to complete within 10-15 minutes. Once it's done, normal authentication will automatically resume.
Customer: Thank you for the quick response.
Agent: You're welcome. I'll monitor the situation and notify you as soon as services are restored.`,

    `Agent: Support speaking. What seems to be the issue?
Customer: My data looks inconsistent. Production and staging environments are showing different information.
Agent: This is actually expected behavior during the database failover. The read replicas are experiencing some lag as they catch up with the primary database transition.
Customer: So my data isn't corrupted?
Agent: No, your data is safe. The inconsistency is temporary and due to replication lag. Once the failover completes and replication syncs, both environments will show the same data.
Customer: When will they sync?
Agent: Typically within 2-3 minutes after the failover completes. The replication process is automatic and will catch up quickly.
Customer: Good to know. Should I wait before making any changes?
Agent: If you're making critical changes, I'd recommend waiting until you receive the "all clear" notification. For non-critical operations, you can proceed, but be aware there may be slight delays in seeing updates across environments.
Customer: Got it. Thanks for explaining.
Agent: My pleasure. Is there anything else I can help with?`,

    `Agent: Thank you for calling. I understand you're seeing connection pool errors?
Customer: Yes, I'm getting "connection pool exhausted" errors constantly. My application can't connect.
Agent: During the database failover, there's increased demand on connection pools as systems try to reconnect. This is causing the exhaustion you're experiencing.
Customer: Is there a way to fix this?
Agent: Yes, I can help you optimize your connection pooling settings. Additionally, I can temporarily increase your connection limit to help during this transition period.
Customer: That would help. Can you do that now?
Agent: Absolutely. I'm updating your connection pool configuration right now. I'm also implementing temporary rate limiting to prevent further exhaustion. This should stabilize your connections.
Customer: How long will this take?
Agent: The changes should take effect within 2-3 minutes. You'll see improved connection availability shortly.
Customer: Great, thank you.
Agent: You're welcome. Once the failover completes, connection demand should normalize and you can revert to your original settings if needed.`,

    `Agent: Hello, technical support. How can I help?
Customer: All my write operations are failing. I can't save any data.
Agent: This is expected during the database failover. Write operations are temporarily restricted while the primary database is being transitioned to the backup instance.
Customer: How long will writes be disabled?
Agent: Write operations should resume within 10-15 minutes once the failover completes. In the meantime, all read operations are still functional.
Customer: Is there any way to queue my writes?
Agent: Unfortunately, we can't queue writes during failover as it could cause data inconsistency. However, I can help you implement client-side queuing so your application can batch and send writes once services are restored.
Customer: That's a good idea. Can you send me documentation on that?
Agent: Of course. I'll send you a guide on implementing client-side write queuing, along with best practices for handling this scenario in the future.
Customer: Perfect. Thank you for the proactive solution.
Agent: You're welcome. I'll also notify you as soon as write operations are restored.`,
  ];

  const calls = [];
  for (let i = 0; i < 5; i++) {
    const type = types[Math.floor(Math.random() * types.length)];
    const issueIndex = i % issues.length; // Cycle through issues to ensure variety
    const issue = issues[issueIndex];
    const agentId = `AI-${String(Math.floor(Math.random() * 12) + 1).padStart(3, '0')}`;
    const callId = `CALL-${String(Date.now() - i * 60000).slice(-8)}`;
    const customerPhone = `+1${Math.floor(Math.random() * 9000000000) + 1000000000}`;
    // Use different summary and transcript for each call
    const summaryIndex = i % summaries.length;
    const transcriptIndex = i % transcripts.length;
    const summary = summaries[summaryIndex];
    const transcript = transcripts[transcriptIndex];

    calls.push({
      callId,
      time: new Date(Date.now() - (i + 1) * 60000).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      }),
      agentId,
      type,
      issue,
      duration: `${Math.floor(Math.random() * 15) + 2}m`,
      sentiment: (Math.random() * 2 + 3).toFixed(1),
      customerPhone,
      summary,
      transcript,
    });
  }

  return calls;
}

export async function GET() {
  await new Promise(resolve => setTimeout(resolve, 200));
  const calls = generateRecentCalls();
  
  // Import active callbacks
  const { getActiveCallbacks } = await import('../../calls/queue/route');
  const callbacks = getActiveCallbacks();
  
  return NextResponse.json({ calls, callbacks });
}

