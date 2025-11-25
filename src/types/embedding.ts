/**
 * Embedding and LLM Types
 * 
 * This file contains all type definitions related to embeddings,
 * LLM operations, and AI model interactions.
 */

// LLM embedding results
export interface EmbeddingResult {
  embedding: number[];
  tokens: number;
}

export interface BatchEmbeddingResult {
  embeddings: number[][];
  totalTokens: number;
}

// Supported embedding models and dimensions
export const EMBEDDING_DIMENSIONS = {
  'text-embedding-3-small': 1536,
  'text-embedding-3-large': 3072,
  'text-embedding-ada-002': 1536,
} as const;

export type EmbeddingModel = keyof typeof EMBEDDING_DIMENSIONS;

// Model configuration
export interface LLMConfig {
  apiKey: string;
  model: EmbeddingModel;
  maxRetries: number;
  batchSize: number;
}

// Rate limiting and error handling
export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

// Token estimation and text processing
export interface TextProcessingOptions {
  maxTokens: number;
  charsPerToken: number;
  splitOnSentences: boolean;
  preserveContext: boolean;
}