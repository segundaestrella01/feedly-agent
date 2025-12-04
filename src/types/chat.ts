/**
 * Chat Completion and LLM Interaction Types
 * 
 * This file contains type definitions for chat completions,
 * LLM interactions, and conversational AI operations.
 */

// Chat completion types
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
}

export interface ChatCompletionResult {
  content: string;
  tokens: {
    prompt: number;
    completion: number;
    total: number;
  };
  model: string;
  finishReason: string;
}

