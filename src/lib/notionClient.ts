/**
 * Notion Client
 * 
 * Handles all interactions with the Notion API for posting digests
 * to a Notion database with rich formatting.
 */

import { Client } from '@notionhq/client';
import type {
  BlockObjectRequest,
  CreatePageParameters,
} from '@notionhq/client/build/src/api-endpoints';
import type { DigestContent, ClusterSummary, NotionDigestOptions } from '../types/index.js';

/**
 * Client for interacting with Notion API
 */
export class NotionClient {
  private client: Client;
  private databaseId: string;

  constructor(apiKey?: string, databaseId?: string) {
    const key = apiKey || process.env.NOTION_API_KEY;
    if (!key) {
      throw new Error('NOTION_API_KEY environment variable is required');
    }

    this.databaseId = databaseId || process.env.NOTION_DATABASE_ID || '';
    if (!this.databaseId) {
      throw new Error('NOTION_DATABASE_ID environment variable is required');
    }

    this.client = new Client({ auth: key });
  }

  /**
   * Add a digest entry to the Notion database
   * @param digest The digest content to add
   * @param options Notion-specific formatting options
   * @returns Promise with the created page ID
   */
  async addDigestEntry(
    digest: DigestContent,
    options?: NotionDigestOptions,
  ): Promise<string> {
    const databaseId = options?.databaseId || this.databaseId;

    // Format digest as Notion blocks
    const blocks = this.formatAsNotionBlocks(digest, options);

    // Create page properties
    const properties: CreatePageParameters['properties'] = {
      'Title': {
        title: [
          {
            text: {
              content: digest.title,
            },
          },
        ],
      },
      'Generated': {
        date: {
          start: digest.generatedAt,
        },
      },
      'Window': {
        select: {
          name: digest.timeWindow,
        },
      },
      'Topics': {
        number: digest.metadata.clusterCount,
      },
      'Articles': {
        number: digest.metadata.totalArticles,
      },
    };

    // Add quality score if available
    if (digest.metadata.avgSilhouetteScore !== undefined) {
      properties['Quality'] = {
        number: Math.round(digest.metadata.avgSilhouetteScore * 100) / 100,
      };
    }

    // Create the page
    const response = await this.client.pages.create({
      parent: {
        database_id: databaseId,
      },
      icon: options?.icon ? {
        type: 'emoji',
        emoji: options.icon,
      } : undefined,
      cover: options?.coverUrl ? {
        type: 'external',
        external: {
          url: options.coverUrl,
        },
      } : undefined,
      properties,
      children: blocks,
    });

    console.log(`✅ Created Notion page: ${response.id}`);
    return response.id;
  }

  /**
   * Format digest content as Notion blocks
   * @param digest The digest content
   * @param options Formatting options
   * @returns Array of Notion block objects
   */
  formatAsNotionBlocks(
    digest: DigestContent,
    options?: NotionDigestOptions,
  ): BlockObjectRequest[] {
    const blocks: BlockObjectRequest[] = [];

    // Add summary callout
    blocks.push({
      object: 'block',
      type: 'callout',
      callout: {
        rich_text: [
          {
            type: 'text',
            text: {
              content: `📊 ${digest.metadata.clusterCount} topics • ${digest.metadata.totalArticles} articles • ${digest.metadata.processingTime}ms processing time`,
            },
          },
        ],
        icon: {
          type: 'emoji',
          emoji: '📰',
        },
        color: 'blue_background',
      },
    });

    // Add table of contents if enabled
    if (options?.enableTOC !== false) {
      blocks.push({
        object: 'block',
        type: 'table_of_contents',
        table_of_contents: {
          color: 'default',
        },
      });
    }

    // Add divider
    blocks.push({
      object: 'block',
      type: 'divider',
      divider: {},
    });

    // Add each cluster
    digest.clusters.forEach((cluster, index) => {
      blocks.push(...this.formatClusterBlocks(cluster, options));
      
      // Add divider between clusters (except after last one)
      if (index < digest.clusters.length - 1) {
        blocks.push({
          object: 'block',
          type: 'divider',
          divider: {},
        });
      }
    });

    return blocks;
  }

  /**
   * Format a single cluster as Notion blocks
   * @param cluster The cluster summary
   * @param options Formatting options
   * @returns Array of Notion block objects
   */
  private formatClusterBlocks(
    cluster: ClusterSummary,
    options?: NotionDigestOptions,
  ): BlockObjectRequest[] {
    const blocks: BlockObjectRequest[] = [];

    // Add cluster heading
    blocks.push({
      object: 'block',
      type: 'heading_2',
      heading_2: {
        rich_text: [
          {
            type: 'text',
            text: {
              content: `${cluster.topicLabel} (${cluster.articleCount} articles)`,
            },
            annotations: {
              bold: true,
            },
          },
        ],
        color: 'default',
      },
    });

    // Add cluster summary
    blocks.push({
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: [
          {
            type: 'text',
            text: {
              content: cluster.summary,
            },
          },
        ],
        color: 'default',
      },
    });

    // Add key takeaways if available
    if (cluster.keyTakeaways.length > 0) {
      blocks.push({
        object: 'block',
        type: 'heading_3',
        heading_3: {
          rich_text: [
            {
              type: 'text',
              text: {
                content: '🔑 Key Takeaways',
              },
            },
          ],
          color: 'default',
        },
      });

      // Add each takeaway as a bulleted list item
      cluster.keyTakeaways.forEach(takeaway => {
        blocks.push({
          object: 'block',
          type: 'bulleted_list_item',
          bulleted_list_item: {
            rich_text: [
              {
                type: 'text',
                text: {
                  content: takeaway,
                },
              },
            ],
            color: 'default',
          },
        });
      });
    }

    // Add articles section
    if (cluster.representativeArticles.length > 0) {
      const articlesHeading: BlockObjectRequest = {
        object: 'block',
        type: 'heading_3',
        heading_3: {
          rich_text: [
            {
              type: 'text',
              text: {
                content: '📚 Articles',
              },
            },
          ],
          color: 'default',
        },
      };

      // If collapse is enabled, wrap articles in a toggle
      if (options?.collapseArticles) {
        blocks.push({
          object: 'block',
          type: 'toggle',
          toggle: {
            rich_text: [
              {
                type: 'text',
                text: {
                  content: `📚 Articles (${cluster.representativeArticles.length})`,
                },
                annotations: {
                  bold: true,
                },
              },
            ],
            color: 'default',
            children: this.formatArticleBlocks(cluster.representativeArticles),
          },
        });
      } else {
        blocks.push(articlesHeading);
        blocks.push(...this.formatArticleBlocks(cluster.representativeArticles));
      }
    }

    return blocks;
  }

  /**
   * Format article references as Notion blocks
   * @param articles Array of article references
   * @returns Array of Notion block objects
   */
  private formatArticleBlocks(
    articles: ClusterSummary['representativeArticles'],
  ): BlockObjectRequest[] {
    const blocks: BlockObjectRequest[] = [];

    articles.forEach(article => {
      // Use bookmark block if URL is available
      if (article.url) {
        blocks.push({
          object: 'block',
          type: 'bookmark',
          bookmark: {
            url: article.url,
            caption: [
              {
                type: 'text',
                text: {
                  content: `${article.source}${article.publishedAt ? ` • ${new Date(article.publishedAt).toLocaleDateString()}` : ''}`,
                },
              },
            ],
          },
        });
      } else {
        // Fallback to bulleted list with title and excerpt
        blocks.push({
          object: 'block',
          type: 'bulleted_list_item',
          bulleted_list_item: {
            rich_text: [
              {
                type: 'text',
                text: {
                  content: `${article.title} (${article.source})`,
                },
                annotations: {
                  bold: true,
                },
              },
            ],
            color: 'default',
          },
        });
      }
    });

    return blocks;
  }

  /**
   * Test the Notion API connection
   * @returns Promise that resolves if connection is successful
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.client.databases.retrieve({
        database_id: this.databaseId,
      });
      console.log('✅ Notion API connection successful');
      return true;
    } catch (error) {
      console.error('❌ Notion API connection failed:', error);
      return false;
    }
  }
}
