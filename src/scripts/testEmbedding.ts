#!/usr/bin/env tsx

import 'dotenv/config';
import { LLMClient } from '../lib/llmClient.js';

// Constants
const PREVIEW_COUNT = 5;
const DECIMAL_PLACES = 6;
const LONG_TEXT_REPEATS = 1000;
const CHUNK_TOKEN_LIMIT = 1000;

async function testEmbedding() {
  try {
    console.log('🧪 Testing LLM Client...\n');
    
    // Initialize client
    const llmClient = new LLMClient();
    console.log(`✅ LLM Client initialized with model: ${llmClient.getModel()}`);
    console.log(`📊 Embedding dimensions: ${llmClient.getEmbeddingDimensions()}\n`);

    // Test single embedding
    console.log('🔍 Testing single text embedding...');
    const testText = 'This is a test article about artificial intelligence and machine learning technologies.';
    console.log(`📝 Text: "${testText}"`);
    console.log(`🔢 Estimated tokens: ${llmClient.estimateTokens(testText)}`);
    
    const singleResult = await llmClient.embedSingle(testText);
    console.log('✅ Single embedding generated:');
    console.log(`   - Dimensions: ${singleResult.embedding.length}`);
    console.log(`   - Tokens used: ${singleResult.tokens}`);
    console.log(`   - First ${PREVIEW_COUNT} values: [${singleResult.embedding.slice(0, PREVIEW_COUNT).map(v => v.toFixed(DECIMAL_PLACES)).join(', ')}, ...]\n`);

    // Test batch embeddings
    console.log('📦 Testing batch embeddings...');
    const batchTexts = [
      'Technology news about AI developments',
      'Sports coverage from recent games',
      'Economic analysis of market trends',
      'Health and wellness tips for daily life',
    ];
    
    console.log(`📝 Batch of ${batchTexts.length} texts:`);
    batchTexts.forEach((text, i) => {
      console.log(`   ${i + 1}. "${text}"`);
    });

    const batchResult = await llmClient.embed(batchTexts);
    console.log('✅ Batch embeddings generated:');
    console.log(`   - Count: ${batchResult.embeddings.length}`);
    console.log(`   - Total tokens: ${batchResult.totalTokens}`);
    console.log(`   - Average tokens per text: ${Math.round(batchResult.totalTokens / batchTexts.length)}\n`);

    // Test text splitting
    console.log('✂️ Testing text splitting...');
    const longText = 'This is a very long text. '.repeat(LONG_TEXT_REPEATS);
    console.log(`📝 Long text length: ${longText.length} characters`);
    console.log(`🔢 Estimated tokens: ${llmClient.estimateTokens(longText)}`);
    
    const chunks = llmClient.splitTextIfNeeded(longText, CHUNK_TOKEN_LIMIT);
    console.log(`✅ Text split into ${chunks.length} chunks`);
    chunks.forEach((chunk, i) => {
      console.log(`   Chunk ${i + 1}: ${chunk.length} chars, ~${llmClient.estimateTokens(chunk)} tokens`);
    });

    console.log('\n🎉 All tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run test if called directly
testEmbedding();