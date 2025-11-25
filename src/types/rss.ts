/**
 * RSS and Feed Related Types
 * 
 * This file contains all type definitions related to RSS feeds,
 * feed items, and feed processing.
 */

export interface RSSItem {
  id: string;
  title: string;
  link: string;
  pubDate: string;
  content: string;
  contentSnippet: string;
  creator?: string;
  categories?: string[];
  source: string;
  feedUrl: string;
  guid: string;
}

export interface RSSFeed {
  title: string;
  description: string;
  link: string;
  feedUrl: string;
  items: RSSItem[];
}

// Database representation of RSS item
export interface RSSItemRecord {
  id: string;
  title: string;
  link: string;
  pub_date: string;
  source: string;
  categories?: string;
  content?: string;
  processed: boolean;
  created_at?: string;
}

// Feed configuration types
export interface FeedConfig {
  name: string;
  url: string;
  category: string;
  active: boolean;
}

export interface FeedsConfiguration {
  feeds: FeedConfig[];
}