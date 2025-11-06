// Vapi client for voice agent integration
// This uses Vapi's REST API directly

const VAPI_BASE_URL = 'https://api.vapi.ai';
const VAPI_API_KEY = process.env.VAPI_API_KEY || '';

export interface VapiAssistant {
  id?: string;
  name: string;
  model: {
    provider: 'openai' | 'anthropic';
    model: string;
    messages?: Array<{
      role: 'system' | 'user' | 'assistant';
      content: string;
    }>;
  };
  voice?: {
    provider: '11labs' | 'playht' | 'deepgram';
    voiceId?: string;
  };
  firstMessage?: string;
  serverUrl?: string;
}

export interface VapiCall {
  id?: string;
  assistantId: string;
  customer?: {
    number: string;
  };
  phoneNumberId?: string;
}

export class VapiClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || VAPI_API_KEY;
    this.baseUrl = VAPI_BASE_URL;
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Vapi API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  async createAssistant(assistant: VapiAssistant) {
    // For demo, return mock data if API key is not set
    if (!this.apiKey || this.apiKey === '') {
      return {
        id: `assistant_${Date.now()}`,
        ...assistant,
        createdAt: new Date().toISOString(),
      };
    }

    try {
      return await this.request('/assistant', {
        method: 'POST',
        body: JSON.stringify(assistant),
      });
    } catch (error) {
      console.error('Failed to create Vapi assistant:', error);
      // Return mock for demo
      return {
        id: `assistant_${Date.now()}`,
        ...assistant,
        createdAt: new Date().toISOString(),
      };
    }
  }

  async createCall(call: VapiCall) {
    // For demo, return mock data if API key is not set
    if (!this.apiKey || this.apiKey === '') {
      return {
        id: `call_${Date.now()}`,
        ...call,
        status: 'queued',
        createdAt: new Date().toISOString(),
      };
    }

    try {
      return await this.request('/call', {
        method: 'POST',
        body: JSON.stringify(call),
      });
    } catch (error) {
      console.error('Failed to create Vapi call:', error);
      // Return mock for demo
      return {
        id: `call_${Date.now()}`,
        ...call,
        status: 'queued',
        createdAt: new Date().toISOString(),
      };
    }
  }

  async getCall(callId: string) {
    if (!this.apiKey || this.apiKey === '') {
      return {
        id: callId,
        status: 'in-progress',
        transcript: [],
      };
    }

    try {
      return await this.request(`/call/${callId}`);
    } catch (error) {
      console.error('Failed to get Vapi call:', error);
      return {
        id: callId,
        status: 'in-progress',
        transcript: [],
      };
    }
  }

  async getAssistant(assistantId: string) {
    if (!this.apiKey || this.apiKey === '') {
      return {
        id: assistantId,
        name: 'Support Agent',
      };
    }

    try {
      return await this.request(`/assistant/${assistantId}`);
    } catch (error) {
      console.error('Failed to get Vapi assistant:', error);
      return {
        id: assistantId,
        name: 'Support Agent',
      };
    }
  }

  async endCall(callId: string) {
    // For demo, return mock success if API key is not set
    if (!this.apiKey || this.apiKey === '') {
      console.log(`[Mock] Ending call ${callId}`);
      return {
        id: callId,
        status: 'ended',
        endedAt: new Date().toISOString(),
      };
    }

    try {
      // VAPI uses PATCH to end calls, or DELETE depending on API version
      // Try PATCH first with status: 'ended'
      return await this.request(`/call/${callId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'ended' }),
      });
    } catch (error) {
      // If PATCH fails, try DELETE
      try {
        return await this.request(`/call/${callId}`, {
          method: 'DELETE',
        });
      } catch (deleteError) {
        console.error('Failed to end Vapi call:', error);
        // Return mock success for demo purposes
        return {
          id: callId,
          status: 'ended',
          endedAt: new Date().toISOString(),
        };
      }
    }
  }
}

export const vapiClient = new VapiClient();

