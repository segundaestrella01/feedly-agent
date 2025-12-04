/**
 * Clustering Types
 *
 * This file contains all type definitions related to content clustering,
 * k-means algorithm configuration, and cluster results.
 */

import type { QueryResult } from './vector.js';

/**
 * A single cluster containing grouped content chunks
 */
export interface Cluster {
  id: number; // Cluster index (0 to k-1)
  chunks: QueryResult[]; // Chunks assigned to this cluster
  centroid: number[]; // Cluster centroid embedding
  size: number; // Number of chunks
  representativeChunk: QueryResult; // Chunk closest to centroid
}

/**
 * Result of clustering operation
 */
export interface ClusteringResult {
  clusters: Cluster[];
  totalChunks: number;
  clusterCount: number;
  timestamp: string;
  silhouetteScore?: number; // Cluster quality metric (-1 to 1, higher is better)
}

/**
 * Configuration options for k-means clustering
 */
export interface ClusteringOptions {
  k?: number; // Number of clusters (default: 5)
  maxIterations?: number; // Max k-means iterations (default: 100)
  tolerance?: number; // Convergence threshold (default: 1e-6)
}

/**
 * Chunk with embedding data for clustering operations
 */
export interface ChunkWithEmbeddingData extends QueryResult {
  embedding: number[];
}

