# Stage 4: Clustering Algorithm Design

## Overview

The clustering system groups semantically similar content chunks using k-means clustering on embedding vectors stored in Chroma.

## Data Flow

```
retrieveRecentChunks() → getChunksWithEmbeddings() → k-means → ClusterResult[]
```

## Key Components

### 1. Retrieve Chunks with Embeddings

Chroma supports returning embeddings via the `include` parameter:

```typescript
// In VectorClient - add new method
async getAllWithEmbeddings(limit: number): Promise<ChunkWithEmbedding[]> {
  const results = await this.collection.get({
    limit,
    include: ["documents", "metadatas", "embeddings"]
  });
  // Transform results to include embedding vectors
}
```

### 2. K-Means Clustering

**Algorithm**: Lloyd's k-means
- Initialize k centroids (k++ initialization for better convergence)
- Assign each embedding to nearest centroid (cosine distance)
- Update centroids as mean of assigned embeddings
- Repeat until convergence or max iterations

**Parameters**:
- `k`: Number of clusters (default: 5, configurable 3-6)
- `maxIterations`: Max iterations (default: 100)
- `tolerance`: Convergence threshold (default: 1e-6)

**Library**: Use `ml-kmeans` npm package (lightweight, TypeScript support)

### 3. Cluster Result Structure

```typescript
interface Cluster {
  id: number;                    // Cluster index (0 to k-1)
  chunks: QueryResult[];         // Chunks assigned to this cluster
  centroid: number[];            // Cluster centroid embedding
  size: number;                  // Number of chunks
  representativeChunk: QueryResult; // Chunk closest to centroid
}

interface ClusteringResult {
  clusters: Cluster[];
  totalChunks: number;
  clusterCount: number;
  timestamp: string;
}
```

### 4. Representative Selection

For each cluster, select the chunk whose embedding is closest to the centroid:
- Compute cosine similarity between each chunk embedding and centroid
- Select chunk with highest similarity as representative

## Implementation Plan

1. **Add `ml-kmeans` dependency** (or implement simple k-means)
2. **Extend VectorClient** with `getAllWithEmbeddings()` method
3. **Create `summarizer.ts`** with:
   - `clusterChunks(chunks, k)` - main clustering function
   - `selectRepresentatives(clusters)` - pick best chunk per cluster
4. **Add types** to `src/types/` for clustering structures

## Configuration

```env
# Clustering Configuration
CLUSTER_COUNT=5           # Number of clusters (3-6 recommended)
CLUSTER_MAX_ITERATIONS=100
CLUSTER_TOLERANCE=0.000001
```

## Quality Validation

- **Silhouette Score**: Measure cluster quality (-1 to 1, higher is better)
- **Cluster Size Distribution**: Warn if clusters are too unbalanced
- **Empty Cluster Handling**: Reassign or reduce k if clusters are empty

