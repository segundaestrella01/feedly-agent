/**
 * End-to-End Notion Posting Test
 *
 * Comprehensive test of Notion integration with various formatting options
 */

import 'dotenv/config';
import { NotionClient } from '../lib/notionClient.js';
import type { DigestContent } from '../types/index.js';

// Constants for time calculations
const MILLISECONDS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;
const HOURS_IN_2 = 2;
const HOURS_IN_3 = 3;
const HOURS_IN_4 = 4;
const HOURS_IN_5 = 5;
const HOURS_IN_6 = 6;
const HOURS_IN_8 = 8;

// Constants for digest metadata
const PROCESSING_TIME_MS = 8.5;
const TOTAL_TOKENS = 2500;
const ESTIMATED_COST = 0.0025;
const AVG_SILHOUETTE_SCORE = 0.78;
const DECIMAL_PLACES = 3;

// Constants for rate limiting
const RATE_LIMIT_DELAY_MS = 2000;

/**
 * Create a comprehensive mock digest for testing all features
 */
function createComprehensiveDigest(): DigestContent {
  const now = Date.now();
  const msPerHour = MINUTES_PER_HOUR * SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND;

  return {
    title: '📰 Daily Digest - E2E Test',
    generatedAt: new Date().toISOString(),
    timeWindow: '24h',
    clusters: [
      {
        clusterId: 0,
        topicLabel: 'AI and Machine Learning Advances',
        summary: 'Recent developments in artificial intelligence and machine learning technologies are reshaping the industry. New models and frameworks are being released at an unprecedented pace, with significant improvements in efficiency and capability.',
        keyTakeaways: [
          'Large language models continue to improve in capability and efficiency',
          'Open-source AI frameworks are gaining significant traction in the community',
          'Ethical AI considerations are becoming more prominent in development processes',
          'Multimodal models are bridging the gap between text, image, and audio processing',
        ],
        articleCount: 3,
        representativeArticles: [
          {
            title: 'The Future of AI Development: Trends and Predictions',
            source: 'Tech News Daily',
            url: 'https://example.com/ai-future',
            publishedAt: new Date(now - HOURS_IN_2 * msPerHour).toISOString(),
            excerpt: 'Exploring the latest trends and innovations in artificial intelligence, including breakthrough models and emerging frameworks that are changing how we approach AI development...',
          },
          {
            title: 'Machine Learning Best Practices for Production Systems',
            source: 'ML Weekly',
            url: 'https://example.com/ml-practices',
            publishedAt: new Date(now - HOURS_IN_5 * msPerHour).toISOString(),
            excerpt: 'A comprehensive guide to implementing machine learning in production environments, covering deployment strategies, monitoring, and optimization techniques...',
          },
          {
            title: 'Ethical AI: Building Responsible Systems',
            source: 'AI Ethics Journal',
            url: 'https://example.com/ethical-ai',
            publishedAt: new Date(now - HOURS_IN_8 * msPerHour).toISOString(),
            excerpt: 'Examining the ethical considerations in AI development and deployment, with practical guidelines for building responsible and fair AI systems...',
          },
        ],
        metadata: {
          silhouetteScore: 0.82,
          avgRelevanceScore: 0.89,
        },
      },
      {
        clusterId: 1,
        topicLabel: 'Web Development and Modern Frameworks',
        summary: 'The web development landscape is evolving rapidly with new frameworks and tools. Developers are increasingly focusing on performance optimization, accessibility standards, and enhanced user experience across all devices.',
        keyTakeaways: [
          'Server-side rendering is making a strong comeback with modern frameworks',
          'TypeScript adoption continues to grow across the entire ecosystem',
          'Web performance optimization remains a critical focus for developers',
        ],
        articleCount: 2,
        representativeArticles: [
          {
            title: 'Modern Web Frameworks: A Comprehensive Comparison',
            source: 'Dev Blog',
            url: 'https://example.com/frameworks',
            publishedAt: new Date(now - HOURS_IN_3 * msPerHour).toISOString(),
            excerpt: 'Comparing the latest web frameworks including React, Vue, Svelte, and emerging alternatives, analyzing their trade-offs and use cases...',
          },
          {
            title: 'TypeScript in 2024: New Features and Best Practices',
            source: 'TypeScript Weekly',
            url: 'https://example.com/typescript-2024',
            publishedAt: new Date(now - HOURS_IN_6 * msPerHour).toISOString(),
            excerpt: 'Exploring the latest TypeScript features and community best practices for building type-safe applications at scale...',
          },
        ],
        metadata: {
          silhouetteScore: 0.75,
          avgRelevanceScore: 0.85,
        },
      },
      {
        clusterId: 2,
        topicLabel: 'Cloud Infrastructure and DevOps',
        summary: 'Cloud infrastructure and DevOps practices are evolving to meet the demands of modern applications. Container orchestration, serverless architectures, and infrastructure as code are becoming standard practices.',
        keyTakeaways: [
          'Kubernetes adoption continues to grow for container orchestration',
          'Serverless architectures are becoming more mature and widely adopted',
          'Infrastructure as Code tools are essential for modern DevOps workflows',
          'Observability and monitoring are critical for cloud-native applications',
        ],
        articleCount: 1,
        representativeArticles: [
          {
            title: 'Kubernetes Best Practices for Production',
            source: 'Cloud Native Weekly',
            url: 'https://example.com/k8s-practices',
            publishedAt: new Date(now - HOURS_IN_4 * msPerHour).toISOString(),
            excerpt: 'Essential best practices for running Kubernetes in production, covering security, scalability, and reliability...',
          },
        ],
        metadata: {
          silhouetteScore: 0.77,
          avgRelevanceScore: 0.91,
        },
      },
    ],
    metadata: {
      totalArticles: 6,
      clusterCount: 3,
      avgSilhouetteScore: AVG_SILHOUETTE_SCORE,
      processingTime: PROCESSING_TIME_MS,
      model: 'gpt-4o-mini',
      totalTokens: TOTAL_TOKENS,
      estimatedCost: ESTIMATED_COST,
    },
  };
}

/**
 * Test configuration options
 */
interface TestConfig {
  name: string;
  enableTOC: boolean;
  collapseArticles: boolean;
  icon: string;
}

const testConfigs: TestConfig[] = [
  {
    name: 'Full Featured (TOC + Expanded Articles)',
    enableTOC: true,
    collapseArticles: false,
    icon: '📰',
  },
  {
    name: 'Collapsed Articles (TOC + Collapsed)',
    enableTOC: true,
    collapseArticles: true,
    icon: '📋',
  },
  {
    name: 'No TOC (Expanded Articles)',
    enableTOC: false,
    collapseArticles: false,
    icon: '📄',
  },
  {
    name: 'Minimal (No TOC + Collapsed)',
    enableTOC: false,
    collapseArticles: true,
    icon: '📝',
  },
];

/**
 * Run end-to-end Notion posting tests
 */
async function runE2ETests(): Promise<void> {
  console.log('🧪 End-to-End Notion Posting Test\n');
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
    console.log('   See README.md for Notion setup instructions');
    console.log('\n✅ Test completed (skipped - credentials required)');
    return;
  }

  // Create mock digest
  console.log('\n=== Creating Comprehensive Mock Digest ===\n');
  const digest = createComprehensiveDigest();
  console.log('✅ Mock digest created');
  console.log(`   Title: ${digest.title}`);
  console.log(`   Clusters: ${digest.clusters.length}`);
  console.log(`   Articles: ${digest.metadata.totalArticles}`);
  if (digest.metadata.avgSilhouetteScore !== undefined) {
    console.log(`   Quality Score: ${digest.metadata.avgSilhouetteScore.toFixed(DECIMAL_PLACES)}`);
  }

  // Test each configuration
  const results: Array<{ config: TestConfig; success: boolean; pageId?: string; error?: string }> = [];

  for (let i = 0; i < testConfigs.length; i++) {
    const config = testConfigs[i]!;
    console.log(`\n=== Test ${i + 1}/${testConfigs.length}: ${config.name} ===\n`);

    try {
      const notionClient = new NotionClient();

      // Modify digest title to include test config
      const testDigest = {
        ...digest,
        title: `${digest.title} - ${config.name}`,
      };

      console.log('   Posting with options:');
      console.log(`   - Table of Contents: ${config.enableTOC ? 'Enabled' : 'Disabled'}`);
      console.log(`   - Collapse Articles: ${config.collapseArticles ? 'Yes' : 'No'}`);
      console.log(`   - Icon: ${config.icon}`);

      const pageId = await notionClient.addDigestEntry(testDigest, {
        enableTOC: config.enableTOC,
        collapseArticles: config.collapseArticles,
        icon: config.icon,
      });

      const pageUrl = `https://notion.so/${pageId.replace(/-/g, '')}`;

      console.log('   ✅ Successfully posted!');
      console.log(`   📄 Page URL: ${pageUrl}`);

      results.push({ config, success: true, pageId });

      // Wait a bit between requests to avoid rate limiting
      if (i < testConfigs.length - 1) {
        console.log('   ⏳ Waiting 2 seconds before next test...');
        await new Promise<void>(resolve => {
          globalThis.setTimeout(resolve, RATE_LIMIT_DELAY_MS);
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log(`   ❌ Failed: ${errorMessage}`);
      results.push({ config, success: false, error: errorMessage });

      // If it's a database not found error, stop testing
      if (errorMessage.includes('object_not_found') || errorMessage.includes('Could not find database')) {
        console.log('\n⚠️  Database not found or not shared with integration');
        console.log('   Stopping tests - please set up Notion database first');
        break;
      }
    }
  }

  // Print summary
  console.log('\n==================================================');
  console.log('\n📊 Test Summary\n');

  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;

  console.log(`Total Tests: ${results.length}`);
  console.log(`✅ Passed: ${successCount}`);
  console.log(`❌ Failed: ${failCount}`);

  if (successCount > 0) {
    console.log('\n✅ Successful Tests:');
    results.filter(r => r.success).forEach((r, idx) => {
      const pageUrl = `https://notion.so/${r.pageId!.replace(/-/g, '')}`;
      console.log(`   ${idx + 1}. ${r.config.name}`);
      console.log(`      URL: ${pageUrl}`);
    });
  }

  if (failCount > 0) {
    console.log('\n❌ Failed Tests:');
    results.filter(r => !r.success).forEach((r, idx) => {
      console.log(`   ${idx + 1}. ${r.config.name}`);
      console.log(`      Error: ${r.error}`);
    });
  }

  console.log('\n==================================================');

  if (successCount === testConfigs.length) {
    console.log('\n🎉 All tests passed! Check the Notion pages to verify formatting.');
  } else if (successCount > 0) {
    console.log('\n⚠️  Some tests passed. Check successful pages and fix errors.');
  } else {
    console.log('\n❌ All tests failed. Check Notion setup and credentials.');
  }
}

// Run tests
runE2ETests().catch((error) => {
  console.error('\n❌ Test suite failed:', error);
  process.exit(1);
});

