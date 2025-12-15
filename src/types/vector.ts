/**
 * Vector Database Types
 * 
 * This file contains all type definitions related to vector databases,
 * similarity search, and vector operations.
 */

import type { RawChunk } from './content.js';

// Core vector types
export interface ChunkMetadata {
  // Source information
  source: string;           // RSS feed source
  source_url: string;       // Original article URL
  title: string;           // Article title
  published_date: string;  // ISO date string
  
  // Chunk information
  chunk_index: number;     // Position in article
  total_chunks: number;    // Total chunks for article
  word_count: number;      // Words in chunk
  char_count: number;      // Characters in chunk
  
  // Content classification
  categories?: string[];   // Feed categories
  tags?: string[];        // Extracted tags
  content_type: string;   // 'article', 'summary', etc.
  
  // Processing metadata
  processed_date: string; // When chunk was created
  embedded_date: string;  // When embedding was generated
  chunk_id: string;       // Unique chunk identifier
  
  // Additional metadata for enhanced search
  domain?: string;        // Extract domain from source_url
  language?: string;      // Detected content language
  sentiment?: 'positive' | 'negative' | 'neutral'; // Basic sentiment
  topic_keywords?: string[]; // AI-extracted topic keywords
}

// Raw chunk structure from chunk files (extends content type)
export interface RawChunkWithMetadata extends RawChunk {
  // Inherits all properties from RawChunk
}

export interface ChunkWithEmbedding {
  id: string;
  content: string;
  embedding?: number[];
  metadata: ChunkMetadata;
}

export interface QueryResult {
  id: string;
  content: string;
  metadata: ChunkMetadata;
  distance: number;
  score: number; // 1 - distance (higher is more similar)
}

export interface CollectionInfo {
  name: string;
  count: number;
  metadata: Record<string, unknown>;
  dimension?: number;
}

// Vector database configuration
export interface VectorDBConfig {
  type: 'chroma' | 'pinecone' | 'qdrant';
  connectionString?: string;
  collectionName: string;
  dimensions: number;
  persistentPath?: string;
}

// Query and search options
export interface QueryOptions {
  topK: number;
  threshold?: number;
  filters?: MetadataFilters;
  includeMetadata: boolean;
  includeEmbeddings: boolean;
}

// Enhanced metadata filtering
export interface MetadataFilters {
  // Source filtering
  source?: string | string[];
  domain?: string | string[];
  
  // Content filtering
  categories?: string | string[];
  tags?: string | string[];
  content_type?: string | string[];
  
  // Date filtering
  published_after?: string;  // ISO date
  published_before?: string; // ISO date
  processed_after?: string;  // ISO date
  processed_before?: string; // ISO date
  
  // Size filtering
  min_word_count?: number;
  max_word_count?: number;
  min_char_count?: number;
  max_char_count?: number;
  
  // Chunk filtering
  chunk_index?: number | number[];
  min_chunks?: number; // Minimum total_chunks for article
  max_chunks?: number; // Maximum total_chunks for article
  
  // Advanced filtering
  language?: string | string[];
  sentiment?: string | string[];
  topic_keywords?: string | string[];
}

// Batch operations
export interface UpsertBatch {
  chunks: ChunkWithEmbedding[];
  batchSize: number;
  parallelBatches: number;
}

export interface QueryBatch {
  queries: string[];
  options: QueryOptions;
}

// Metadata validation and utilities
export interface MetadataValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface MetadataValidationRules {
  required_fields: (keyof ChunkMetadata)[];
  max_categories: number;
  max_tags: number;
  max_topic_keywords: number;
  valid_content_types: string[];
  valid_sentiments: string[];
}

// Metadata enrichment options
export interface MetadataEnrichmentOptions {
  extract_domain: boolean;
  detect_language: boolean;
  analyze_sentiment: boolean;
  extract_keywords: boolean;
  normalize_categories: boolean;
  validate_dates: boolean;
}

// Vector search result with enhanced metadata
export interface EnhancedQueryResult extends QueryResult {
  metadata: ChunkMetadata;
  highlights?: {
    content: string[];      // Highlighted content snippets
    title: string[];        // Highlighted title parts
    categories: string[];   // Matching categories
  };
  explanation?: {
    matching_keywords: string[];
    similarity_factors: string[];
    relevance_score: number;
  };
}

// Collection statistics with metadata insights
export interface MetadataCollectionStats {
  total_chunks: number;
  unique_sources: number;
  unique_domains: number;
  date_range: {
    earliest: string;
    latest: string;
  };
  category_distribution: Record<string, number>;
  content_type_distribution: Record<string, number>;
  language_distribution?: Record<string, number>;
  sentiment_distribution?: Record<string, number>;
  avg_chunk_size: {
    words: number;
    chars: number;
  };
}

// ============================================================================
// Article-Level Embedding Types (Aggregated from Chunks)
// ============================================================================

/**
 * Metadata for an article-level embedding (aggregated from chunks)
 * Unlike ChunkMetadata, this represents the entire article, not a single chunk.
 */
export interface ArticleMetadata {
  // Source information
  source: string;           // RSS feed source
  source_url: string;       // Original article URL (unique identifier)
  title: string;            // Article title
  published_date: string;   // ISO date string

  // Aggregated chunk information
  chunk_count: number;      // Number of chunks that were aggregated
  total_word_count: number; // Sum of word counts from all chunks
  total_char_count: number; // Sum of char counts from all chunks

  // Content classification
  categories?: string[];    // Feed categories
  tags?: string[];          // Extracted tags
  content_type: 'article';  // Always 'article' for aggregated content

  // Processing metadata
  processed_date: string;   // When article was first processed
  embedded_date: string;    // When aggregated embedding was generated
  article_id: string;       // Unique article identifier (hash of source_url)

  // Additional metadata for enhanced search
  domain?: string;          // Extract domain from source_url
  language?: string;        // Detected content language
  sentiment?: 'positive' | 'negative' | 'neutral'; // Basic sentiment
  topic_keywords?: string[]; // AI-extracted topic keywords
}

/**
 * An article with its aggregated embedding
 * This is the primary unit stored in the vector database
 */
export interface ArticleWithEmbedding {
  id: string;               // article_id (hash of source_url)
  content: string;          // Combined content from all chunks (may be truncated)
  embedding?: number[];     // Aggregated embedding vector
  metadata: ArticleMetadata;
}

/**
 * Query result for article-level queries
 */
export interface ArticleQueryResult {
  id: string;
  content: string;
  metadata: ArticleMetadata;
  distance: number;
  score: number;            // 1 - distance (higher is more similar)
}

/**
 * Result of the embedding aggregation process
 */
export interface AggregationResult {
  articleId: string;
  aggregatedEmbedding: number[];
  combinedContent: string;
  chunkCount: number;
  totalWordCount: number;
  totalCharCount: number;
}