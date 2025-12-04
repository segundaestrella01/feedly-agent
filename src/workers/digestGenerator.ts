/**
 * Daily Digest Generator Worker
 * Generates and composes daily digest from clustered content
 */

import { LLMClient } from '../lib/llmClient.js';
import type {
  Cluster,
  ClusterSummary,
  ArticleReference,
  ChatMessage,
} from '../types/index.js';

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

${articles.map((a, i) => `${i + 1}. ${a.title} (${a.source})\n   ${a.content.substring(0, 300)}...`).join('\n\n')}

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

    return takeaways.slice(0, 5); // Limit to 5 takeaways
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
      excerpt: chunk.content.substring(0, 200) + (chunk.content.length > 200 ? '...' : ''),
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

${articles.map((a, i) => `${i + 1}. ${a.title} (${a.source})\n   ${a.content.substring(0, 300)}...`).join('\n\n')}

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
      options?.maxArticles || 10,
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
      representativeArticles: formatArticleReferences(cluster, options?.maxArticles || 10),
      metadata: errorMetadata,
    };
  }
}

/**
 * Generate and compose the daily digest from clustered content
 * Combines cluster summaries into a formatted digest for delivery
 * @returns Promise that resolves when digest generation is complete
 */
export async function generateDigest(): Promise<void> {
  // TODO: Generate and compose daily digest
  console.log('Generating daily digest...');
}