/**
 * Digest Types
 * 
 * Type definitions for daily digest generation, including cluster summaries,
 * article references, and digest metadata.
 */

import type { TimeWindow } from './retrieval.js';

/**
 * Reference to an article in a cluster
 */
export interface ArticleReference {
  /** Article title */
  title: string;
  /** RSS feed source name */
  source: string;
  /** Original article URL */
  url?: string;
  /** Publication date (ISO string) */
  publishedAt?: string;
  /** Brief excerpt or summary of the article */
  excerpt: string;
}

/**
 * Summary of a content cluster
 */
export interface ClusterSummary {
  /** Cluster identifier (0 to k-1) */
  clusterId: number;
  /** Concise topic label (3-5 words) */
  topicLabel: string;
  /** Main summary of the cluster (2-3 sentences) */
  summary: string;
  /** Key takeaways or insights (3-5 bullet points) */
  keyTakeaways: string[];
  /** Number of articles in the cluster */
  articleCount: number;
  /** Representative articles from the cluster */
  representativeArticles: ArticleReference[];
  /** Cluster quality and relevance metrics */
  metadata: {
    /** Silhouette score for cluster quality (-1 to 1) */
    silhouetteScore?: number;
    /** Average relevance score of articles */
    avgRelevanceScore?: number;
  };
}

/**
 * Metadata about the digest generation process
 */
export interface DigestMetadata {
  /** Total number of articles processed */
  totalArticles: number;
  /** Number of clusters generated */
  clusterCount: number;
  /** Average silhouette score across all clusters */
  avgSilhouetteScore?: number;
  /** Processing time in milliseconds */
  processingTime: number;
  /** LLM model used for summarization */
  model: string;
  /** Total tokens used for LLM operations */
  totalTokens?: number;
  /** Estimated cost in USD */
  estimatedCost?: number;
}

/**
 * Complete digest content structure
 */
export interface DigestContent {
  /** Digest title */
  title: string;
  /** When the digest was generated (ISO string) */
  generatedAt: string;
  /** Time window for content retrieval */
  timeWindow: string;
  /** Cluster summaries */
  clusters: ClusterSummary[];
  /** Digest metadata */
  metadata: DigestMetadata;
}

/**
 * Options for digest generation
 */
export interface DigestOptions {
  /** Time window for content retrieval */
  timeWindow?: TimeWindow;
  /** Number of clusters to generate */
  clusterCount?: number;
  /** Maximum articles per cluster to include in references */
  maxArticlesPerCluster?: number;
  /** Whether to include key takeaways */
  includeKeyTakeaways?: boolean;
  /** Whether to include article excerpts */
  includeExcerpts?: boolean;
  /** Custom title for the digest */
  customTitle?: string;
  /** LLM model override */
  model?: string;
  /** Temperature override for LLM */
  temperature?: number;
}

/**
 * Result of digest generation with additional stats
 */
export interface DigestGenerationResult {
  /** The generated digest content */
  digest: DigestContent;
  /** Success status */
  success: boolean;
  /** Error message if generation failed */
  error?: string;
  /** Detailed statistics */
  stats: {
    /** Articles retrieved */
    articlesRetrieved: number;
    /** Articles clustered */
    articlesClustered: number;
    /** LLM API calls made */
    llmCalls: number;
    /** Total tokens used */
    totalTokens: number;
    /** Processing time in milliseconds */
    processingTime: number;
  };
}

/**
 * Notion-specific formatting options
 */
export interface NotionDigestOptions {
  /** Notion database ID to add entry to */
  databaseId: string;
  /** Whether to enable table of contents */
  enableTOC?: boolean;
  /** Whether to collapse articles in toggle blocks */
  collapseArticles?: boolean;
  /** Icon emoji for the page */
  icon?: string;
  /** Cover image URL */
  coverUrl?: string;
}

