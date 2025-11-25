#!/usr/bin/env tsx

import { getConfig, printConfigSummary, ensureDirectories } from '../lib/config.js';

/**
 * Test configuration setup and validation
 */
async function testConfiguration() {
  console.log('🧪 Testing Configuration Setup...\n');

  try {
    // Test configuration loading
    console.log('📋 Loading configuration...');
    const config = getConfig();
    console.log('✅ Configuration loaded successfully\n');

    // Print configuration summary
    printConfigSummary();

    // Test directory creation
    console.log('\n📁 Ensuring required directories exist...');
    await ensureDirectories();
    console.log('✅ All directories created/verified\n');

    // Test specific configuration values
    console.log('🔍 Testing configuration values...');
    console.log(`OpenAI API Key: ${config.openai.apiKey ? '✅ Set' : '❌ Missing'}`);
    console.log(`LLM API Key: ${config.llm.apiKey ? '✅ Set' : '❌ Missing'}`);
    console.log(`Data Directory: ${config.app.dataDir}`);
    console.log(`Chroma Path: ${config.chroma.dataPath}`);
    console.log(`Collection Name: ${config.chroma.collectionName}`);

    console.log('\n✅ Configuration test completed successfully!');

  } catch (error) {
    console.error('❌ Configuration test failed:', error);
    throw error;
  }
}

// Run the test
const isMainModule = import.meta.url === `file://${process.argv[1]}`;

if (isMainModule) {
  testConfiguration()
    .then(() => {
      console.log('\n🎉 All configuration tests passed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Configuration test failed:', error);
      process.exit(1);
    });
}

export { testConfiguration };