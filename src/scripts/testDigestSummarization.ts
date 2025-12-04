/**
 * Test Digest Summarization
 * 
 * This script tests the cluster summarization functions:
 * - generateTopicLabel()
 * - extractKeyTakeaways()
 * - formatArticleReferences()
 * - summarizeCluster()
 */

import 'dotenv/config';
import { LLMClient } from '../lib/llmClient.js';
import {
  generateTopicLabel,
  extractKeyTakeaways,
  formatArticleReferences,
  summarizeCluster,
} from '../workers/digestGenerator.js';
import type { Cluster, ChunkMetadata } from '../types/index.js';

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

// Mock cluster data
const mockCluster: Cluster = {
  id: 0,
  size: 3,
  centroid: [],
  chunks: [
    {
      id: '1',
      content: 'OpenAI has released GPT-5, featuring significantly enhanced reasoning capabilities and improved context understanding. The model demonstrates better performance on complex tasks and can handle longer conversations with greater coherence.',
      metadata: createMockMetadata(
        'GPT-5 Released with Enhanced Reasoning',
        'https://example.com/gpt5',
        'AI News',
        '2024-12-01T00:00:00Z',
      ),
      distance: 0.1,
      score: 0.9,
    },
    {
      id: '2',
      content: 'Researchers have developed a new transformer architecture that reduces training time by 50% while maintaining accuracy. This breakthrough could make large language model training more accessible and cost-effective.',
      metadata: createMockMetadata(
        'Breakthrough in Transformer Efficiency',
        'https://example.com/transformer',
        'ML Research',
        '2024-12-01T00:00:00Z',
      ),
      distance: 0.15,
      score: 0.85,
    },
    {
      id: '3',
      content: 'Anthropic announces Claude 4 with improved safety features and extended context windows up to 200K tokens. The new model includes enhanced guardrails and better alignment with human values.',
      metadata: createMockMetadata(
        'Claude 4 Announcement',
        'https://example.com/claude4',
        'AI News',
        '2024-12-02T00:00:00Z',
      ),
      distance: 0.12,
      score: 0.88,
    },
  ],
  representativeChunk: {
    id: '1',
    content: 'OpenAI releases GPT-5 with enhanced reasoning capabilities.',
    metadata: createMockMetadata(
      'GPT-5 Released',
      'https://example.com/gpt5',
      'AI News',
      '2024-12-01T00:00:00Z',
    ),
    distance: 0.1,
    score: 0.9,
  },
};

async function testTopicLabelGeneration() {
  console.log('\n=== Test 1: Topic Label Generation ===');
  
  const client = new LLMClient();
  
  try {
    const topicLabel = await generateTopicLabel(mockCluster, client);
    
    console.log('✅ Topic label generated successfully');
    console.log(`   Topic: "${topicLabel}"`);
    console.log(`   Length: ${topicLabel.split(' ').length} words`);
    
    return true;
  } catch (error) {
    console.error('❌ Topic label generation failed:', error);
    return false;
  }
}

async function testKeyTakeawaysExtraction() {
  console.log('\n=== Test 2: Key Takeaways Extraction ===');
  
  const client = new LLMClient();
  
  try {
    const takeaways = await extractKeyTakeaways(mockCluster, client);
    
    console.log('✅ Key takeaways extracted successfully');
    console.log(`   Count: ${takeaways.length} takeaways`);
    takeaways.forEach((takeaway, i) => {
      console.log(`   ${i + 1}. ${takeaway}`);
    });
    
    return true;
  } catch (error) {
    console.error('❌ Key takeaways extraction failed:', error);
    return false;
  }
}

async function testArticleReferenceFormatting() {
  console.log('\n=== Test 3: Article Reference Formatting ===');

  try {
    const references = formatArticleReferences(mockCluster, 5);

    console.log('✅ Article references formatted successfully');
    console.log(`   Count: ${references.length} articles`);
    references.forEach((ref, i) => {
      console.log(`   ${i + 1}. ${ref.title}`);
      console.log(`      Source: ${ref.source}`);
      console.log(`      URL: ${ref.url}`);
      console.log(`      Excerpt: ${ref.excerpt.substring(0, 80)}...`);
    });

    return true;
  } catch (error) {
    console.error('❌ Article reference formatting failed:', error);
    return false;
  }
}

async function testClusterSummarization() {
  console.log('\n=== Test 4: Complete Cluster Summarization ===');

  const client = new LLMClient();

  try {
    // First generate topic label
    const topicLabel = await generateTopicLabel(mockCluster, client);
    console.log(`   Topic Label: "${topicLabel}"`);

    // Then summarize the cluster
    const summary = await summarizeCluster(
      mockCluster,
      topicLabel,
      client,
      {
        maxArticles: 5,
        includeKeyTakeaways: true,
        silhouetteScore: 0.75,
      },
    );

    console.log('✅ Cluster summarization completed successfully');
    console.log(`   Cluster ID: ${summary.clusterId}`);
    console.log(`   Topic: ${summary.topicLabel}`);
    console.log(`   Summary: ${summary.summary}`);
    console.log(`   Key Takeaways (${summary.keyTakeaways.length}):`);
    summary.keyTakeaways.forEach((takeaway, i) => {
      console.log(`      ${i + 1}. ${takeaway}`);
    });
    console.log(`   Articles: ${summary.articleCount}`);
    console.log(`   Representative Articles: ${summary.representativeArticles.length}`);
    console.log(`   Silhouette Score: ${summary.metadata.silhouetteScore}`);
    console.log(`   Avg Relevance Score: ${summary.metadata.avgRelevanceScore?.toFixed(2)}`);

    return true;
  } catch (error) {
    console.error('❌ Cluster summarization failed:', error);
    return false;
  }
}

async function testSummarizationWithoutTakeaways() {
  console.log('\n=== Test 5: Summarization Without Key Takeaways ===');

  const client = new LLMClient();

  try {
    const topicLabel = await generateTopicLabel(mockCluster, client);

    const summary = await summarizeCluster(
      mockCluster,
      topicLabel,
      client,
      {
        maxArticles: 3,
        includeKeyTakeaways: false,
      },
    );

    console.log('✅ Summarization without takeaways completed');
    console.log(`   Topic: ${summary.topicLabel}`);
    console.log(`   Summary: ${summary.summary}`);
    console.log(`   Key Takeaways: ${summary.keyTakeaways.length} (should be 0)`);
    console.log(`   Representative Articles: ${summary.representativeArticles.length}`);

    return summary.keyTakeaways.length === 0;
  } catch (error) {
    console.error('❌ Summarization without takeaways failed:', error);
    return false;
  }
}

async function main() {
  const SEPARATOR_LENGTH = 60;
  console.log('🧪 Testing Digest Summarization Functions\n');
  console.log('='.repeat(SEPARATOR_LENGTH));

  const results = await Promise.all([
    testTopicLabelGeneration(),
    testKeyTakeawaysExtraction(),
    testArticleReferenceFormatting(),
  ]);

  // Run sequential tests that depend on each other
  const clusterSummaryResult = await testClusterSummarization();
  results.push(clusterSummaryResult);

  const noTakeawaysResult = await testSummarizationWithoutTakeaways();
  results.push(noTakeawaysResult);

  console.log('\n' + '='.repeat(SEPARATOR_LENGTH));
  console.log('\n📊 Test Results:');
  console.log(`✅ Passed: ${results.filter(r => r).length}/${results.length}`);
  console.log(`❌ Failed: ${results.filter(r => !r).length}/${results.length}`);

  if (results.every(r => r)) {
    console.log('\n🎉 All digest summarization tests passed!');
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

