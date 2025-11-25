/**
 * Metadata Utilities
 * 
 * Utilities for transforming, validating, and enriching chunk metadata
 * for vector database operations.
 */

import { URL } from 'url';
import type { 
  ChunkMetadata, 
  RawChunkWithMetadata,
  MetadataValidationResult,
  MetadataValidationRules,
  MetadataEnrichmentOptions,
} from '../types/vector.js';

// Type for vector metadata (avoiding 'any')
export type VectorMetadata = Record<string, string | number | boolean>;

// Default validation rules
export const DEFAULT_VALIDATION_RULES: MetadataValidationRules = {
  required_fields: [
    'source', 'source_url', 'title', 'published_date', 'chunk_index', 
    'total_chunks', 'word_count', 'char_count', 'content_type', 
    'processed_date', 'chunk_id',
  ],
  max_categories: 10,
  max_tags: 20,
  max_topic_keywords: 15,
  valid_content_types: ['article', 'summary', 'excerpt', 'full_text'],
  valid_sentiments: ['positive', 'negative', 'neutral'],
};

/**
 * Transform raw chunk data into rich metadata for vector storage
 */
export function transformRawChunkToMetadata(
  chunk: RawChunkWithMetadata,
  options: Partial<MetadataEnrichmentOptions> = {},
): ChunkMetadata {
  const enrichmentOptions: MetadataEnrichmentOptions = {
    extract_domain: true,
    detect_language: false,
    analyze_sentiment: false,
    extract_keywords: false,
    normalize_categories: true,
    validate_dates: true,
    ...options,
  };

  const metadata: ChunkMetadata = {
    // Source information
    source: chunk.sourceItem.source,
    source_url: chunk.sourceItem.link,
    title: chunk.sourceItem.title,
    published_date: enrichmentOptions.validate_dates 
      ? validateAndFormatDate(chunk.sourceItem.pubDate) 
      : chunk.sourceItem.pubDate,
    
    // Chunk information
    chunk_index: chunk.chunkIndex,
    total_chunks: 1, // Will be updated when we know total chunks for this article
    word_count: chunk.wordCount,
    char_count: chunk.charCount,
    
    // Content classification
    content_type: 'article',
    
    // Processing metadata
    processed_date: chunk.timestamp,
    embedded_date: new Date().toISOString(),
    chunk_id: chunk.id,
  };

  // Add optional properties only if they exist
  if (enrichmentOptions.normalize_categories && chunk.sourceItem.categories) {
    metadata.categories = normalizeCategories(chunk.sourceItem.categories);
  } else if (chunk.sourceItem.categories) {
    metadata.categories = chunk.sourceItem.categories;
  }

  if (chunk.sourceItem.tags) {
    metadata.tags = chunk.sourceItem.tags;
  }

  // Apply enrichment options
  if (enrichmentOptions.extract_domain) {
    metadata.domain = extractDomain(chunk.sourceItem.link);
  }

  return metadata;
}

/**
 * Extract domain from URL
 */
export function extractDomain(url: string): string {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.hostname.toLowerCase().replace(/^www\./, '');
  } catch (error) {
    console.warn(`Failed to extract domain from URL: ${url}`, error);
    return 'unknown';
  }
}

/**
 * Normalize and clean category arrays
 */
export function normalizeCategories(categories?: string[]): string[] {
  if (!categories) {
    return [];
  }
  
  return categories
    .map(cat => cat.trim())
    .filter(cat => cat.length > 0)
    .map(cat => {
      // Remove common prefixes and clean up
      return cat
        .replace(/^(Politics\s*\/\s*|Science\s*\/\s*|Technology\s*\/\s*)/i, '')
        .replace(/\s+/g, ' ')
        .trim();
    })
    .filter((cat, index, arr) => arr.indexOf(cat) === index) // Remove duplicates
    .slice(0, DEFAULT_VALIDATION_RULES.max_categories);
}

/**
 * Validate and format ISO date strings
 */
export function validateAndFormatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      console.warn(`Invalid date: ${dateString}, using current timestamp`);
      return new Date().toISOString();
    }
    return date.toISOString();
  } catch {
    console.warn(`Failed to parse date: ${dateString}`);
    return new Date().toISOString();
  }
}

/**
 * Validate chunk metadata according to rules
 */
export function validateMetadata(
  metadata: ChunkMetadata,
  rules: MetadataValidationRules = DEFAULT_VALIDATION_RULES,
): MetadataValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check required fields
  for (const field of rules.required_fields) {
    if (metadata[field] === undefined || metadata[field] === null) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  // Validate arrays and limits
  if (metadata.categories && metadata.categories.length > rules.max_categories) {
    warnings.push(`Too many categories (${metadata.categories.length}), max is ${rules.max_categories}`);
  }

  if (metadata.tags && metadata.tags.length > rules.max_tags) {
    warnings.push(`Too many tags (${metadata.tags.length}), max is ${rules.max_tags}`);
  }

  if (metadata.topic_keywords && metadata.topic_keywords.length > rules.max_topic_keywords) {
    warnings.push(`Too many topic keywords (${metadata.topic_keywords.length}), max is ${rules.max_topic_keywords}`);
  }

  // Validate content type
  if (!rules.valid_content_types.includes(metadata.content_type)) {
    errors.push(`Invalid content_type: ${metadata.content_type}. Valid values: ${rules.valid_content_types.join(', ')}`);
  }

  // Validate sentiment if present
  if (metadata.sentiment && !rules.valid_sentiments.includes(metadata.sentiment)) {
    errors.push(`Invalid sentiment: ${metadata.sentiment}. Valid values: ${rules.valid_sentiments.join(', ')}`);
  }

  // Validate dates
  try {
    new Date(metadata.published_date);
  } catch {
    errors.push(`Invalid published_date format: ${metadata.published_date}`);
  }

  try {
    new Date(metadata.processed_date);
  } catch {
    errors.push(`Invalid processed_date format: ${metadata.processed_date}`);
  }

  // Validate numeric fields
  if (metadata.word_count < 0) {
    errors.push(`Invalid word_count: ${metadata.word_count}, must be >= 0`);
  }

  if (metadata.char_count < 0) {
    errors.push(`Invalid char_count: ${metadata.char_count}, must be >= 0`);
  }

  if (metadata.chunk_index < 0) {
    errors.push(`Invalid chunk_index: ${metadata.chunk_index}, must be >= 0`);
  }

  if (metadata.total_chunks < 1) {
    errors.push(`Invalid total_chunks: ${metadata.total_chunks}, must be >= 1`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Convert metadata to vector database format (flatten for Chroma)
 */
export function toVectorMetadata(metadata: ChunkMetadata): VectorMetadata {
  return {
    // String fields
    source: metadata.source,
    source_url: metadata.source_url,
    title: metadata.title,
    published_date: metadata.published_date,
    content_type: metadata.content_type,
    processed_date: metadata.processed_date,
    embedded_date: metadata.embedded_date,
    chunk_id: metadata.chunk_id,
    domain: metadata.domain || '',
    language: metadata.language || '',
    sentiment: metadata.sentiment || '',

    // Numeric fields
    chunk_index: metadata.chunk_index,
    total_chunks: metadata.total_chunks,
    word_count: metadata.word_count,
    char_count: metadata.char_count,

    // Array fields (convert to JSON strings for storage)
    categories: JSON.stringify(metadata.categories || []),
    tags: JSON.stringify(metadata.tags || []),
    topic_keywords: JSON.stringify(metadata.topic_keywords || []),
  };
}

/**
 * Convert vector metadata back to typed format
 */
export function fromVectorMetadata(vectorMetadata: VectorMetadata): ChunkMetadata {
  const metadata: ChunkMetadata = {
    source: String(vectorMetadata.source),
    source_url: String(vectorMetadata.source_url),
    title: String(vectorMetadata.title),
    published_date: String(vectorMetadata.published_date),
    chunk_index: Number(vectorMetadata.chunk_index),
    total_chunks: Number(vectorMetadata.total_chunks),
    word_count: Number(vectorMetadata.word_count),
    char_count: Number(vectorMetadata.char_count),
    content_type: String(vectorMetadata.content_type),
    processed_date: String(vectorMetadata.processed_date),
    embedded_date: String(vectorMetadata.embedded_date),
    chunk_id: String(vectorMetadata.chunk_id),
  };

  // Add optional fields only if they exist and are not empty
  if (vectorMetadata.categories && String(vectorMetadata.categories) !== '[]') {
    metadata.categories = JSON.parse(String(vectorMetadata.categories));
  }
  
  if (vectorMetadata.tags && String(vectorMetadata.tags) !== '[]') {
    metadata.tags = JSON.parse(String(vectorMetadata.tags));
  }
  
  if (vectorMetadata.domain && String(vectorMetadata.domain) !== '') {
    metadata.domain = String(vectorMetadata.domain);
  }
  
  if (vectorMetadata.language && String(vectorMetadata.language) !== '') {
    metadata.language = String(vectorMetadata.language);
  }
  
  if (vectorMetadata.sentiment && String(vectorMetadata.sentiment) !== '') {
    const sentimentValue = String(vectorMetadata.sentiment);
    if (sentimentValue === 'positive' || sentimentValue === 'negative' || sentimentValue === 'neutral') {
      metadata.sentiment = sentimentValue;
    }
  }
  
  if (vectorMetadata.topic_keywords && String(vectorMetadata.topic_keywords) !== '[]') {
    metadata.topic_keywords = JSON.parse(String(vectorMetadata.topic_keywords));
  }

  return metadata;
}

/**
 * Generate a comprehensive metadata hash for deduplication
 */
export function generateMetadataHash(metadata: ChunkMetadata): string {
  const hashInput = {
    source_url: metadata.source_url,
    title: metadata.title,
    chunk_index: metadata.chunk_index,
    content_type: metadata.content_type,
  };
  
  return Buffer.from(JSON.stringify(hashInput)).toString('base64');
}

/**
 * Update total chunks count for all chunks of the same article
 */
export function updateTotalChunks(
  metadataArray: ChunkMetadata[],
  articleIdentifier = (metadata: ChunkMetadata) => metadata.source_url,
): ChunkMetadata[] {
  // Group by article
  const articleGroups = new Map<string, ChunkMetadata[]>();
  
  for (const metadata of metadataArray) {
    const articleId = articleIdentifier(metadata);
    if (!articleGroups.has(articleId)) {
      articleGroups.set(articleId, []);
    }
    articleGroups.get(articleId)!.push(metadata);
  }

  // Update total_chunks for each group
  const updatedMetadata: ChunkMetadata[] = [];
  
  for (const [, chunks] of articleGroups) {
    const totalChunks = chunks.length;
    for (const chunk of chunks) {
      updatedMetadata.push({
        ...chunk,
        total_chunks: totalChunks,
      });
    }
  }

  return updatedMetadata;
}

/**
 * Extract common metadata patterns for analytics
 */
export function analyzeMetadataPatterns(metadataArray: ChunkMetadata[]): {
  topSources: Array<{ source: string; count: number }>;
  topDomains: Array<{ domain: string; count: number }>;
  topCategories: Array<{ category: string; count: number }>;
  dateRange: { earliest: string; latest: string };
  avgChunkSize: { words: number; chars: number };
} {
  const sourceCounts = new Map<string, number>();
  const domainCounts = new Map<string, number>();
  const categoryCounts = new Map<string, number>();
  
  let totalWords = 0;
  let totalChars = 0;
  let earliestDate = new Date();
  let latestDate = new Date(0);

  for (const metadata of metadataArray) {
    // Count sources
    sourceCounts.set(metadata.source, (sourceCounts.get(metadata.source) || 0) + 1);
    
    // Count domains
    if (metadata.domain) {
      domainCounts.set(metadata.domain, (domainCounts.get(metadata.domain) || 0) + 1);
    }
    
    // Count categories
    if (metadata.categories) {
      for (const category of metadata.categories) {
        categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1);
      }
    }

    // Track sizes and dates
    totalWords += metadata.word_count;
    totalChars += metadata.char_count;
    
    const pubDate = new Date(metadata.published_date);
    if (pubDate < earliestDate) {
      earliestDate = pubDate;
    }
    if (pubDate > latestDate) {
      latestDate = pubDate;
    }
  }

  const totalChunks = metadataArray.length;

  return {
    topSources: Array.from(sourceCounts.entries())
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count),
    
    topDomains: Array.from(domainCounts.entries())
      .map(([domain, count]) => ({ domain, count }))
      .sort((a, b) => b.count - a.count),
      
    topCategories: Array.from(categoryCounts.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count),
      
    dateRange: {
      earliest: earliestDate.toISOString(),
      latest: latestDate.toISOString(),
    },
    
    avgChunkSize: {
      words: totalChunks > 0 ? Math.round(totalWords / totalChunks) : 0,
      chars: totalChunks > 0 ? Math.round(totalChars / totalChunks) : 0,
    },
  };
}