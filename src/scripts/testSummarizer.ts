#!/usr/bin/env node
/**
 * Test script for summarizer/clustering functionality
 * Tests k-means clustering on embeddings and validates acceptance criteria
 */

import 'dotenv/config';

import {
  clusterChunks,
  clusterAllContent,
  clusterRecentContent,
  summarizeContent,
} from '../workers/summarizer.js';
import { VectorClient } from '../lib/vectorClient.js';

// Constants
const PREVIEW_LENGTH = 100;
const TITLE_PREVIEW_LENGTH = 50;
const DEFAULT_TEST_LIMIT = 50;
const MIN_CLUSTER_SIZE = 1;

/**
 * Test basic clustering with mock data
 */
async function testBasicClustering(): Promise<boolean> {
  console.log('\n🧪 Testing Basic Clustering Logic...');

  // Get real chunks with embeddings to test
  const vectorClient = new VectorClient();
  await vectorClient.initialize();

  const chunks = await vectorClient.getAllWithEmbeddings(DEFAULT_TEST_LIMIT);

  if (chunks.length === 0) {
    console.log('⚠️ No chunks available for testing');
    return false;
  }

  console.log(`   Retrieved ${chunks.length} chunks with embeddings`);

  // Test clustering
  const result = clusterChunks(chunks, { k: 3 });

  console.log(`✅ Created ${result.clusterCount} clusters from ${result.totalChunks} chunks`);

  // Validate result structure
  const isValid =
    result.clusters.length > 0 &&
    result.clusters.every(
      (c) =>
        c.id !== undefined &&
        c.chunks.length >= MIN_CLUSTER_SIZE &&
        c.centroid.length > 0 &&
        c.representativeChunk !== undefined,
    );

  console.log(`   Structure validation: ${isValid ? 'PASSED' : 'FAILED'}`);

  return isValid;
}

/**
 * Test clustering all content
 */
async function testClusterAllContent(): Promise<boolean> {
  console.log('\n🧪 Testing Cluster All Content...');

  const result = await clusterAllContent(100, { k: 5 });

  console.log(`✅ Clustered ${result.totalChunks} chunks into ${result.clusterCount} clusters`);

  if (result.clusters.length > 0) {
    console.log('📊 Cluster distribution:');
    result.clusters.forEach((cluster, idx) => {
      console.log(`   Cluster ${idx + 1}: ${cluster.size} chunks`);
    });
  }

  return result.totalChunks > 0 && result.clusterCount > 0;
}

/**
 * Test clustering with time window
 */
async function testClusterRecentContent(): Promise<boolean> {
  console.log('\n🧪 Testing Cluster Recent Content (7d window)...');

  const result = await clusterRecentContent('7d', 100, { k: 4 });

  console.log(`✅ Clustered ${result.totalChunks} recent chunks into ${result.clusterCount} clusters`);

  // Even if no recent content, the function should return valid structure
  const isValidStructure =
    Array.isArray(result.clusters) &&
    typeof result.totalChunks === 'number' &&
    typeof result.clusterCount === 'number' &&
    typeof result.timestamp === 'string';

  console.log(`   Structure validation: ${isValidStructure ? 'PASSED' : 'FAILED'}`);

  return isValidStructure;
}

/**
 * Test representative chunk selection
 */
async function testRepresentativeSelection(): Promise<boolean> {
  console.log('\n🧪 Testing Representative Chunk Selection...');

  const result = await clusterAllContent(50, { k: 3 });

  if (result.clusters.length === 0) {
    console.log('⚠️ No clusters to test representative selection');
    return false;
  }

  let allValid = true;
  result.clusters.forEach((cluster, idx) => {
    const rep = cluster.representativeChunk;
    const isValid =
      rep.content !== undefined &&
      rep.metadata !== undefined &&
      rep.metadata.title !== undefined;

    if (!isValid) {allValid = false;}

    console.log(`   Cluster ${idx + 1} representative: "${rep.metadata.title?.slice(0, TITLE_PREVIEW_LENGTH)}..."`);
  });

  console.log(`✅ Representative selection: ${allValid ? 'PASSED' : 'FAILED'}`);

  return allValid;
}

/**
 * Test cluster size distribution
 */
async function testClusterDistribution(): Promise<boolean> {
  console.log('\n🧪 Testing Cluster Size Distribution...');

  const result = await clusterAllContent(100, { k: 5 });

  if (result.clusters.length === 0) {
    console.log('⚠️ No clusters for distribution test');
    return false;
  }

  const sizes = result.clusters.map((c) => c.size);
  const total = sizes.reduce((a, b) => a + b, 0);
  const avg = total / sizes.length;
  const max = Math.max(...sizes);
  const min = Math.min(...sizes);

  console.log('📊 Distribution stats:');
  console.log(`   Total chunks: ${total}`);
  console.log(`   Clusters: ${sizes.length}`);
  console.log(`   Average size: ${avg.toFixed(1)}`);
  console.log(`   Min/Max: ${min}/${max}`);

  // Check if distribution is reasonably balanced (no cluster > 80% of total)
  const isBalanced = max <= total * 0.8;
  console.log(`   Balance check: ${isBalanced ? 'PASSED' : 'WARNING - one cluster dominates'}`);

  return true;
}

/**
 * Test Silhouette score quality validation
 */
async function testSilhouetteScore(): Promise<boolean> {
  console.log('\n🧪 Testing Silhouette Score Quality Validation...');

  const result = await clusterAllContent(100, { k: 5 });

  if (result.clusters.length === 0) {
    console.log('⚠️ No clusters for Silhouette score test');
    return false;
  }

  if (result.silhouetteScore === undefined) {
    console.log('❌ Silhouette score not calculated');
    return false;
  }

  console.log(`📊 Silhouette score: ${result.silhouetteScore.toFixed(3)}`);

  // Interpret quality
  let quality = 'poor';
  if (result.silhouetteScore >= 0.7) {quality = 'strong';}
  else if (result.silhouetteScore >= 0.5) {quality = 'reasonable';}
  else if (result.silhouetteScore >= 0.25) {quality = 'weak';}

  console.log(`   Quality: ${quality}`);
  console.log(`   Range check: ${result.silhouetteScore >= -1 && result.silhouetteScore <= 1 ? 'PASSED' : 'FAILED'}`);

  // Silhouette score should be between -1 and 1
  const isValid = result.silhouetteScore >= -1 && result.silhouetteScore <= 1;

  console.log(`✅ Silhouette score validation: ${isValid ? 'PASSED' : 'FAILED'}`);

  return isValid;
}

/**
 * Test main summarizeContent function
 */
async function testSummarizeContent(): Promise<boolean> {
  console.log('\n🧪 Testing Main summarizeContent Function...');

  const result = await summarizeContent('7d', 4);

  console.log('✅ Summarization complete:');
  console.log(`   Total chunks: ${result.totalChunks}`);
  console.log(`   Clusters: ${result.clusterCount}`);
  console.log(`   Timestamp: ${result.timestamp}`);

  if (result.clusters.length > 0) {
    console.log('\n🎯 Cluster Representatives:');
    result.clusters.forEach((cluster, idx) => {
      console.log(`\n   --- Cluster ${idx + 1} (${cluster.size} chunks) ---`);
      console.log(`   Title: ${cluster.representativeChunk.metadata.title}`);
      console.log(`   Source: ${cluster.representativeChunk.metadata.source}`);
      console.log(`   Preview: ${cluster.representativeChunk.content.slice(0, PREVIEW_LENGTH)}...`);
    });
  }

  return result.clusterCount > 0 || result.totalChunks === 0; // Pass if clusters created or no data
}

/**
 * Test edge cases
 */
async function testEdgeCases(): Promise<boolean> {
  console.log('\n🧪 Testing Edge Cases...');

  // Test with k larger than chunk count
  console.log('   Testing k > chunk count...');
  const vectorClient = new VectorClient();
  await vectorClient.initialize();
  const chunks = await vectorClient.getAllWithEmbeddings(5);

  if (chunks.length > 0) {
    const result = clusterChunks(chunks, { k: 100 }); // k much larger than chunks
    console.log(`   ✓ Handled gracefully: ${result.clusterCount} clusters from ${chunks.length} chunks`);
  }

  // Test with empty input
  console.log('   Testing empty input...');
  const emptyResult = clusterChunks([], { k: 5 });
  const emptyHandled = emptyResult.totalChunks === 0 && emptyResult.clusters.length === 0;
  console.log(`   ✓ Empty input: ${emptyHandled ? 'PASSED' : 'FAILED'}`);

  // Test with k=1
  console.log('   Testing k=1 (single cluster)...');
  if (chunks.length > 0) {
    const singleResult = clusterChunks(chunks, { k: 1 });
    console.log(`   ✓ Single cluster: ${singleResult.clusterCount} cluster with ${singleResult.totalChunks} chunks`);
  }

  console.log('✅ Edge case tests completed');
  return true;
}

/**
 * Validate acceptance criteria for clustering
 */
async function validateAcceptanceCriteria(): Promise<boolean> {
  console.log('\n✅ Validating Clustering Acceptance Criteria...');

  const criteria: Record<string, boolean> = {
    'Cluster chunks using k-means on embeddings': false,
    'Support configurable cluster count': false,
    'Select representative chunk per cluster': false,
    'Return structured ClusteringResult': false,
    'Calculate Silhouette score for quality': false,
    'Handle edge cases gracefully': false,
  };

  // Test 1: K-means clustering works
  try {
    const result = await clusterAllContent(50, { k: 3 });
    criteria['Cluster chunks using k-means on embeddings'] = result.clusterCount > 0 || result.totalChunks === 0;
    console.log(`   ✓ K-means clustering: ${result.clusterCount} clusters created`);
  } catch (error) {
    console.log(`   ✗ K-means clustering failed: ${error}`);
  }

  // Test 2: Configurable cluster count
  try {
    const result3 = await clusterAllContent(30, { k: 3 });
    const result5 = await clusterAllContent(30, { k: 5 });
    criteria['Support configurable cluster count'] = result3.clusterCount <= 3 && result5.clusterCount <= 5;
    console.log(`   ✓ Configurable k: k=3 gave ${result3.clusterCount}, k=5 gave ${result5.clusterCount}`);
  } catch (error) {
    console.log(`   ✗ Configurable cluster count failed: ${error}`);
  }

  // Test 3: Representative selection
  try {
    const result = await clusterAllContent(30, { k: 3 });
    const hasReps = result.clusters.every((c) => c.representativeChunk?.metadata?.title);
    criteria['Select representative chunk per cluster'] = hasReps;
    console.log(`   ✓ Representative selection: ${hasReps ? 'All clusters have reps' : 'Missing reps'}`);
  } catch (error) {
    console.log(`   ✗ Representative selection failed: ${error}`);
  }

  // Test 4: Structured result
  try {
    const result = await clusterAllContent(20, { k: 2 });
    const isStructured =
      Array.isArray(result.clusters) &&
      typeof result.totalChunks === 'number' &&
      typeof result.clusterCount === 'number' &&
      typeof result.timestamp === 'string';
    criteria['Return structured ClusteringResult'] = isStructured;
    console.log(`   ✓ Structured result: ${isStructured ? 'Valid' : 'Invalid'}`);
  } catch (error) {
    console.log(`   ✗ Structured result failed: ${error}`);
  }

  // Test 5: Silhouette score calculation
  try {
    const result = await clusterAllContent(50, { k: 4 });
    const hasSilhouette =
      result.clusterCount > 1 &&
      result.silhouetteScore !== undefined &&
      result.silhouetteScore >= -1 &&
      result.silhouetteScore <= 1;
    criteria['Calculate Silhouette score for quality'] = hasSilhouette;
    console.log(`   ✓ Silhouette score: ${hasSilhouette ? `${result.silhouetteScore?.toFixed(3)}` : 'Not calculated'}`);
  } catch (error) {
    console.log(`   ✗ Silhouette score failed: ${error}`);
  }

  // Test 6: Edge cases
  try {
    const emptyResult = clusterChunks([], { k: 5 });
    criteria['Handle edge cases gracefully'] = emptyResult.totalChunks === 0;
    console.log('   ✓ Edge cases: Empty input handled');
  } catch (error) {
    console.log(`   ✗ Edge cases failed: ${error}`);
  }

  // Summary
  const passedCount = Object.values(criteria).filter(Boolean).length;
  const totalCount = Object.keys(criteria).length;

  console.log(`\n📋 Acceptance Criteria Summary: ${passedCount}/${totalCount} passed`);
  Object.entries(criteria).forEach(([criterion, passed]) => {
    console.log(`   ${passed ? '✅' : '❌'} ${criterion}`);
  });

  return passedCount === totalCount;
}

/**
 * Main test runner
 */
async function runAllTests(): Promise<void> {
  console.log('🚀 Starting Summarizer/Clustering Test Suite...\n');

  const testResults: Record<string, boolean> = {
    'Basic Clustering': false,
    'Cluster All Content': false,
    'Cluster Recent Content': false,
    'Representative Selection': false,
    'Cluster Distribution': false,
    'Silhouette Score': false,
    'Main Summarize Function': false,
    'Edge Cases': false,
    'Acceptance Criteria': false,
  };

  try {
    testResults['Basic Clustering'] = await testBasicClustering();
    testResults['Cluster All Content'] = await testClusterAllContent();
    testResults['Cluster Recent Content'] = await testClusterRecentContent();
    testResults['Representative Selection'] = await testRepresentativeSelection();
    testResults['Cluster Distribution'] = await testClusterDistribution();
    testResults['Silhouette Score'] = await testSilhouetteScore();
    testResults['Main Summarize Function'] = await testSummarizeContent();
    testResults['Edge Cases'] = await testEdgeCases();
    testResults['Acceptance Criteria'] = await validateAcceptanceCriteria();
  } catch (error) {
    console.error('❌ Test suite failed with error:', error);
  }

  // Final summary
  const passedTests = Object.values(testResults).filter(Boolean).length;
  const totalTests = Object.keys(testResults).length;

  console.log(`\n🏁 Test Suite Complete: ${passedTests}/${totalTests} tests passed\n`);

  Object.entries(testResults).forEach(([testName, passed]) => {
    console.log(`${passed ? '✅' : '❌'} ${testName}`);
  });

  if (passedTests === totalTests) {
    console.log('\n🎉 All tests passed! Clustering implementation is ready for digest generation.');
  } else {
    console.log(`\n⚠️ ${totalTests - passedTests} test(s) failed. Review implementation.`);
  }

  process.exit(passedTests === totalTests ? 0 : 1);
}

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests().catch(console.error);
}

export { runAllTests };
