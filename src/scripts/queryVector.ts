import 'dotenv/config';
import { VectorClient } from '../lib/vectorClient.js';

/**
 * Interactive vector database query tool
 */
async function queryVectorDatabase() {
  console.log('🔍 VECTOR DATABASE QUERY TOOL');
  console.log('='.repeat(40));

  const vectorClient = new VectorClient();

  try {
    // Initialize vector client
    await vectorClient.initialize();

    // Get collection info
    const info = await vectorClient.getCollectionInfo();
    console.log(`\n📊 Collection: ${info.name}`);
    console.log(`📈 Vectors: ${info.count}`);
    console.log(`📐 Dimensions: ${info.dimension}\n`);

    if (info.count === 0) {
      console.log('⚠️ No vectors found. Run "npm run embed" first to populate the database.');
      return;
    }

    // Predefined test queries
    const testQueries = [
      'artificial intelligence and machine learning',
      'politics and elections news',
      'technology and cybersecurity',
      'climate change and environment',
      'space exploration and rockets',
      'cryptocurrency and blockchain',
      'health and medical research',
      'software development and programming',
    ];

    console.log('🧪 Running test queries...\n');

    for (const query of testQueries) {
      console.log(`🔍 Query: "${query}"`);
      console.log('─'.repeat(60));

      try {
        const results = await vectorClient.query(query, 3);

        if (results.length === 0) {
          console.log('   ❌ No results found\n');
          continue;
        }

        results.forEach((result, index) => {
          console.log(`   ${index + 1}. Score: ${result.score.toFixed(3)} | ${result.metadata.source}`);
          console.log(`      📰 "${result.metadata.title}"`);
          const preview = result.content.length > 100 
            ? result.content.substring(0, 100) + '...' 
            : result.content;
          console.log(`      💬 "${preview}"`);
          console.log(`      🏷️  Categories: ${result.metadata.categories?.join(', ') || 'none'}`);
          console.log(`      📅 ${new Date(result.metadata.published_date).toLocaleDateString()}\n`);
        });

      } catch (error) {
        console.log(`   ❌ Query failed: ${error}\n`);
      }

      console.log();
    }

    // Show some statistics
    console.log('📊 QUERY STATISTICS');
    console.log('─'.repeat(30));
    console.log(`✅ Processed ${testQueries.length} test queries`);
    console.log('💡 Use the VectorClient programmatically for custom queries');
    
    console.log('\n💻 Example usage:');
    console.log('```typescript');
    console.log('const vectorClient = new VectorClient();');
    console.log('await vectorClient.initialize();');
    console.log('const results = await vectorClient.query("your query here", 5);');
    console.log('```');

  } catch (error) {
    console.error('❌ Failed to query vector database:', error);
    throw error;
  }
}

// Run if called directly
const isMainModule = import.meta.url === `file://${process.argv[1]}`;

if (isMainModule) {
  queryVectorDatabase()
    .then(() => {
      console.log('\n✅ Query testing completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Query testing failed:', error);
      process.exit(1);
    });
}

export { queryVectorDatabase };