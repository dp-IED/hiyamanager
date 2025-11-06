import { NextResponse } from 'next/server';
import { vapiClient } from '@/lib/vapi';
import { getAgentById, updateAgentStatus } from '@/lib/db/queries';
import { db } from '@/lib/db/index';
import { agents } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// Store created assistants (demo only - for backward compatibility)
const assistants = new Map<string, any>();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { agentId, name } = body;

    // Create assistant configuration for outage support
    const assistant = await vapiClient.createAssistant({
      name: name || `AI Agent ${agentId}`,
      model: {
        provider: 'openai',
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are a helpful customer support agent for a tech company. 
            We're currently experiencing a database failover incident that's affecting some services.
            Be empathetic, provide clear information, and help customers with workarounds when possible.
            Keep responses concise and professional.`,
          },
        ],
      },
      voice: {
        provider: '11labs',
        voiceId: '21m00Tcm4TlvDq8ikWAM', // Default voice
      },
      firstMessage: 'Hello! Thank you for calling support. I understand you may be experiencing some service issues. How can I help you today?',
    });

    // Store assistant mapping (for backward compatibility)
    assistants.set(agentId, assistant);

    // Update agent in database with assistant ID
    if (assistant.id && agentId) {
      const now = Math.floor(Date.now() / 1000);
      await db.update(agents)
        .set({ 
          vapiAssistantId: assistant.id,
          updatedAt: now,
        })
        .where(eq(agents.id, agentId));
    }

    return NextResponse.json({
      success: true,
      assistant,
      agentId,
    });
  } catch (error: any) {
    console.error('Failed to create Vapi assistant:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create assistant' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agentId');

    if (agentId) {
      const assistant = assistants.get(agentId);
      if (assistant) {
        return NextResponse.json({ assistant });
      }
      return NextResponse.json(
        { error: 'Assistant not found' },
        { status: 404 }
      );
    }

    // Return all assistants
    const allAssistants = Array.from(assistants.entries()).map(([id, assistant]) => ({
      agentId: id,
      assistant,
    }));

    return NextResponse.json({ assistants: allAssistants });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to get assistants' },
      { status: 500 }
    );
  }
}

