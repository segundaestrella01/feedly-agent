import OpenAI from 'openai';

// Constants
const CHARS_PER_TOKEN = 4; // Rough estimation: 1 token ≈ 4 characters
const MAX_TOKEN_CHARS = 100; // Max chars for warning
const HTTP_RATE_LIMIT = 429;
const HTTP_SERVER_ERROR = 500;
const BACKOFF_BASE_MS = 1000;
const BACKOFF_MULTIPLIER = 2;
const MAX_RATE_LIMIT_DELAY_MS = 30000;
const MAX_SERVER_ERROR_DELAY_MS = 10000;
const DEFAULT_MAX_TOKENS = 8000;

// Embedding dimensions by model
const EMBEDDING_DIMENSIONS = {
  'text-embedding-3-small': 1536,
  'text-embedding-3-large': 3072,
  'text-embedding-ada-002': 1536,
} as const;

// Types for embeddings
export interface EmbeddingResult {
  embedding: number[];
  tokens: number;
}

export interface BatchEmbeddingResult {
  embeddings: number[][];
  totalTokens: number;
}

// LLM client for embeddings and chat completions
export class LLMClient {
  private client: OpenAI;
  private model: string;
  private maxRetries: number;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }

    this.client = new OpenAI({
      apiKey: apiKey,
    });

    this.model = process.env.EMBEDDING_MODEL || 'text-embedding-3-small';
    this.maxRetries = parseInt(process.env.EMBEDDING_MAX_RETRIES || '3', 10);
  }

  /**
   * Generate embeddings for a batch of texts
   * @param texts Array of texts to embed
   * @param options Optional parameters for embedding
   * @returns Promise with embeddings and token count
   */
  async embed(texts: string[]): Promise<BatchEmbeddingResult> {
    if (texts.length === 0) {
      return { embeddings: [], totalTokens: 0 };
    }

    // Validate input lengths
    const maxLength = 8191; // tokens limit for text-embedding-3-small
    const validTexts = texts.filter(text => {
      const estimatedTokens = Math.ceil(text.length / CHARS_PER_TOKEN);
      if (estimatedTokens > maxLength) {
        console.warn(`Text too long (${estimatedTokens} estimated tokens), skipping:`, 
          text.substring(0, MAX_TOKEN_CHARS) + '...');
        return false;
      }
      return true;
    });

    if (validTexts.length === 0) {
      throw new Error('No valid texts to embed (all texts too long)');
    }

    try {
      const result = await this.retryWithBackoff(async () => {
        return await this.client.embeddings.create({
          model: this.model,
          input: validTexts,
          encoding_format: 'float',
        });
      }, this.maxRetries);

      const embeddings = result.data.map(item => item.embedding);
      const totalTokens = result.usage.total_tokens;

      console.log(`Generated ${embeddings.length} embeddings using ${totalTokens} tokens`);

      return {
        embeddings,
        totalTokens,
      };
    } catch (error) {
      console.error('Error generating embeddings:', error);
      throw error;
    }
  }

  /**
   * Generate embedding for a single text
   * @param text Text to embed
   * @returns Promise with embedding and token count
   */
  async embedSingle(text: string): Promise<EmbeddingResult> {
    const result = await this.embed([text]);
    
    if (result.embeddings.length === 0) {
      throw new Error('Failed to generate embedding for text');
    }

    const embedding = result.embeddings[0];
    if (!embedding) {
      throw new Error('Generated embedding is undefined');
    }

    return {
      embedding,
      tokens: result.totalTokens,
    };
  }

  /**
   * Retry function with exponential backoff
   * @param fn Function to retry
   * @param maxRetries Maximum number of retries
   * @returns Promise with function result
   */
  private async retryWithBackoff<T>(
    fn: () => Promise<T>, 
    maxRetries: number,
  ): Promise<T> {
    let lastError: Error = new Error('No attempts made');

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        
        // Check if it's a rate limit error
        if (error instanceof OpenAI.APIError) {
          if (error.status === HTTP_RATE_LIMIT) {
            // Rate limit - wait and retry
            const backoffTime = Math.min(BACKOFF_BASE_MS * Math.pow(BACKOFF_MULTIPLIER, attempt), MAX_RATE_LIMIT_DELAY_MS);
            console.warn(`Rate limited, retrying in ${backoffTime}ms (attempt ${attempt + 1}/${maxRetries + 1})`);
            await this.sleep(backoffTime);
            continue;
          } else if (error.status >= HTTP_SERVER_ERROR) {
            // Server error - retry
            const backoffTime = Math.min(BACKOFF_BASE_MS * Math.pow(BACKOFF_MULTIPLIER, attempt), MAX_SERVER_ERROR_DELAY_MS);
            console.warn(`Server error ${error.status}, retrying in ${backoffTime}ms (attempt ${attempt + 1}/${maxRetries + 1})`);
            await this.sleep(backoffTime);
            continue;
          } else {
            // Client error - don't retry
            throw error;
          }
        }
        
        // Unknown error - retry with backoff
        if (attempt < maxRetries) {
          const backoffTime = Math.min(BACKOFF_BASE_MS * Math.pow(BACKOFF_MULTIPLIER, attempt), MAX_SERVER_ERROR_DELAY_MS);
          console.warn(`Error occurred, retrying in ${backoffTime}ms (attempt ${attempt + 1}/${maxRetries + 1}):`, error);
          await this.sleep(backoffTime);
        }
      }
    }

    throw lastError;
  }

  /**
   * Sleep utility function
   * @param ms Milliseconds to sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => {
      setTimeout(resolve, ms);
    });
  }

  /**
   * Get the current embedding model
   * @returns Model name
   */
  getModel(): string {
    return this.model;
  }

  /**
   * Get embedding dimensions for the current model
   * @returns Number of dimensions
   */
  getEmbeddingDimensions(): number {
    if (this.model in EMBEDDING_DIMENSIONS) {
      return EMBEDDING_DIMENSIONS[this.model as keyof typeof EMBEDDING_DIMENSIONS];
    }
    return EMBEDDING_DIMENSIONS['text-embedding-3-small']; // default fallback
  }

  /**
   * Estimate token count for a text (rough estimation)
   * @param text Text to estimate
   * @returns Estimated token count
   */
  estimateTokens(text: string): number {
    // Rough estimation: 1 token ≈ 4 characters for English text
    return Math.ceil(text.length / CHARS_PER_TOKEN);
  }

  /**
   * Split text into smaller chunks if it exceeds token limit
   * @param text Text to potentially split
   * @param maxTokens Maximum tokens per chunk
   * @returns Array of text chunks
   */
  splitTextIfNeeded(text: string, maxTokens = DEFAULT_MAX_TOKENS): string[] {
    const estimatedTokens = this.estimateTokens(text);
    
    if (estimatedTokens <= maxTokens) {
      return [text];
    }

    const chunks: string[] = [];
    const words = text.split(' ');
    let currentChunk = '';
    
    for (const word of words) {
      const testChunk = currentChunk ? `${currentChunk} ${word}` : word;
      
      if (this.estimateTokens(testChunk) <= maxTokens) {
        currentChunk = testChunk;
      } else {
        if (currentChunk) {
          chunks.push(currentChunk.trim());
          currentChunk = word;
        } else {
          // Single word exceeds limit - force add it
          chunks.push(word);
        }
      }
    }
    
    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }

    return chunks.filter(chunk => chunk.length > 0);
  }
}