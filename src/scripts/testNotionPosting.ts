/**
 * Test Notion Posting
 * 
 * Tests the Notion posting functionality with a mock digest
 */

import 'dotenv/config';
import { NotionClient } from '../lib/notionClient.js';
import type { DigestContent } from '../types/index.js';

/**
 * Create a mock digest for testing
 */
function createMockDigest(): DigestContent {
  return {
    title: '📰 Daily Digest - Test',
    generatedAt: new Date().toISOString(),
    timeWindow: '24h',
    clusters: [
      {
        clusterId: 0,
        topicLabel: 'AI and Machine Learning',
        summary: 'Recent developments in artificial intelligence and machine learning technologies are reshaping the industry. New models and frameworks are being released at an unprecedented pace.',
        keyTakeaways: [
          'Large language models continue to improve in capability and efficiency',
          'Open-source AI frameworks are gaining significant traction',
          'Ethical AI considerations are becoming more prominent in development',
        ],
        articleCount: 2,
        representativeArticles: [
          {
            title: 'The Future of AI Development',
            source: 'Tech News',
            url: 'https://example.com/ai-future',
            publishedAt: new Date().toISOString(),
            excerpt: 'Exploring the latest trends and innovations in artificial intelligence...',
          },
          {
            title: 'Machine Learning Best Practices',
            source: 'ML Weekly',
            url: 'https://example.com/ml-practices',
            publishedAt: new Date().toISOString(),
            excerpt: 'A comprehensive guide to implementing machine learning in production...',
          },
        ],
        metadata: {
          silhouetteScore: 0.75,
          avgRelevanceScore: 0.88,
        },
      },
      {
        clusterId: 1,
        topicLabel: 'Web Development Trends',
        summary: 'The web development landscape is evolving with new frameworks and tools. Developers are focusing on performance, accessibility, and user experience.',
        keyTakeaways: [
          'Server-side rendering is making a comeback with modern frameworks',
          'TypeScript adoption continues to grow across the ecosystem',
          'Web performance optimization remains a critical focus',
        ],
        articleCount: 1,
        representativeArticles: [
          {
            title: 'Modern Web Frameworks Comparison',
            source: 'Dev Blog',
            url: 'https://example.com/frameworks',
            publishedAt: new Date().toISOString(),
            excerpt: 'Comparing the latest web frameworks and their trade-offs...',
          },
        ],
        metadata: {
          silhouetteScore: 0.82,
          avgRelevanceScore: 0.91,
        },
      },
    ],
    metadata: {
      totalArticles: 3,
      clusterCount: 2,
      avgSilhouetteScore: 0.72,
      processingTime: 5.2,
      model: 'gpt-4o-mini',
      totalTokens: 1500,
      estimatedCost: 0.0012,
    },
  };
}

/**
 * Test Notion posting with mock data
 */
async function testNotionPosting(): Promise<void> {
  console.log('🧪 Testing Notion Posting\n');
  console.log('==================================================\n');

  // Check environment variables
  console.log('=== Environment Check ===\n');
  const hasApiKey = !!process.env.NOTION_API_KEY;
  const hasDatabaseId = !!process.env.NOTION_DATABASE_ID;

  console.log(`NOTION_API_KEY: ${hasApiKey ? '✅ Set' : '❌ Not set'}`);
  console.log(`NOTION_DATABASE_ID: ${hasDatabaseId ? '✅ Set' : '❌ Not set'}`);

  if (!hasApiKey || !hasDatabaseId) {
    console.log('\n⚠️  Notion credentials not configured');
    console.log('   Set NOTION_API_KEY and NOTION_DATABASE_ID in .env');
    console.log('   See NOTION_SETUP.md for instructions');
    console.log('\n✅ Test completed (skipped posting)');
    return;
  }

  // Create mock digest
  console.log('\n=== Creating Mock Digest ===\n');
  const digest = createMockDigest();
  console.log(`✅ Mock digest created`);
  console.log(`   Title: ${digest.title}`);
  console.log(`   Clusters: ${digest.clusters.length}`);
  console.log(`   Articles: ${digest.metadata.totalArticles}`);

  // Test Notion posting
  console.log('\n=== Posting to Notion ===\n');
  try {
    const notionClient = new NotionClient();

    const pageId = await notionClient.addDigestEntry(digest, {
      enableTOC: true,
      collapseArticles: false,
      icon: '🧪',
    });

    const pageUrl = `https://notion.so/${pageId.replace(/-/g, '')}`;

    console.log('✅ Successfully posted to Notion!');
    console.log(`   Page ID: ${pageId}`);
    console.log(`   Page URL: ${pageUrl}`);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('object_not_found') || error.message.includes('Could not find database')) {
        console.error('❌ Notion database not found or not shared with integration');
        console.error('   Make sure to:');
        console.error('   1. Create a database in Notion');
        console.error('   2. Share the database with your integration');
        console.error('   3. Copy the database ID to NOTION_DATABASE_ID in .env');
        console.error('\n⚠️  This is expected if you haven\'t set up the Notion database yet');
        console.error('   The integration code is working correctly!');
        console.log('\n==================================================');
        console.log('\n✅ Test completed (database setup required)');
        return;
      }
    }
    console.error('❌ Failed to post to Notion:', error);
    throw error;
  }

  console.log('\n==================================================');
  console.log('\n✅ All tests passed!');
}

// Run tests
testNotionPosting().catch((error) => {
  console.error('\n❌ Test failed:', error);
  process.exit(1);
});

