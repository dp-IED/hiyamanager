// ElevenLabs client for conversation simulation
// Uses ElevenLabs Agents API for simulating conversations

const ELEVENLABS_BASE_URL = 'https://api.elevenlabs.io/v1';
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || '';

export interface ConversationSimulationSpecification {
  simulated_user_config?: {
    prompt?: string;
    llm?: string;
    temperature?: number;
  };
  extra_evaluation_criteria?: Array<{
    id: string;
    name: string;
    conversation_goal_prompt: string;
    use_knowledge_base?: boolean;
  }>;
  partial_conversation_history?: Array<{
    role: 'user' | 'agent';
    message: string;
  }>;
}

export interface SimulatedConversationResponse {
  conversation: Array<{
    role: 'user' | 'agent';
    message: string;
    tool_calls?: any[];
    tool_results?: any[];
    time_in_call_secs?: number;
  }>;
  analysis: {
    evaluation_criteria_results?: Record<string, {
      criteria_id: string;
      result: 'success' | 'failure';
      rationale: string;
    }>;
    data_collection_results?: Record<string, {
      data_collection_id: string;
      value: string;
      rationale: string;
    }>;
    call_successful?: 'success' | 'failure';
    transcript_summary?: string;
  };
}

export class ElevenLabsClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || ELEVENLABS_API_KEY;
    this.baseUrl = ELEVENLABS_BASE_URL;
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'xi-api-key': this.apiKey,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`ElevenLabs API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  /**
   * Simulate a conversation using ElevenLabs Agents API
   * This is used for the "listen in" feature to simulate and listen to conversations
   * 
   * @param agentId - The ElevenLabs agent ID
   * @param simulationSpec - Specification for the conversation simulation
   * @returns The simulated conversation with transcript and analysis
   */
  async simulateConversation(
    agentId: string,
    simulationSpec: ConversationSimulationSpecification
  ): Promise<SimulatedConversationResponse> {
    if (!this.apiKey || this.apiKey === '') {
      throw new Error('ELEVENLABS_API_KEY is not set. Please configure it in your environment variables.');
    }

    try {
      const response = await this.request(`/conversational-ai/agents/${agentId}/simulate_conversation`, {
        method: 'POST',
        body: JSON.stringify(simulationSpec),
      });

      return response as SimulatedConversationResponse;
    } catch (error) {
      console.error('Failed to simulate conversation:', error);
      throw error;
    }
  }

  /**
   * Stream simulate conversation (for real-time listening)
   * This can be used for streaming the conversation as it's being generated
   */
  async streamSimulateConversation(
    agentId: string,
    simulationSpec: ConversationSimulationSpecification,
    onChunk?: (chunk: any) => void
  ): Promise<SimulatedConversationResponse> {
    if (!this.apiKey || this.apiKey === '') {
      throw new Error('ELEVENLABS_API_KEY is not set. Please configure it in your environment variables.');
    }

    try {
      const response = await fetch(`${this.baseUrl}/conversational-ai/agents/${agentId}/stream_simulate_conversation`, {
        method: 'POST',
        headers: {
          'xi-api-key': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(simulationSpec),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`ElevenLabs API error: ${response.status} - ${error}`);
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      if (!reader) {
        throw new Error('No response body reader available');
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim() && line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (onChunk) {
                onChunk(data);
              }
            } catch (e) {
              // Ignore parse errors for incomplete chunks
            }
          }
        }
      }

      // Return final result (you may need to accumulate this differently)
      return {} as SimulatedConversationResponse;
    } catch (error) {
      console.error('Failed to stream simulate conversation:', error);
      throw error;
    }
  }
}

export const elevenLabsClient = new ElevenLabsClient();

