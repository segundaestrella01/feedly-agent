import 'dotenv/config';
import { DatabaseClient } from '../lib/db.js';
import { VectorClient } from '../lib/vectorClient.js';

/**
 * Reset vector database and embedding status
 */
async function resetVectorDatabase() {
  console.log('🗑️ VECTOR DATABASE RESET TOOL');
  console.log('='.repeat(40));

  const dbClient = new DatabaseClient();
  const vectorClient = new VectorClient();

  try {
    console.log('\n⚠️ This will delete ALL vectors and embedding status!');
    console.log('🔄 Starting reset process...\n');

    // Initialize clients
    await dbClient.initialize();
    await vectorClient.initialize();

    // Get current status before reset
    const beforeStats = dbClient.getEmbeddingStats();
    const beforeInfo = await vectorClient.getCollectionInfo();
    
    console.log('📊 Current state:');
    console.log(`   - Vector database: ${beforeInfo.count} vectors`);
    console.log(`   - Embedding tracking: ${beforeStats.total_chunks_embedded} chunks tracked`);
    console.log(`   - Files: ${beforeStats.total_files} total (${beforeStats.completed_files} completed)`);

    // Reset vector database
    console.log('\n🗃️ Resetting Chroma vector database...');
    await vectorClient.reset();
    console.log('✅ Vector database reset complete');

    // Reset embedding status in SQLite
    console.log('\n💾 Resetting embedding status tracking...');
    dbClient.resetEmbeddingStatus();
    console.log('✅ Embedding status reset complete');

    // Verify reset
    const afterStats = dbClient.getEmbeddingStats();
    const afterInfo = await vectorClient.getCollectionInfo();
    
    console.log('\n📊 After reset:');
    console.log(`   - Vector database: ${afterInfo.count} vectors`);
    console.log(`   - Embedding tracking: ${afterStats.total_chunks_embedded} chunks tracked`);
    console.log(`   - Files: ${afterStats.total_files} total`);

    console.log('\n🎯 Reset summary:');
    console.log(`   ✅ Deleted ${beforeInfo.count} vectors`);
    console.log(`   ✅ Reset ${beforeStats.total_files} file tracking records`);
    console.log(`   ✅ Cleared ${beforeStats.total_chunks_embedded} chunk embeddings`);

    console.log('\n💡 Next steps:');
    console.log('   - Run "npm run embed" to reprocess all chunks');
    console.log('   - Use "npm run embed:status" to monitor progress');

  } catch (error) {
    console.error('❌ Failed to reset vector database:', error);
    throw error;
  } finally {
    dbClient.close();
  }
}

// Run if called directly
const isMainModule = import.meta.url === `file://${process.argv[1]}`;

if (isMainModule) {
  resetVectorDatabase()
    .then(() => {
      console.log('\n✅ Reset completed successfully!');
      console.log('🚀 Ready for fresh embedding processing');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Reset failed:', error);
      process.exit(1);
    });
}

export { resetVectorDatabase };