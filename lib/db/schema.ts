import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const agents = sqliteTable('agents', {
  id: text('id').primaryKey(),
  type: text('type').notNull(), // 'HUMAN' | 'AI'
  status: text('status').notNull(), // 'ACTIVE' | 'IDLE'
  callsHandled: integer('calls_handled').default(0).notNull(),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export const calls = sqliteTable('calls', {
  id: text('id').primaryKey(),
  customerPhone: text('customer_phone').notNull(),
  agentId: text('agent_id').references(() => agents.id),
  status: text('status').notNull(), // 'queued' | 'active' | 'ended' | 'abandoned'
  callType: text('call_type').notNull(), // 'regular' | 'callback'
  issue: text('issue'),
  startTime: integer('start_time'),
  endTime: integer('end_time'),
  waitTime: integer('wait_time').notNull(), // wait time in seconds
  expectedDuration: integer('expected_duration'), // expected duration in seconds (5-15 min = 300-900)
  generationStatus: text('generation_status'), // 'pending' | 'generating' | 'completed' | 'failed' | null (for Gemini generation)
  generationAttempts: integer('generation_attempts').default(0), // retry count for conversation generation
  elevenlabsConversationId: text('elevenlabs_conversation_id'), // optional: for tracking ElevenLabs simulations
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export const callTranscripts = sqliteTable('call_transcripts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  callId: text('call_id').notNull().references(() => calls.id),
  transcript: text('transcript').notNull(),
  summary: text('summary'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export const callQueue = sqliteTable('call_queue', {
  id: text('id').primaryKey(),
  callId: text('call_id').references(() => calls.id),
  customerPhone: text('customer_phone').notNull(),
  issue: text('issue'),
  waitTime: integer('wait_time').notNull(),
  queuedAt: integer('queued_at').notNull(),
  assignedAt: integer('assigned_at'),
  assignedAgentId: text('assigned_agent_id').references(() => agents.id),
  status: text('status').notNull(), // 'queued' | 'assigned' | 'completed'
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export const callConversationTurns = sqliteTable('call_conversation_turns', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  callId: text('call_id').notNull().references(() => calls.id),
  role: text('role').notNull(), // 'agent' | 'customer'
  content: text('content').notNull(),
  turnOrder: integer('turn_order').notNull(),
  estimatedDuration: integer('estimated_duration').notNull(), // seconds for this turn
  predictedRemainingDuration: integer('predicted_remaining_duration').notNull(), // seconds remaining after this turn
  createdAt: integer('created_at').notNull(),
});

