#!/usr/bin/env node
/**
 * Simple test to verify basic vector querying works
 */

// Ensure environment is loaded
import 'dotenv/config';

import { VectorClient } from '../lib/vectorClient.js';

async function simpleQueryTest() {
  console.log('🧪 Testing basic vector query...');
  
  const vectorClient = new VectorClient();
  await vectorClient.initialize();

  try {
    // Test without any filters first
    const results = await vectorClient.query('artificial intelligence', 5);
    console.log(`✅ Found ${results.length} results`);
    
    if (results.length > 0) {
      console.log('\n📊 Sample results:');
      results.forEach((result, index) => {
        console.log(`${index + 1}. [${result.score.toFixed(3)}] ${result.metadata.title}`);
        console.log(`   Published: ${result.metadata.published_date}`);
        console.log(`   Source: ${result.metadata.source}`);
      });
    }
    
    return true;
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}

// Run test
if (import.meta.url === `file://${process.argv[1]}`) {
  simpleQueryTest().then(success => {
    console.log(success ? '\n✅ Basic query test passed!' : '\n❌ Basic query test failed!');
    process.exit(success ? 0 : 1);
  }).catch(console.error);
}

export { simpleQueryTest };