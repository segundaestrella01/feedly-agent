import { promises as fs } from 'fs';
import { dirname } from 'path';
import Database from 'better-sqlite3';

// Types for embedding tracking
export interface EmbeddingStatus {
  id?: number;
  chunk_file: string;
  total_chunks: number;
  processed_chunks: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  started_at?: string;
  completed_at?: string;
  error_message?: string;
  model_used: string;
}

export interface ChunkEmbedding {
  id: string;
  chunk_id: string;
  source_file: string;
  embedding_created_at?: string;
  vector_id: string;
  model_used: string;
}

export interface RSSItem {
  id: string;
  title: string;
  link: string;
  pub_date: string;
  source: string;
  categories?: string;
  content?: string;
  processed: boolean;
  created_at?: string;
}

// Database client for metadata storage (SQLite)
export class DatabaseClient {
  private db: Database.Database;
  private dbPath: string;

  constructor(dbPath = './data/metadata.db') {
    this.dbPath = dbPath;
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
  }

  /**
   * Initialize database and create tables
   */
  async initialize(): Promise<void> {
    try {
      // Ensure data directory exists
      await fs.mkdir(dirname(this.dbPath), { recursive: true });

      // Create tables
      this.createTables();
      
      console.log(`✅ Database initialized at ${this.dbPath}`);
    } catch (error) {
      console.error('❌ Failed to initialize database:', error);
      throw error;
    }
  }

  /**
   * Create all required tables
   */
  private createTables(): void {
    // RSS items table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS rss_items (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        link TEXT NOT NULL UNIQUE,
        pub_date TEXT NOT NULL,
        source TEXT NOT NULL,
        categories TEXT,
        content TEXT,
        processed BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Embedding status tracking table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS embeddings_status (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        chunk_file TEXT UNIQUE,
        total_chunks INTEGER,
        processed_chunks INTEGER,
        status TEXT CHECK(status IN ('pending', 'processing', 'completed', 'failed')),
        started_at TIMESTAMP,
        completed_at TIMESTAMP,
        error_message TEXT,
        model_used TEXT DEFAULT 'text-embedding-3-small',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Individual chunk embeddings tracking table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS chunk_embeddings (
        id TEXT PRIMARY KEY,
        chunk_id TEXT UNIQUE,
        source_file TEXT,
        embedding_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        vector_id TEXT,
        model_used TEXT DEFAULT 'text-embedding-3-small'
      )
    `);

    // Create indexes for performance
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_rss_items_source ON rss_items(source);
      CREATE INDEX IF NOT EXISTS idx_rss_items_processed ON rss_items(processed);
      CREATE INDEX IF NOT EXISTS idx_rss_items_pub_date ON rss_items(pub_date);
      CREATE INDEX IF NOT EXISTS idx_embeddings_status_status ON embeddings_status(status);
      CREATE INDEX IF NOT EXISTS idx_chunk_embeddings_source_file ON chunk_embeddings(source_file);
    `);
  }

  // RSS Items Methods
  /**
   * Upsert RSS items
   */
  async upsertRSSItems(items: RSSItem[]): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO rss_items 
      (id, title, link, pub_date, source, categories, content, processed)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const transaction = this.db.transaction((items: RSSItem[]) => {
      for (const item of items) {
        stmt.run(
          item.id,
          item.title,
          item.link,
          item.pub_date,
          item.source,
          item.categories || null,
          item.content || null,
          item.processed,
        );
      }
    });

    transaction(items);
  }

  /**
   * Get RSS items by status
   */
  getRSSItems(processed?: boolean, source?: string): RSSItem[] {
    let query = 'SELECT * FROM rss_items';
    const params: any[] = [];

    const conditions: string[] = [];
    if (processed !== undefined) {
      conditions.push('processed = ?');
      params.push(processed);
    }
    if (source) {
      conditions.push('source = ?');
      params.push(source);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY pub_date DESC';

    return this.db.prepare(query).all(...params) as RSSItem[];
  }

  /**
   * Mark RSS items as processed
   */
  markItemsAsProcessed(itemIds: string[]): void {
    if (itemIds.length === 0) {return;}

    const placeholders = itemIds.map(() => '?').join(',');
    const stmt = this.db.prepare(`
      UPDATE rss_items 
      SET processed = TRUE 
      WHERE id IN (${placeholders})
    `);

    stmt.run(...itemIds);
  }

  // Embedding Status Methods
  /**
   * Create or update embedding status for a chunk file
   */
  async upsertEmbeddingStatus(status: EmbeddingStatus): Promise<number> {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO embeddings_status 
      (chunk_file, total_chunks, processed_chunks, status, started_at, completed_at, error_message, model_used)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      status.chunk_file,
      status.total_chunks,
      status.processed_chunks,
      status.status,
      status.started_at || new Date().toISOString(),
      status.completed_at,
      status.error_message,
      status.model_used,
    );

    return result.lastInsertRowid as number;
  }

  /**
   * Get embedding status for chunk files
   */
  getEmbeddingStatus(chunkFile?: string): EmbeddingStatus[] {
    let query = 'SELECT * FROM embeddings_status';
    const params: any[] = [];

    if (chunkFile) {
      query += ' WHERE chunk_file = ?';
      params.push(chunkFile);
    }

    query += ' ORDER BY created_at DESC';

    return this.db.prepare(query).all(...params) as EmbeddingStatus[];
  }

  /**
   * Update embedding progress
   */
  updateEmbeddingProgress(chunkFile: string, processedChunks: number, status: string): void {
    const stmt = this.db.prepare(`
      UPDATE embeddings_status 
      SET processed_chunks = ?, status = ?, completed_at = CASE WHEN ? = 'completed' THEN CURRENT_TIMESTAMP ELSE completed_at END
      WHERE chunk_file = ?
    `);

    stmt.run(processedChunks, status, status, chunkFile);
  }

  /**
   * Mark embedding as failed with error message
   */
  markEmbeddingFailed(chunkFile: string, errorMessage: string): void {
    const stmt = this.db.prepare(`
      UPDATE embeddings_status 
      SET status = 'failed', error_message = ?, completed_at = CURRENT_TIMESTAMP
      WHERE chunk_file = ?
    `);

    stmt.run(errorMessage, chunkFile);
  }

  // Chunk Embeddings Methods
  /**
   * Track individual chunk embeddings
   */
  async upsertChunkEmbeddings(embeddings: ChunkEmbedding[]): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO chunk_embeddings 
      (id, chunk_id, source_file, vector_id, model_used)
      VALUES (?, ?, ?, ?, ?)
    `);

    const transaction = this.db.transaction((embeddings: ChunkEmbedding[]) => {
      for (const embedding of embeddings) {
        stmt.run(
          embedding.id,
          embedding.chunk_id,
          embedding.source_file,
          embedding.vector_id,
          embedding.model_used,
        );
      }
    });

    transaction(embeddings);
  }

  /**
   * Check if chunks are already embedded
   */
  getEmbeddedChunks(chunkIds: string[]): string[] {
    if (chunkIds.length === 0) {return [];}

    const placeholders = chunkIds.map(() => '?').join(',');
    const stmt = this.db.prepare(`
      SELECT chunk_id FROM chunk_embeddings 
      WHERE chunk_id IN (${placeholders})
    `);

    const results = stmt.all(...chunkIds) as { chunk_id: string }[];
    return results.map(r => r.chunk_id);
  }

  /**
   * Get embedding statistics
   */
  getEmbeddingStats(): {
    total_files: number;
    completed_files: number;
    pending_files: number;
    failed_files: number;
    total_chunks_embedded: number;
    } {
    const stats = this.db.prepare(`
      SELECT 
        COUNT(*) as total_files,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_files,
        COUNT(CASE WHEN status IN ('pending', 'processing') THEN 1 END) as pending_files,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_files,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN processed_chunks ELSE 0 END), 0) as total_chunks_embedded
      FROM embeddings_status
    `).get() as any;

    return stats;
  }

  /**
   * Reset embedding status (for development/testing)
   */
  resetEmbeddingStatus(): void {
    this.db.exec('DELETE FROM embeddings_status');
    this.db.exec('DELETE FROM chunk_embeddings');
  }

  /**
   * Close database connection
   */
  close(): void {
    this.db.close();
  }

  /**
   * Get database info
   */
  getInfo(): { path: string; tables: string[] } {
    const tables = this.db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `).all() as { name: string }[];

    return {
      path: this.dbPath,
      tables: tables.map(t => t.name),
    };
  }
}