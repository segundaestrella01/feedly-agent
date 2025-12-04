/**
 * Summarizer Worker: Clusters content using k-means on embeddings
 *
 * This module provides clustering functionality for organizing
 * semantically similar content chunks into groups.
 */

import 'dotenv/config';
// @ts-expect-error - ml-kmeans types require node16 module resolution
import { kmeans } from 'ml-kmeans';
import { VectorClient } from '../lib/vectorClient.js';
import type {
  QueryResult,
  Cluster,
  ClusteringResult,
  ClusteringOptions,
  ChunkWithEmbeddingData,
  TimeWindow,
} from '../types/index.js';

// Default clustering configuration
const DEFAULT_CLUSTER_COUNT = parseInt(process.env.CLUSTER_COUNT || '5', 10);
const DEFAULT_MAX_ITERATIONS = 100;
const DEFAULT_TOLERANCE = 1e-6;

/**
 * Calculate cosine similarity between two vectors
 * @param a - First vector
 * @param b - Second vector
 * @returns Cosine similarity score between -1 and 1
 * @throws Error if vectors have different dimensions
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have same dimensions');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    const aVal = a[i]!;
    const bVal = b[i]!;
    dotProduct += aVal * bVal;
    normA += aVal * aVal;
    normB += bVal * bVal;
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator === 0 ? 0 : dotProduct / denominator;
}

/**
 * Find the representative chunk for a cluster (closest to centroid)
 * Selects the chunk with highest cosine similarity to the cluster centroid
 * @param chunks - Array of chunks with embeddings in the cluster
 * @param centroid - Cluster centroid vector
 * @returns The most representative chunk (without embedding property)
 */
function findRepresentative(
  chunks: ChunkWithEmbeddingData[],
  centroid: number[],
): QueryResult {
  let bestChunk = chunks[0]!;
  let bestSimilarity = -Infinity;

  for (const chunk of chunks) {
    const similarity = cosineSimilarity(chunk.embedding, centroid);
    if (similarity > bestSimilarity) {
      bestSimilarity = similarity;
      bestChunk = chunk;
    }
  }

  // Return without the embedding property
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { embedding, ...result } = bestChunk;
  return result;
}

/**
 * Cluster chunks using k-means algorithm on embeddings
 * @param chunks Array of chunks with embeddings
 * @param options Clustering configuration options
 * @returns ClusteringResult with organized clusters
 */
export function clusterChunks(
  chunks: ChunkWithEmbeddingData[],
  options: ClusteringOptions = {},
): ClusteringResult {
  const k = options.k ?? DEFAULT_CLUSTER_COUNT;
  const maxIterations = options.maxIterations ?? DEFAULT_MAX_ITERATIONS;
  const tolerance = options.tolerance ?? DEFAULT_TOLERANCE;

  console.log(`🔬 Clustering ${chunks.length} chunks into ${k} clusters...`);

  if (chunks.length === 0) {
    return {
      clusters: [],
      totalChunks: 0,
      clusterCount: 0,
      timestamp: new Date().toISOString(),
    };
  }

  // Adjust k if we have fewer chunks than clusters
  const effectiveK = Math.min(k, chunks.length);

  if (effectiveK < k) {
    console.log(`⚠️ Reduced cluster count to ${effectiveK} (fewer chunks than requested)`);
  }

  // Extract embeddings matrix for k-means
  const embeddings = chunks.map(chunk => chunk.embedding);

  // Run k-means clustering
  const result = kmeans(embeddings, effectiveK, {
    maxIterations,
    tolerance,
    initialization: 'kmeans++',
  });

  // Group chunks by cluster assignment
  const clusterGroups = new Map<number, ChunkWithEmbeddingData[]>();

  for (let i = 0; i < result.clusters.length; i++) {
    const clusterId = result.clusters[i];
    const chunk = chunks[i];
    if (clusterId !== undefined && chunk !== undefined) {
      if (!clusterGroups.has(clusterId)) {
        clusterGroups.set(clusterId, []);
      }
      clusterGroups.get(clusterId)!.push(chunk);
    }
  }

  // Build cluster objects
  const clusters: Cluster[] = [];

  for (let clusterId = 0; clusterId < effectiveK; clusterId++) {
    const clusterChunks = clusterGroups.get(clusterId) || [];
    const centroid = result.centroids[clusterId];

    if (clusterChunks.length > 0) {
      clusters.push({
        id: clusterId,
        chunks: clusterChunks.map(c => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { embedding: _unused, ...rest } = c;
          return rest;
        }),
        centroid,
        size: clusterChunks.length,
        representativeChunk: findRepresentative(clusterChunks, centroid),
      });
    }
  }

  // Sort clusters by size (largest first)
  clusters.sort((a, b) => b.size - a.size);

  // Log cluster statistics
  console.log(`✅ Created ${clusters.length} clusters:`);
  clusters.forEach((cluster, idx) => {
    console.log(`   Cluster ${idx + 1}: ${cluster.size} chunks`);
  });

  return {
    clusters,
    totalChunks: chunks.length,
    clusterCount: clusters.length,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Retrieve all chunks with embeddings and cluster them (no time filter)
 * @param limit Maximum chunks to retrieve
 * @param options Clustering options
 */
export async function clusterAllContent(
  limit = 100,
  options: ClusteringOptions = {},
): Promise<ClusteringResult> {
  console.log(`🚀 Clustering all content (up to ${limit} chunks)...`);

  const vectorClient = new VectorClient();
  await vectorClient.initialize();

  // Get all chunks with embeddings
  const chunksWithEmbeddings = await vectorClient.getAllWithEmbeddings(limit);

  if (chunksWithEmbeddings.length === 0) {
    console.log('⚠️ No chunks found to cluster');
    return {
      clusters: [],
      totalChunks: 0,
      clusterCount: 0,
      timestamp: new Date().toISOString(),
    };
  }

  console.log(`📊 Found ${chunksWithEmbeddings.length} chunks to cluster`);

  // Cluster the chunks
  return clusterChunks(chunksWithEmbeddings, options);
}

/**
 * Retrieve recent chunks with embeddings and cluster them
 * @param timeWindow Time window for recent chunks
 * @param limit Maximum chunks to retrieve
 * @param options Clustering options
 */
export async function clusterRecentContent(
  timeWindow: TimeWindow = '24h',
  limit = 100,
  options: ClusteringOptions = {},
): Promise<ClusteringResult> {
  console.log(`🚀 Clustering recent content from last ${timeWindow}...`);

  const vectorClient = new VectorClient();
  await vectorClient.initialize();

  // Get all chunks with embeddings
  const chunksWithEmbeddings = await vectorClient.getAllWithEmbeddings(limit);

  if (chunksWithEmbeddings.length === 0) {
    console.log('⚠️ No chunks found to cluster');
    return {
      clusters: [],
      totalChunks: 0,
      clusterCount: 0,
      timestamp: new Date().toISOString(),
    };
  }

  // Filter by time window
  const timeWindowMs = parseTimeWindow(timeWindow);
  const cutoffDate = new Date(Date.now() - timeWindowMs);

  const recentChunks = chunksWithEmbeddings.filter(chunk => {
    const publishedDate = new Date(chunk.metadata.published_date);
    return publishedDate >= cutoffDate;
  });

  console.log(`📊 Found ${recentChunks.length} chunks from last ${timeWindow}`);

  if (recentChunks.length === 0) {
    console.log('⚠️ No recent chunks found to cluster');
    return {
      clusters: [],
      totalChunks: 0,
      clusterCount: 0,
      timestamp: new Date().toISOString(),
    };
  }

  // Cluster the chunks
  return clusterChunks(recentChunks, options);
}

/**
 * Parse time window string to milliseconds
 * @param timeWindow - Time window string (e.g., '1h', '24h', '7d')
 * @returns Duration in milliseconds
 */
function parseTimeWindow(timeWindow: TimeWindow): number {
  const timeMap: Record<TimeWindow, number> = {
    '1h': 60 * 60 * 1000,
    '6h': 6 * 60 * 60 * 1000,
    '12h': 12 * 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
    '3d': 3 * 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
  };

  return timeMap[timeWindow];
}

/**
 * Main summarize function - clusters content for digest generation
 * Entry point for the summarization pipeline
 * @param timeWindow - Time window for recent content (default: '24h')
 * @param clusterCount - Number of clusters to create (default: 5)
 * @returns ClusteringResult with organized content clusters
 */
export async function summarizeContent(
  timeWindow: TimeWindow = '24h',
  clusterCount = DEFAULT_CLUSTER_COUNT,
): Promise<ClusteringResult> {
  console.log('📝 Starting content summarization...');

  const result = await clusterRecentContent(timeWindow, 200, { k: clusterCount });

  console.log('\n📊 Clustering Summary:');
  console.log(`   Total chunks: ${result.totalChunks}`);
  console.log(`   Clusters: ${result.clusterCount}`);
  console.log(`   Timestamp: ${result.timestamp}`);

  return result;
}

// CLI execution
const PREVIEW_LENGTH = 150;
const CLI_ARGS_START = 2;

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(CLI_ARGS_START);
  const mode = args[0] || 'all'; // 'all' or time window like '24h', '7d'
  const clusterCountArg = args[1];
  const clusterCount = clusterCountArg ? parseInt(clusterCountArg, 10) : DEFAULT_CLUSTER_COUNT;

  const runClustering = async () => {
    let result: ClusteringResult;

    if (mode === 'all') {
      // Cluster all content without time filter
      result = await clusterAllContent(200, { k: clusterCount });
    } else {
      // Use time window
      result = await summarizeContent(mode as TimeWindow, clusterCount);
    }

    console.log('\n🎯 Cluster Representatives:');
    result.clusters.forEach((cluster, idx) => {
      console.log(`\n--- Cluster ${idx + 1} (${cluster.size} chunks) ---`);
      console.log(`Title: ${cluster.representativeChunk.metadata.title}`);
      console.log(`Source: ${cluster.representativeChunk.metadata.source}`);
      console.log(`Content: ${cluster.representativeChunk.content.slice(0, PREVIEW_LENGTH)}...`);
    });
  };

  runClustering().catch(console.error);
}