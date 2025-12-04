import 'dotenv/config';
import { promises as fs } from 'fs';
import path from 'path';
import { VectorClient } from '../lib/vectorClient.js';
import { DatabaseClient } from '../lib/db.js';
import type { 
  ChunkWithEmbedding, 
  ChunkMetadata,
  ChunkFile,
  RawChunk,
  ProcessingStats,
} from '../types/index.js';

// Constants
const DATA_DIR = process.env.DATA_DIR || './data';
const CHUNKS_DIR = path.join(DATA_DIR, 'chunks');
const BATCH_SIZE = parseInt(process.env.EMBEDDING_BATCH_SIZE || '20', 10);
const DELAY_MS = parseInt(process.env.EMBEDDING_DELAY_MS || '1000', 10);
const BATCH_DELAY_DIVISOR = 2;
const SEPARATOR_LENGTH = 60;
const MILLISECONDS_IN_SECOND = 1000;
const DECIMAL_PLACES = 2;

/**
 * Embedder Worker: Generates embeddings and upserts to vector database
 * Processes chunk files, generates embeddings via OpenAI, and stores in Chroma
 */
export class EmbedderWorker {
  private vectorClient: VectorClient;
  private dbClient: DatabaseClient;
  private stats: ProcessingStats;

  /**
   * Create a new EmbedderWorker instance
   * Initializes vector and database clients with default configuration
   */
  constructor() {
    this.vectorClient = new VectorClient();
    this.dbClient = new DatabaseClient();
    this.stats = {
      totalFiles: 0,
      totalChunks: 0,
      processedChunks: 0,
      skippedChunks: 0,
      successfulUpserts: 0,
      errors: 0,
      tokensUsed: 0,
      startTime: new Date(),
    };
  }

  /**
   * Main entry point: process all chunk files and embed to vector DB
   * Initializes databases, processes chunk files in batches, and tracks progress
   * @throws Error if embedding or database operations fail
   */
  async embedAndUpsert(): Promise<void> {
    try {
      console.log('🚀 Starting embedder worker...\n');

      // Initialize database
      await this.dbClient.initialize();

      // Initialize vector database
      await this.vectorClient.initialize();

      // Get initial collection info
      const initialInfo = await this.vectorClient.getCollectionInfo();
      console.log(`📊 Initial vector database state: ${initialInfo.count} vectors\n`);

      // Find all chunk files
      const chunkFiles = await this.getChunkFiles();
      this.stats.totalFiles = chunkFiles.length;

      if (chunkFiles.length === 0) {
        console.log('⚠️ No chunk files found in', CHUNKS_DIR);
        return;
      }

      console.log(`📁 Found ${chunkFiles.length} chunk files to process:`);
      chunkFiles.forEach(file => console.log(`   - ${path.basename(file)}`));
      console.log();

      // Process each chunk file
      for (let i = 0; i < chunkFiles.length; i++) {
        const file = chunkFiles[i];
        if (!file) {
          continue;
        }
        
        const fileName = path.basename(file);
        console.log(`\n📂 Processing file ${i + 1}/${chunkFiles.length}: ${fileName}`);
        
        // Check if file is already completed
        const existingStatus = this.dbClient.getEmbeddingStatus(fileName);
        if (existingStatus.length > 0 && existingStatus[0] && existingStatus[0].status === 'completed') {
          console.log('   ⏭️ File already completed, skipping...');
          continue;
        }
        
        try {
          await this.processChunkFile(file);
        } catch (error) {
          console.error(`❌ Failed to process file ${file}:`, error);
          this.stats.errors++;
          
          // Mark as failed in database
          await this.dbClient.markEmbeddingFailed(fileName, String(error));
        }

        // Add delay between files to respect rate limits
        if (i < chunkFiles.length - 1) {
          console.log(`⏳ Waiting ${DELAY_MS}ms before next file...`);
          await this.sleep(DELAY_MS);
        }
      }

      // Final statistics
      this.stats.endTime = new Date();
      await this.printFinalStats();

      // Close database connection
      this.dbClient.close();

    } catch (error) {
      console.error('❌ Embedder worker failed:', error);
      throw error;
    }
  }

  /**
   * Find all chunk files in the chunks directory
   * @returns Array of absolute paths to chunk JSON files, sorted chronologically
   */
  private async getChunkFiles(): Promise<string[]> {
    try {
      const files = await fs.readdir(CHUNKS_DIR);
      const chunkFiles = files
        .filter(file => file.startsWith('chunks-') && file.endsWith('.json'))
        .map(file => path.join(CHUNKS_DIR, file))
        .sort(); // Process in chronological order

      return chunkFiles;
    } catch (error) {
      console.error(`❌ Failed to read chunks directory ${CHUNKS_DIR}:`, error);
      return [];
    }
  }

  /**
   * Process a single chunk file
   * Loads chunks, generates embeddings, and upserts to vector database
   * @param filePath - Absolute path to the chunk JSON file
   * @throws Error if file processing fails
   */
  private async processChunkFile(filePath: string): Promise<void> {
    const fileName = path.basename(filePath);
    
    try {
      // Load chunk file
      const content = await fs.readFile(filePath, 'utf-8');
      const chunkFile: ChunkFile = JSON.parse(content);

      console.log(`📄 Loaded ${chunkFile.totalChunks} chunks from ${chunkFile.totalItems} items`);
      this.stats.totalChunks += chunkFile.totalChunks;

      // Initialize status in database
      await this.dbClient.upsertEmbeddingStatus({
        chunk_file: fileName,
        total_chunks: chunkFile.totalChunks,
        processed_chunks: 0,
        status: 'processing',
        model_used: 'text-embedding-3-small',
      });

      // Check for already embedded chunks
      const allChunkIds = chunkFile.chunks.map(c => c.id);
      const alreadyEmbedded = this.dbClient.getEmbeddedChunks(allChunkIds);
      const chunksToProcess = chunkFile.chunks.filter(c => !alreadyEmbedded.includes(c.id));
      
      if (chunksToProcess.length === 0) {
        console.log('   ✅ All chunks already embedded, marking as completed');
        await this.dbClient.updateEmbeddingProgress(fileName, chunkFile.totalChunks, 'completed');
        return;
      }
      
      if (alreadyEmbedded.length > 0) {
        console.log(`   📊 Found ${alreadyEmbedded.length} already embedded, processing ${chunksToProcess.length} remaining`);
      }

      // Convert raw chunks to vector format
      const vectorChunks = this.convertChunksToVectorFormat(chunksToProcess);

      // Process chunks in batches
      const batches = this.createBatches(vectorChunks, BATCH_SIZE);
      
      console.log(`⚡ Processing in ${batches.length} batches of up to ${BATCH_SIZE} chunks each`);

      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        if (!batch) {continue;}
        
        try {
          console.log(`\n   📦 Batch ${batchIndex + 1}/${batches.length}: ${batch.length} chunks`);
          
          // Upsert batch (this will automatically generate embeddings)
          await this.vectorClient.upsert(batch);
          
          this.stats.processedChunks += batch.length;
          this.stats.successfulUpserts += batch.length;
          
          console.log(`   ✅ Batch ${batchIndex + 1} completed successfully`);

          // Add delay between batches
          if (batchIndex < batches.length - 1) {
            await this.sleep(DELAY_MS / BATCH_DELAY_DIVISOR);
          }

        } catch (error) {
          console.error(`   ❌ Batch ${batchIndex + 1} failed:`, error);
          this.stats.errors++;
          this.stats.skippedChunks += batch?.length || 0;
        }
      }

      // Mark file as completed after successful processing
      console.log('   ✅ File processing completed, updating status to \'completed\'');
      await this.dbClient.updateEmbeddingProgress(fileName, chunkFile.totalChunks, 'completed');

    } catch (error) {
      console.error(`❌ Failed to process chunk file ${filePath}:`, error);
      
      // Mark file as failed
      await this.dbClient.updateEmbeddingProgress(fileName, 0, 'failed');
      throw error;
    }
  }

  /**
   * Convert raw chunks to vector database format
   * Transforms chunk data into the format expected by the vector client
   * @param rawChunks - Array of raw chunks from chunk files
   * @returns Array of chunks formatted for vector database upsert
   */
  private convertChunksToVectorFormat(rawChunks: RawChunk[]): ChunkWithEmbedding[] {
    return rawChunks.map(chunk => {
      const metadata: ChunkMetadata = {
        // Source information
        source: chunk.sourceItem.source,
        source_url: chunk.sourceItem.link,
        title: chunk.sourceItem.title,
        published_date: chunk.sourceItem.pubDate,
        
        // Chunk information
        chunk_index: chunk.chunkIndex,
        total_chunks: rawChunks.filter(c => c.sourceItem.id === chunk.sourceItem.id).length,
        word_count: chunk.wordCount,
        char_count: chunk.charCount,
        
        // Content classification
        categories: chunk.sourceItem.categories || [],
        tags: chunk.sourceItem.tags || [],
        content_type: 'article',
        
        // Processing metadata
        processed_date: chunk.sourceItem.pubDate,
        embedded_date: '', // Will be set during upsert
        chunk_id: chunk.id,
      };

      return {
        id: chunk.id,
        content: chunk.content,
        metadata,
        // embedding will be generated automatically during upsert
      };
    });
  }

  /**
   * Split chunks into batches for processing
   * @param items - Array of items to batch
   * @param batchSize - Maximum number of items per batch
   * @returns Array of batches
   */
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Sleep utility function for rate limiting
   * @param ms - Number of milliseconds to sleep
   * @returns Promise that resolves after the specified delay
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => globalThis.setTimeout(resolve, ms));
  }

  /**
   * Print final processing statistics
   * Displays summary of processed files, chunks, errors, and timing
   */
  private async printFinalStats(): Promise<void> {
    console.log('\n' + '='.repeat(SEPARATOR_LENGTH));
    console.log('📊 EMBEDDER WORKER COMPLETE - FINAL STATISTICS');
    console.log('='.repeat(SEPARATOR_LENGTH));

    const duration = this.stats.endTime 
      ? (this.stats.endTime.getTime() - this.stats.startTime.getTime()) / MILLISECONDS_IN_SECOND
      : 0;

    console.log(`🕒 Duration: ${duration.toFixed(DECIMAL_PLACES)} seconds`);
    console.log(`📁 Files processed: ${this.stats.totalFiles}`);
    console.log(`📄 Total chunks: ${this.stats.totalChunks}`);
    console.log(`✅ Successfully processed: ${this.stats.processedChunks}`);
    console.log(`⏭️ Skipped: ${this.stats.skippedChunks}`);
    console.log(`❌ Errors: ${this.stats.errors}`);
    
    if (this.stats.processedChunks > 0) {
      console.log(`⚡ Average chunks/second: ${(this.stats.processedChunks / duration).toFixed(DECIMAL_PLACES)}`);
    }

    // Get final collection info
    try {
      const finalInfo = await this.vectorClient.getCollectionInfo();
      console.log(`🗃️ Final vector database: ${finalInfo.count} vectors (${finalInfo.dimension} dimensions)`);
      
      // Get database stats
      const dbStats = this.dbClient.getEmbeddingStats();
      console.log(`💾 Database: ${dbStats.total_chunks_embedded} chunks tracked, ${dbStats.completed_files}/${dbStats.total_files} files completed`);
    } catch (error) {
      console.log('⚠️ Could not get final collection info:', error);
    }

    console.log('='.repeat(SEPARATOR_LENGTH));
    
    if (this.stats.errors > 0) {
      console.log(`⚠️ Completed with ${this.stats.errors} errors. Check logs above for details.`);
    } else {
      console.log('🎉 All chunks processed successfully!');
    }
  }
}

/**
 * Main function to run the embedder worker
 * Creates an EmbedderWorker instance and executes the embedding pipeline
 * @returns Promise that resolves when all chunks are processed
 */
export async function embedAndUpsert(): Promise<void> {
  const worker = new EmbedderWorker();
  await worker.embedAndUpsert();
}

// Run if called directly
const isMainModule = import.meta.url === `file://${process.argv[1]}`;

if (isMainModule) {
  embedAndUpsert()
    .then(() => {
      console.log('\n✅ Embedder worker completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Embedder worker failed:', error);
      process.exit(1);
    });
}