# Stage 4 Implementation Plan: RAG - Retrieval, Clustering & Summarization

## Overview
This document outlines the detailed implementation plan for Stage 4 of the RSS Learning-Resources AI Agent. This stage implements the core RAG (Retrieval-Augmented Generation) functionality including content retrieval, clustering, and digest generation.

## Current State Analysis
Based on codebase analysis, the following components are already in place:
- ✅ Vector database client (Chroma) with query capabilities
- ✅ LLM client with embedding and completion functionality
- ✅ Skeleton files for retriever, digestGenerator, and summarizer workers
- ✅ Package.json with `npm run digest` script configured
- ✅ Type definitions for vector operations and chunk metadata

## Stage 4 Implementation Tasks

### 4.1 Implement `retriever.ts` - Chunk Retrieval System

#### 4.1.1 Query Strategy Implementation DONE
**File**: `src/workers/retriever.ts`

**Requirements**:
- Query vector DB for relevant chunks from last 24h
- Support multiple query strategies:
  - Semantic similarity search
  - Date-based filtering
  - Source-based filtering
  - Hybrid scoring (recency + relevance)

**Implementation Details**:
```typescript
// Key functions to implement:
- retrieveRecentChunks(timeWindow: string, limit: number)
- retrieveByQuery(query: string, options: QueryOptions)
- retrieveByTopics(topics: string[], limit: number)
- combineAndRankResults(results: QueryResult[])
```

**Acceptance Criteria**:
- [ ] Retrieve top-N chunks (default: 50) from last 24h
- [ ] Support time window filtering (1h, 6h, 12h, 24h, 3d, 7d)
- [ ] Handle empty results gracefully
- [ ] Return results with relevance scores
- [ ] Include rich metadata for clustering

#### 4.1.2 Advanced Retrieval Features TBD
- **Diversity filtering**: Avoid too many chunks from same source
- **Quality scoring**: Combine semantic similarity with content quality metrics
- **User preference integration**: Bias towards user interests (Stage 5 prep)

### 4.2 Implement Content Clustering System

#### 4.2.1 Embedding-based Clustering
**File**: `src/workers/summarizer.ts`

**Requirements**:
- Group similar chunks using embedding similarity
- Implement multiple clustering algorithms:
  - K-means clustering on embeddings
  - Hierarchical clustering
  - Density-based clustering (DBSCAN-like)
  
**Implementation Details**:
```typescript
// Key functions to implement:
- clusterByEmbeddings(chunks: QueryResult[], numClusters: number)
- clusterByTopics(chunks: QueryResult[])
- optimizeClusterCount(chunks: QueryResult[])
- labelClusters(clusters: ChunkCluster[])
```

**Cluster Structure**:
```typescript
interface ChunkCluster {
  id: string;
  label: string;
  summary: string;
  chunks: QueryResult[];
  centroid?: number[];
  coherenceScore: number;
  representativeChunk: QueryResult;
}
```

#### 4.2.2 LLM-Assisted Clustering
**Alternative/Hybrid Approach**:
- Use LLM to identify topics and themes
- Generate cluster labels and descriptions
- Validate clustering quality

**Implementation**:
```typescript
// LLM prompts for clustering:
const CLUSTERING_PROMPT = `
Group these article excerpts into 4-6 coherent topics. 
Return JSON: {
  clusters: [
    {
      id: string,
      label: string,
      summary: string (2 sentences),
      topics: string[],
      representative: {title, url, excerpt}
    }
  ]
}
Input: [{title, excerpt, url}, ...]
`;
```

### 4.3 Implement Daily Digest Generation

#### 4.3.1 Digest Composer
**File**: `src/workers/digestGenerator.ts`

**Requirements**:
- Orchestrate retrieval → clustering → summarization pipeline
- Generate multiple output formats (HTML, text, JSON)
- Include cluster summaries and source links
- Add metadata (generation time, source counts, etc.)

**Implementation Flow**:
1. Retrieve relevant chunks from last 24h
2. Apply clustering algorithm
3. Generate cluster summaries using LLM
4. Format as HTML digest with links
5. Include engagement metrics and source attribution

#### 4.3.2 Digest Templates and Formatting

**HTML Template Structure**:
```html
<!DOCTYPE html>
<html>
<head>
    <title>Daily AI Digest - {date}</title>
    <style>/* Responsive CSS styles */</style>
</head>
<body>
    <header>
        <h1>Daily AI & Tech Digest</h1>
        <p>Generated on {date} • {totalArticles} articles from {sourceCount} sources</p>
    </header>
    
    <main>
        {clusters.map(cluster => 
            <section class="cluster">
                <h2>{cluster.label}</h2>
                <p class="summary">{cluster.summary}</p>
                <div class="articles">
                    {cluster.chunks.map(chunk =>
                        <article>
                            <h3><a href="{url}">{title}</a></h3>
                            <p class="excerpt">{excerpt}</p>
                            <span class="source">{source} • {publishedDate}</span>
                        </article>
                    )}
                </div>
            </section>
        )}
    </main>
    
    <footer>
        <p>Stats: {processingTime}ms • {embeddingCount} embeddings • {clusterCount} clusters</p>
    </footer>
</body>
</html>
```

#### 4.3.3 Multiple Output Formats
- **HTML**: Rich formatting with CSS, suitable for email/web viewing
- **Text**: Plain text for terminal output
- **JSON**: Structured data for API consumption
- **Slack**: Markdown-formatted for Slack posting

### 4.4 LLM Integration for Summarization

#### 4.4.1 Cluster Summarization
**Prompt Templates**:
```typescript
const SUMMARIZATION_PROMPTS = {
  clusterSummary: `
    Summarize this cluster of related articles in exactly 2 sentences.
    Focus on the key insights and trends. Be concise but informative.
    
    Articles:
    {articles}
    
    Summary:
  `,
  
  topicExtraction: `
    Extract 3-5 key topics from these article titles and excerpts.
    Return as a JSON array of strings.
    
    Articles:
    {articles}
    
    Topics:
  `,
  
  digestIntro: `
    Write a brief introduction (1-2 sentences) for today's digest covering these topics:
    {topics}
    
    Make it engaging and highlight the most interesting developments.
  `
};
```

#### 4.4.2 Quality Control
- Validate LLM outputs for coherence
- Implement fallback summarization using extractive methods
- Track summarization quality metrics

### 4.5 Performance and Optimization

#### 4.5.1 Caching Strategy
- Cache embeddings for repeated queries
- Cache cluster results for same time windows
- Implement digest caching with TTL

#### 4.5.2 Error Handling and Resilience
- Graceful degradation when LLM is unavailable
- Retry logic for API calls
- Fallback to rule-based clustering if embedding clustering fails

### 4.6 Configuration and Customization

#### 4.6.1 Environment Variables
```bash
# Digest Configuration
DIGEST_TIME_WINDOW=24h
DIGEST_MAX_CLUSTERS=6
DIGEST_MAX_ARTICLES_PER_CLUSTER=5
DIGEST_MIN_CLUSTER_SIZE=2
DIGEST_CLUSTERING_METHOD=embedding  # embedding|llm|hybrid

# LLM Configuration for Summarization
LLM_MODEL_CHAT=gpt-4o-mini
LLM_MAX_TOKENS=4000
LLM_TEMPERATURE=0.3

# Output Configuration
DIGEST_OUTPUT_FORMAT=html,text,json
DIGEST_OUTPUT_DIR=./data/digests
DIGEST_INCLUDE_STATS=true
```

#### 4.6.2 Digest Configuration Options
```typescript
interface DigestConfig {
  timeWindow: string;
  maxClusters: number;
  maxArticlesPerCluster: number;
  minClusterSize: number;
  clusteringMethod: 'embedding' | 'llm' | 'hybrid';
  outputFormats: ('html' | 'text' | 'json' | 'slack')[];
  includeStats: boolean;
  customPrompts?: Record<string, string>;
}
```

## Implementation Timeline

### Phase 1: Core Retrieval (Days 1-2)
- [ ] Implement basic time-based chunk retrieval
- [ ] Add semantic similarity search
- [ ] Test with existing embedded chunks
- [ ] Validate query performance

### Phase 2: Clustering Engine (Days 3-4)
- [ ] Implement embedding-based clustering
- [ ] Add cluster labeling and summarization
- [ ] Test clustering quality and coherence
- [ ] Implement LLM-assisted clustering as alternative

### Phase 3: Digest Generation (Days 5-6)
- [ ] Build digest orchestration pipeline
- [ ] Implement HTML template rendering
- [ ] Add multiple output format support
- [ ] Create comprehensive error handling

### Phase 4: Integration and Testing (Days 7)
- [ ] Integration testing of full pipeline
- [ ] Performance optimization
- [ ] Acceptance criteria validation
- [ ] Documentation and examples

## Acceptance Criteria

### Primary Success Metrics
1. **`npm run digest` Command**:
   - [ ] Executes without errors
   - [ ] Generates digest in under 30 seconds
   - [ ] Outputs HTML file with 3-6 clusters
   - [ ] Includes working links to source articles

2. **Clustering Quality**:
   - [ ] Clusters are thematically coherent
   - [ ] Each cluster has 2+ articles
   - [ ] Cluster labels are descriptive and accurate
   - [ ] No empty clusters

3. **Content Quality**:
   - [ ] Summaries are concise (2-3 sentences)
   - [ ] Key insights are highlighted
   - [ ] Recent content is prioritized
   - [ ] Source attribution is complete

4. **Output Format**:
   - [ ] HTML is well-formatted and readable
   - [ ] Links are clickable and valid
   - [ ] Generation metadata is included
   - [ ] Responsive design for mobile viewing

### Secondary Success Metrics
- [ ] Processing time under 30s for 100 chunks
- [ ] Clustering coherence score > 0.7
- [ ] LLM token usage optimized (< 10k tokens per digest)
- [ ] Memory usage remains under 500MB during processing

## Testing Strategy

### Unit Tests
- Retrieval functions with mock vector DB
- Clustering algorithms with synthetic data
- Template rendering with sample clusters
- LLM prompt formatting and parsing

### Integration Tests
- End-to-end digest generation
- Multiple time window scenarios
- Error handling and fallback scenarios
- Performance benchmarks

### Manual Testing
- Visual inspection of generated digests
- Link validation and accessibility
- Cross-browser compatibility
- Mobile responsiveness

## Risk Mitigation

### Potential Issues and Solutions

1. **Poor Clustering Quality**:
   - Risk: Articles grouped incorrectly
   - Mitigation: Multiple clustering algorithms, manual validation tools

2. **LLM API Failures**:
   - Risk: Digest generation fails
   - Mitigation: Fallback to extractive summarization, retry logic

3. **Performance Issues**:
   - Risk: Digest takes too long to generate
   - Mitigation: Caching, parallel processing, optimization

4. **Empty or Low-Quality Content**:
   - Risk: No recent chunks or poor content
   - Mitigation: Graceful degradation, expanded time windows, quality filters

## Future Enhancements (Post-Stage 4)

1. **Multi-language Support**: Handle content in different languages
2. **Visual Elements**: Include images, charts, or infographics
3. **Personalization**: User-specific digest customization
4. **Analytics**: Track digest engagement and effectiveness
5. **Delivery Integration**: Direct email/Slack delivery
6. **Interactive Features**: Feedback buttons, save-for-later

## Success Validation

### Automated Tests
```bash
# Run full acceptance test suite
npm run test:stage4

# Generate test digest
npm run digest

# Validate output quality
npm run validate:digest
```

### Manual Validation Checklist
- [ ] Digest contains meaningful clusters
- [ ] Summaries are accurate and helpful
- [ ] All links work correctly
- [ ] HTML renders properly across devices
- [ ] Generation time is acceptable
- [ ] Error handling works correctly

---

**Next Steps**: Begin implementation with Phase 1 (Core Retrieval) and set up comprehensive testing framework to validate each component before moving to the next phase.