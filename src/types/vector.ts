/**
 * Vector Database Types
 * 
 * This file contains all type definitions related to vector databases,
 * similarity search, and vector operations.
 */

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
  metadata: Record<string, any>;
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
  filters?: Record<string, string | number | boolean>;
  includeMetadata: boolean;
  includeEmbeddings: boolean;
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