import { ChromaClient } from 'chromadb';
import { LLMClient } from './llmClient.js';
import type {
  ChunkMetadata,
  ChunkWithEmbedding,
  QueryResult,
  CollectionInfo,
  ChunkWithEmbeddingData,
} from '../types/index.js';

// Vector database client (Chroma)
export class VectorClient {
  private client: ChromaClient;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private collection: any = null; // ChromaDB Collection type
  private collectionName: string;
  private llmClient: LLMClient;
  private initialized = false;

  constructor() {
    this.collectionName = process.env.CHROMA_COLLECTION_NAME || 'rss_chunks';
    
    // Use default local configuration for ChromaDB
    this.client = new ChromaClient();

    this.llmClient = new LLMClient();
  }

  /**
   * Initialize the vector client and ensure collection exists
   */
  async initialize(): Promise<void> {
    try {
      console.log('🔧 Initializing Chroma vector database...');
      
      // Don't reset - just work with collections
      console.log('✅ Chroma database connected');

      // Create or get collection
      this.collection = await this.client.getOrCreateCollection({
        name: this.collectionName,
        metadata: {
          description: 'RSS article chunks with embeddings',
          created_at: new Date().toISOString(),
          embedding_model: this.llmClient.getModel(),
          embedding_dimensions: this.llmClient.getEmbeddingDimensions(),
        },
      });

      console.log(`✅ Collection '${this.collectionName}' ready`);
      this.initialized = true;

      // Log collection info
      const info = await this.getCollectionInfo();
      console.log(`📊 Collection info: ${info.count} vectors, ${info.dimension || 'unknown'} dimensions`);

    } catch (error) {
      console.error('❌ Failed to initialize Chroma:', error);
      throw error;
    }
  }

  /**
   * Ensure the client is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
    
    if (!this.collection) {
      throw new Error('Collection not initialized');
    }
  }

  /**
   * Upsert chunks with embeddings to the vector database
   * @param chunks Array of chunks with optional embeddings
   */
  async upsert(chunks: ChunkWithEmbedding[]): Promise<void> {
    await this.ensureInitialized();
    
    if (chunks.length === 0) {
      console.log('⚠️ No chunks to upsert');
      return;
    }

    console.log(`📤 Upserting ${chunks.length} chunks to vector database...`);

    // Separate chunks that need embeddings from those that already have them
    const chunksNeedingEmbeddings = chunks.filter(chunk => !chunk.embedding);
    const chunksWithEmbeddings = chunks.filter(chunk => chunk.embedding);

    // Generate embeddings for chunks that don't have them
    if (chunksNeedingEmbeddings.length > 0) {
      console.log(`🔢 Generating embeddings for ${chunksNeedingEmbeddings.length} chunks...`);
      
      const texts = chunksNeedingEmbeddings.map(chunk => chunk.content);
      const embeddingResult = await this.llmClient.embed(texts);
      
      // Add embeddings to chunks
      chunksNeedingEmbeddings.forEach((chunk, index) => {
        const embedding = embeddingResult.embeddings[index];
        if (embedding) {
          chunk.embedding = embedding;
          chunk.metadata.embedded_date = new Date().toISOString();
        }
      });
      
      console.log(`✅ Generated ${embeddingResult.embeddings.length} embeddings using ${embeddingResult.totalTokens} tokens`);
    }

    // Combine all chunks (those that had embeddings + those we just generated)
    const allChunks = [...chunksWithEmbeddings, ...chunksNeedingEmbeddings];

    try {
      // Prepare data for Chroma
      const ids = allChunks.map(chunk => chunk.id);
      const embeddings = allChunks.map(chunk => chunk.embedding!);
      const metadatas = allChunks.map(chunk => ({
        ...chunk.metadata,
        // Ensure all metadata values are strings, numbers, or booleans for Chroma
        categories: chunk.metadata.categories?.join(',') || '',
        tags: chunk.metadata.tags?.join(',') || '',
      }));
      const documents = allChunks.map(chunk => chunk.content);

      // Upsert to collection
      await this.collection!.upsert({
        ids,
        embeddings,
        metadatas,
        documents,
      });

      console.log(`✅ Successfully upserted ${allChunks.length} chunks to collection '${this.collectionName}'`);

    } catch (error) {
      console.error('❌ Failed to upsert chunks:', error);
      throw error;
    }
  }

  /**
   * Query the vector database using text (will generate embedding)
   * @param queryText Text to search for
   * @param topK Number of results to return
   * @param filters Optional metadata filters
   * @returns Array of query results
   */
  async query(queryText: string, topK = 10, filters?: Record<string, string | number | boolean>): Promise<QueryResult[]> {
    console.log(`🔍 Querying for: "${queryText}" (top ${topK})`);
    
    // Generate embedding for query text
    const embeddingResult = await this.llmClient.embedSingle(queryText);
    
    return this.queryByVector(embeddingResult.embedding, topK, filters);
  }

  /**
   * Query the vector database using a pre-computed embedding vector
   * @param vector Embedding vector to search with
   * @param topK Number of results to return
   * @param filters Optional metadata filters
   * @returns Array of query results
   */
  async queryByVector(vector: number[], topK = 10, filters?: Record<string, string | number | boolean>): Promise<QueryResult[]> {
    await this.ensureInitialized();

    try {
      const results = await this.collection!.query({
        queryEmbeddings: [vector],
        nResults: topK,
        where: filters,
      });

      // Transform results
      const queryResults: QueryResult[] = [];
      
      if (results.ids && results.distances && results.documents && results.metadatas) {
        const ids = results.ids[0];
        const distances = results.distances[0];
        const documents = results.documents[0];
        const metadatas = results.metadatas[0];

        for (let i = 0; i < ids.length; i++) {
          const metadata = metadatas[i] as Record<string, unknown>;
          
          queryResults.push({
            id: ids[i],
            content: documents[i] || '',
            distance: distances[i],
            score: 1 - distances[i], // Convert distance to similarity score
            metadata: {
              ...((metadata as unknown) as ChunkMetadata),
              // Convert comma-separated strings back to arrays
              categories: (metadata.categories as string) ? (metadata.categories as string).split(',').filter((c: string) => c.length > 0) : [],
              tags: (metadata.tags as string) ? (metadata.tags as string).split(',').filter((t: string) => t.length > 0) : [],
            },
          });
        }
      }

      console.log(`✅ Found ${queryResults.length} results`);
      return queryResults;

    } catch (error) {
      console.error('❌ Query failed:', error);
      throw error;
    }
  }

  /**
   * Delete vectors by their IDs
   * @param ids Array of vector IDs to delete
   */
  async deleteByIds(ids: string[]): Promise<void> {
    await this.ensureInitialized();

    if (ids.length === 0) {
      console.log('⚠️ No IDs provided for deletion');
      return;
    }

    try {
      await this.collection!.delete({
        ids,
      });
      
      console.log(`✅ Deleted ${ids.length} vectors from collection`);
    } catch (error) {
      console.error('❌ Failed to delete vectors:', error);
      throw error;
    }
  }

  /**
   * Get collection information
   * @returns Collection metadata and stats
   */
  async getCollectionInfo(): Promise<CollectionInfo> {
    await this.ensureInitialized();

    try {
      const count = await this.collection!.count();
      const metadata = this.collection!.metadata || {};

      return {
        name: this.collectionName,
        count,
        metadata,
        dimension: metadata.embedding_dimensions as number,
      };
    } catch (error) {
      console.error('❌ Failed to get collection info:', error);
      throw error;
    }
  }

  /**
   * Reset/clear the entire collection
   */
  async reset(): Promise<void> {
    try {
      console.log(`🗑️ Resetting collection '${this.collectionName}'...`);
      
      // Delete the collection if it exists
      try {
        await this.client.deleteCollection({
          name: this.collectionName,
        });
        console.log('✅ Existing collection deleted');
      } catch {
        // Collection might not exist, that's fine
        console.log('ℹ️ No existing collection to delete');
      }

      // Reinitialize
      this.collection = null;
      this.initialized = false;
      await this.initialize();

      console.log('✅ Collection reset complete');
    } catch (error) {
      console.error('❌ Failed to reset collection:', error);
      throw error;
    }
  }

  /**
   * Get all vectors in the collection (for debugging/inspection)
   * @param limit Maximum number of vectors to return
   */
  async getAll(limit = 100): Promise<QueryResult[]> {
    await this.ensureInitialized();

    try {
      const results = await this.collection!.get({
        limit,
      });

      const queryResults: QueryResult[] = [];
      if (results.ids && results.documents && results.metadatas) {
        for (let i = 0; i < results.ids.length; i++) {
          const metadata = results.metadatas[i] as Record<string, unknown>;
          queryResults.push({
            id: results.ids[i],
            content: results.documents[i] || '',
            distance: 0, // No distance for get operation
            score: 1,    // No score for get operation
            metadata: {
              ...((metadata as unknown) as ChunkMetadata),
              categories: (metadata.categories as string) ? (metadata.categories as string).split(',').filter((c: string) => c.length > 0) : [],
              tags: (metadata.tags as string) ? (metadata.tags as string).split(',').filter((t: string) => t.length > 0) : [],
            },
          });
        }
      }

      return queryResults;
    } catch (error) {
      console.error('❌ Failed to get all vectors:', error);
      throw error;
    }
  }

  /**
   * Get all vectors with their embeddings for clustering
   * @param limit Maximum number of vectors to return
   * @returns Array of chunks with embeddings
   */
  async getAllWithEmbeddings(limit = 100): Promise<ChunkWithEmbeddingData[]> {
    await this.ensureInitialized();

    try {
      const results = await this.collection!.get({
        limit,
        include: ['documents', 'metadatas', 'embeddings'],
      });

      const chunksWithEmbeddings: ChunkWithEmbeddingData[] = [];

      if (results.ids && results.documents && results.metadatas && results.embeddings) {
        for (let i = 0; i < results.ids.length; i++) {
          const metadata = results.metadatas[i] as Record<string, unknown>;
          const embedding = results.embeddings[i] as number[];

          if (embedding) {
            chunksWithEmbeddings.push({
              id: results.ids[i],
              content: results.documents[i] || '',
              distance: 0,
              score: 1,
              embedding,
              metadata: {
                ...((metadata as unknown) as ChunkMetadata),
                categories: (metadata.categories as string) ? (metadata.categories as string).split(',').filter((c: string) => c.length > 0) : [],
                tags: (metadata.tags as string) ? (metadata.tags as string).split(',').filter((t: string) => t.length > 0) : [],
              },
            });
          }
        }
      }

      console.log(`✅ Retrieved ${chunksWithEmbeddings.length} chunks with embeddings`);
      return chunksWithEmbeddings;
    } catch (error) {
      console.error('❌ Failed to get chunks with embeddings:', error);
      throw error;
    }
  }
}