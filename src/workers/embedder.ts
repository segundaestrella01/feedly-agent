import 'dotenv/config';
import { promises as fs } from 'fs';
import path from 'path';
import { VectorClient, ChunkWithEmbedding, ChunkMetadata } from '../lib/vectorClient.js';

// Constants
const DATA_DIR = process.env.DATA_DIR || './data';
const CHUNKS_DIR = path.join(DATA_DIR, 'chunks');
const BATCH_SIZE = parseInt(process.env.EMBEDDING_BATCH_SIZE || '20', 10);
const DELAY_MS = parseInt(process.env.EMBEDDING_DELAY_MS || '1000', 10);

// Types for chunk file structure
interface ChunkFile {
  totalItems: number;
  totalChunks: number;
  chunks: RawChunk[];
}

interface RawChunk {
  id: string;
  chunkIndex: number;
  content: string;
  wordCount: number;
  charCount: number;
  sourceItem: {
    id: string;
    title: string;
    link: string;
    pubDate: string;
    source: string;
    categories?: string[];
    tags?: string[];
  };
}

interface ProcessingStats {
  totalFiles: number;
  totalChunks: number;
  processedChunks: number;
  skippedChunks: number;
  successfulUpserts: number;
  errors: number;
  tokensUsed: number;
  startTime: Date;
  endTime?: Date;
}

// Embedder worker: generates embeddings and upserts to vector DB
export class EmbedderWorker {
  private vectorClient: VectorClient;
  private stats: ProcessingStats;

  constructor() {
    this.vectorClient = new VectorClient();
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
   */
  async embedAndUpsert(): Promise<void> {
    try {
      console.log('🚀 Starting embedder worker...\n');

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
        if (!file) {continue;}
        
        console.log(`\n📂 Processing file ${i + 1}/${chunkFiles.length}: ${path.basename(file)}`);
        
        try {
          await this.processChunkFile(file);
        } catch (error) {
          console.error(`❌ Failed to process file ${file}:`, error);
          this.stats.errors++;
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

    } catch (error) {
      console.error('❌ Embedder worker failed:', error);
      throw error;
    }
  }

  /**
   * Find all chunk files in the chunks directory
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
   */
  private async processChunkFile(filePath: string): Promise<void> {
    try {
      // Load chunk file
      const content = await fs.readFile(filePath, 'utf-8');
      const chunkFile: ChunkFile = JSON.parse(content);

      console.log(`📄 Loaded ${chunkFile.totalChunks} chunks from ${chunkFile.totalItems} items`);
      this.stats.totalChunks += chunkFile.totalChunks;

      // Convert raw chunks to vector format
      const vectorChunks = this.convertChunksToVectorFormat(chunkFile.chunks);

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
            await this.sleep(DELAY_MS / 2); // Shorter delay between batches
          }

        } catch (error) {
          console.error(`   ❌ Batch ${batchIndex + 1} failed:`, error);
          this.stats.errors++;
          this.stats.skippedChunks += batch?.length || 0;
        }
      }

    } catch (error) {
      console.error(`❌ Failed to process chunk file ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Convert raw chunks to vector database format
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
   */
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Sleep utility function
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Print final processing statistics
   */
  private async printFinalStats(): Promise<void> {
    console.log('\n' + '='.repeat(60));
    console.log('📊 EMBEDDER WORKER COMPLETE - FINAL STATISTICS');
    console.log('='.repeat(60));

    const duration = this.stats.endTime 
      ? (this.stats.endTime.getTime() - this.stats.startTime.getTime()) / 1000
      : 0;

    console.log(`🕒 Duration: ${duration.toFixed(2)} seconds`);
    console.log(`📁 Files processed: ${this.stats.totalFiles}`);
    console.log(`📄 Total chunks: ${this.stats.totalChunks}`);
    console.log(`✅ Successfully processed: ${this.stats.processedChunks}`);
    console.log(`⏭️ Skipped: ${this.stats.skippedChunks}`);
    console.log(`❌ Errors: ${this.stats.errors}`);
    
    if (this.stats.processedChunks > 0) {
      console.log(`⚡ Average chunks/second: ${(this.stats.processedChunks / duration).toFixed(2)}`);
    }

    // Get final collection info
    try {
      const finalInfo = await this.vectorClient.getCollectionInfo();
      console.log(`🗃️ Final vector database: ${finalInfo.count} vectors (${finalInfo.dimension} dimensions)`);
    } catch (error) {
      console.log('⚠️ Could not get final collection info:', error);
    }

    console.log('='.repeat(60));
    
    if (this.stats.errors > 0) {
      console.log(`⚠️ Completed with ${this.stats.errors} errors. Check logs above for details.`);
    } else {
      console.log('🎉 All chunks processed successfully!');
    }
  }
}

/**
 * Main function to run the embedder worker
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