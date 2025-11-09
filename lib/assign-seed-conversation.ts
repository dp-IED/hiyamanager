import { getRandomSeedConversation } from './seed-conversations';
import { 
  saveCallTranscript, 
  saveConversationTurns, 
  updateCallExpectedDuration,
  updateCallGenerationStatus 
} from './db/queries';

/**
 * Assigns a randomly selected seed conversation to a call
 * Uses pre-generated conversations from seed.ts (cached by issue type)
 */
export async function assignSeedConversationToCall(callId: string): Promise<void> {
  try {
    console.log(`[assignSeedConversation] Assigning seed conversation to call ${callId}`);

    // Update status to 'generating'
    await updateCallGenerationStatus(callId, 'generating', 1);

    // Get a random seed conversation (from cache, pre-generated in seed.ts)
    const conversation = await getRandomSeedConversation();
    let expectedDuration = conversation.predictedRemainingDuration || conversation.estimatedTotalDuration;
    
    // Ensure we have a valid duration - use random 10-15 minutes (600-900 seconds) if missing
    if (!expectedDuration || expectedDuration <= 0) {
      console.warn(`[assignSeedConversation] Invalid duration for call ${callId}: ${expectedDuration}. Using random 10-15 minutes`);
      expectedDuration = Math.floor(Math.random() * (900 - 600 + 1)) + 600; // Random 600-900 seconds
    }

    // Save the conversation to the call
    await saveCallTranscript({
      callId,
      transcript: conversation.transcript,
      summary: conversation.summary,
    });
    await saveConversationTurns(callId, conversation.turns);
    await updateCallExpectedDuration(callId, expectedDuration);

    // Mark as completed
    await updateCallGenerationStatus(callId, 'completed', 1);

    console.log(`[assignSeedConversation] ✓ Successfully assigned seed conversation to call ${callId}`);
  } catch (error) {
    console.error(`[assignSeedConversation] ✗ Failed to assign seed conversation to call ${callId}:`, error);
    // Mark as failed
    await updateCallGenerationStatus(callId, 'failed', 1);
    throw error;
  }
}

