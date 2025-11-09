import { getCachedConversation, GeneratedConversation } from './conversation-cache';

// Issue types from seed.ts - these are the conversation types we can randomly assign
export const SEED_ISSUE_TYPES = [
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

/**
 * Randomly picks an issue type from the seed issues
 */
export function getRandomIssueType(): string {
  const randomIndex = Math.floor(Math.random() * SEED_ISSUE_TYPES.length);
  return SEED_ISSUE_TYPES[randomIndex];
}

/**
 * Gets a cached conversation for a randomly selected issue type
 * This will use the pre-generated conversations from seed.ts
 */
export async function getRandomSeedConversation(): Promise<GeneratedConversation> {
  const issueType = getRandomIssueType();
  return await getCachedConversation(issueType);
}

/**
 * Gets a cached conversation for a specific issue type
 * Falls back to random if the specific type isn't cached
 */
export async function getSeedConversationByType(issueType?: string): Promise<GeneratedConversation> {
  if (issueType && SEED_ISSUE_TYPES.includes(issueType)) {
    return await getCachedConversation(issueType);
  }
  // Fallback to random if issue type not in seed types
  return await getRandomSeedConversation();
}

