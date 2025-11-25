import 'dotenv/config';
import { DatabaseClient } from '../lib/db.js';
import { VectorClient } from '../lib/vectorClient.js';

/**
 * Embedding Status Monitor - Check processing status and statistics
 */
async function checkEmbeddingStatus() {
  console.log('📊 EMBEDDING STATUS MONITOR');
  console.log('='.repeat(50));

  const dbClient = new DatabaseClient();
  const vectorClient = new VectorClient();

  try {
    // Initialize clients
    await dbClient.initialize();
    await vectorClient.initialize();

    // Get overall statistics
    const stats = dbClient.getEmbeddingStats();
    console.log('\n🎯 OVERALL STATISTICS');
    console.log('─'.repeat(30));
    console.log(`📁 Total files tracked: ${stats.total_files}`);
    console.log(`✅ Completed files: ${stats.completed_files}`);
    console.log(`⏳ Pending/processing files: ${stats.pending_files}`);
    console.log(`❌ Failed files: ${stats.failed_files}`);
    console.log(`🔢 Total chunks embedded: ${stats.total_chunks_embedded}`);

    // Get vector database info
    const vectorInfo = await vectorClient.getCollectionInfo();
    console.log(`🗃️ Vector database: ${vectorInfo.count} vectors (${vectorInfo.dimension} dimensions)`);

    // Get detailed file status
    const allStatus = dbClient.getEmbeddingStatus();
    
    if (allStatus.length === 0) {
      console.log('\n⚠️ No embedding operations found in database');
      return;
    }

    console.log('\n📋 DETAILED FILE STATUS');
    console.log('─'.repeat(50));

    for (const status of allStatus) {
      const progress = status.total_chunks > 0 
        ? `${status.processed_chunks}/${status.total_chunks} (${Math.round((status.processed_chunks / status.total_chunks) * 100)}%)`
        : '0/0';

      const statusIcon = {
        completed: '✅',
        processing: '⏳',
        pending: '⏸️',
        failed: '❌',
      }[status.status] || '❓';

      console.log(`${statusIcon} ${status.chunk_file}`);
      console.log(`   Progress: ${progress}`);
      console.log(`   Status: ${status.status}`);
      
      if (status.started_at) {
        console.log(`   Started: ${new Date(status.started_at).toLocaleString()}`);
      }
      
      if (status.completed_at) {
        console.log(`   Completed: ${new Date(status.completed_at).toLocaleString()}`);
      }
      
      if (status.error_message) {
        console.log(`   Error: ${status.error_message}`);
      }
      
      console.log(`   Model: ${status.model_used}`);
      console.log();
    }

    // Show completion summary
    if (stats.total_files > 0) {
      const completionRate = Math.round((stats.completed_files / stats.total_files) * 100);
      console.log(`🎯 Overall completion: ${completionRate}% (${stats.completed_files}/${stats.total_files} files)`);
      
      if (stats.failed_files > 0) {
        console.log(`⚠️ ${stats.failed_files} files failed - check error messages above`);
      }
      
      if (stats.pending_files > 0) {
        console.log(`📋 ${stats.pending_files} files pending - run 'npm run embed' to process`);
      }
    }

  } catch (error) {
    console.error('❌ Failed to check embedding status:', error);
    throw error;
  } finally {
    dbClient.close();
  }
}

// Run if called directly
const isMainModule = import.meta.url === `file://${process.argv[1]}`;

if (isMainModule) {
  checkEmbeddingStatus()
    .then(() => {
      console.log('\n✅ Status check completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Status check failed:', error);
      process.exit(1);
    });
}

export { checkEmbeddingStatus };