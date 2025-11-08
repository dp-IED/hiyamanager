import { getConversationTurns, getConversationProgress } from './db/queries';

export interface ConversationTurn {
  id: number;
  callId: string;
  role: 'agent' | 'customer';
  content: string;
  turnOrder: number;
  estimatedDuration: number;
  createdAt: number;
}

/**
 * Plays a conversation with realistic timing
 * Calls onTurn callback for each turn as it should be displayed
 */
export async function playConversation(
  callId: string,
  onTurn: (turn: ConversationTurn, index: number) => void
): Promise<void> {
  const turns = await getConversationTurns(callId);
  
  if (turns.length === 0) {
    return;
  }
  
  // Get current progress to determine where to start
  const progress = await getConversationProgress(callId);
  const startIndex = progress.currentTurnIndex;
  
  // Play remaining turns
  for (let i = startIndex; i < turns.length; i++) {
    const turn = turns[i];
    onTurn(turn as ConversationTurn, i);
    
    // Wait for the estimated duration before next turn
    if (i < turns.length - 1) {
      await new Promise(resolve => setTimeout(resolve, turn.estimatedDuration * 1000));
    }
  }
}

/**
 * Gets the current conversation state for a call
 */
export async function getConversationState(callId: string) {
  const turns = await getConversationTurns(callId);
  const progress = await getConversationProgress(callId);
  
  return {
    turns: turns as ConversationTurn[],
    currentTurnIndex: progress.currentTurnIndex,
    totalTurns: progress.totalTurns,
    visibleTurns: turns.slice(0, progress.currentTurnIndex) as ConversationTurn[],
  };
}

