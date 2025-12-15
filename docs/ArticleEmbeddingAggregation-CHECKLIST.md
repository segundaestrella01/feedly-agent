# Article-Level Embedding Aggregation - Implementation Checklist

> Reference: [ArticleEmbeddingAggregation-PLAN.md](./ArticleEmbeddingAggregation-PLAN.md)

## Pre-Implementation

- [ ] Review current chunk storage format in ChromaDB
- [ ] Determine max content size to store per article (~4000 chars recommended)
- [ ] Decide on aggregation method (weighted average vs simple average)
- [ ] Back up existing vector database

---

## Phase 1: Types & Aggregation Module ✅

### 1.1 Update Types
- [x] Add `ArticleWithEmbedding` interface to `src/types/vector.ts`
- [x] Add `ArticleMetadata` interface to `src/types/vector.ts`
- [x] Add `ArticleQueryResult` interface to `src/types/vector.ts`
- [x] Add `AggregationResult` interface to `src/types/vector.ts`
- [x] Types auto-exported via `src/types/index.ts` (re-exports vector.ts)

### 1.2 Create Aggregation Module
- [x] Create `src/lib/embeddingAggregator.ts`
- [x] Implement `generateArticleId(sourceUrl: string): string`
- [x] Implement `aggregateEmbeddings(embeddings: number[][], usePositionWeighting?: boolean): number[]`
- [x] Implement `combineChunkContent(chunks, maxChars?: number): string`
- [x] Implement `groupChunksByArticle(chunks): Map<string, T[]>`
- [x] Implement `calculateTotalWordCount(chunks): number`
- [x] Implement `calculateTotalCharCount(chunks): number`
- [x] Implement `createAggregationResult(articleUrl, chunks, embeddings, maxContentChars?): AggregationResult`
- [ ] Add unit tests for aggregation functions

---

## Phase 2: Modify Embedder Worker

### 2.1 Update Embedder Logic
- [ ] Import aggregation functions in `src/workers/embedder.ts`
- [ ] Modify `processChunkFile()` to group chunks by article before processing
- [ ] Update `convertChunksToVectorFormat()` to produce article-level format
- [ ] Compute aggregated embedding per article
- [ ] Combine chunk content into single document text

### 2.2 Update Metadata Handling
- [ ] Update metadata to include `chunk_count` instead of `chunk_index`
- [ ] Remove `total_chunks` (now implicit - it's 1)
- [ ] Calculate `total_word_count` and `total_char_count` as sums

### 2.3 Test Embedder Changes
- [ ] Run embedder on sample data
- [ ] Verify single vector per article in ChromaDB
- [ ] Verify metadata contains correct aggregated values

---

## Phase 3: Update Vector Client

### 3.1 Schema Updates
- [ ] Update `ChunkMetadata` or create `ArticleMetadata` in vectorClient
- [ ] Ensure upsert handles new metadata fields
- [ ] Update query result parsing for new metadata format

### 3.2 Query Methods
- [ ] Verify `query()` returns article-level results
- [ ] Verify `getAllWithEmbeddings()` works with new format
- [ ] Update any chunk-specific logic to article-level

---

## Phase 4: Simplify Retriever

### 4.1 Remove Chunk-Level Logic
- [ ] Simplify `removeDuplicates()` - may no longer be needed
- [ ] Update `applyDiversityFilter()` - now operates on articles
- [ ] Remove `chunk_index` references from deduplication key

### 4.2 Update Result Handling
- [ ] Update `QueryResult` usage to reflect article-level data
- [ ] Simplify hybrid scoring (no chunk-level adjustments needed)

### 4.3 Test Retrieval
- [ ] Run retrieval queries
- [ ] Verify results are unique articles (no duplicates from same URL)
- [ ] Verify diversity filter distributes across sources correctly

---

## Phase 5: Update Clustering & Summarizer

### 5.1 Clustering Updates
- [ ] Update `clusterChunks()` in `src/workers/summarizer.ts`
- [ ] Rename to `clusterArticles()` or update documentation
- [ ] Each cluster item is now an article, not a chunk
- [ ] Update `Cluster` type if needed

### 5.2 Test Clustering
- [ ] Run clustering on article-level data
- [ ] Verify silhouette score is reasonable
- [ ] Verify no article appears in multiple clusters

---

## Phase 6: Update Digest Generation

### 6.1 Article References
- [ ] Simplify `formatArticleReferences()` in `src/workers/digest.ts`
- [ ] Remove deduplication logic (no longer needed)
- [ ] Each cluster item IS an article

### 6.2 Article Counting
- [ ] Update `articleCount` calculation: `cluster.articles.length`
- [ ] Update total article count in metadata

### 6.3 Content for LLM
- [ ] Use `combinedContent` from article for summarization
- [ ] Update prompts if needed to reference "article" not "chunks"

### 6.4 Test Digest
- [ ] Generate digest with new pipeline
- [ ] Verify article count matches unique articles
- [ ] Verify no duplicate articles in output
- [ ] Verify summaries are coherent

---

## Phase 7: Migration & Cleanup

### 7.1 Data Migration
- [ ] Create migration script `src/scripts/migrateToArticleEmbeddings.ts`
- [ ] Clear existing ChromaDB collection
- [ ] Re-run embedder on all existing chunk files
- [ ] Verify migration completed successfully

### 7.2 Code Cleanup
- [ ] Remove unused chunk-level types (if any)
- [ ] Update comments and documentation
- [ ] Remove dead code paths

### 7.3 Documentation
- [ ] Update README.md if needed
- [ ] Update PLAN.md to reflect completed work
- [ ] Add notes to RAG_Learnings.md

---

## Phase 8: Testing & Validation

### 8.1 Unit Tests
- [ ] Test `aggregateEmbeddings()` with various inputs
- [ ] Test `combineChunkContent()` with truncation
- [ ] Test `groupChunksByArticle()` 

### 8.2 Integration Tests
- [ ] Test full pipeline: fetch → chunk → embed → store → retrieve → cluster → digest
- [ ] Verify end-to-end article counting

### 8.3 Quality Validation
- [ ] Compare digest quality before/after
- [ ] Verify clustering silhouette scores
- [ ] Check query latency improvement

---

## Post-Implementation

- [ ] Monitor for any issues in production use
- [ ] Document any edge cases discovered
- [ ] Consider removing chunk files if no longer needed (optional)

---

## Notes

_Add implementation notes, decisions, and issues here as you work through the checklist._

```
Date: 
Notes:

```

