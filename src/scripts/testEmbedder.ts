import 'dotenv/config';
import { EmbedderWorker } from '../workers/embedder.js';

/**
 * Test script for the embedder worker
 * This will process all chunk files and embed them to Chroma
 */
async function testEmbedder() {
  console.log('🧪 Testing Embedder Worker...\n');

  try {
    // Create and run the embedder worker
    const worker = new EmbedderWorker();
    await worker.embedAndUpsert();

    console.log('\n✅ Embedder worker test completed successfully!');

  } catch (error) {
    console.error('\n❌ Embedder worker test failed:', error);
    throw error;
  }
}

// Run the test
testEmbedder()
  .then(() => {
    console.log('\n🎉 All tests passed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Test failed:', error);
    process.exit(1);
  });
export { testEmbedder };