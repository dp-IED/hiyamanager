import { geminiClient, GeminiMessage } from './gemini-client';
import { updateCallGenerationStatus, saveCallTranscript, saveConversationTurns, updateCallExpectedDuration } from './db/queries';

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

const MAIN_OUTAGE = 'Database failover incident affecting primary database connections and write operations';

/**
 * Generates a realistic customer support conversation based on an issue
 * Uses structured JSON output with duration predictions
 */
export async function generateConversation(
  issue: string,
  mainOutage: string = MAIN_OUTAGE
): Promise<GeneratedConversation> {
  const systemPrompt = `You are a helpful customer support agent for a tech company. Generate a realistic, natural ONGOING conversation between a support agent and a customer about a technical issue.

CRITICAL REQUIREMENTS:
- This is an ONGOING conversation that is still in progress. DO NOT end the conversation.
- The conversation should be in the middle of being resolved, with the agent actively helping.
- DO NOT include closing statements like "Is there anything else?" or "Thank you for calling"
- The conversation should feel like it's continuing, not concluding

OUTPUT FORMAT:
You MUST respond with valid JSON only. The JSON structure must be:
{
  "turns": [
    {
      "role": "agent" or "customer",
      "content": "the message text",
      "estimatedDuration": <number in seconds for this turn>,
      "predictedRemainingDuration": <number in seconds remaining in conversation after this turn>
    },
    ...
  ]
}

DURATION PREDICTION:
- estimatedDuration: How long this specific turn will take (speaking time + natural pause, typically 5-15 seconds)
- predictedRemainingDuration: Your prediction of how many seconds remain in the ENTIRE conversation after this turn completes
- For the first turn, predictedRemainingDuration should be your estimate of total conversation length
- For each subsequent turn, predictedRemainingDuration should decrease as the conversation progresses
- Typical support calls last 3-10 minutes (180-600 seconds), but ongoing calls may have more remaining
- Consider the complexity of the issue, how much troubleshooting is needed, and how close to resolution you are

CONVERSATION GUIDELINES:
- Generate 6-12 turns showing an ongoing conversation
- Agent should be professional, empathetic, and solution-oriented
- Customer should express concern appropriately
- Each message should be 1-3 sentences typically
- The conversation should end mid-resolution, with the agent still actively helping`;

  const userPrompt = `Generate an ONGOING customer support conversation about this issue: "${issue}"

Context: The main outage is: "${mainOutage}"

The customer is calling about: ${issue}

Generate a realistic ONGOING conversation between the agent and customer. The conversation should be IN PROGRESS, not finished. Do not end the conversation - it should feel like it's continuing.

Respond with ONLY valid JSON in the specified format. /no-think`;

  const messages: GeminiMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];

  try {
    const rawResponse = await geminiClient.generateWithGeminiStructured(messages, {
      temperature: 0.8,
      maxTokens: 2000,
    });

    // Parse JSON response
    let conversationData: { turns: ConversationTurn[] };
    try {
      // Strip /no-think if present
      const cleanedResponse = rawResponse.replace(/\s*\/no-think\s*/gi, '').trim();
      conversationData = JSON.parse(cleanedResponse);
    } catch (parseError) {
      throw new Error(`Failed to parse JSON response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
    }

    if (!conversationData.turns || !Array.isArray(conversationData.turns) || conversationData.turns.length === 0) {
      throw new Error('Invalid response format - no turns found in JSON');
    }

    // Validate and process turns
    const turns: ConversationTurn[] = conversationData.turns.map((turn, index) => {
      if (!turn.role || !turn.content) {
        throw new Error(`Invalid turn at index ${index}: missing role or content`);
      }
      if (turn.role !== 'agent' && turn.role !== 'customer') {
        throw new Error(`Invalid turn at index ${index}: role must be 'agent' or 'customer'`);
      }
      if (typeof turn.estimatedDuration !== 'number' || turn.estimatedDuration < 0) {
        throw new Error(`Invalid turn at index ${index}: estimatedDuration must be a positive number`);
      }
      if (typeof turn.predictedRemainingDuration !== 'number' || turn.predictedRemainingDuration < 0) {
        throw new Error(`Invalid turn at index ${index}: predictedRemainingDuration must be a positive number`);
      }
      return {
        role: turn.role,
        content: turn.content.trim(),
        estimatedDuration: Math.round(turn.estimatedDuration),
        predictedRemainingDuration: Math.round(turn.predictedRemainingDuration),
      };
    });

    // Generate summary
    const summary = await generateSummary(issue, turns);

    // Calculate total duration (sum of all turn durations)
    const estimatedTotalDuration = turns.reduce((sum, turn) => sum + turn.estimatedDuration, 0);

    // Get predicted remaining duration from the last turn
    const predictedRemainingDuration = turns.length > 0 ? turns[turns.length - 1].predictedRemainingDuration : 0;

    // Log duration values for debugging
    if (!predictedRemainingDuration || predictedRemainingDuration <= 0) {
      console.warn(`[generateConversation] Invalid predictedRemainingDuration: ${predictedRemainingDuration} for issue "${issue}". Using estimatedTotalDuration: ${estimatedTotalDuration}`);
    }

    // Create transcript string for backward compatibility
    const transcript = turns
      .map(turn => `${turn.role === 'agent' ? 'Agent' : 'Customer'}: ${turn.content}`)
      .join('\n');

    return {
      turns,
      transcript,
      estimatedTotalDuration,
      predictedRemainingDuration,
      summary,
    };
  } catch (error) {
    console.error('Failed to generate conversation:', error);
    // Re-throw the error - no fallbacks
    throw new Error(`Failed to generate conversation for issue "${issue}": ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}


/**
 * Generates a summary of the conversation
 */
async function generateSummary(issue: string, turns: ConversationTurn[]): Promise<string> {
  const conversationText = turns
    .map(t => `${t.role === 'agent' ? 'Agent' : 'Customer'}: ${t.content}`)
    .join('\n');

  const summaryPrompt = `Summarize this customer support conversation in 1-2 sentences:

Issue: ${issue}
Conversation:
${conversationText}

Summary: /no-think`;

  try {
    const summary = await geminiClient.generateWithGemini(
      [{ role: 'user', content: summaryPrompt }],
      { temperature: 0.5, maxTokens: 200 }
    );
    // Remove /no-think if it appears in the response
    return summary.trim().replace(/\s*\/no-think\s*$/i, '').trim();
  } catch (error) {
    console.error('Failed to generate summary:', error);
    // Re-throw the error - no fallbacks
    throw new Error(`Failed to generate summary: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// ============================================================================
// Background Generation Queue with Retry Logic
// ============================================================================

interface GenerationRequest {
  callId: string;
  issue: string;
  mainOutage?: string;
}

class BackgroundGenerationQueue {
  private queue: GenerationRequest[] = [];
  private processing = false;
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAYS = [10000, 30000, 60000]; // Exponential backoff: 10s, 30s, 60s

  /**
   * Enqueue a conversation generation request
   * This does not block - it adds to queue and returns immediately
   */
  enqueue(callId: string, issue: string, mainOutage?: string): void {
    console.log(`[BackgroundGeneration] Enqueued generation for call ${callId}`);
    this.queue.push({ callId, issue, mainOutage });
    this.processQueue();
  }

  /**
   * Process the generation queue sequentially
   */
  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      const request = this.queue.shift()!;
      await this.processGenerationWithRetry(request);
    }

    this.processing = false;
  }

  /**
   * Process a single generation request with retry logic
   */
  private async processGenerationWithRetry(request: GenerationRequest): Promise<void> {
    const { callId, issue, mainOutage } = request;
    let attempt = 0;

    while (attempt < this.MAX_RETRIES) {
      attempt++;

      try {
        console.log(`[BackgroundGeneration] Generating conversation for call ${callId} (attempt ${attempt}/${this.MAX_RETRIES})`);

        // Update status to 'generating'
        await updateCallGenerationStatus(callId, 'generating', attempt);

        // Generate conversation
        const conversation = await generateConversation(issue, mainOutage);
        const expectedDuration = conversation.predictedRemainingDuration || conversation.estimatedTotalDuration;

        // Save the results
        await saveCallTranscript({
          callId,
          transcript: conversation.transcript,
          summary: conversation.summary,
        });
        await saveConversationTurns(callId, conversation.turns);
        await updateCallExpectedDuration(callId, expectedDuration);

        // Mark as completed
        await updateCallGenerationStatus(callId, 'completed', attempt);

        console.log(`[BackgroundGeneration] ✓ Successfully generated conversation for call ${callId} on attempt ${attempt}`);
        return; // Success - exit retry loop
      } catch (error) {
        console.error(`[BackgroundGeneration] ✗ Failed to generate conversation for call ${callId} on attempt ${attempt}:`, error);

        if (attempt < this.MAX_RETRIES) {
          // Wait before retrying (exponential backoff)
          const delay = this.RETRY_DELAYS[attempt - 1];
          console.log(`[BackgroundGeneration] Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          // Max retries reached - mark as failed
          console.error(`[BackgroundGeneration] ✗ Max retries (${this.MAX_RETRIES}) reached for call ${callId}. Marking as failed.`);
          await updateCallGenerationStatus(callId, 'failed', attempt);
        }
      }
    }
  }

  /**
   * Get queue status for debugging
   */
  getStatus(): { queueLength: number; processing: boolean } {
    return {
      queueLength: this.queue.length,
      processing: this.processing,
    };
  }
}

// Export singleton instance
export const backgroundGenerationQueue = new BackgroundGenerationQueue();


