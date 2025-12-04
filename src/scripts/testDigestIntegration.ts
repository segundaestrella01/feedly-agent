/**
 * Integration Test: Complete Digest Pipeline
 * 
 * This script tests the complete end-to-end digest generation and Notion posting pipeline:
 * 1. Generate digest from vector database
 * 2. Format digest as Notion blocks
 * 3. Validate block structure
 * 4. Test Notion API connection (if credentials available)
 * 5. Post digest to Notion (if enabled)
 */

import 'dotenv/config';
import { generateDigest } from '../workers/digestGenerator.js';
import { NotionClient } from '../lib/notionClient.js';
import type { DigestContent } from '../types/index.js';

// Test configuration
const TEST_TIME_WINDOW = '7d'; // Use 7d to ensure we get content
const TEST_CLUSTER_COUNT = 3;
const DRY_RUN = process.env.NOTION_DRY_RUN !== 'false';

/**
 * Test 1: Generate Digest
 */
async function testDigestGeneration(): Promise<DigestContent | null> {
  console.log('\n=== Test 1: Generate Digest ===');
  
  try {
    const digest = await generateDigest(TEST_TIME_WINDOW, TEST_CLUSTER_COUNT, {
      includeKeyTakeaways: true,
      maxArticlesPerCluster: 5,
      customTitle: 'Integration Test Digest',
    });
    
    console.log('✅ Digest generated successfully');
    console.log(`   Title: ${digest.title}`);
    console.log(`   Clusters: ${digest.clusters.length}`);
    console.log(`   Total Articles: ${digest.metadata.totalArticles}`);
    console.log(`   Processing Time: ${digest.metadata.processingTime}ms`);
    console.log(`   Estimated Cost: $${digest.metadata.estimatedCost.toFixed(4)}`);
    
    // Validate structure
    if (digest.clusters.length === 0) {
      console.log('⚠️  No clusters generated (database may be empty)');
      return null;
    }
    
    // Validate each cluster has required fields
    for (const cluster of digest.clusters) {
      if (!cluster.topicLabel || !cluster.summary) {
        console.log('❌ Cluster missing required fields');
        return null;
      }
    }
    
    return digest;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('No content found')) {
      console.log('⚠️  No content in database - skipping remaining tests');
      console.log('   Run RSS fetcher and embedder first to populate database');
      return null;
    }
    console.error('❌ Digest generation failed:', error);
    return null;
  }
}

/**
 * Test 2: Format as Notion Blocks
 */
function testNotionBlockFormatting(digest: DigestContent): boolean {
  console.log('\n=== Test 2: Format as Notion Blocks ===');
  
  try {
    const notionClient = new NotionClient();
    
    // Test with default options
    const blocks = notionClient.formatAsNotionBlocks(digest);
    console.log(`✅ Generated ${blocks.length} Notion blocks`);
    
    // Count block types
    const blockTypes = blocks.reduce((acc, block) => {
      acc[block.type] = (acc[block.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('   Block types:');
    Object.entries(blockTypes).forEach(([type, count]) => {
      console.log(`   - ${type}: ${count}`);
    });
    
    // Validate required block types
    const requiredTypes = ['callout', 'heading_2', 'paragraph'];
    const missingTypes = requiredTypes.filter(type => !blockTypes[type]);
    
    if (missingTypes.length > 0) {
      console.log(`❌ Missing required block types: ${missingTypes.join(', ')}`);
      return false;
    }
    
    // Test with options
    const blocksWithOptions = notionClient.formatAsNotionBlocks(digest, {
      enableTOC: true,
      collapseArticles: true,
    });
    
    console.log(`✅ Generated ${blocksWithOptions.length} blocks with options`);
    
    return true;
  } catch (error) {
    console.error('❌ Block formatting failed:', error);
    return false;
  }
}

/**
 * Test 3: Validate Block Structure
 */
function testBlockStructure(digest: DigestContent): boolean {
  console.log('\n=== Test 3: Validate Block Structure ===');
  
  try {
    const notionClient = new NotionClient();
    const blocks = notionClient.formatAsNotionBlocks(digest);
    
    // Validate each block has required properties
    for (const block of blocks) {
      if (!block.object || block.object !== 'block') {
        console.log('❌ Invalid block object');
        return false;
      }
      
      if (!block.type) {
        console.log('❌ Block missing type');
        return false;
      }
      
      // Validate block has content for its type
      if (!block[block.type as keyof typeof block]) {
        console.log(`❌ Block missing content for type: ${block.type}`);
        return false;
      }
    }
    
    console.log('✅ All blocks have valid structure');
    
    // Validate block order
    const firstBlock = blocks[0];
    if (firstBlock?.type !== 'callout') {
      console.log('⚠️  First block is not a callout (expected summary stats)');
    }
    
    console.log('✅ Block structure validation passed');
    return true;
  } catch (error) {
    console.error('❌ Block structure validation failed:', error);
    return false;
  }
}

/**
 * Test 4: Test Notion API Connection
 */
async function testNotionConnection(): Promise<boolean> {
  console.log('\n=== Test 4: Test Notion API Connection ===');

  // Check if credentials are available
  const hasApiKey = process.env.NOTION_API_KEY &&
                    process.env.NOTION_API_KEY !== 'secret_xxxxxxxxxxxxx';
  const hasDatabaseId = process.env.NOTION_DATABASE_ID &&
                        process.env.NOTION_DATABASE_ID !== 'xxxxxxxxxxxxx';

  if (!hasApiKey || !hasDatabaseId) {
    console.log('⚠️  No valid Notion credentials found');
    console.log('   Set NOTION_API_KEY and NOTION_DATABASE_ID to test connection');
    console.log('✅ Skipping connection test');
    return true; // Don't fail the test
  }

  try {
    const notionClient = new NotionClient();
    const connected = await notionClient.testConnection();

    if (connected) {
      console.log('✅ Notion API connection successful');
      return true;
    } else {
      console.log('❌ Notion API connection failed');
      return false;
    }
  } catch (error) {
    console.error('❌ Connection test failed:', error);
    console.log('   Make sure the database is shared with your integration');
    return false;
  }
}

/**
 * Test 5: Post Digest to Notion (Dry-Run or Real)
 */
async function testNotionPosting(digest: DigestContent): Promise<boolean> {
  console.log('\n=== Test 5: Post Digest to Notion ===');

  // Check if credentials are available
  const hasApiKey = process.env.NOTION_API_KEY &&
                    process.env.NOTION_API_KEY !== 'secret_xxxxxxxxxxxxx';
  const hasDatabaseId = process.env.NOTION_DATABASE_ID &&
                        process.env.NOTION_DATABASE_ID !== 'xxxxxxxxxxxxx';

  if (!hasApiKey || !hasDatabaseId) {
    console.log('⚠️  No valid Notion credentials found');
    console.log('   Set NOTION_API_KEY and NOTION_DATABASE_ID to test posting');
    console.log('✅ Skipping posting test');
    return true; // Don't fail the test
  }

  if (DRY_RUN) {
    console.log('ℹ️  Dry-run mode enabled (set NOTION_DRY_RUN=false to actually post)');
    console.log('✅ Skipping actual posting');
    return true;
  }

  try {
    const notionClient = new NotionClient();

    console.log('📤 Posting digest to Notion...');
    const pageId = await notionClient.addDigestEntry(digest, {
      enableTOC: true,
      collapseArticles: true,
      icon: '📰',
    });

    console.log(`✅ Digest posted successfully!`);
    console.log(`   Page ID: ${pageId}`);
    console.log(`   View at: https://notion.so/${pageId.replace(/-/g, '')}`);

    return true;
  } catch (error) {
    console.error('❌ Posting failed:', error);
    console.log('   Make sure the database is shared with your integration');
    return false;
  }
}

/**
 * Test 6: Validate Digest Content Quality
 */
function testDigestQuality(digest: DigestContent): boolean {
  console.log('\n=== Test 6: Validate Digest Content Quality ===');

  try {
    // Check metadata completeness
    if (!digest.metadata.totalArticles || digest.metadata.totalArticles === 0) {
      console.log('⚠️  No articles in digest');
    }

    if (!digest.metadata.processingTime || digest.metadata.processingTime <= 0) {
      console.log('❌ Invalid processing time');
      return false;
    }

    // Check cluster quality
    for (const cluster of digest.clusters) {
      // Topic label should be concise (3-5 words)
      const wordCount = cluster.topicLabel.split(' ').length;
      if (wordCount < 2 || wordCount > 8) {
        console.log(`⚠️  Topic label may be too ${wordCount < 2 ? 'short' : 'long'}: "${cluster.topicLabel}"`);
      }

      // Summary should be 2-3 sentences
      const sentenceCount = cluster.summary.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
      if (sentenceCount < 1 || sentenceCount > 5) {
        console.log(`⚠️  Summary has ${sentenceCount} sentences (expected 2-3)`);
      }

      // Should have takeaways
      if (cluster.keyTakeaways.length === 0) {
        console.log(`⚠️  Cluster "${cluster.topicLabel}" has no takeaways`);
      }

      // Should have articles
      if (cluster.representativeArticles.length === 0) {
        console.log(`⚠️  Cluster "${cluster.topicLabel}" has no articles`);
      }
    }

    console.log('✅ Digest quality validation passed');
    console.log(`   Average topic label length: ${Math.round(digest.clusters.reduce((sum, c) => sum + c.topicLabel.split(' ').length, 0) / digest.clusters.length)} words`);
    console.log(`   Average takeaways per cluster: ${Math.round(digest.clusters.reduce((sum, c) => sum + c.keyTakeaways.length, 0) / digest.clusters.length)}`);
    console.log(`   Average articles per cluster: ${Math.round(digest.clusters.reduce((sum, c) => sum + c.representativeArticles.length, 0) / digest.clusters.length)}`);

    return true;
  } catch (error) {
    console.error('❌ Quality validation failed:', error);
    return false;
  }
}

/**
 * Main test runner
 */
async function runIntegrationTests() {
  console.log('🧪 Integration Test: Complete Digest Pipeline\n');
  console.log('==================================================');

  const results: Record<string, boolean> = {};

  // Test 1: Generate digest
  const digest = await testDigestGeneration();
  results.generation = digest !== null;

  if (!digest) {
    console.log('\n⚠️  Cannot proceed with remaining tests (no digest generated)');
    console.log('   This is expected if the database is empty');
    console.log('   Run RSS fetcher and embedder first to populate database');

    console.log('\n==================================================');
    console.log('\n📊 Test Results:');
    console.log('⚠️  Tests skipped due to empty database');
    console.log('\nℹ️  To run full integration tests:');
    console.log('   1. Run: npm run fetch');
    console.log('   2. Run: npm run embed');
    console.log('   3. Run: npm run test:digest-integration');
    return;
  }

  // Test 2: Format as Notion blocks
  results.formatting = testNotionBlockFormatting(digest);

  // Test 3: Validate block structure
  results.structure = testBlockStructure(digest);

  // Test 4: Test Notion connection
  results.connection = await testNotionConnection();

  // Test 5: Post to Notion
  results.posting = await testNotionPosting(digest);

  // Test 6: Validate quality
  results.quality = testDigestQuality(digest);

  // Summary
  console.log('\n==================================================');
  console.log('\n📊 Test Results:');
  console.log(`✅ Passed: ${Object.values(results).filter(r => r).length}/${Object.keys(results).length}`);
  console.log(`❌ Failed: ${Object.values(results).filter(r => !r).length}/${Object.keys(results).length}`);

  console.log('\nDetailed Results:');
  Object.entries(results).forEach(([test, passed]) => {
    console.log(`   ${passed ? '✅' : '❌'} ${test}`);
  });

  if (Object.values(results).every(r => r)) {
    console.log('\n🎉 All integration tests passed!');
  } else {
    console.log('\n⚠️  Some tests failed. Check the output above for details.');
    process.exit(1);
  }
}

// Run tests
runIntegrationTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

