import { getCachedConversation } from "@/lib/conversation-cache";
import { createCall } from "@/lib/db/queries";
import { generatePhoneNumber } from "@/lib/utils/generatePhoneNumber";
import { getRandomIssueType } from "@/lib/seed-conversations";
import { NextResponse } from "next/server";

/**
 * Creates a new call with a randomly generated conversation.
 * Useful for populating the waiting calls list with test data.
 * 
 * @route GET /api/calls/create
 * @returns {Promise<NextResponse>} Response containing the ID of the newly created call
 * 
 * @example
 * // Create a random call
 * GET /api/calls/create
 * 
 * Response: "CALL-abc123"
 */
export async function GET() {
  const issue = getRandomIssueType();
  const conversation = await getCachedConversation(issue);

  const call = await createCall({
    id: `CALL-${Math.random().toString(36).substring(2, 15)}`,
    customerPhone: generatePhoneNumber(),
    status: 'queued',
    callType: 'regular',
    issue: issue,
    waitTime: 0,
    expectedDuration: conversation.predictedRemainingDuration || conversation.estimatedTotalDuration,
    generationStatus: 'completed',
    generationAttempts: 1,
    
  });

  return NextResponse.json(call.id);
}
