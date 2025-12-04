/**
 * Daily Digest Generator Worker
 * Generates and composes daily digest from clustered content
 */

import { LLMClient } from '../lib/llmClient.js';
import { clusterRecentContent } from './summarizer.js';
import type {
  Cluster,
  ClusterSummary,
  ArticleReference,
  ChatMessage,
  DigestContent,
  DigestOptions,
  DigestMetadata,
  TimeWindow,
} from '../types/index.js';

// Constants
const MAX_CHUNKS_TO_RETRIEVE = 200;
const ESTIMATED_TOKENS_PER_CLUSTER = 700;
const GPT4O_MINI_INPUT_COST_PER_1M = 0.150;
const GPT4O_MINI_OUTPUT_COST_PER_1M = 0.600;
const INPUT_TOKEN_RATIO = 0.6;
const OUTPUT_TOKEN_RATIO = 0.4;
const COST_PRECISION = 4;
const SCORE_PRECISION = 3;
const TOKENS_PER_MILLION = 1_000_000;
const ARTICLE_PREVIEW_LENGTH = 300;
const EXCERPT_LENGTH = 200;
const MAX_TAKEAWAYS = 5;
const DEFAULT_MAX_ARTICLES = 10;

/**
 * Generate a concise topic label for a cluster
 * @param cluster The cluster to generate a label for
 * @param llmClient LLM client instance
 * @returns Promise with the topic label (3-5 words)
 */
export async function generateTopicLabel(
  cluster: Cluster,
  llmClient: LLMClient,
): Promise<string> {
  // Extract titles from cluster chunks
  const titles = cluster.chunks
    .map(chunk => chunk.metadata?.title)
    .filter((title): title is string => !!title);

  if (titles.length === 0) {
    return 'Untitled Topic';
  }

  // Create prompt for topic labeling
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: 'You are an expert at analyzing article topics and creating concise, descriptive labels. Generate topic labels that are clear, specific, and capture the main theme.',
    },
    {
      role: 'user',
      content: `Based on these article titles, generate a concise topic label (3-5 words):

${titles.map((title, i) => `${i + 1}. ${title}`).join('\n')}

Return only the topic label, nothing else. Make it specific and descriptive.`,
    },
  ];

  try {
    const result = await llmClient.chatCompletion(messages, {
      temperature: 0.3, // Lower temperature for more focused output
      maxTokens: 50,
    });

    return result.content.trim();
  } catch (error) {
    console.error('Error generating topic label:', error);
    return 'General Topic';
  }
}

/**
 * Extract key takeaways from a cluster
 * @param cluster The cluster to extract takeaways from
 * @param llmClient LLM client instance
 * @returns Promise with array of key takeaways (3-5 items)
 */
export async function extractKeyTakeaways(
  cluster: Cluster,
  llmClient: LLMClient,
): Promise<string[]> {
  // Prepare article content
  const articles = cluster.chunks.map(chunk => ({
    title: chunk.metadata?.title || 'Untitled',
    content: chunk.content,
    source: chunk.metadata?.source || 'Unknown',
  }));

  if (articles.length === 0) {
    return [];
  }

  // Create prompt for key takeaways
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: 'You are an expert at extracting key insights and takeaways from articles. Focus on actionable insights, important facts, and significant developments.',
    },
    {
      role: 'user',
      content: `Extract 3-5 key takeaways or insights from these articles. Each takeaway should be a concise, standalone statement.

${articles.map((a, i) => `${i + 1}. ${a.title} (${a.source})\n   ${a.content.substring(0, ARTICLE_PREVIEW_LENGTH)}...`).join('\n\n')}

Return the takeaways as a numbered list, one per line.`,
    },
  ];

  try {
    const result = await llmClient.chatCompletion(messages, {
      temperature: 0.5,
      maxTokens: 300,
    });

    // Parse the numbered list into an array
    const takeaways = result.content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(line => {
        // Remove numbering (e.g., "1. ", "- ", "• ")
        return line.replace(/^[\d]+\.\s*|^[-•]\s*/, '').trim();
      })
      .filter(line => line.length > 0);

    return takeaways.slice(0, MAX_TAKEAWAYS);
  } catch (error) {
    console.error('Error extracting key takeaways:', error);
    return [];
  }
}

/**
 * Format article references from a cluster
 * @param cluster The cluster to format references for
 * @param maxArticles Maximum number of articles to include (default: 10)
 * @returns Array of article references
 */
export function formatArticleReferences(
  cluster: Cluster,
  maxArticles = 10,
): ArticleReference[] {
  return cluster.chunks
    .slice(0, maxArticles)
    .map(chunk => ({
      title: chunk.metadata?.title || 'Untitled',
      source: chunk.metadata?.source || 'Unknown',
      url: chunk.metadata?.source_url,
      publishedAt: chunk.metadata?.published_date,
      excerpt: chunk.content.substring(0, EXCERPT_LENGTH) + (chunk.content.length > EXCERPT_LENGTH ? '...' : ''),
    }));
}

/**
 * Summarize a cluster with topic label, summary, and key takeaways
 * @param cluster The cluster to summarize
 * @param topicLabel The topic label for the cluster
 * @param llmClient LLM client instance
 * @param options Optional configuration
 * @returns Promise with the cluster summary
 */
export async function summarizeCluster(
  cluster: Cluster,
  topicLabel: string,
  llmClient: LLMClient,
  options?: {
    maxArticles?: number;
    includeKeyTakeaways?: boolean;
    silhouetteScore?: number;
  },
): Promise<ClusterSummary> {
  // Prepare article content
  const articles = cluster.chunks.map(chunk => ({
    title: chunk.metadata?.title || 'Untitled',
    content: chunk.content,
    source: chunk.metadata?.source || 'Unknown',
  }));

  // Create prompt for cluster summarization
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: 'You are an expert at summarizing technical articles and identifying key insights. Create concise, informative summaries that capture the main themes.',
    },
    {
      role: 'user',
      content: `Topic: ${topicLabel}

Summarize the main themes and insights from these articles in 2-3 sentences:

${articles.map((a, i) => `${i + 1}. ${a.title} (${a.source})\n   ${a.content.substring(0, ARTICLE_PREVIEW_LENGTH)}...`).join('\n\n')}

Focus on the key developments, trends, and important information.`,
    },
  ];

  try {
    const result = await llmClient.chatCompletion(messages, {
      temperature: 0.7,
      maxTokens: 200,
    });

    const summary = result.content.trim();

    // Extract key takeaways if requested
    const keyTakeaways = options?.includeKeyTakeaways !== false
      ? await extractKeyTakeaways(cluster, llmClient)
      : [];

    // Format article references
    const representativeArticles = formatArticleReferences(
      cluster,
      options?.maxArticles || DEFAULT_MAX_ARTICLES,
    );

    // Calculate average relevance score
    const avgRelevanceScore = cluster.chunks.length > 0
      ? cluster.chunks.reduce((sum, chunk) => sum + chunk.score, 0) / cluster.chunks.length
      : 0;

    // Build metadata object
    const metadata: { silhouetteScore?: number; avgRelevanceScore?: number } = {
      avgRelevanceScore,
    };

    if (options?.silhouetteScore !== undefined) {
      metadata.silhouetteScore = options.silhouetteScore;
    }

    return {
      clusterId: cluster.id,
      topicLabel,
      summary,
      keyTakeaways,
      articleCount: cluster.size,
      representativeArticles,
      metadata,
    };
  } catch (error) {
    console.error('Error summarizing cluster:', error);

    // Build metadata object for error case
    const errorMetadata: { silhouetteScore?: number; avgRelevanceScore?: number } = {
      avgRelevanceScore: 0,
    };

    if (options?.silhouetteScore !== undefined) {
      errorMetadata.silhouetteScore = options.silhouetteScore;
    }

    // Return a basic summary on error
    return {
      clusterId: cluster.id,
      topicLabel,
      summary: 'Unable to generate summary.',
      keyTakeaways: [],
      articleCount: cluster.size,
      representativeArticles: formatArticleReferences(cluster, options?.maxArticles || DEFAULT_MAX_ARTICLES),
      metadata: errorMetadata,
    };
  }
}

/**
 * Generate and compose the daily digest from clustered content
 *
 * Pipeline:
 * 1. Retrieve recent content from vector database
 * 2. Cluster content using k-means
 * 3. Generate topic labels for each cluster
 * 4. Summarize each cluster
 * 5. Extract key takeaways
 * 6. Format article references
 * 7. Compose final digest with metadata
 *
 * @param timeWindow Time window for content retrieval (default: '24h')
 * @param clusterCount Number of clusters to create (default: 5)
 * @param options Additional digest generation options
 * @returns Promise with complete digest content
 */
export async function generateDigest(
  timeWindow: TimeWindow = '24h',
  clusterCount = 5,
  options?: DigestOptions,
): Promise<DigestContent> {
  console.log(`\n🚀 Generating digest for ${timeWindow} with ${clusterCount} clusters...`);
  const startTime = Date.now();

  // Initialize clients
  const llmClient = new LLMClient();

  try {
    // Step 1: Cluster recent content
    console.log('\n📊 Step 1: Clustering recent content...');
    const clusteringResult = await clusterRecentContent(
      timeWindow,
      MAX_CHUNKS_TO_RETRIEVE,
      { k: clusterCount },
    );

    if (clusteringResult.clusters.length === 0) {
      throw new Error('No content found to generate digest');
    }

    console.log(`✅ Created ${clusteringResult.clusters.length} clusters from ${clusteringResult.totalChunks} chunks`);

    // Step 2: Generate summaries for each cluster
    console.log('\n📝 Step 2: Generating cluster summaries...');
    const clusterSummaries: ClusterSummary[] = [];
    let totalTokens = 0;

    for (const cluster of clusteringResult.clusters) {
      console.log(`\n   Processing cluster ${cluster.id + 1}/${clusteringResult.clusters.length}...`);

      // Generate topic label
      const topicLabel = await generateTopicLabel(cluster, llmClient);
      console.log(`   ✓ Topic: "${topicLabel}"`);

      // Build summarization options
      const summarizationOptions: {
        maxArticles?: number;
        includeKeyTakeaways?: boolean;
        silhouetteScore?: number;
      } = {
        maxArticles: options?.maxArticlesPerCluster ?? DEFAULT_MAX_ARTICLES,
        includeKeyTakeaways: options?.includeKeyTakeaways ?? true,
      };

      // Add silhouetteScore only if defined
      if (clusteringResult.silhouetteScore !== undefined) {
        summarizationOptions.silhouetteScore = clusteringResult.silhouetteScore;
      }

      // Summarize cluster
      const summary = await summarizeCluster(
        cluster,
        topicLabel,
        llmClient,
        summarizationOptions,
      );

      clusterSummaries.push(summary);
      console.log(`   ✓ Summary generated (${summary.keyTakeaways.length} takeaways, ${summary.representativeArticles.length} articles)`);
    }

    // Step 3: Calculate metadata
    console.log('\n📊 Step 3: Calculating digest metadata...');
    const processingTime = Date.now() - startTime;
    const totalArticles = clusterSummaries.reduce((sum, c) => sum + c.articleCount, 0);

    // Calculate average silhouette score
    const avgSilhouetteScore = clusteringResult.silhouetteScore;

    // Estimate cost (rough approximation based on typical token usage)
    // Topic label: ~100 tokens, Summary: ~300 tokens, Takeaways: ~300 tokens per cluster
    totalTokens = clusterSummaries.length * ESTIMATED_TOKENS_PER_CLUSTER;

    // GPT-4o-mini pricing: $0.150 per 1M input tokens, $0.600 per 1M output tokens
    // Rough estimate: 60% input, 40% output
    const inputCost = (totalTokens * INPUT_TOKEN_RATIO) * (GPT4O_MINI_INPUT_COST_PER_1M / TOKENS_PER_MILLION);
    const outputCost = (totalTokens * OUTPUT_TOKEN_RATIO) * (GPT4O_MINI_OUTPUT_COST_PER_1M / TOKENS_PER_MILLION);
    const estimatedCost = inputCost + outputCost;

    // Build metadata object with proper type handling
    const metadata: DigestMetadata = {
      totalArticles,
      clusterCount: clusterSummaries.length,
      processingTime,
      model: options?.model || 'gpt-4o-mini',
      totalTokens,
      estimatedCost,
    };

    // Add optional properties only if defined
    if (avgSilhouetteScore !== undefined) {
      metadata.avgSilhouetteScore = avgSilhouetteScore;
    }

    // Step 4: Compose final digest
    console.log('\n📰 Step 4: Composing final digest...');
    const generatedAt = new Date().toISOString();
    const title = options?.customTitle || `Daily Digest - ${new Date().toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })}`;

    const digest: DigestContent = {
      title,
      generatedAt,
      timeWindow,
      clusters: clusterSummaries,
      metadata,
    };

    // Log summary
    console.log('\n✅ Digest generation complete!');
    console.log(`   Title: ${title}`);
    console.log(`   Clusters: ${metadata.clusterCount}`);
    console.log(`   Articles: ${metadata.totalArticles}`);
    console.log(`   Quality: ${avgSilhouetteScore?.toFixed(SCORE_PRECISION) ?? 'N/A'}`);
    console.log(`   Processing time: ${processingTime}ms`);
    console.log(`   Estimated tokens: ${totalTokens}`);
    console.log(`   Estimated cost: $${estimatedCost.toFixed(COST_PRECISION)}`);

    return digest;

  } catch (error) {
    console.error('❌ Failed to generate digest:', error);
    throw error;
  }
}