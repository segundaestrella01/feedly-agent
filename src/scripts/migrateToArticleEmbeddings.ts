/**
 * Migration Script: Chunk-Level to Article-Level Embeddings
 * 
 * This script migrates the vector database from chunk-level embeddings
 * to article-level embeddings by:
 * 1. Clearing the existing ChromaDB collection
 * 2. Resetting embedding status tracking
 * 3. Re-running the embedder on all existing chunk files
 * 
 * The new embedder aggregates chunk embeddings into a single article-level
 * embedding using position-weighted averaging.
 * 
 * Usage: npx tsx src/scripts/migrateToArticleEmbeddings.ts [--dry-run]
 */

import 'dotenv/config';
import { DatabaseClient } from '../lib/db.js';
import { VectorClient } from '../lib/vectorClient.js';
import { EmbedderWorker } from '../workers/embedder.js';

const SEPARATOR = '='.repeat(60);

interface MigrationStats {
  beforeVectorCount: number;
  beforeChunksTracked: number;
  afterVectorCount: number;
  afterArticleCount: number;
  processingTimeMs: number;
}

/**
 * Run the migration from chunk-level to article-level embeddings
 */
async function migrateToArticleEmbeddings(dryRun = false): Promise<MigrationStats> {
  console.log('\n' + SEPARATOR);
  console.log('🔄 MIGRATION: Chunk-Level → Article-Level Embeddings');
  console.log(SEPARATOR);

  if (dryRun) {
    console.log('\n⚠️  DRY RUN MODE - No changes will be made\n');
  }

  const dbClient = new DatabaseClient();
  const vectorClient = new VectorClient();
  const startTime = Date.now();

  const stats: MigrationStats = {
    beforeVectorCount: 0,
    beforeChunksTracked: 0,
    afterVectorCount: 0,
    afterArticleCount: 0,
    processingTimeMs: 0,
  };

  try {
    // Initialize clients
    await dbClient.initialize();
    await vectorClient.initialize();

    // Step 1: Get current state
    console.log('\n📊 Step 1: Analyzing current state...');
    const beforeInfo = await vectorClient.getCollectionInfo();
    const beforeStats = dbClient.getEmbeddingStats();

    stats.beforeVectorCount = beforeInfo.count;
    stats.beforeChunksTracked = beforeStats.total_chunks_embedded;

    console.log(`   Vector database: ${beforeInfo.count} vectors (chunk-level)`);
    console.log(`   Embedding tracking: ${beforeStats.total_chunks_embedded} chunks tracked`);
    console.log(`   Files processed: ${beforeStats.completed_files}/${beforeStats.total_files}`);

    if (dryRun) {
      console.log('\n✅ Dry run complete. Would perform the following:');
      console.log('   1. Delete all vectors from ChromaDB');
      console.log('   2. Reset embedding status tracking');
      console.log('   3. Re-embed all chunks with article-level aggregation');
      stats.processingTimeMs = Date.now() - startTime;
      return stats;
    }

    // Step 2: Clear vector database
    console.log('\n🗑️  Step 2: Clearing vector database...');
    await vectorClient.reset();
    console.log('   ✅ Vector database cleared');

    // Step 3: Reset embedding status
    console.log('\n🗑️  Step 3: Resetting embedding status tracking...');
    dbClient.resetEmbeddingStatus();
    console.log('   ✅ Embedding status reset');

    // Step 4: Re-run embedder with article-level aggregation
    console.log('\n⚡ Step 4: Re-embedding with article-level aggregation...');
    console.log('   This may take a while depending on the number of chunks...\n');

    const embedder = new EmbedderWorker();
    await embedder.embedAndUpsert();

    // Step 5: Verify migration
    console.log('\n✅ Step 5: Verifying migration...');
    const afterInfo = await vectorClient.getCollectionInfo();
    const afterStats = dbClient.getEmbeddingStats();

    stats.afterVectorCount = afterInfo.count;
    stats.afterArticleCount = afterInfo.count; // Now each vector = 1 article
    stats.processingTimeMs = Date.now() - startTime;

    console.log(`   Vector database: ${afterInfo.count} vectors (article-level)`);
    console.log(`   Embedding tracking: ${afterStats.total_chunks_embedded} chunks processed`);

    // Summary
    console.log('\n' + SEPARATOR);
    console.log('📈 MIGRATION SUMMARY');
    console.log(SEPARATOR);
    console.log(`   Before: ${stats.beforeVectorCount} vectors (chunk-level)`);
    console.log(`   After:  ${stats.afterVectorCount} vectors (article-level)`);
    console.log(`   Reduction: ${((1 - stats.afterVectorCount / stats.beforeVectorCount) * 100).toFixed(1)}%`);
    console.log(`   Processing time: ${(stats.processingTimeMs / 1000).toFixed(1)}s`);
    console.log('\n✅ Migration complete!\n');

    return stats;

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    throw error;
  } finally {
    dbClient.close();
  }
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run') || args.includes('-n');

  migrateToArticleEmbeddings(dryRun)
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export { migrateToArticleEmbeddings };

