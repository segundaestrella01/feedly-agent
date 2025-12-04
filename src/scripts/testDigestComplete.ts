/**
 * Complete Digest Test Suite
 * 
 * Runs all digest-related tests in sequence and provides a comprehensive summary.
 * This is the master test script for Phase 3.4 Testing.
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '../..');

interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  output?: string;
}

/**
 * Run a test script and capture results
 */
function runTest(scriptName: string, displayName: string): Promise<TestResult> {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const process = spawn('npm', ['run', scriptName], {
      cwd: rootDir,
      shell: true,
    });

    let output = '';

    process.stdout.on('data', (data) => {
      output += data.toString();
    });

    process.stderr.on('data', (data) => {
      output += data.toString();
    });

    process.on('close', (code) => {
      const duration = Date.now() - startTime;
      resolve({
        name: displayName,
        passed: code === 0,
        duration,
        output,
      });
    });
  });
}

/**
 * Main test runner
 */
async function runAllTests() {
  console.log('🧪 Complete Digest Test Suite\n');
  console.log('==================================================\n');
  console.log('Running all digest-related tests...\n');

  const tests = [
    { script: 'test:chat', name: 'Chat Completion (Phase 1)' },
    { script: 'test:digest-types', name: 'Digest Types (Phase 2)' },
    { script: 'test:digest-summarization', name: 'Cluster Summarization (Phase 2)' },
    { script: 'test:digest-edge-cases', name: 'Edge Cases (Phase 2)' },
    { script: 'test:digest-generation', name: 'Digest Generation (Phase 3.1)' },
    { script: 'test:notion', name: 'Notion Client (Phase 3.2)' },
    { script: 'test:digest-integration', name: 'Integration Test (Phase 3.4)' },
  ];

  const results: TestResult[] = [];

  for (const test of tests) {
    console.log(`\n📝 Running: ${test.name}...`);
    const result = await runTest(test.script, test.name);
    results.push(result);
    
    if (result.passed) {
      console.log(`✅ ${test.name} passed (${result.duration}ms)`);
    } else {
      console.log(`❌ ${test.name} failed (${result.duration}ms)`);
    }
  }

  // Print summary
  console.log('\n==================================================');
  console.log('\n📊 Test Suite Summary\n');

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

  console.log(`Total Tests: ${results.length}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⏱️  Total Duration: ${(totalDuration / 1000).toFixed(2)}s`);

  console.log('\nDetailed Results:\n');
  results.forEach((result, index) => {
    const status = result.passed ? '✅' : '❌';
    const duration = (result.duration / 1000).toFixed(2);
    console.log(`${index + 1}. ${status} ${result.name} (${duration}s)`);
  });

  // Print phase summary
  console.log('\n==================================================');
  console.log('\n📋 Phase Summary\n');

  const phases = [
    {
      name: 'Phase 1: LLM Chat Completion',
      tests: results.filter(r => r.name.includes('Phase 1')),
    },
    {
      name: 'Phase 2: Cluster Summarization',
      tests: results.filter(r => r.name.includes('Phase 2')),
    },
    {
      name: 'Phase 3.1: Digest Pipeline',
      tests: results.filter(r => r.name.includes('Phase 3.1')),
    },
    {
      name: 'Phase 3.2: Notion Client',
      tests: results.filter(r => r.name.includes('Phase 3.2')),
    },
    {
      name: 'Phase 3.4: Integration',
      tests: results.filter(r => r.name.includes('Phase 3.4')),
    },
  ];

  phases.forEach(phase => {
    if (phase.tests.length > 0) {
      const phasePassed = phase.tests.every(t => t.passed);
      const status = phasePassed ? '✅' : '❌';
      console.log(`${status} ${phase.name}: ${phase.tests.filter(t => t.passed).length}/${phase.tests.length} tests passed`);
    }
  });

  // Final verdict
  console.log('\n==================================================\n');

  if (failed === 0) {
    console.log('🎉 All tests passed! Stage 4 implementation is complete.\n');
    console.log('✅ Phase 1: LLM Chat Completion - Complete');
    console.log('✅ Phase 2: Cluster Summarization - Complete');
    console.log('✅ Phase 3.1: Digest Pipeline - Complete');
    console.log('✅ Phase 3.2: Notion Client - Complete');
    console.log('✅ Phase 3.3: Notion Block Formatting - Complete');
    console.log('✅ Phase 3.4: Testing - Complete');
    console.log('\n🚀 Ready for Phase 4: Notion Integration & CLI');
  } else {
    console.log(`⚠️  ${failed} test(s) failed. Review the output above for details.\n`);
    console.log('Note: Some tests may fail if:');
    console.log('  - The vector database is empty (run RSS fetcher and embedder)');
    console.log('  - Notion credentials are not configured');
    console.log('  - The Notion database is not shared with the integration');
    process.exit(1);
  }
}

// Run all tests
runAllTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

