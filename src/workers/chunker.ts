import fs from 'fs/promises';
import path from 'path';
import { RSSItem } from '../lib/rssClient.js';
import { JSDOM } from 'jsdom';

interface ContentChunk {
  id: string;
  chunkIndex: number;
  content: string;
  wordCount: number;
  charCount: number;
  sourceItem: {
    id: string;
    title: string;
    link: string;
    pubDate: string;
    source: string;
    categories?: string[];
  };
  timestamp: string;
}

interface ChunkResult {
  totalItems: number;
  totalChunks: number;
  chunks: ContentChunk[];
  timestamp: string;
}

const CHUNK_SIZE = 1500; // Target characters per chunk
const CHUNK_OVERLAP = 150; // Overlap between chunks for context preservation

/**
 * Split text into chunks with overlap
 */
function splitTextIntoChunks(text: string, chunkSize: number = CHUNK_SIZE, overlap: number = CHUNK_OVERLAP): string[] {
  if (text.length <= chunkSize) {
    return [text];
  }

  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    let end = start + chunkSize;
    
    // If this isn't the last chunk, try to find a good breaking point
    if (end < text.length) {
      // Look for sentence boundaries within the last 200 characters
      const searchStart = Math.max(start + chunkSize - 200, start);
      const subText = text.substring(searchStart, end);
      const lastSentence = subText.lastIndexOf('. ');
      const lastNewline = subText.lastIndexOf('\n');
      const lastParagraph = subText.lastIndexOf('\n\n');
      
      // Prefer paragraph breaks, then sentence breaks, then newlines
      let breakPoint = -1;
      if (lastParagraph > -1) {
        breakPoint = searchStart + lastParagraph + 2;
      } else if (lastSentence > -1 && lastSentence < subText.length - 50) {
        breakPoint = searchStart + lastSentence + 2;
      } else if (lastNewline > -1 && lastNewline < subText.length - 100) {
        breakPoint = searchStart + lastNewline + 1;
      }
      
      if (breakPoint > start) {
        end = breakPoint;
      }
    }

    const chunk = text.substring(start, end).trim();
    if (chunk.length > 0) {
      chunks.push(chunk);
    }

    // Move start position with overlap
    start = end - overlap;
    if (start <= 0 || start >= text.length) {
      break;
    }
  }

  return chunks;
}

/**
 * Extract and clean text content from RSS item
 */
function extractTextContent(item: RSSItem): string {
  // Use content field if available, fall back to contentSnippet
  let text = item.content || item.contentSnippet || '';
  
  // Basic HTML tag removal (simple approach for now)
  text = text.replace(/<[^>]*>/g, ' ');
  
  // Clean up whitespace
  text = text.replace(/\s+/g, ' ').trim();
  
  // Remove common HTML entities
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, '\'');
  
  return text;
}

/**
 * Fetch full article content from URL
 */
async function fetchArticleContent(url: string): Promise<string> {
  try {
    console.log(`🌐 Fetching: ${url}`);
    
    // Create an AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    const dom = new JSDOM(html);
    const document = dom.window.document;

    // Remove script and style elements
    const scripts = document.querySelectorAll('script, style, nav, header, footer');
    scripts.forEach(element => element.remove());

    // Try to find main content area
    let contentElement = 
      document.querySelector('article') ||
      document.querySelector('[role="main"]') ||
      document.querySelector('main') ||
      document.querySelector('.content') ||
      document.querySelector('.article-content') ||
      document.querySelector('.post-content') ||
      document.querySelector('.entry-content') ||
      document.querySelector('#content') ||
      document.querySelector('.article-body');

    // If no main content found, use body but filter out common non-content elements
    if (!contentElement) {
      contentElement = document.querySelector('body');
      if (contentElement) {
        // Remove common non-content elements
        const nonContentSelectors = [
          '.sidebar', '.navigation', '.nav', '.menu', '.header', '.footer',
          '.advertisement', '.ads', '.social', '.share', '.comments',
          '.related', '.newsletter', '.popup', '.modal',
        ];
        
        nonContentSelectors.forEach(selector => {
          const elements = contentElement!.querySelectorAll(selector);
          elements.forEach(el => el.remove());
        });
      }
    }

    if (!contentElement) {
      throw new Error('Could not find main content area');
    }

    // Extract text content
    let textContent = contentElement.textContent || '';
    
    // Clean up the text
    textContent = textContent
      .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
      .replace(/\n\s*\n/g, '\n\n') // Preserve paragraph breaks
      .trim();

    // Filter out very short content (likely not an article)
    if (textContent.length < 500) {
      throw new Error(`Content too short: ${textContent.length} characters`);
    }

    return textContent;

  } catch (error) {
    console.log(`❌ Failed to fetch ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return '';
  }
}

/**
 * Extract and clean text content from RSS item with optional full article fetch
 */
async function extractFullTextContent(item: RSSItem, fetchFullArticle = true): Promise<string> {
  // Start with RSS content
  let text = extractTextContent(item);
  
  // If we have very little content and a valid URL, try to fetch the full article
  if (fetchFullArticle && text.length < 300 && item.link) {
    const fullContent = await fetchArticleContent(item.link);
    if (fullContent.length > text.length) {
      text = fullContent;
      console.log(`✅ Fetched full article: ${fullContent.length} chars for "${item.title}"`);
    }
  }
  
  return text;
}

/**
 * Generate a unique chunk ID with format: {url}-{chunk number}-of-{total chunks}
 */
function generateChunkId(itemUrl: string, chunkIndex: number, totalChunks: number): string {
  // Clean the URL to make it a valid ID (remove protocol and replace special chars)
  const cleanUrl = itemUrl.replace(/^https?:\/\//, '').replace(/[^a-zA-Z0-9-_.]/g, '-');
  return `${cleanUrl}-${chunkIndex + 1}-of-${totalChunks}`;
}

/**
 * Count words in text
 */
function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
}

/**
 * Process RSS items and chunk their content
 */
export async function chunkContent(inputFilePath?: string, fetchFullArticles = true): Promise<ChunkResult> {
  try {
    console.log('🔄 Starting content chunking process...');

    // Determine input file path
    let filePath = inputFilePath;
    if (!filePath) {
      // Find the most recent raw RSS file
      const rawDataDir = path.join(process.cwd(), 'data', 'raw');
      const files = await fs.readdir(rawDataDir);
      const rssFiles = files.filter(file => file.startsWith('rss-items-') && file.endsWith('.json'));
      
      if (rssFiles.length === 0) {
        throw new Error('No RSS data files found in data/raw/. Run fetcher first.');
      }
      
      // Sort by filename (timestamp) and take the most recent
      rssFiles.sort();
      const latestFile = rssFiles[rssFiles.length - 1];
      if (!latestFile) {
        throw new Error('No RSS data files found in data/raw/. Run fetcher first.');
      }
      filePath = path.join(rawDataDir, latestFile);
    }

    console.log(`📁 Processing file: ${path.basename(filePath!)}`);

    // Read and parse the RSS data
    const rawData = await fs.readFile(filePath!, 'utf-8');
    const rssData = JSON.parse(rawData);
    const items: RSSItem[] = rssData.items || [];

    if (items.length === 0) {
      console.log('⚠️ No items found in the RSS data file');
      return {
        totalItems: 0,
        totalChunks: 0,
        chunks: [],
        timestamp: new Date().toISOString(),
      };
    }

    console.log(`📄 Processing ${items.length} RSS items...`);

    const allChunks: ContentChunk[] = [];
    let totalChunks = 0;

    // Process each RSS item
    for (const item of items) {
      const textContent = await extractFullTextContent(item, fetchFullArticles);
      
      // Skip items with very little content
      if (textContent.length < 100) {
        console.log(`⏭️ Skipping item "${item.title}" (too short: ${textContent.length} chars)`);
        continue;
      }

      // Split content into chunks
      const chunks = splitTextIntoChunks(textContent);
      
      console.log(`📝 "${item.title}" → ${chunks.length} chunks (${textContent.length} chars)`);

      // Create chunk objects
      for (let i = 0; i < chunks.length; i++) {
        const chunkContent = chunks[i];
        if (!chunkContent) { continue; } // Skip undefined chunks

        const chunk: ContentChunk = {
          id: generateChunkId(item.link, i, chunks.length),
          chunkIndex: i,
          content: chunkContent,
          wordCount: countWords(chunkContent),
          charCount: chunkContent.length,
          sourceItem: {
            id: item.id,
            title: item.title,
            link: item.link,
            pubDate: item.pubDate,
            source: item.source,
            ...(item.categories && { categories: item.categories }),
          },
          timestamp: new Date().toISOString(),
        };

        allChunks.push(chunk);
        totalChunks++;
      }
    }

    // Create result object
    const result: ChunkResult = {
      totalItems: items.length,
      totalChunks: totalChunks,
      chunks: allChunks,
      timestamp: new Date().toISOString(),
    };

    // Save chunks to JSON file
    const chunksDir = path.join(process.cwd(), 'data', 'chunks');
    await fs.mkdir(chunksDir, { recursive: true });
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputFilePath = path.join(chunksDir, `chunks-${timestamp}.json`);
    
    await fs.writeFile(outputFilePath, JSON.stringify(result, null, 2), 'utf-8');

    console.log(`✅ Successfully chunked ${items.length} items into ${totalChunks} chunks`);
    console.log(`💾 Saved to: ${path.basename(outputFilePath)}`);
    console.log(`📊 Average chunk size: ${Math.round(allChunks.reduce((sum, chunk) => sum + chunk.charCount, 0) / allChunks.length)} characters`);
    
    return result;

  } catch (error) {
    console.error('❌ Error during content chunking:', error);
    throw error;
  }
}

// Run chunker if this file is executed directly
if (process.argv[1] && (process.argv[1].endsWith('chunker.ts') || process.argv[1].endsWith('chunker.js'))) {
  chunkContent()
    .then((result) => {
      console.log(`✅ Chunking completed successfully: ${result.totalChunks} chunks from ${result.totalItems} items`);
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Chunking failed:', error);
      process.exit(1);
    });
}