import Parser from 'rss-parser';
import fs from 'fs/promises';
import path from 'path';
import type { RSSItem, RSSFeed } from '../types/index.js';

export interface FeedFetchResult {
  feed: RSSFeed | null;
  url: string;
  success: boolean;
  error?: string;
}

export class RSSClient {
  private parser: Parser;
  private feedUrls: string[];
  private dataDir: string;
  private failedFeeds: string[] = [];

  constructor(feedUrls: string[] = [], dataDir = './data') {
    this.parser = new Parser({
      customFields: {
        feed: ['subtitle', 'updated'],
        item: ['summary', 'updated', 'id'],
      },
    });
    this.feedUrls = feedUrls;
    this.dataDir = dataDir;
  }

  /**
   * Get list of feeds that failed during the last fetch
   */
  getFailedFeeds(): string[] {
    return [...this.failedFeeds];
  }

  /**
   * Set feed URLs from environment variable or array
   */
  setFeedUrls(feeds: string | string[]): void {
    if (typeof feeds === 'string') {
      this.feedUrls = feeds.split(',').map(url => url.trim()).filter(url => url.length > 0);
    } else {
      this.feedUrls = feeds;
    }
  }

  /**
   * Fetch and parse a single RSS feed
   */
  async fetchFeed(feedUrl: string): Promise<RSSFeed> {
    try {
      const feed = await this.parser.parseURL(feedUrl);
      
      const items: RSSItem[] = feed.items.map((item, index) => ({
        id: item.guid || item.link || `${feedUrl}-${index}`,
        title: item.title || 'Untitled',
        link: item.link || '',
        pubDate: item.pubDate || item.isoDate || new Date().toISOString(),
        content: item.content || item['content:encoded'] || item.summary || item.contentSnippet || '',
        contentSnippet: item.contentSnippet || item.summary || '',
        creator: item.creator || item.author,
        categories: item.categories || [],
        source: feed.title || feedUrl,
        feedUrl: feedUrl,
        guid: item.guid || item.id || item.link || `${feedUrl}-${index}`,
      }));

      return {
        title: feed.title || 'Unknown Feed',
        description: feed.description || '',
        link: feed.link || feedUrl,
        feedUrl: feedUrl,
        items: items,
      };
    } catch (error) {
      console.error(`Error fetching feed ${feedUrl}:`, error);
      throw new Error(`Failed to fetch RSS feed: ${feedUrl}`);
    }
  }

  /**
   * Fetch all configured RSS feeds
   */
  async fetchAllFeeds(): Promise<RSSFeed[]> {
    if (this.feedUrls.length === 0) {
      throw new Error('No RSS feed URLs configured. Use setFeedUrls() to configure feeds.');
    }

    console.log(`Fetching ${this.feedUrls.length} RSS feeds...`);

    // Reset failed feeds list
    this.failedFeeds = [];

    const feedPromises = this.feedUrls.map(async (feedUrl): Promise<FeedFetchResult> => {
      try {
        const feed = await this.fetchFeed(feedUrl);
        return { feed, url: feedUrl, success: true };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`Failed to fetch ${feedUrl}:`, errorMessage);
        return { feed: null, url: feedUrl, success: false, error: errorMessage };
      }
    });

    const results = await Promise.all(feedPromises);

    // Track failed feeds
    this.failedFeeds = results
      .filter(r => !r.success)
      .map(r => r.url);

    const validFeeds = results
      .filter((r): r is FeedFetchResult & { feed: RSSFeed } => r.success && r.feed !== null)
      .map(r => r.feed);

    console.log(`Successfully fetched ${validFeeds.length} out of ${this.feedUrls.length} feeds`);
    if (this.failedFeeds.length > 0) {
      console.log(`⚠️  ${this.failedFeeds.length} feeds failed and will be marked as inactive`);
    }
    return validFeeds;
  }

  /**
   * Get recent items from all feeds (within specified hours)
   */
  async getRecentItems(hoursBack = 24): Promise<RSSItem[]> {
    const feeds = await this.fetchAllFeeds();
    const cutoffDate = new Date(Date.now() - (hoursBack * 60 * 60 * 1000));
    
    const allItems: RSSItem[] = [];
    
    for (const feed of feeds) {
      for (const item of feed.items) {
        const itemDate = new Date(item.pubDate);
        if (itemDate >= cutoffDate) {
          allItems.push(item);
        }
      }
    }

    // Sort by publication date, newest first
    allItems.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
    
    console.log(`Found ${allItems.length} items from the last ${hoursBack} hours`);
    return allItems;
  }

  /**
   * Save raw RSS items to JSON files in data/raw directory
   */
  async saveRawItems(items: RSSItem[]): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `rss-items-${timestamp}.json`;
    const filepath = path.join(this.dataDir, 'raw', filename);

    // Ensure directory exists
    await fs.mkdir(path.dirname(filepath), { recursive: true });

    // Save items with metadata
    const data = {
      timestamp: new Date().toISOString(),
      itemCount: items.length,
      feedSources: [...new Set(items.map(item => item.source))],
      items: items,
    };

    await fs.writeFile(filepath, JSON.stringify(data, null, 2));
    console.log(`Saved ${items.length} RSS items to ${filepath}`);
    
    return filepath;
  }

  /**
   * Load previously saved raw items from JSON file
   */
  async loadRawItems(filename: string): Promise<RSSItem[]> {
    const filepath = path.join(this.dataDir, 'raw', filename);
    const data = await fs.readFile(filepath, 'utf-8');
    const parsed = JSON.parse(data);
    return parsed.items || [];
  }

  /**
   * Get list of available raw item files
   */
  async getRawItemFiles(): Promise<string[]> {
    const rawDir = path.join(this.dataDir, 'raw');
    try {
      const files = await fs.readdir(rawDir);
      return files.filter(file => file.startsWith('rss-items-') && file.endsWith('.json'));
    } catch (error) {
      console.error('Error reading raw items directory:', error);
      return [];
    }
  }
}

// Load feeds from feeds.json file
export async function loadFeedsFromFile(filePath = './feeds.json'): Promise<string[]> {
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    const config = JSON.parse(data);
    return config.feeds
      .filter((feed: any) => feed.active)
      .map((feed: any) => feed.url);
  } catch (error) {
    console.warn(`Could not load feeds from ${filePath}:`, error);
    return [];
  }
}

// Mark feeds as inactive in feeds.json
export async function markFeedsAsInactive(feedUrls: string[], filePath = './feeds.json'): Promise<void> {
  if (feedUrls.length === 0) return;

  try {
    const data = await fs.readFile(filePath, 'utf-8');
    const config = JSON.parse(data);

    let deactivatedCount = 0;
    for (const feed of config.feeds) {
      if (feedUrls.includes(feed.url) && feed.active) {
        feed.active = false;
        deactivatedCount++;
        console.log(`🚫 Marking feed as inactive: ${feed.name || feed.url}`);
      }
    }

    if (deactivatedCount > 0) {
      await fs.writeFile(filePath, JSON.stringify(config, null, 2));
      console.log(`📝 Updated feeds.json: ${deactivatedCount} feeds marked as inactive`);
    }
  } catch (error) {
    console.error(`Failed to update feeds.json:`, error);
  }
}

// Create RSS client from feeds.json configuration
export async function createRSSClientFromConfig(): Promise<RSSClient> {
  const dataDir = process.env.DATA_DIR || './data';

  const client = new RSSClient([], dataDir);

  // Load feeds from feeds.json
  try {
    const fileFeeds = await loadFeedsFromFile();
    if (fileFeeds.length === 0) {
      throw new Error('No active feeds found in feeds.json');
    }
    client.setFeedUrls(fileFeeds);
  } catch (error) {
    console.error('Failed to load feeds from feeds.json:', error);
    throw new Error('Could not load feed configuration. Please ensure feeds.json exists with active feeds.');
  }

  return client;
}