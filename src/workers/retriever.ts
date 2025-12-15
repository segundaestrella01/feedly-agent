import { VectorClient } from '../lib/vectorClient.js';
import { LLMClient } from '../lib/llmClient.js';
import type {
  QueryResult,
  MetadataFilters,
  TimeWindow,
  RetrievalOptions,
  HybridScoringOptions,
} from '../types/index.js';

/**
 * Retriever Worker: Advanced article retrieval system
 *
 * Implements multiple query strategies for content retrieval:
 * - Time-based filtering
 * - Semantic similarity search
 * - Source-based filtering
 * - Hybrid scoring (recency + relevance)
 *
 * NOTE: This module now operates on article-level embeddings.
 * Each result represents a complete article, not individual chunks.
 */

/**
 * Retrieve articles from the last N hours/days with optional filtering
 * @param timeWindow Time window to retrieve from
 * @param limit Maximum number of articles to return
 * @param additionalFilters Optional metadata filters
 * @returns Array of query results sorted by recency
 */
export async function retrieveRecentChunks(
  timeWindow: TimeWindow = '24h',
  limit = 50,
  additionalFilters?: MetadataFilters,
): Promise<QueryResult[]> {
  console.log(`🔍 Retrieving recent articles from last ${timeWindow}...`);
  
  const vectorClient = new VectorClient();
  await vectorClient.initialize();

  // Calculate time boundary
  const timeWindowMs = parseTimeWindow(timeWindow);
  const cutoffDate = new Date(Date.now() - timeWindowMs);
  
  // Build filters
  const filters: MetadataFilters = {
    published_after: cutoffDate.toISOString(),
    ...additionalFilters,
  };

  try {
    // Query with a generic embedding (we're primarily filtering by time)
    const llmClient = new LLMClient();
    const genericQuery = 'recent technology and AI developments';
    const embeddingResult = await llmClient.embedSingle(genericQuery);
    
    const chromaFilters = convertFiltersToChroma(filters);
    const results = await vectorClient.queryByVector(
      embeddingResult.embedding,
      limit * 2, // Get extra to allow for diversity filtering
      chromaFilters,
    );

    console.log(`✅ Retrieved ${results.length} recent articles from ${timeWindow}`);
    return results.slice(0, limit);

  } catch (error) {
    console.error('❌ Failed to retrieve recent articles:', error);
    return [];
  }
}

/**
 * Query vector database using semantic similarity search
 * @param query Natural language query
 * @param options Query configuration options
 * @returns Array of semantically similar articles
 */
export async function retrieveByQuery(
  query: string, 
  options: RetrievalOptions = { limit: 50 },
): Promise<QueryResult[]> {
  console.log(`🔍 Querying for: "${query}" with options:`, options);
  
  const vectorClient = new VectorClient();
  await vectorClient.initialize();

  try {
    // Build filters based on options
    const filters: MetadataFilters = {};
    
    if (options.timeWindow) {
      const timeWindowMs = parseTimeWindow(options.timeWindow);
      const cutoffDate = new Date(Date.now() - timeWindowMs);
      filters.published_after = cutoffDate.toISOString();
    }

    if (options.sources && options.sources.length > 0) {
      filters.source = options.sources;
    }

    // Perform semantic search
    const chromaFilters = convertFiltersToChroma(filters);
    
    // Generate embedding for the query
    const llmClient = new LLMClient();
    const embeddingResult = await llmClient.embedSingle(query);
    
    const results = await vectorClient.queryByVector(
      embeddingResult.embedding,
      options.limit * 2, // Get extra for diversity filtering
      chromaFilters,
    );

    // Apply quality threshold if specified
    let filteredResults = results;
    if (options.qualityThreshold) {
      filteredResults = results.filter(r => r.score >= options.qualityThreshold!);
    }

    // Apply diversity filtering if requested
    if (options.diversityFilter) {
      filteredResults = applyDiversityFilter(filteredResults, options.limit);
    } else {
      filteredResults = filteredResults.slice(0, options.limit);
    }

    console.log(`✅ Found ${filteredResults.length} relevant articles for query: "${query}"`);
    return filteredResults;

  } catch (error) {
    console.error('❌ Failed to query by semantic search:', error);
    return [];
  }
}

/**
 * Retrieve articles related to specific topics
 * @param topics Array of topic keywords
 * @param limit Maximum number of articles per topic
 * @returns Array of topic-related articles
 */
export async function retrieveByTopics(
  topics: string[],
  limit = 20,
): Promise<QueryResult[]> {
  console.log('🔍 Retrieving articles for topics:', topics);
  
  const allResults: QueryResult[] = [];
  
  // Query for each topic separately
  for (const topic of topics) {
    try {
      const topicResults = await retrieveByQuery(topic, {
        limit: Math.ceil(limit / topics.length),
        diversityFilter: true,
      });
      allResults.push(...topicResults);
    } catch (error) {
      console.warn(`⚠️ Failed to retrieve articles for topic "${topic}":`, error);
    }
  }

  // Remove duplicates and apply final diversity filter
  const uniqueResults = removeDuplicates(allResults);
  const finalResults = applyDiversityFilter(uniqueResults, limit);

  console.log(`✅ Retrieved ${finalResults.length} articles across ${topics.length} topics`);
  return finalResults;
}

/**
 * Combine and rank results using hybrid scoring
 * @param results Array of query results to rank
 * @param options Hybrid scoring configuration
 * @returns Ranked and scored results
 */
export async function combineAndRankResults(
  results: QueryResult[],
  options: HybridScoringOptions = {
    recencyWeight: 0.3,
    diversityBonus: 0.1,
    qualityWeight: 0.6,
  },
): Promise<QueryResult[]> {
  console.log(`🏆 Ranking ${results.length} results with hybrid scoring...`);
  
  if (results.length === 0) {return [];}

  // Calculate time-based scores
  const now = Date.now();
  const oldestDate = Math.min(...results.map(r => 
    new Date(r.metadata.published_date).getTime(),
  ));
  const timeRange = now - oldestDate;

  // Calculate source diversity
  const sourceCount = new Map<string, number>();
  results.forEach(r => {
    const source = r.metadata.source;
    sourceCount.set(source, (sourceCount.get(source) || 0) + 1);
  });

  // Score each result
  const scoredResults = results.map(result => {
    const publishedTime = new Date(result.metadata.published_date).getTime();
    
    // Recency score (0-1, newer is higher)
    const recencyScore = timeRange > 0 ? 
      (publishedTime - oldestDate) / timeRange : 1;
    
    // Diversity bonus (fewer from same source = higher bonus)
    const sourceFreq = sourceCount.get(result.metadata.source) || 1;
    const diversityScore = 1 / Math.log(sourceFreq + 1);
    
    // Quality score based on content metrics
    const wordCount = result.metadata.word_count || 0;
    const qualityScore = Math.min(wordCount / 200, 1); // Normalize around 200 words
    
    // Combine scores
    const hybridScore = 
      (result.score * options.qualityWeight) +
      (recencyScore * options.recencyWeight) +
      (diversityScore * options.diversityBonus);

    return {
      ...result,
      hybridScore,
      recencyScore,
      diversityScore,
      qualityScore,
    };
  });

  // Sort by hybrid score
  scoredResults.sort((a, b) => b.hybridScore - a.hybridScore);

  console.log('✅ Ranked results by hybrid score');
  return scoredResults;
}

/**
 * Main retrieval function with comprehensive options
 * Combines query-based, topic-based, and time-based retrieval strategies
 * @param options - Configuration including query, topics, time window, and scoring options
 * @returns Array of relevant articles ranked by hybrid scoring
 */
export async function retrieveRelevantChunks(
  options: RetrievalOptions & {
    query?: string,
    topics?: string[],
    hybridScoring?: HybridScoringOptions
  } = { limit: 50, timeWindow: '24h' },
): Promise<QueryResult[]> {
  console.log('🚀 Starting comprehensive article retrieval...');

  try {
    let results: QueryResult[] = [];

    // Strategy 1: Query-based retrieval
    if (options.query) {
      const queryResults = await retrieveByQuery(options.query, options);
      results.push(...queryResults);
    }

    // Strategy 2: Topic-based retrieval
    if (options.topics && options.topics.length > 0) {
      const topicResults = await retrieveByTopics(options.topics, options.limit);
      results.push(...topicResults);
    }

    // Strategy 3: Recent chunks if no specific query
    if (!options.query && (!options.topics || options.topics.length === 0)) {
      results = await retrieveRecentChunks(options.timeWindow, options.limit);
    }

    // Remove duplicates
    results = removeDuplicates(results);

    // Apply hybrid scoring if requested
    if (options.hybridScoring) {
      results = await combineAndRankResults(results, options.hybridScoring);
    }

    // Apply final limit
    results = results.slice(0, options.limit);

    console.log(`✅ Retrieved ${results.length} total relevant articles`);
    return results;

  } catch (error) {
    console.error('❌ Failed to retrieve relevant articles:', error);
    return [];
  }
}

// Utility functions

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
 * Convert metadata filters to Chroma-compatible format
 * @param filters - Application-level metadata filters
 * @returns Chroma-compatible filter object, or undefined if no filters
 */
function convertFiltersToChroma(filters: MetadataFilters): Record<string, string | number | boolean> | undefined {
  const chromaFilters: Record<string, string | number | boolean> = {};
  let hasFilters = false;

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      if (Array.isArray(value)) {
        // Chroma doesn't support array filters directly in this format
        // We'll need to handle this with multiple queries or OR conditions
        if (value.length > 0) {
          chromaFilters[key] = value[0]; // Use first value for now
          hasFilters = true;
        }
      } else {
        chromaFilters[key] = value;
        hasFilters = true;
      }
    }
  });

  // Return undefined if no filters to avoid Chroma validation error
  return hasFilters ? chromaFilters : undefined;
}

/**
 * Remove duplicate articles based on source URL
 * With article-level embeddings, each article has a single entry,
 * so we only need to deduplicate by source_url (or article_id if available)
 * @param results - Array of query results that may contain duplicates
 * @returns Deduplicated array of query results
 */
function removeDuplicates(results: QueryResult[]): QueryResult[] {
  const seen = new Set<string>();
  return results.filter(result => {
    // Use article_id if available (new format), fallback to source_url (legacy)
    const metadata = result.metadata as unknown as Record<string, unknown>;
    const key = (metadata.article_id as string | undefined) || result.metadata.source_url;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

/**
 * Apply diversity filtering to avoid too many articles from same source
 * Distributes results evenly across sources while respecting the limit
 * @param results - Array of query results to filter
 * @param limit - Maximum number of results to return
 * @returns Diversified array of query results
 */
function applyDiversityFilter(results: QueryResult[], limit: number): QueryResult[] {
  const sourceGroups = new Map<string, QueryResult[]>();
  
  // Group by source
  results.forEach(result => {
    const source = result.metadata.source;
    if (!sourceGroups.has(source)) {
      sourceGroups.set(source, []);
    }
    sourceGroups.get(source)!.push(result);
  });

  // Calculate max items per source
  const maxPerSource = Math.max(1, Math.floor(limit / sourceGroups.size));
  const diverseResults: QueryResult[] = [];

  // Take top items from each source
  Array.from(sourceGroups.entries()).forEach(([_source, sourceResults]) => {
    const topFromSource = sourceResults
      .sort((a, b) => b.score - a.score)
      .slice(0, maxPerSource);
    diverseResults.push(...topFromSource);
  });

  // Fill remaining slots with highest scoring items
  const remaining = limit - diverseResults.length;
  if (remaining > 0) {
    const allRemaining = results.filter(r => 
      !diverseResults.some(dr => dr.id === r.id),
    );
    const topRemaining = allRemaining
      .sort((a, b) => b.score - a.score)
      .slice(0, remaining);
    diverseResults.push(...topRemaining);
  }

  return diverseResults
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const queryArg = args[0];
  const limit = parseInt(args[1] || '20', 10);
  const timeWindow = (args[2] as TimeWindow) || '24h';

  // Build options object, only include query if provided
  const options: Parameters<typeof retrieveRelevantChunks>[0] = {
    limit,
    timeWindow,
    diversityFilter: true,
    hybridScoring: {
      recencyWeight: 0.3,
      diversityBonus: 0.1,
      qualityWeight: 0.6,
    },
  };

  if (queryArg) {
    options.query = queryArg;
  }

  retrieveRelevantChunks(options).then(results => {
    console.log(`\n📊 Retrieved ${results.length} articles:`);
    results.forEach((result, index) => {
      console.log(`\n${index + 1}. [${result.score.toFixed(3)}] ${result.metadata.title}`);
      console.log(`   Source: ${result.metadata.source}`);
      console.log(`   Published: ${result.metadata.published_date}`);
      console.log(`   Content: ${result.content.slice(0, 100)}...`);
    });
  }).catch(console.error);
}