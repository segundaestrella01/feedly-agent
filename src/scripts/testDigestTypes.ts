/**
 * Test Digest Types
 * 
 * This script verifies that the digest types are properly defined
 * and can be used to create valid digest structures.
 */

import type {
  ArticleReference,
  ClusterSummary,
  DigestContent,
  DigestMetadata,
  DigestOptions,
  DigestGenerationResult,
  NotionDigestOptions,
} from '../types/index.js';

function testArticleReference() {
  console.log('\n=== Testing ArticleReference ===');
  
  const article: ArticleReference = {
    title: 'GPT-5 Released with Enhanced Reasoning',
    source: 'AI News',
    url: 'https://example.com/gpt5',
    publishedAt: '2024-12-01T00:00:00Z',
    excerpt: 'OpenAI releases GPT-5 with enhanced reasoning capabilities.',
  };
  
  console.log('✅ ArticleReference type is valid');
  console.log('   Title:', article.title);
  console.log('   Source:', article.source);
  return true;
}

function testClusterSummary() {
  console.log('\n=== Testing ClusterSummary ===');
  
  const cluster: ClusterSummary = {
    clusterId: 0,
    topicLabel: 'AI Model Advancements',
    summary: 'Recent advancements in AI models highlight improvements in reasoning and efficiency.',
    keyTakeaways: [
      'GPT-5 introduces enhanced reasoning capabilities',
      'New transformer architecture reduces training time by 50%',
      'Claude 4 focuses on improved safety features',
    ],
    articleCount: 3,
    representativeArticles: [
      {
        title: 'GPT-5 Released',
        source: 'AI News',
        url: 'https://example.com/gpt5',
        publishedAt: '2024-12-01T00:00:00Z',
        excerpt: 'OpenAI releases GPT-5.',
      },
    ],
    metadata: {
      silhouetteScore: 0.75,
      avgRelevanceScore: 0.88,
    },
  };
  
  console.log('✅ ClusterSummary type is valid');
  console.log('   Topic:', cluster.topicLabel);
  console.log('   Articles:', cluster.articleCount);
  console.log('   Takeaways:', cluster.keyTakeaways.length);
  return true;
}

function testDigestContent() {
  console.log('\n=== Testing DigestContent ===');
  
  const metadata: DigestMetadata = {
    totalArticles: 5,
    clusterCount: 2,
    avgSilhouetteScore: 0.72,
    processingTime: 5432,
    model: 'gpt-4o-mini',
    totalTokens: 546,
    estimatedCost: 0.0082,
  };
  
  const digest: DigestContent = {
    title: 'Daily AI Digest - December 4, 2024',
    generatedAt: new Date().toISOString(),
    timeWindow: '24h',
    clusters: [
      {
        clusterId: 0,
        topicLabel: 'AI Model Advancements',
        summary: 'Recent advancements in AI models.',
        keyTakeaways: ['GPT-5 released', 'Transformer efficiency improved'],
        articleCount: 3,
        representativeArticles: [],
        metadata: {
          silhouetteScore: 0.75,
        },
      },
    ],
    metadata,
  };
  
  console.log('✅ DigestContent type is valid');
  console.log('   Title:', digest.title);
  console.log('   Clusters:', digest.clusters.length);
  console.log('   Total Articles:', digest.metadata.totalArticles);
  console.log('   Processing Time:', digest.metadata.processingTime, 'ms');
  return true;
}

function testDigestOptions() {
  console.log('\n=== Testing DigestOptions ===');
  
  const options: DigestOptions = {
    timeWindow: '24h',
    clusterCount: 5,
    maxArticlesPerCluster: 10,
    includeKeyTakeaways: true,
    includeExcerpts: true,
    customTitle: 'My Custom Digest',
    model: 'gpt-4o-mini',
    temperature: 0.7,
  };
  
  console.log('✅ DigestOptions type is valid');
  console.log('   Time Window:', options.timeWindow);
  console.log('   Cluster Count:', options.clusterCount);
  return true;
}

function testDigestGenerationResult() {
  console.log('\n=== Testing DigestGenerationResult ===');
  
  const result: DigestGenerationResult = {
    digest: {
      title: 'Test Digest',
      generatedAt: new Date().toISOString(),
      timeWindow: '24h',
      clusters: [],
      metadata: {
        totalArticles: 0,
        clusterCount: 0,
        processingTime: 0,
        model: 'gpt-4o-mini',
      },
    },
    success: true,
    stats: {
      articlesRetrieved: 10,
      articlesClustered: 10,
      llmCalls: 4,
      totalTokens: 546,
      processingTime: 5432,
    },
  };
  
  console.log('✅ DigestGenerationResult type is valid');
  console.log('   Success:', result.success);
  console.log('   LLM Calls:', result.stats.llmCalls);
  console.log('   Total Tokens:', result.stats.totalTokens);
  return true;
}

function testNotionDigestOptions() {
  console.log('\n=== Testing NotionDigestOptions ===');
  
  const notionOptions: NotionDigestOptions = {
    databaseId: 'abc123',
    enableTOC: true,
    collapseArticles: true,
    icon: '📰',
    coverUrl: 'https://example.com/cover.jpg',
  };
  
  console.log('✅ NotionDigestOptions type is valid');
  console.log('   Database ID:', notionOptions.databaseId);
  console.log('   Enable TOC:', notionOptions.enableTOC);
  console.log('   Icon:', notionOptions.icon);
  return true;
}

function main() {
  console.log('🧪 Testing Digest Types\n');
  console.log('='.repeat(60));
  
  const results = [
    testArticleReference(),
    testClusterSummary(),
    testDigestContent(),
    testDigestOptions(),
    testDigestGenerationResult(),
    testNotionDigestOptions(),
  ];
  
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 Test Results:');
  console.log(`✅ Passed: ${results.filter(r => r).length}/${results.length}`);
  console.log(`❌ Failed: ${results.filter(r => !r).length}/${results.length}`);
  
  if (results.every(r => r)) {
    console.log('\n🎉 All digest types are properly defined!');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some type tests failed');
    process.exit(1);
  }
}

main();

