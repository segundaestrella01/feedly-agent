/**
 * Test Digest Summarization Edge Cases
 * 
 * This script tests edge cases and error handling:
 * - Empty clusters
 * - Single article clusters
 * - Large clusters
 * - Missing metadata
 * - Multiple clusters workflow
 */

import 'dotenv/config';
import { LLMClient } from '../lib/llmClient.js';
import {
  generateTopicLabel,
  formatArticleReferences,
  summarizeCluster,
} from '../workers/digest.js';
import type { Cluster, ChunkMetadata, QueryResult } from '../types/index.js';

// Helper to create mock metadata
function createMockMetadata(
  title: string,
  url: string,
  source: string,
  publishedDate: string,
): ChunkMetadata {
  return {
    title,
    source_url: url,
    source,
    published_date: publishedDate,
    chunk_index: 0,
    total_chunks: 1,
    word_count: 50,
    char_count: 300,
    content_type: 'article',
    processed_date: new Date().toISOString(),
    embedded_date: new Date().toISOString(),
    chunk_id: `chunk_${Date.now()}_${Math.random()}`,
  };
}

// Helper to create mock chunk
function createMockChunk(
  id: string,
  content: string,
  metadata: ChunkMetadata,
  score = 0.9,
): QueryResult {
  return {
    id,
    content,
    metadata,
    distance: 1 - score,
    score,
  };
}

async function testEmptyCluster() {
  console.log('\n=== Test 1: Empty Cluster ===');
  
  const emptyCluster: Cluster = {
    id: 0,
    size: 0,
    centroid: [],
    chunks: [],
    representativeChunk: createMockChunk(
      '0',
      'Empty',
      createMockMetadata('Empty', 'https://example.com', 'Test', new Date().toISOString()),
    ),
  };
  
  const client = new LLMClient();
  
  try {
    const topicLabel = await generateTopicLabel(emptyCluster, client);
    console.log(`✅ Empty cluster handled: "${topicLabel}"`);
    
    const references = formatArticleReferences(emptyCluster);
    console.log(`✅ Empty references: ${references.length} articles`);
    
    return true;
  } catch (error) {
    console.error('❌ Empty cluster test failed:', error);
    return false;
  }
}

async function testSingleArticleCluster() {
  console.log('\n=== Test 2: Single Article Cluster ===');
  
  const singleCluster: Cluster = {
    id: 1,
    size: 1,
    centroid: [],
    chunks: [
      createMockChunk(
        '1',
        'A groundbreaking study reveals new insights into quantum computing efficiency.',
        createMockMetadata(
          'Quantum Computing Breakthrough',
          'https://example.com/quantum',
          'Science Daily',
          '2024-12-04T00:00:00Z',
        ),
      ),
    ],
    representativeChunk: createMockChunk(
      '1',
      'Quantum computing breakthrough',
      createMockMetadata(
        'Quantum Computing Breakthrough',
        'https://example.com/quantum',
        'Science Daily',
        '2024-12-04T00:00:00Z',
      ),
    ),
  };
  
  const client = new LLMClient();
  
  try {
    const topicLabel = await generateTopicLabel(singleCluster, client);
    console.log(`✅ Single article topic: "${topicLabel}"`);
    
    const summary = await summarizeCluster(singleCluster, topicLabel, client, {
      maxArticles: 5,
      includeKeyTakeaways: true,
    });
    
    console.log(`   Summary: ${summary.summary}`);
    console.log(`   Takeaways: ${summary.keyTakeaways.length}`);
    console.log(`   Articles: ${summary.articleCount}`);
    
    return true;
  } catch (error) {
    console.error('❌ Single article cluster test failed:', error);
    return false;
  }
}

async function testMissingMetadata() {
  console.log('\n=== Test 3: Missing Metadata ===');

  const partialMetadata = createMockMetadata('Partial', 'https://example.com', 'Test', '2024-12-04');
  delete (partialMetadata as Partial<ChunkMetadata>).title;

  const clusterWithMissingData: Cluster = {
    id: 2,
    size: 2,
    centroid: [],
    chunks: [
      createMockChunk(
        '1',
        'Article content without metadata',
        createMockMetadata('', '', '', ''),
      ),
      createMockChunk(
        '2',
        'Article with partial metadata',
        partialMetadata,
      ),
    ],
    representativeChunk: createMockChunk(
      '1',
      'Representative',
      createMockMetadata('Rep', 'https://example.com', 'Test', '2024-12-04'),
    ),
  };

  try {
    const references = formatArticleReferences(clusterWithMissingData);
    console.log(`✅ Handled missing metadata: ${references.length} references`);
    references.forEach((ref, i) => {
      console.log(`   ${i + 1}. Title: "${ref.title}", Source: "${ref.source}"`);
    });

    return true;
  } catch (error) {
    console.error('❌ Missing metadata test failed:', error);
    return false;
  }
}

async function testLargeCluster() {
  console.log('\n=== Test 4: Large Cluster (15 articles) ===');

  const topics = [
    'Machine Learning Advances',
    'Neural Network Optimization',
    'Deep Learning Applications',
    'AI Ethics and Governance',
    'Computer Vision Breakthroughs',
  ];

  const ARTICLE_COUNT = 15;
  const MAX_ARTICLES_TO_SHOW = 5;
  const BASE_SCORE = 0.85;
  const SCORE_VARIANCE = 0.1;
  const SOURCE_MODULO = 2;
  const DATE_MODULO = 4;

  const chunks: QueryResult[] = [];
  for (let i = 0; i < ARTICLE_COUNT; i++) {
    const topicIndex = i % topics.length;
    const topic = topics[topicIndex];
    if (!topic) {continue;}

    const sourceIndex = i % SOURCE_MODULO;
    const dateIndex = (i % DATE_MODULO) + 1;

    chunks.push(
      createMockChunk(
        `${i}`,
        `Article ${i + 1} discusses ${topic.toLowerCase()} and its implications for the future of AI technology.`,
        createMockMetadata(
          `${topic} - Article ${i + 1}`,
          `https://example.com/article${i}`,
          sourceIndex === 0 ? 'AI Weekly' : 'Tech Review',
          `2024-12-0${dateIndex}T00:00:00Z`,
        ),
        BASE_SCORE + Math.random() * SCORE_VARIANCE,
      ),
    );
  }

  if (chunks.length === 0 || !chunks[0]) {
    console.error('❌ Failed to create chunks');
    return false;
  }

  const largeCluster: Cluster = {
    id: 3,
    size: chunks.length,
    centroid: [],
    chunks,
    representativeChunk: chunks[0],
  };

  const client = new LLMClient();

  try {
    const topicLabel = await generateTopicLabel(largeCluster, client);
    console.log(`✅ Large cluster topic: "${topicLabel}"`);

    // Test with limited articles
    const summary = await summarizeCluster(largeCluster, topicLabel, client, {
      maxArticles: MAX_ARTICLES_TO_SHOW,
      includeKeyTakeaways: true,
    });

    console.log(`   Summary length: ${summary.summary.length} chars`);
    console.log(`   Takeaways: ${summary.keyTakeaways.length}`);
    console.log(`   Total articles: ${summary.articleCount}`);
    console.log(`   Representative articles: ${summary.representativeArticles.length} (max ${MAX_ARTICLES_TO_SHOW})`);

    return summary.representativeArticles.length <= MAX_ARTICLES_TO_SHOW;
  } catch (error) {
    console.error('❌ Large cluster test failed:', error);
    return false;
  }
}

async function testMultipleClusters() {
  console.log('\n=== Test 5: Multiple Clusters Workflow ===');

  const MIN_SILHOUETTE = 0.65;
  const SILHOUETTE_VARIANCE = 0.2;
  const DECIMAL_PLACES = 2;

  const clusters: Cluster[] = [
    {
      id: 0,
      size: 3,
      centroid: [],
      chunks: [
        createMockChunk(
          '1',
          'Blockchain technology is revolutionizing financial transactions.',
          createMockMetadata('Blockchain Revolution', 'https://example.com/1', 'Crypto News', '2024-12-04'),
        ),
        createMockChunk(
          '2',
          'DeFi platforms are gaining mainstream adoption.',
          createMockMetadata('DeFi Adoption', 'https://example.com/2', 'Finance Today', '2024-12-04'),
        ),
        createMockChunk(
          '3',
          'Smart contracts enable trustless transactions.',
          createMockMetadata('Smart Contracts', 'https://example.com/3', 'Tech Weekly', '2024-12-04'),
        ),
      ],
      representativeChunk: createMockChunk(
        '1',
        'Blockchain revolution',
        createMockMetadata('Blockchain', 'https://example.com/1', 'Crypto News', '2024-12-04'),
      ),
    },
    {
      id: 1,
      size: 2,
      centroid: [],
      chunks: [
        createMockChunk(
          '4',
          'Climate change mitigation requires immediate action.',
          createMockMetadata('Climate Action', 'https://example.com/4', 'Environment News', '2024-12-04'),
        ),
        createMockChunk(
          '5',
          'Renewable energy adoption is accelerating globally.',
          createMockMetadata('Renewable Energy', 'https://example.com/5', 'Green Tech', '2024-12-04'),
        ),
      ],
      representativeChunk: createMockChunk(
        '4',
        'Climate action',
        createMockMetadata('Climate', 'https://example.com/4', 'Environment News', '2024-12-04'),
      ),
    },
  ];

  const client = new LLMClient();

  try {
    const summaries = [];

    for (const cluster of clusters) {
      const topicLabel = await generateTopicLabel(cluster, client);
      const summary = await summarizeCluster(cluster, topicLabel, client, {
        maxArticles: 10,
        includeKeyTakeaways: true,
        silhouetteScore: MIN_SILHOUETTE + Math.random() * SILHOUETTE_VARIANCE,
      });
      summaries.push(summary);
    }

    console.log(`✅ Processed ${summaries.length} clusters successfully`);
    summaries.forEach((summary, i) => {
      console.log(`   Cluster ${i}: "${summary.topicLabel}" (${summary.articleCount} articles)`);
      console.log(`      Silhouette: ${summary.metadata.silhouetteScore?.toFixed(DECIMAL_PLACES)}`);
      console.log(`      Relevance: ${summary.metadata.avgRelevanceScore?.toFixed(DECIMAL_PLACES)}`);
    });

    return summaries.length === clusters.length;
  } catch (error) {
    console.error('❌ Multiple clusters test failed:', error);
    return false;
  }
}

async function main() {
  const SEPARATOR_LENGTH = 60;
  console.log('🧪 Testing Digest Summarization Edge Cases\n');
  console.log('='.repeat(SEPARATOR_LENGTH));

  const results: boolean[] = [];

  // Run tests sequentially to avoid rate limiting
  results.push(await testEmptyCluster());
  results.push(await testSingleArticleCluster());
  results.push(await testMissingMetadata());
  results.push(await testLargeCluster());
  results.push(await testMultipleClusters());

  console.log('\n' + '='.repeat(SEPARATOR_LENGTH));
  console.log('\n📊 Test Results:');
  console.log(`✅ Passed: ${results.filter(r => r).length}/${results.length}`);
  console.log(`❌ Failed: ${results.filter(r => !r).length}/${results.length}`);

  if (results.every(r => r)) {
    console.log('\n🎉 All edge case tests passed!');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

