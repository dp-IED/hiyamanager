// Types exported for use in other files
export interface ConversationTurn {
  role: 'agent' | 'customer';
  content: string;
  estimatedDuration: number; // seconds for this turn
  predictedRemainingDuration: number; // seconds remaining in the conversation after this turn
}

export interface GeneratedConversation {
  turns: ConversationTurn[];
  transcript: string; // Full transcript string for backward compatibility
  estimatedTotalDuration: number; // Total duration in seconds (sum of all turn durations)
  predictedRemainingDuration: number; // Predicted remaining duration from the last turn
  summary: string;
}

// Helper function to estimate duration based on content length
function estimateDuration(content: string): number {
  // Rough estimate: 2-3 words per second, minimum 5 seconds, maximum 15 seconds
  const wordCount = content.split(/\s+/).length;
  const estimated = Math.max(5, Math.min(15, Math.ceil(wordCount / 2.5)));
  return estimated;
}

// Helper function to parse transcript string into turns
function parseTranscript(transcript: string): ConversationTurn[] {
  const lines = transcript.split('\n').filter(line => line.trim());
  const turns: ConversationTurn[] = [];
  const predictedRemainingDuration = Math.floor(Math.random() * (900 - 600 + 1)) + 600; // 600-900 seconds

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('Agent:')) {
      const content = trimmed.substring(6).trim();
      turns.push({
        role: 'agent',
        content,
        estimatedDuration: estimateDuration(content),
        predictedRemainingDuration,
      });
    } else if (trimmed.startsWith('Customer:')) {
      const content = trimmed.substring(9).trim();
      turns.push({
        role: 'customer',
        content,
        estimatedDuration: estimateDuration(content),
        predictedRemainingDuration,
      });
    }
  }

  return turns;
}

// Hardcoded transcripts and summaries from seed.ts
const hardcodedTranscripts = [
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

const hardcodedSummaries = [
  'Customer reporting complete service outage with database connection timeouts. Agent is explaining the ongoing primary database failover incident and providing estimated resolution time of 10-15 minutes. Customer is understanding and will monitor status page.',
  'Customer experiencing API 503 errors across all endpoints. Agent is confirming this is related to the database failover and that read replicas are being promoted. Providing workaround to use cached data endpoints temporarily.',
  'Customer unable to sync data between services due to database write restrictions during failover. Agent is explaining read-only mode is active and full write access will restore once primary database is back online.',
  'Customer reporting query timeouts on critical reports. Agent is identifying queries hitting the primary database during failover. Redirecting customer to use read replica endpoints which are functioning normally.',
  'Customer experiencing transaction rollback errors on payment processing. Agent is confirming database failover is causing temporary write restrictions. Providing alternative payment gateway as interim solution.',
  'Customer unable to access user authentication services. Agent is explaining database failover is affecting authentication database. Providing temporary API key access until primary database is restored.',
  'Customer reporting data inconsistency between production and staging environments. Agent is confirming this is due to read replica lag during the failover process. Explaining data will sync automatically once failover completes.',
  'Customer experiencing connection pool exhaustion errors. Agent is identifying high connection demand during failover. Recommending connection pooling optimization and providing temporary rate limiting workaround.',
];

// Issue types that map to conversations
const issues = [
  'Database failover incident',
  'API service unavailable',
  'Primary database connection timeout',
  'Read replica lag causing data inconsistency',
  'Connection pool exhaustion',
  'Transaction rollback errors',
  'Authentication service down',
  'Payment processing failures',
  'Data sync failure',
  'Query timeout errors',
  'Service degradation',
  'High latency issues',
];

// Create hardcoded conversations for each issue
// Map issues to transcripts (cycling through available transcripts)
function createHardcodedConversations(): Map<string, GeneratedConversation> {
  const conversations = new Map<string, GeneratedConversation>();

  issues.forEach((issue, index) => {
    // Cycle through available transcripts (5 transcripts, 12 issues)
    const transcriptIndex = index % hardcodedTranscripts.length;
    const summaryIndex = index % hardcodedSummaries.length;
    
    const transcript = hardcodedTranscripts[transcriptIndex];
    const summary = hardcodedSummaries[summaryIndex];
    const turns = parseTranscript(transcript);
    
    const estimatedTotalDuration = turns.reduce((sum, turn) => sum + turn.estimatedDuration, 0);
    const predictedRemainingDuration = turns[0]?.predictedRemainingDuration || 750; // Default 12.5 minutes

    conversations.set(issue, {
      turns,
      transcript,
      estimatedTotalDuration,
      predictedRemainingDuration,
      summary,
    });
  });

  return conversations;
}

// Initialize hardcoded conversations
const hardcodedConversations = createHardcodedConversations();

/**
 * Gets a cached conversation for an issue type
 * Always succeeds - returns a hardcoded conversation
 * Falls back to first conversation if issue not found
 */
export async function getCachedConversation(issue: string): Promise<GeneratedConversation> {
  // Try to get exact match first
  if (hardcodedConversations.has(issue)) {
    const cached = hardcodedConversations.get(issue)!;
    // Return a copy to avoid mutations
    return {
      ...cached,
      turns: [...cached.turns],
    };
  }
  
  // Fallback: return first available conversation
  const firstConversation = hardcodedConversations.values().next().value;
  if (firstConversation) {
    return {
      ...firstConversation,
      turns: [...firstConversation.turns],
    };
  }
  
  // This should never happen, but provide a safe fallback
  throw new Error('No hardcoded conversations available');
}

/**
 * Clears the conversation cache (no-op for hardcoded conversations)
 * Kept for backward compatibility
 */
export function clearConversationCache(): void {
  // No-op: hardcoded conversations cannot be cleared
}

/**
 * Gets the current cache size
 */
export function getCacheSize(): number {
  return hardcodedConversations.size;
}
