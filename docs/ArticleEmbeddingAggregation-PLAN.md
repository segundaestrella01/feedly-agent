# Article-Level Embedding Aggregation Plan

## Problem Statement

Currently, each article is split into multiple chunks, and each chunk is:
1. Embedded separately
2. Stored as an independent vector in ChromaDB
3. Treated as a separate "article" during clustering and digest generation

This causes:
- **Inflated article counts**: An article split into 5 chunks appears as 5 articles
- **Fragmented clustering**: Chunks from the same article can end up in different clusters
- **Redundant storage**: N chunks × embedding size instead of 1 × embedding size per article
- **Misleading digests**: Same article shown multiple times with different excerpts

## Solution: Article-Level Embedding Aggregation

Aggregate chunk embeddings into a single article-level embedding before storage. Store one vector per article instead of one per chunk.

### Architecture Overview

```
BEFORE (Current):
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│ Article │ -> │ Chunker │ -> │ Embedder│ -> │ ChromaDB│
└─────────┘    └─────────┘    └─────────┘    └─────────┘
                   │               │              │
                   ▼               ▼              ▼
              [5 chunks]    [5 embeddings]   [5 vectors]

AFTER (Proposed):
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌───────────┐    ┌─────────┐
│ Article │ -> │ Chunker │ -> │ Embedder│ -> │ Aggregator│ -> │ ChromaDB│
└─────────┘    └─────────┘    └─────────┘    └───────────┘    └─────────┘
                   │               │              │                │
                   ▼               ▼              ▼                ▼
              [5 chunks]    [5 embeddings]   [1 avg emb]     [1 vector]
                   │                              │
                   ▼                              ▼
              [stored in     [metadata includes article_id,
               metadata       chunk_count, combined_content]
               or DB]
```

## Aggregation Strategy

**Method: Weighted Average by Position**

```typescript
function aggregateEmbeddings(chunkEmbeddings: number[][]): number[] {
  // Weight earlier chunks slightly higher (they usually contain key info)
  const weights = chunkEmbeddings.map((_, i) => 1 / (1 + i * 0.1));
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  
  const dimensions = chunkEmbeddings[0].length;
  const aggregated = new Array(dimensions).fill(0);
  
  for (let i = 0; i < chunkEmbeddings.length; i++) {
    const weight = weights[i] / totalWeight;
    for (let d = 0; d < dimensions; d++) {
      aggregated[d] += chunkEmbeddings[i][d] * weight;
    }
  }
  
  return aggregated;
}
```

Alternative: Simple average (equally weight all chunks).

## Data Model Changes

### New: ArticleEmbedding Type

```typescript
interface ArticleEmbedding {
  id: string;                    // article_id (hash of source_url)
  embedding: number[];           // aggregated embedding
  content: string;               // combined chunk content (for LLM)
  metadata: ArticleMetadata;
}

interface ArticleMetadata {
  source: string;                // RSS feed source
  source_url: string;            // original article URL
  title: string;
  published_date: string;
  chunk_count: number;           // how many chunks were aggregated
  total_word_count: number;      // sum of all chunk word counts
  total_char_count: number;
  categories?: string[];
  tags?: string[];
  content_type: 'article';
  processed_date: string;
  embedded_date: string;
}
```

## Implementation Phases

### Phase 1: Create Aggregation Module
- Create `src/lib/embeddingAggregator.ts`
- Implement `aggregateEmbeddings()` function
- Implement `combineChunkContent()` function (respecting context limits)

### Phase 2: Modify Embedder Worker
- Update `src/workers/embedder.ts` to:
  1. Group chunks by article (using `source_url`)
  2. Embed all chunks of an article
  3. Aggregate embeddings into single article embedding
  4. Combine chunk content (truncated if needed)
  5. Upsert single article vector instead of multiple chunk vectors

### Phase 3: Update Vector Client
- Modify `src/lib/vectorClient.ts` to handle article-level operations
- Update metadata schema for article-level fields
- Ensure backward compatibility during migration

### Phase 4: Update Retrieval
- Simplify `src/workers/retriever.ts`:
  - Remove chunk-level deduplication (no longer needed)
  - Update diversity filter to work on articles
  - Each result IS an article

### Phase 5: Update Clustering & Digest
- Simplify `src/workers/summarizer.ts`: clustering now on articles
- Update `src/workers/digest.ts`:
  - `formatArticleReferences()` no longer needs deduplication
  - Article count is simply `cluster.articles.length`

### Phase 6: Migration & Cleanup
- Create migration script to re-process existing data
- Update types in `src/types/`
- Update tests
- Clean up unused chunk-level code

## Content Handling for LLM

Since we still need to pass content to the LLM for summarization, we have options:

1. **Store combined content in metadata** (recommended for articles < 8KB)
2. **Store chunk content separately** and fetch when needed
3. **Store summary** instead of full content

Recommended: Store truncated combined content (~4000 chars max) in the document field.

## Rollback Strategy

Keep the chunker functionality intact. If article-level aggregation proves problematic:
1. The chunker still produces chunks
2. We can revert embedder to store chunk-level vectors
3. No data loss, just re-embed

## Success Metrics

- [ ] Vector count reduced by ~80% (avg 5 chunks/article → 1)
- [ ] Article count in digest matches actual unique articles
- [ ] Clustering quality maintained or improved (silhouette score)
- [ ] No article appears multiple times in same cluster
- [ ] Query performance improved (fewer vectors to search)

