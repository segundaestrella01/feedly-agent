#!/usr/bin/env tsx

import 'dotenv/config';
import { VectorClient } from '../lib/vectorClient.js';
import { LLMClient } from '../lib/llmClient.js';

// Constants
const QUERY_LIMIT = 2;
const VECTOR_QUERY_LIMIT = 3;
const FILTER_QUERY_LIMIT = 5;
const SCORE_PRECISION = 3;
const CONTENT_PREVIEW_LENGTH = 80;

// Test data
const sampleChunks = [
  {
    id: 'test-chunk-1',
    content: 'Artificial intelligence is revolutionizing the technology industry with machine learning algorithms and neural networks.',
    metadata: {
      source: 'tech-news.com',
      source_url: 'https://tech-news.com/ai-revolution',
      title: 'AI Revolution in Technology',
      published_date: '2024-11-25T10:00:00Z',
      chunk_index: 0,
      total_chunks: 1,
      word_count: 15,
      char_count: 118,
      categories: ['Technology', 'AI'],
      tags: ['machine-learning', 'neural-networks'],
      content_type: 'article',
      processed_date: '2024-11-25T12:00:00Z',
      embedded_date: new Date().toISOString(),
      chunk_id: 'test-chunk-1',
    },
  },
  {
    id: 'test-chunk-2',
    content: 'Sports teams are preparing for the upcoming championship season with intensive training and strategic planning.',
    metadata: {
      source: 'sports-daily.com',
      source_url: 'https://sports-daily.com/championship-prep',
      title: 'Championship Season Preparation',
      published_date: '2024-11-25T09:00:00Z',
      chunk_index: 0,
      total_chunks: 1,
      word_count: 14,
      char_count: 107,
      categories: ['Sports'],
      tags: ['championship', 'training'],
      content_type: 'article',
      processed_date: '2024-11-25T12:00:00Z',
      embedded_date: new Date().toISOString(),
      chunk_id: 'test-chunk-2',
    },
  },
  {
    id: 'test-chunk-3',
    content: 'Economic markets are showing volatility as investors react to new policy changes and global trade developments.',
    metadata: {
      source: 'market-watch.com',
      source_url: 'https://market-watch.com/market-volatility',
      title: 'Market Volatility Analysis',
      published_date: '2024-11-25T08:00:00Z',
      chunk_index: 0,
      total_chunks: 1,
      word_count: 16,
      char_count: 117,
      categories: ['Economics', 'Finance'],
      tags: ['markets', 'policy', 'trade'],
      content_type: 'article',
      processed_date: '2024-11-25T12:00:00Z',
      embedded_date: new Date().toISOString(),
      chunk_id: 'test-chunk-3',
    },
  },
];

async function testVectorClient() {
  try {
    console.log('🧪 Testing Chroma Vector Client...\n');
    
    // Initialize client
    console.log('🔧 Initializing vector client...');
    const vectorClient = new VectorClient();
    await vectorClient.initialize();
    
    // Get initial collection info
    const initialInfo = await vectorClient.getCollectionInfo();
    console.log(`📊 Initial collection state: ${initialInfo.count} vectors\n`);

    // Test upsert operation
    console.log('📤 Testing upsert operation...');
    await vectorClient.upsert(sampleChunks);
    
    // Get updated collection info
    const updatedInfo = await vectorClient.getCollectionInfo();
    console.log(`📊 After upsert: ${updatedInfo.count} vectors, ${updatedInfo.dimension} dimensions\n`);

    // Test text-based query
    console.log('🔍 Testing text-based queries...');
    const aiQuery = await vectorClient.query('artificial intelligence and machine learning', QUERY_LIMIT);
    console.log(`Query "AI and ML" returned ${aiQuery.length} results:`);
    aiQuery.forEach((result, i) => {
      console.log(`  ${i + 1}. Score: ${result.score.toFixed(SCORE_PRECISION)}, Source: ${result.metadata.source}`);
      console.log(`     "${result.content.substring(0, CONTENT_PREVIEW_LENGTH)}..."`);
    });
    console.log();

    const sportsQuery = await vectorClient.query('sports training championship', QUERY_LIMIT);
    console.log(`Query "sports training" returned ${sportsQuery.length} results:`);
    sportsQuery.forEach((result, i) => {
      console.log(`  ${i + 1}. Score: ${result.score.toFixed(SCORE_PRECISION)}, Source: ${result.metadata.source}`);
      console.log(`     "${result.content.substring(0, CONTENT_PREVIEW_LENGTH)}..."`);
    });
    console.log();

    // Test metadata filtering
    console.log('🔍 Testing metadata filtering...');
    const techQuery = await vectorClient.query('technology news', FILTER_QUERY_LIMIT, {
      source: 'tech-news.com',
    });
    console.log(`Query with source filter returned ${techQuery.length} results\n`);

    // Test vector-based query
    console.log('🔍 Testing vector-based query...');
    // Get embedding for one of our samples and search for similar
    const llmClient = new LLMClient();
    const testEmbedding = await llmClient.embedSingle(sampleChunks[0]!.content);
    const vectorQuery = await vectorClient.queryByVector(testEmbedding.embedding, VECTOR_QUERY_LIMIT);
    console.log(`Vector query returned ${vectorQuery.length} results:`);
    vectorQuery.forEach((result, i) => {
      console.log(`  ${i + 1}. Score: ${result.score.toFixed(SCORE_PRECISION)}, ID: ${result.id}`);
    });
    console.log();

    // Test get all operation
    console.log('📋 Testing get all vectors...');
    const allVectors = await vectorClient.getAll();
    console.log(`Retrieved ${allVectors.length} total vectors`);
    allVectors.forEach(vector => {
      console.log(`  - ${vector.id}: ${vector.metadata.title}`);
    });
    console.log();

    // Test deletion
    console.log('🗑️ Testing deletion...');
    await vectorClient.deleteByIds(['test-chunk-2']);
    const afterDeleteInfo = await vectorClient.getCollectionInfo();
    console.log(`After deletion: ${afterDeleteInfo.count} vectors remaining\n`);

    // Test collection reset
    console.log('🔄 Testing collection reset...');
    await vectorClient.reset();
    const resetInfo = await vectorClient.getCollectionInfo();
    console.log(`After reset: ${resetInfo.count} vectors\n`);

    console.log('🎉 All Chroma Vector Client tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run test if called directly
testVectorClient();