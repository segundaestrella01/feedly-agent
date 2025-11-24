import { chunkContent } from './chunker.js';

/**
 * Combined processor worker for stage implementation
 * Currently handles: chunking
 * TODO: Add embedding + upserting in future stages
 */
export async function processContent(inputFilePath?: string, fetchFullArticles = true) {
  try {
    console.log('🔄 Starting content processing pipeline...');
    
    // Stage 2: Content extraction and chunking
    console.log('📝 Stage 2: Content extraction and chunking with full article fetching');
    const chunkResult = await chunkContent(inputFilePath, fetchFullArticles);
    
    console.log('✅ Processing completed successfully:');
    console.log(`   • ${chunkResult.totalItems} items processed`);
    console.log(`   • ${chunkResult.totalChunks} chunks created`);
    
    // TODO: Stage 3 - Embeddings & Vector Upsert
    // TODO: Stage 4 - Retrieval, Clustering & Summarization
    
    return chunkResult;
    
  } catch (error) {
    console.error('❌ Error during content processing:', error);
    throw error;
  }
}

// Run processor if this file is executed directly
if (process.argv[1] && (process.argv[1].endsWith('processor.ts') || process.argv[1].endsWith('processor.js'))) {
  processContent()
    .then(() => {
      console.log('✅ Processing completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Processing failed:', error);
      process.exit(1);
    });
}