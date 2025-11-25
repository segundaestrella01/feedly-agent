/**
 * Content Processing and Chunking Types
 * 
 * This file contains all type definitions related to content processing,
 * chunking, and text manipulation.
 */

export interface ContentChunk {
  id: string;
  chunkIndex: number;
  content: string;
  wordCount: number;
  charCount: number;
  sourceItem: {
    id: string;
    title: string;
    link: string;
    pubDate: string;
    source: string;
    categories?: string[];
  };
  timestamp: string;
}

export interface ChunkResult {
  totalItems: number;
  totalChunks: number;
  chunks: ContentChunk[];
  timestamp: string;
}

// File-based chunk storage format
export interface ChunkFile {
  totalItems: number;
  totalChunks: number;
  chunks: RawChunk[];
}

export interface RawChunk {
  id: string;
  chunkIndex: number;
  content: string;
  wordCount: number;
  charCount: number;
  sourceItem: {
    id: string;
    title: string;
    link: string;
    pubDate: string;
    source: string;
    categories?: string[];
    tags?: string[];
  };
  timestamp: string;
}

// Processing statistics and monitoring
export interface ProcessingStats {
  totalFiles: number;
  totalChunks: number;
  processedChunks: number;
  skippedChunks: number;
  successfulUpserts: number;
  errors: number;
  tokensUsed: number;
  startTime: Date;
  endTime?: Date;
}

// Content extraction configuration
export interface ExtractionOptions {
  fetchFullArticles: boolean;
  timeoutMs: number;
  chunkSize: number;
  chunkOverlap: number;
  minContentLength: number;
}