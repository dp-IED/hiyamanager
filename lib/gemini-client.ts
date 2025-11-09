// Gemini 2.0 Flash client using Vercel AI SDK
// Works in both Node.js (seed.ts) and browser environments

import { google } from '@ai-sdk/google';
import { generateText, generateObject } from 'ai';
import { z } from 'zod';
import dotenv from 'dotenv';
dotenv.config();

export interface GeminiMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface GeminiChatCompletionOptions {
  temperature?: number;
  maxTokens?: number;
}

// Conversation turn schema for structured output
const ConversationTurnSchema = z.object({
  role: z.enum(['agent', 'customer']),
  content: z.string(),
});

const ConversationSchema = z.object({
  turns: z.array(ConversationTurnSchema),
});

type QueuedRequest = {
  resolve: (value: string) => void;
  reject: (error: Error) => void;
  messages: GeminiMessage[];
  options: GeminiChatCompletionOptions;
  isStructured?: boolean;
};

export class GeminiClient {
  private requestQueue: QueuedRequest[] = [];
  private isProcessing: boolean = false;
  private apiKey: string | undefined;

  constructor() {
    this.apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
    if (!this.apiKey) {
      console.log('GOOGLE_GENERATIVE_AI_API_KEY', process.env.GOOGLE_GENERATIVE_AI_API_KEY);
      console.warn('GOOGLE_GENERATIVE_AI_API_KEY is not set. Gemini client will fail.');
    }
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.requestQueue.length === 0) {
      return;
    }

    this.isProcessing = true;
    const request = this.requestQueue.shift()!;

    try {
      const result = await this.executeRequest(
        request.messages,
        request.options,
        request.isStructured
      );
      request.resolve(result);
    } catch (error) {
      request.reject(error instanceof Error ? error : new Error('Unknown error'));
    } finally {
      this.isProcessing = false;
      this.processQueue();
    }
  }

  private async executeRequest(
    messages: GeminiMessage[],
    options: GeminiChatCompletionOptions = {},
    isStructured: boolean = false
  ): Promise<string> {
    try {
      if (isStructured) {
        const result = await generateObject({
          model: google('gemini-2.5-flash-lite'),
          schema: ConversationSchema,
          messages: messages.map(msg => ({
            role: msg.role,
            content: msg.content,
          })),
          temperature: options.temperature ?? 0.8,
          maxTokens: options.maxTokens ?? 2000,
        });

        return JSON.stringify(result.object);
      } else {
        const result = await generateText({
          model: google('gemini-2.5-flash-lite'),
          messages: messages.map(msg => ({
            role: msg.role,
            content: msg.content,
          })),
          temperature: options.temperature ?? 0.7,
          maxTokens: options.maxTokens ?? 2000,
        });

        const content = result.text.trim();
        if (content.length === 0) {
          throw new Error('Gemini returned empty string');
        }

        return content;
      }
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('API key')) {
          console.error('Gemini API key error:', error.message);
          throw new Error('Invalid or missing API key. Please set GEMINI_API_KEY (for AI Studio) or GOOGLE_GENERATIVE_AI_API_KEY (for Google Cloud) in your environment variables.');
        }
        if (error.message.includes('quota') || error.message.includes('rate limit')) {
          throw new Error('Gemini API quota exceeded or rate limited. Please try again later.');
        }
        throw new Error(`Gemini API error: ${error.message}`);
      }
      throw new Error('Unknown error occurred while calling Gemini API');
    }
  }

  /**
   * Generate text using Gemini
   */
  async generateWithGemini(
    messages: GeminiMessage[],
    options: GeminiChatCompletionOptions = {}
  ): Promise<string> {
    try {
      return await new Promise<string>((resolve, reject) => {
        // Add request to queue
        this.requestQueue.push({
          resolve,
          reject,
          messages,
          options,
          isStructured: false,
        });

        this.processQueue();
      });
    } catch (error) {
      console.error('Gemini generation error:', error);
      // Re-throw the error
      throw error;
    }
  }

  async generateWithGeminiStructured(
    messages: GeminiMessage[],
    options: GeminiChatCompletionOptions = {}
  ): Promise<string> {
    try {
      return await new Promise<string>((resolve, reject) => {
        this.requestQueue.push({
          resolve,
          reject,
          messages,
          options,
          isStructured: true,
        });

        this.processQueue();
      });
    } catch (error) {
      console.error('Gemini structured generation error:', error);
      // Re-throw the error
      throw error;
    }
  }
}

export const geminiClient = new GeminiClient();

