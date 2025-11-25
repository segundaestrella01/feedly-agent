import 'dotenv/config';
import { VectorClient } from '../lib/vectorClient.js';

// Constants
const SEPARATOR_LENGTH = 50;
const MAX_RESULTS = 3;
const SCORE_PRECISION = 3;
const PREVIEW_LENGTH = 100;

/**
 * Test script to query the populated vector database
 */
async function testVectorQueries() {
  console.log('🔍 Testing Vector Database Queries...\n');

  const vectorClient = new VectorClient();
  
  try {
    // Initialize the client
    await vectorClient.initialize();

    // Get collection info
    const info = await vectorClient.getCollectionInfo();
    console.log(`📊 Collection Status: ${info.count} vectors (${info.dimension} dimensions)\n`);

    // Test queries
    const queries = [
      'artificial intelligence and machine learning',
      'politics and elections',
      'technology and cybersecurity',
      'climate change and environment',
      'space exploration',
    ];

    for (const query of queries) {
      console.log(`🔍 Query: "${query}"`);
      console.log('─'.repeat(SEPARATOR_LENGTH));
      
      const results = await vectorClient.query(query, MAX_RESULTS);
      
      if (results.length === 0) {
        console.log('   ❌ No results found\n');
        continue;
      }

      results.forEach((result, index) => {
        console.log(`   ${index + 1}. Score: ${result.score.toFixed(SCORE_PRECISION)} | ${result.metadata.source}`);
        console.log(`      📰 "${result.metadata.title}"`);
        const preview = result.content.length > PREVIEW_LENGTH 
          ? result.content.substring(0, PREVIEW_LENGTH) + '...' 
          : result.content;
        console.log(`      💬 "${preview}"`);
        console.log(`      🏷️  Categories: ${result.metadata.categories?.join(', ') || 'none'}`);
        console.log(`      📅 ${new Date(result.metadata.published_date).toLocaleDateString()}\n`);
      });

      console.log();
    }

  } catch (error) {
    console.error('❌ Query test failed:', error);
    throw error;
  }
}

// Run the test
const isMainModule = import.meta.url === `file://${process.argv[1]}`;

if (isMainModule) {
  testVectorQueries()
    .then(() => {
      console.log('✅ Vector query tests completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Vector query tests failed:', error);
      process.exit(1);
    });
}

export { testVectorQueries };