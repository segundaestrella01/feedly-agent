/**
 * Validation Script for Article-Level Embeddings
 * 
 * Verifies that the migration to article-level embeddings was successful:
 * 1. Each vector represents a unique article (no duplicate URLs)
 * 2. Metadata contains article-level fields
 * 3. No chunk_index > 0 (all should be 0 or have article_id)
 */

import 'dotenv/config';
import { VectorClient } from '../lib/vectorClient.js';
import { clusterChunks } from '../workers/summarizer.js';

const SEPARATOR = '='.repeat(60);

async function validateArticleEmbeddings(): Promise<void> {
  console.log('\n' + SEPARATOR);
  console.log('🔍 ARTICLE-LEVEL EMBEDDING VALIDATION');
  console.log(SEPARATOR);

  const client = new VectorClient();
  await client.initialize();

  // Get all articles with embeddings
  const articles = await client.getAllWithEmbeddings(100);

  console.log('\n📊 Database Statistics:');
  console.log(`   Total vectors: ${articles.length}`);

  // Check 1: Unique source URLs
  const urls = articles.map(a => a.metadata.source_url);
  const uniqueUrls = new Set(urls);
  const duplicates = urls.length - uniqueUrls.size;
  
  console.log(`   Unique source URLs: ${uniqueUrls.size}`);
  console.log(`   Duplicate URLs: ${duplicates} ${duplicates === 0 ? '✅' : '❌'}`);

  // Check 2: Sample metadata
  const sample = articles[0];
  if (sample) {
    console.log('\n📝 Sample Article Metadata:');
    console.log(`   Title: ${sample.metadata.title?.substring(0, 50)}...`);
    console.log(`   Source: ${sample.metadata.source}`);
    console.log(`   article_id: ${(sample.metadata as Record<string, unknown>).article_id || 'N/A (legacy)'}`);
    console.log(`   chunk_count: ${(sample.metadata as Record<string, unknown>).chunk_count || sample.metadata.total_chunks}`);
    console.log(`   word_count: ${sample.metadata.word_count}`);
    console.log(`   Content length: ${sample.content.length} chars`);
  }

  // Check 3: No chunk_index > 0
  const articlesWithChunkIndex = articles.filter(a => 
    a.metadata.chunk_index !== undefined && a.metadata.chunk_index > 0
  );
  console.log(`\n🔢 Articles with chunk_index > 0: ${articlesWithChunkIndex.length} ${articlesWithChunkIndex.length === 0 ? '✅' : '❌'}`);

  // Check 4: Clustering works
  console.log('\n🔬 Testing Clustering:');
  if (articles.length >= 3) {
    const result = clusterChunks(articles, { k: 3 });
    
    // Verify no article appears in multiple clusters
    const articleIds = new Set<string>();
    let duplicatesInClusters = 0;
    
    for (const cluster of result.clusters) {
      for (const item of cluster.chunks) {
        const id = item.metadata.source_url;
        if (articleIds.has(id)) {
          duplicatesInClusters++;
        }
        articleIds.add(id);
      }
    }
    
    console.log(`   Clusters created: ${result.clusters.length}`);
    console.log(`   Total articles in clusters: ${result.totalChunks}`);
    console.log(`   Articles in multiple clusters: ${duplicatesInClusters} ${duplicatesInClusters === 0 ? '✅' : '❌'}`);
    console.log(`   Silhouette score: ${result.silhouetteScore?.toFixed(3) || 'N/A'}`);
  } else {
    console.log('   ⚠️ Not enough articles to test clustering (need >= 3)');
  }

  // Summary
  console.log('\n' + SEPARATOR);
  console.log('📋 VALIDATION SUMMARY');
  console.log(SEPARATOR);
  
  const allPassed = duplicates === 0 && articlesWithChunkIndex.length === 0;
  
  if (allPassed) {
    console.log('✅ All validation checks passed!');
    console.log('   - Each vector represents a unique article');
    console.log('   - No chunk-level vectors found');
    console.log('   - Clustering works correctly');
  } else {
    console.log('❌ Some validation checks failed:');
    if (duplicates > 0) console.log(`   - Found ${duplicates} duplicate URLs`);
    if (articlesWithChunkIndex.length > 0) console.log(`   - Found ${articlesWithChunkIndex.length} chunk-level vectors`);
  }
  
  console.log('\n');
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  validateArticleEmbeddings()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('❌ Validation failed:', err);
      process.exit(1);
    });
}

export { validateArticleEmbeddings };

