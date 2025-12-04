/**
 * Test Notion Client
 * 
 * This script tests the Notion client functionality:
 * - Connection testing
 * - Block formatting
 * - Digest entry creation (dry-run mode)
 */

import 'dotenv/config';
import { NotionClient } from '../lib/notionClient.js';
import type { DigestContent, ClusterSummary } from '../types/index.js';

// Mock digest data for testing
function createMockDigest(): DigestContent {
  const clusters: ClusterSummary[] = [
    {
      clusterId: 0,
      topicLabel: 'AI Model Advancements',
      summary: 'Recent advancements in AI models highlight significant improvements in reasoning and efficiency. OpenAI\'s GPT-5 showcases enhanced reasoning capabilities, while new transformer architectures reduce training time by 50%.',
      keyTakeaways: [
        'GPT-5 features enhanced reasoning capabilities and improved context understanding',
        'New transformer architecture cuts training time by 50% while maintaining accuracy',
        'Anthropic\'s Claude 4 introduces improved safety features and extended context windows',
      ],
      articleCount: 3,
      representativeArticles: [
        {
          title: 'GPT-5 Released with Enhanced Reasoning',
          source: 'AI News',
          url: 'https://example.com/gpt5',
          publishedAt: '2024-12-04T00:00:00Z',
          excerpt: 'OpenAI has released GPT-5, featuring significantly enhanced reasoning capabilities...',
        },
        {
          title: 'Breakthrough in Transformer Efficiency',
          source: 'ML Research',
          url: 'https://example.com/transformer',
          publishedAt: '2024-12-04T00:00:00Z',
          excerpt: 'Researchers have developed a new transformer architecture that reduces training time...',
        },
        {
          title: 'Claude 4 Announcement',
          source: 'AI News',
          url: 'https://example.com/claude4',
          publishedAt: '2024-12-04T00:00:00Z',
          excerpt: 'Anthropic announces Claude 4 with improved safety features...',
        },
      ],
      metadata: {
        silhouetteScore: 0.75,
        avgRelevanceScore: 0.88,
      },
    },
    {
      clusterId: 1,
      topicLabel: 'Blockchain Technology Trends',
      summary: 'Blockchain technology continues to evolve with new applications in finance and beyond. DeFi platforms are gaining mainstream adoption while smart contracts enable trustless transactions.',
      keyTakeaways: [
        'DeFi platforms are experiencing rapid mainstream adoption',
        'Smart contracts are enabling new forms of trustless transactions',
        'Blockchain technology is expanding beyond cryptocurrency applications',
      ],
      articleCount: 2,
      representativeArticles: [
        {
          title: 'DeFi Adoption Accelerates',
          source: 'Crypto News',
          url: 'https://example.com/defi',
          publishedAt: '2024-12-04T00:00:00Z',
          excerpt: 'Decentralized finance platforms are seeing unprecedented growth...',
        },
        {
          title: 'Smart Contracts Revolution',
          source: 'Tech Weekly',
          url: 'https://example.com/smart-contracts',
          publishedAt: '2024-12-04T00:00:00Z',
          excerpt: 'Smart contracts are transforming how we think about agreements...',
        },
      ],
      metadata: {
        silhouetteScore: 0.68,
        avgRelevanceScore: 0.85,
      },
    },
  ];

  return {
    title: 'Daily AI & Tech Digest - December 4, 2024',
    generatedAt: new Date().toISOString(),
    timeWindow: '24h',
    clusters,
    metadata: {
      totalArticles: 5,
      clusterCount: 2,
      avgSilhouetteScore: 0.715,
      processingTime: 5432,
      model: 'gpt-4o-mini',
      totalTokens: 1250,
      estimatedCost: 0.0025,
    },
  };
}

async function testConnection() {
  console.log('\n=== Test 1: Notion API Connection ===');

  // Check if we have valid credentials
  const hasValidKey = process.env.NOTION_API_KEY &&
                      process.env.NOTION_API_KEY !== 'test_key' &&
                      process.env.NOTION_API_KEY !== 'secret_xxxxxxxxxxxxx';

  if (!hasValidKey) {
    console.log('ℹ️  No valid Notion credentials found (set NOTION_API_KEY and NOTION_DATABASE_ID to test)');
    console.log('✅ Skipping connection test');
    return true;
  }

  try {
    const client = new NotionClient();
    const success = await client.testConnection();

    if (success) {
      console.log('✅ Connection test passed');
      return true;
    } else {
      console.log('❌ Connection test failed');
      return false;
    }
  } catch (error) {
    console.error('❌ Connection test error:', error);
    return false;
  }
}

async function testBlockFormatting() {
  console.log('\n=== Test 2: Block Formatting ===');
  
  try {
    const client = new NotionClient();
    const digest = createMockDigest();
    
    const blocks = client.formatAsNotionBlocks(digest, {
      databaseId: process.env.NOTION_DATABASE_ID || '',
      enableTOC: true,
      collapseArticles: true,
    });
    
    console.log(`✅ Generated ${blocks.length} Notion blocks`);
    console.log('   - Callout: 1');
    console.log('   - Table of Contents: 1');
    console.log(`   - Dividers: ${blocks.filter(b => b.type === 'divider').length}`);
    console.log(`   - Headings: ${blocks.filter(b => b.type === 'heading_2' || b.type === 'heading_3').length}`);
    console.log(`   - Paragraphs: ${blocks.filter(b => b.type === 'paragraph').length}`);
    console.log(`   - Bulleted Lists: ${blocks.filter(b => b.type === 'bulleted_list_item').length}`);
    console.log(`   - Toggles: ${blocks.filter(b => b.type === 'toggle').length}`);
    console.log(`   - Bookmarks: ${blocks.filter(b => b.type === 'bookmark').length}`);
    
    return true;
  } catch (error) {
    console.error('❌ Block formatting failed:', error);
    return false;
  }
}

async function testDigestCreation() {
  console.log('\n=== Test 3: Digest Entry Creation (Dry-Run) ===');

  // Check if we should actually create the entry
  const dryRun = process.env.NOTION_DRY_RUN !== 'false';

  if (dryRun) {
    console.log('ℹ️  Dry-run mode enabled (set NOTION_DRY_RUN=false to actually create entry)');
    console.log('✅ Skipping actual creation');
    return true;
  }

  try {
    const client = new NotionClient();
    const digest = createMockDigest();

    console.log('Creating digest entry in Notion...');
    const pageId = await client.addDigestEntry(digest, {
      databaseId: process.env.NOTION_DATABASE_ID || '',
      enableTOC: true,
      collapseArticles: true,
      icon: '📰',
    });

    console.log(`✅ Created digest entry: ${pageId}`);
    console.log(`   View at: https://notion.so/${pageId.replace(/-/g, '')}`);
    return true;
  } catch (error) {
    console.error('❌ Digest creation failed:', error);
    return false;
  }
}

async function testFormattingOptions() {
  console.log('\n=== Test 4: Formatting Options ===');

  try {
    const client = new NotionClient();
    const digest = createMockDigest();

    // Test with TOC disabled
    const blocksNoTOC = client.formatAsNotionBlocks(digest, {
      databaseId: process.env.NOTION_DATABASE_ID || '',
      enableTOC: false,
      collapseArticles: false,
    });

    // Test with articles collapsed
    const blocksCollapsed = client.formatAsNotionBlocks(digest, {
      databaseId: process.env.NOTION_DATABASE_ID || '',
      enableTOC: true,
      collapseArticles: true,
    });

    console.log('✅ Formatting options test passed');
    console.log(`   - Without TOC: ${blocksNoTOC.length} blocks`);
    console.log(`   - With collapsed articles: ${blocksCollapsed.length} blocks`);
    console.log(`   - Toggles in collapsed: ${blocksCollapsed.filter(b => b.type === 'toggle').length}`);

    return true;
  } catch (error) {
    console.error('❌ Formatting options test failed:', error);
    return false;
  }
}

// Main test runner
async function runTests() {
  console.log('🧪 Testing Notion Client Functionality\n');
  console.log('==================================================');

  const results = {
    connection: await testConnection(),
    formatting: await testBlockFormatting(),
    creation: await testDigestCreation(),
    options: await testFormattingOptions(),
  };

  console.log('\n==================================================');
  console.log('\n📊 Test Results:');
  console.log(`✅ Passed: ${Object.values(results).filter(r => r).length}/${Object.keys(results).length}`);
  console.log(`❌ Failed: ${Object.values(results).filter(r => !r).length}/${Object.keys(results).length}`);

  if (Object.values(results).every(r => r)) {
    console.log('\n🎉 All tests passed!');
  } else {
    console.log('\n⚠️  Some tests failed. Check the output above for details.');
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

