/**
 * Embedding Aggregator
 * 
 * Provides functions to aggregate chunk-level embeddings into article-level embeddings.
 * This module is used to combine multiple chunk embeddings from the same article
 * into a single representative embedding for the entire article.
 */

import crypto from 'crypto';
import type { ContentChunk, RawChunk, AggregationResult } from '../types/index.js';

// Default maximum characters for combined content (fits in most LLM context windows)
const DEFAULT_MAX_CONTENT_CHARS = 4000;

// Position weight decay factor (earlier chunks weighted slightly higher)
const POSITION_WEIGHT_DECAY = 0.1;

// Threshold for truncating at word boundary (80% of remaining space)
const WORD_BOUNDARY_THRESHOLD = 0.8;

// Length of hash substring used for article ID
const ARTICLE_ID_HASH_LENGTH = 16;

/**
 * Generate a unique article ID from the source URL
 * Uses SHA-256 hash truncated for readability
 * @param sourceUrl - The original article URL
 * @returns A unique article identifier
 */
export function generateArticleId(sourceUrl: string): string {
  const hash = crypto.createHash('sha256').update(sourceUrl).digest('hex');
  return `article_${hash.substring(0, ARTICLE_ID_HASH_LENGTH)}`;
}

/**
 * Aggregate multiple embeddings into a single embedding using weighted average
 * Earlier chunks are weighted slightly higher as they typically contain key information
 * 
 * @param embeddings - Array of embedding vectors to aggregate
 * @param usePositionWeighting - Whether to weight by position (default: true)
 * @returns Single aggregated embedding vector
 * @throws Error if embeddings array is empty or embeddings have inconsistent dimensions
 */
export function aggregateEmbeddings(
  embeddings: number[][],
  usePositionWeighting = true,
): number[] {
  if (embeddings.length === 0) {
    throw new Error('Cannot aggregate empty embeddings array');
  }

  const firstEmbedding = embeddings[0];
  if (!firstEmbedding) {
    throw new Error('First embedding is undefined');
  }

  if (embeddings.length === 1) {
    return [...firstEmbedding]; // Return copy of single embedding
  }

  const dimensions = firstEmbedding.length;

  // Validate all embeddings have same dimensions
  for (let i = 1; i < embeddings.length; i++) {
    const embedding = embeddings[i];
    if (!embedding) {
      throw new Error(`Embedding at index ${i} is undefined`);
    }
    if (embedding.length !== dimensions) {
      throw new Error(
        `Embedding dimension mismatch: expected ${dimensions}, got ${embedding.length} at index ${i}`,
      );
    }
  }

  // Calculate weights (position-based or uniform)
  const weights = embeddings.map((_, i) =>
    usePositionWeighting ? 1 / (1 + i * POSITION_WEIGHT_DECAY) : 1,
  );
  const totalWeight = weights.reduce((a, b) => a + b, 0);

  // Compute weighted average
  const aggregated = new Array<number>(dimensions).fill(0);

  for (let i = 0; i < embeddings.length; i++) {
    const embedding = embeddings[i]!; // Safe: validated above
    const weight = (weights[i] ?? 1) / totalWeight;
    for (let d = 0; d < dimensions; d++) {
      aggregated[d]! += embedding[d]! * weight;
    }
  }

  return aggregated;
}

/**
 * Combine content from multiple chunks into a single string
 * Handles truncation to fit within LLM context limits
 * 
 * @param chunks - Array of chunks to combine (should be sorted by chunkIndex)
 * @param maxChars - Maximum characters for combined content
 * @returns Combined content string, possibly truncated
 */
export function combineChunkContent(
  chunks: (ContentChunk | RawChunk)[],
  maxChars: number = DEFAULT_MAX_CONTENT_CHARS,
): string {
  if (chunks.length === 0) {
    return '';
  }

  // Sort by chunk index to ensure correct order
  const sortedChunks = [...chunks].sort((a, b) => a.chunkIndex - b.chunkIndex);
  
  // Combine content
  let combined = '';
  for (const chunk of sortedChunks) {
    if (combined.length >= maxChars) {
      break;
    }
    
    // Add separator between chunks (but not before first)
    if (combined.length > 0) {
      combined += '\n\n';
    }
    
    const remainingSpace = maxChars - combined.length;
    if (chunk.content.length <= remainingSpace) {
      combined += chunk.content;
    } else {
      // Truncate at word boundary if possible
      const truncated = chunk.content.substring(0, remainingSpace);
      const lastSpace = truncated.lastIndexOf(' ');
      combined += lastSpace > remainingSpace * WORD_BOUNDARY_THRESHOLD
        ? truncated.substring(0, lastSpace) + '...'
        : truncated + '...';
      break;
    }
  }

  return combined;
}

/**
 * Group chunks by their parent article using source URL as identifier
 *
 * @param chunks - Array of chunks to group
 * @returns Map of article URL to array of chunks
 */
export function groupChunksByArticle<T extends ContentChunk | RawChunk>(
  chunks: T[],
): Map<string, T[]> {
  const groups = new Map<string, T[]>();

  for (const chunk of chunks) {
    const articleUrl = chunk.sourceItem.link;

    if (!groups.has(articleUrl)) {
      groups.set(articleUrl, []);
    }
    groups.get(articleUrl)!.push(chunk);
  }

  // Sort chunks within each group by chunkIndex
  for (const [url, articleChunks] of groups) {
    groups.set(url, articleChunks.sort((a, b) => a.chunkIndex - b.chunkIndex));
  }

  return groups;
}

/**
 * Calculate total word count from an array of chunks
 * @param chunks - Array of chunks
 * @returns Total word count
 */
export function calculateTotalWordCount(chunks: (ContentChunk | RawChunk)[]): number {
  return chunks.reduce((total, chunk) => total + chunk.wordCount, 0);
}

/**
 * Calculate total character count from an array of chunks
 * @param chunks - Array of chunks
 * @returns Total character count
 */
export function calculateTotalCharCount(chunks: (ContentChunk | RawChunk)[]): number {
  return chunks.reduce((total, chunk) => total + chunk.charCount, 0);
}

/**
 * Create an aggregation result from chunks and their embeddings
 * This is a convenience function that combines all aggregation steps
 *
 * @param articleUrl - The source URL of the article
 * @param chunks - Array of chunks belonging to the article
 * @param embeddings - Array of embeddings corresponding to the chunks
 * @param maxContentChars - Maximum characters for combined content
 * @returns Complete aggregation result
 */
export function createAggregationResult(
  articleUrl: string,
  chunks: (ContentChunk | RawChunk)[],
  embeddings: number[][],
  maxContentChars: number = DEFAULT_MAX_CONTENT_CHARS,
): AggregationResult {
  if (chunks.length !== embeddings.length) {
    throw new Error(
      `Chunk count (${chunks.length}) does not match embedding count (${embeddings.length})`,
    );
  }

  if (chunks.length === 0) {
    throw new Error('Cannot create aggregation result from empty chunks array');
  }

  // Sort chunks by index for consistent processing
  // Use non-null assertion since we've validated length equality above
  const sortedData = chunks
    .map((chunk, i) => ({ chunk, embedding: embeddings[i]! }))
    .sort((a, b) => a.chunk.chunkIndex - b.chunk.chunkIndex);

  const sortedChunks = sortedData.map(d => d.chunk);
  const sortedEmbeddings = sortedData.map(d => d.embedding);

  return {
    articleId: generateArticleId(articleUrl),
    aggregatedEmbedding: aggregateEmbeddings(sortedEmbeddings),
    combinedContent: combineChunkContent(sortedChunks, maxContentChars),
    chunkCount: chunks.length,
    totalWordCount: calculateTotalWordCount(sortedChunks),
    totalCharCount: calculateTotalCharCount(sortedChunks),
  };
}

