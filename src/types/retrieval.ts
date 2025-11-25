/**
 * Retrieval Types
 * 
 * Type definitions for the retrieval system including query strategies,
 * filtering options, scoring mechanisms, and configuration.
 */

import type { QueryResult, MetadataFilters } from './vector.js';

/**
 * Time window options for retrieving recent content
 */
export type TimeWindow = '1h' | '6h' | '12h' | '24h' | '3d' | '7d';

/**
 * Available clustering methods for content organization
 */
export type ClusteringMethod = 'embedding' | 'llm' | 'hybrid';

/**
 * Configuration options for content retrieval operations
 */
export interface RetrievalOptions {
  /** Maximum number of chunks to return */
  limit: number;
  /** Time window for filtering recent content */
  timeWindow?: TimeWindow;
  /** Filter by specific RSS sources */
  sources?: string[];
  /** Apply diversity filtering to avoid source clustering */
  diversityFilter?: boolean;
  /** Minimum quality/relevance score threshold */
  qualityThreshold?: number;
  /** Whether to include summary information */
  includeSummaries?: boolean;
}

/**
 * Configuration for hybrid scoring algorithm that combines
 * multiple factors for result ranking
 */
export interface HybridScoringOptions {
  /** Weight for recency factor (0-1) */
  recencyWeight: number;
  /** Bonus weight for content diversity across sources */
  diversityBonus: number;
  /** Weight for content quality metrics */
  qualityWeight: number;
}

/**
 * Extended query result with hybrid scoring metadata
 */
export interface HybridScoredResult extends QueryResult {
  /** Combined hybrid score */
  hybridScore?: number;
  /** Individual recency component score */
  recencyScore?: number;
  /** Individual diversity component score */
  diversityScore?: number;
  /** Individual quality component score */
  qualityScore?: number;
}

/**
 * Comprehensive options for the main retrieval function
 */
export interface ComprehensiveRetrievalOptions extends RetrievalOptions {
  /** Natural language query for semantic search */
  query?: string;
  /** Array of topics for multi-topic retrieval */
  topics?: string[];
  /** Configuration for hybrid scoring algorithm */
  hybridScoring?: HybridScoringOptions;
}

/**
 * Statistics and metrics for retrieval operations
 */
export interface RetrievalStats {
  /** Total number of chunks retrieved */
  totalRetrieved: number;
  /** Number of unique sources */
  uniqueSources: number;
  /** Average relevance score */
  averageScore: number;
  /** Time range of retrieved content */
  timeRange: {
    oldest: Date;
    newest: Date;
  };
  /** Processing time in milliseconds */
  processingTime: number;
  /** Query strategy used */
  strategy: 'time-based' | 'semantic' | 'topic-based' | 'hybrid';
}

/**
 * Configuration for diversity filtering algorithm
 */
export interface DiversityFilterConfig {
  /** Maximum items per source */
  maxPerSource?: number;
  /** Whether to enforce strict diversity */
  strictMode?: boolean;
  /** Bonus weight for diverse sources */
  diversityBonus?: number;
}

/**
 * Time window mapping for millisecond conversion
 */
export type TimeWindowMapping = Record<TimeWindow, number>;

/**
 * Query strategy enumeration
 */
export type QueryStrategy = 
  | 'recent' 
  | 'semantic' 
  | 'topic-based' 
  | 'hybrid' 
  | 'comprehensive';

/**
 * Error types specific to retrieval operations
 */
export interface RetrievalError extends Error {
  code: 'QUERY_FAILED' | 'FILTER_INVALID' | 'NO_RESULTS' | 'TIMEOUT' | 'RATE_LIMITED';
  strategy?: QueryStrategy;
  context?: {
    query?: string;
    timeWindow?: TimeWindow;
    filters?: MetadataFilters;
  };
}

/**
 * Cache configuration for retrieval operations
 */
export interface RetrievalCacheConfig {
  /** Whether to enable caching */
  enabled: boolean;
  /** Cache TTL in seconds */
  ttlSeconds: number;
  /** Maximum cache size */
  maxSize: number;
  /** Cache key prefix */
  keyPrefix: string;
}

/**
 * Performance monitoring for retrieval operations
 */
export interface RetrievalPerformance {
  /** Query execution time */
  queryTime: number;
  /** Filtering time */
  filterTime: number;
  /** Scoring time */
  scoringTime: number;
  /** Total operation time */
  totalTime: number;
  /** Memory usage in bytes */
  memoryUsage: number;
  /** Number of database hits */
  dbHits: number;
  /** Cache hit/miss ratio */
  cacheRatio?: number;
}