/**
 * Database Types
 * 
 * This file contains all type definitions related to database operations,
 * tracking, and persistence.
 */

// Embedding status tracking
export interface EmbeddingStatus {
  id?: number;
  chunk_file: string;
  total_chunks: number;
  processed_chunks: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  started_at?: string;
  completed_at?: string;
  error_message?: string;
  model_used: string;
}

export interface ChunkEmbedding {
  id: string;
  chunk_id: string;
  source_file: string;
  embedding_created_at?: string;
  vector_id: string;
  model_used: string;
}

// Database statistics and monitoring
export interface EmbeddingStats {
  total_files: number;
  completed_files: number;
  pending_files: number;
  failed_files: number;
  total_chunks_embedded: number;
}

export interface DatabaseInfo {
  path: string;
  tables: string[];
  size?: number;
  lastModified?: Date;
}

// Database configuration
export interface DatabaseConfig {
  path: string;
  type: 'sqlite' | 'postgres' | 'mysql';
  options?: {
    journalMode?: 'WAL' | 'DELETE' | 'TRUNCATE';
    synchronous?: 'NORMAL' | 'FULL' | 'OFF';
    cacheSize?: number;
  };
}

// Transaction and operation types
export interface DatabaseTransaction<T> {
  execute: (items: T[]) => void;
  rollback: () => void;
  commit: () => void;
}

export interface QueryFilter {
  column: string;
  operator: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'LIKE' | 'IN';
  value: string | number | boolean | (string | number | boolean)[];
}

export interface DatabaseQueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'ASC' | 'DESC';
  filters?: QueryFilter[];
}