import { generateConversation, GeneratedConversation } from './conversation-generator';

// Cache for pre-generated conversations
const conversationCache = new Map<string, GeneratedConversation>();

/**
 * Gets a cached conversation or generates a new one
 */
export async function getCachedConversation(issue: string): Promise<GeneratedConversation> {
  // Check cache first
  if (conversationCache.has(issue)) {
    const cached = conversationCache.get(issue)!;
    // Return a copy to avoid mutations
    return {
      ...cached,
      turns: [...cached.turns],
    };
  }
  
  // Generate new conversation
  const conversation = await generateConversation(issue);
  
  // Cache it
  conversationCache.set(issue, conversation);
  
  return conversation;
}

/**
 * Pre-generates conversations for a list of issues
 * Processes them sequentially to avoid overwhelming Gemini API (important for free tier)
 * Uses issue-based caching to minimize API calls and save credits
 */
export async function pregenerateConversations(issues: string[]): Promise<void> {
  console.log(`Pre-generating conversations for ${issues.length} issues...`);
  
  // Process sequentially to avoid overwhelming Gemini API (rate limiting)
  for (const issue of issues) {
    try {
      await getCachedConversation(issue);
      console.log(`✓ Cached conversation for: ${issue}`);
      // Small delay between requests to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`✗ Failed to generate conversation for ${issue}:`, error);
      // Continue with next issue even if one fails
    }
  }
  
  console.log(`Pre-generation complete. Cache size: ${conversationCache.size}`);
}

/**
 * Clears the conversation cache
 */
export function clearConversationCache(): void {
  conversationCache.clear();
}

/**
 * Gets the current cache size
 */
export function getCacheSize(): number {
  return conversationCache.size;
}

