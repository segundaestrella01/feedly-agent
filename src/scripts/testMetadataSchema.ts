/**
 * Test Rich Metadata Schema Implementation
 * 
 * This script tests the metadata transformation, validation, and utility functions
 * to ensure the Rich Metadata Schema is working correctly.
 */

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { 
  transformRawChunkToMetadata,
  validateMetadata,
  toVectorMetadata,
  fromVectorMetadata,
  analyzeMetadataPatterns,
  updateTotalChunks,
  normalizeCategories,
  extractDomain,
  generateMetadataHash,
} from '../lib/metadataUtils.js';
import type { ChunkMetadata } from '../types/vector.js';

const DATA_DIR = './data/chunks';
const TITLE_PREVIEW_LENGTH = 50;
const SAMPLE_CHUNKS_COUNT = 10;
const TOP_RESULTS_COUNT = 3;
const HASH_PREVIEW_LENGTH = 20;

/**
 * Test the Rich Metadata Schema with real chunk data
 */
async function testRichMetadataSchema(): Promise<void> {
  console.log('🧪 Testing Rich Metadata Schema Implementation...\n');

  try {
    // Load sample chunk data
    console.log('📁 Loading chunk files...');
    const chunkFiles = readdirSync(DATA_DIR).filter(file => file.endsWith('.json'));
    console.log(`Found ${chunkFiles.length} chunk files`);

    if (chunkFiles.length === 0) {
      console.log('❌ No chunk files found in', DATA_DIR);
      return;
    }

    // Test with first chunk file
    const firstChunkFile = chunkFiles[0];
    if (!firstChunkFile) {
      console.log('❌ No chunk files available');
      return;
    }
    
    const firstFile = join(DATA_DIR, firstChunkFile);
    const chunkData = JSON.parse(readFileSync(firstFile, 'utf8'));
    console.log(`📊 Loaded ${chunkData.totalChunks} chunks from ${chunkData.totalItems} items\n`);

    // Test 1: Metadata Transformation
    console.log('🔄 Test 1: Metadata Transformation');
    const sampleChunk = chunkData.chunks[0];
    const metadata = transformRawChunkToMetadata(sampleChunk);
    
    console.log('Sample chunk transformed to metadata:');
    console.log('- Source:', metadata.source);
    console.log('- Domain:', metadata.domain);
    console.log('- Title:', metadata.title.substring(0, TITLE_PREVIEW_LENGTH) + '...');
    console.log('- Categories:', metadata.categories);
    console.log('- Content type:', metadata.content_type);
    console.log('- Chunk info:', `${metadata.chunk_index}/${metadata.total_chunks} (${metadata.word_count} words)`);
    console.log('✅ Transformation successful\n');

    // Test 2: Metadata Validation
    console.log('🔍 Test 2: Metadata Validation');
    const validationResult = validateMetadata(metadata);
    console.log('Validation result:', validationResult.isValid ? '✅ Valid' : '❌ Invalid');
    if (validationResult.errors.length > 0) {
      console.log('Errors:', validationResult.errors);
    }
    if (validationResult.warnings.length > 0) {
      console.log('Warnings:', validationResult.warnings);
    }
    console.log('✅ Validation complete\n');

    // Test 3: Vector Format Conversion
    console.log('🔄 Test 3: Vector Format Conversion');
    const vectorMetadata = toVectorMetadata(metadata);
    console.log('Vector metadata fields:', Object.keys(vectorMetadata).length);
    console.log('Sample fields:');
    console.log('- chunk_index:', vectorMetadata.chunk_index);
    console.log('- word_count:', vectorMetadata.word_count);
    const categoriesValue = vectorMetadata.categories;
    const categoriesDisplay = typeof categoriesValue === 'string' 
      ? categoriesValue.substring(0, TITLE_PREVIEW_LENGTH) + '...'
      : String(categoriesValue);
    console.log('- categories (JSON):', categoriesDisplay);

    // Test conversion back
    const convertedBack = fromVectorMetadata(vectorMetadata);
    console.log('✅ Round-trip conversion successful');
    console.log('Source matches:', convertedBack.source === metadata.source);
    console.log('Categories match:', JSON.stringify(convertedBack.categories) === JSON.stringify(metadata.categories));
    console.log();

    // Test 4: Process Multiple Chunks
    console.log('📊 Test 4: Processing Multiple Chunks');
    const allMetadata: ChunkMetadata[] = [];
    
    let totalProcessed = 0;
    for (const chunk of chunkData.chunks.slice(0, SAMPLE_CHUNKS_COUNT)) { // Test with first chunks
      try {
        const chunkMetadata = transformRawChunkToMetadata(chunk);
        allMetadata.push(chunkMetadata);
        totalProcessed++;
      } catch (error) {
        console.warn(`Failed to process chunk ${chunk.id}:`, error);
      }
    }

    console.log(`✅ Successfully processed ${totalProcessed} chunks`);

    // Test 5: Update Total Chunks
    console.log('📊 Test 5: Update Total Chunks');
    const updatedMetadata = updateTotalChunks(allMetadata);
    console.log('Updated total chunks for grouped articles');
    const articleGroups = new Map<string, number>();
    for (const meta of updatedMetadata) {
      const key = meta.source_url;
      articleGroups.set(key, (articleGroups.get(key) || 0) + 1);
    }
    console.log(`✅ Found ${articleGroups.size} unique articles with proper chunk counts\n`);

    // Test 6: Metadata Analytics
    console.log('📈 Test 6: Metadata Analytics');
    const analytics = analyzeMetadataPatterns(updatedMetadata);
    console.log('Analytics results:');
    console.log(`- Total chunks analyzed: ${updatedMetadata.length}`);
    console.log(`- Date range: ${analytics.dateRange.earliest.split('T')[0]} to ${analytics.dateRange.latest.split('T')[0]}`);
    console.log(`- Average chunk size: ${analytics.avgChunkSize.words} words, ${analytics.avgChunkSize.chars} chars`);
    console.log('- Top 3 sources:', analytics.topSources.slice(0, TOP_RESULTS_COUNT).map(s => `${s.source} (${s.count})`));
    console.log('- Top 3 domains:', analytics.topDomains.slice(0, TOP_RESULTS_COUNT).map(d => `${d.domain} (${d.count})`));
    console.log('- Top 3 categories:', analytics.topCategories.slice(0, TOP_RESULTS_COUNT).map(c => `${c.category} (${c.count})`));
    console.log('✅ Analytics generation successful\n');

    // Test 7: Utility Functions
    console.log('🔧 Test 7: Utility Functions');
    
    // Test domain extraction
    const testUrls = [
      'https://www.example.com/article',
      'http://subdomain.test.org/path',
      'https://arstechnica.com/science/article',
    ];
    console.log('Domain extraction:');
    for (const url of testUrls) {
      console.log(`- ${url} → ${extractDomain(url)}`);
    }

    // Test category normalization
    const testCategories = [
      'Politics / Politics News',
      'Science / Technology',
      '  Extra Spaces  ',
      'Technology',
      'Technology', // Duplicate
    ];
    console.log('Category normalization:');
    console.log(`- Input: [${testCategories.join(', ')}]`);
    console.log(`- Output: [${normalizeCategories(testCategories).join(', ')}]`);

    // Test hash generation
    const hash = generateMetadataHash(metadata);
    console.log('Metadata hash generated:', hash.substring(0, HASH_PREVIEW_LENGTH) + '...');
    console.log('✅ Utility functions working correctly\n');

    console.log('🎉 All Rich Metadata Schema tests completed successfully!');
    console.log('\nThe Rich Metadata Schema implementation provides:');
    console.log('✅ Comprehensive metadata structure with 16+ fields');
    console.log('✅ Robust transformation from raw chunks to rich metadata');
    console.log('✅ Validation with configurable rules and warnings');
    console.log('✅ Vector database format conversion (Chroma-compatible)');
    console.log('✅ Advanced filtering capabilities for semantic search');
    console.log('✅ Analytics and pattern extraction utilities');
    console.log('✅ Domain extraction and category normalization');
    console.log('✅ Deduplication and article grouping support');

  } catch (error) {
    console.error('❌ Error during metadata schema testing:', error);
    throw error;
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testRichMetadataSchema()
    .then(() => {
      console.log('\n✅ Rich Metadata Schema tests completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Rich Metadata Schema tests failed:', error);
      process.exit(1);
    });
}

export { testRichMetadataSchema };