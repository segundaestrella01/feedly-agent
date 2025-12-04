# RSS Learning-Resources AI Agent

A personal AI assistant that fetches RSS feeds, embeds and clusters content, and generates a daily digest tailored to your interests using a Retrieval-Augmented Generation (RAG) workflow.

## 🎯 Current Capabilities

✅ **Fetch** RSS feeds from multiple sources
✅ **Extract** full article content with intelligent parsing
✅ **Chunk** content into semantic segments (~1500 chars)
✅ **Embed** chunks using OpenAI embeddings
✅ **Store** in Chroma vector database with rich metadata
✅ **Retrieve** content via semantic search, time filters, and hybrid scoring
🔄 **Cluster** and summarize content (in progress)
🔄 **Generate** daily digest (in progress)

## 🚀 Quick Start

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure feeds and API keys**:
   ```bash
   cp .env.example .env
   # Edit .env with your OpenAI API key and other settings
   # Configure RSS feeds in feeds.json
   ```

3. **Start Chroma vector database**:
   ```bash
   npm run chroma:up
   ```

4. **Fetch RSS items**:
   ```bash
   npm run fetch
   ```

5. **Process content (extract and chunk)**:
   ```bash
   npm run chunk     # Chunk content only
   npm run process   # Complete processing pipeline
   ```

6. **Generate embeddings and store in vector database**:
   ```bash
   npm run embed           # Process all chunks
   npm run embed:status    # Check progress
   ```

7. **Query and test the system**:
   ```bash
   npm run vector:query    # Interactive vector search
   npm run test:retriever  # Test retrieval system
   ```

8. **Generate daily digest** (coming soon):
   ```bash
   npm run digest
   ```

## 📁 Project Structure

```
/project
  /src
    /lib
      rssClient.ts      # RSS feed parsing and management ✅
      llmClient.ts      # LLM API client (embeddings + chat) ✅
      vectorClient.ts   # Chroma vector database client ✅
      db.ts             # SQLite database client ✅
      metadataUtils.ts  # Rich metadata utilities ✅
      config.ts         # Centralized configuration ✅
    /workers
      fetcher.ts        # RSS item fetcher ✅
      chunker.ts        # Content extraction & chunking ✅
      processor.ts      # Processing pipeline orchestrator ✅
      embedder.ts       # Text embedding & vector upsert ✅
      retriever.ts      # Vector retrieval & search ✅
      summarizer.ts     # Content clustering & summarization (TODO)
      digestGenerator.ts # Daily digest generation (TODO)
      memory.ts         # Preference memory (TODO)
      notifier.ts       # Notification delivery (TODO)
    /scripts
      testEmbedding.ts  # Test OpenAI embeddings ✅
      testChroma.ts     # Test Chroma vector DB ✅
      testRetriever.ts  # Test retrieval system ✅
      embeddingStatus.ts # Check embedding progress ✅
      queryVector.ts    # Interactive vector queries ✅
    /api
      app.ts            # Web API server (TODO)
  /data
    /raw                # Raw RSS items ✅
    /chunks             # Processed content chunks ✅
    /chroma             # Chroma vector database ✅
    metadata.db         # SQLite metadata database ✅
  feeds.json            # RSS feed configuration ✅
```

## ✅ Implemented Features

### Stage 0: Project Setup ✅

- **Project Structure**: Complete TypeScript setup with ESLint and build configuration
- **Environment Configuration**: Centralized config management via `src/lib/config.ts`
- **Docker Setup**: Docker Compose configuration for Chroma vector database
- **Development Tools**: Hot reload, type checking, linting

### Stage 1: RSS Fetching ✅

#### RSS Client (`src/lib/rssClient.ts`)

- **Feed Management**: Configure RSS feeds via `feeds.json`
- **Robust Parsing**: Parse RSS/Atom feeds with error handling
- **Time Filtering**: Fetch items from specific time ranges
- **Data Storage**: Save raw items to `/data/raw` with metadata
- **Multiple Sources**: Support for multiple RSS feeds simultaneously

#### Usage Example:

```typescript
import { createRSSClientFromConfig } from './src/lib/rssClient.js';

// Create client from environment/config
const client = await createRSSClientFromConfig();

// Get recent items (last 24 hours)
const items = await client.getRecentItems(24);

// Save items to file
await client.saveRawItems(items);
```

#### RSS Fetcher (`src/workers/fetcher.ts`)

- **Automated Fetching**: Run `npm run fetch` to collect recent RSS items
- **Configuration**: Loads feed URLs from `feeds.json`
- **Error Handling**: Graceful handling of failed feeds
- **Logging**: Detailed logging of fetch operations

### Stage 2: Content Extraction & Chunking ✅

#### Content Chunker (`src/workers/chunker.ts`)

- **Full Article Fetching**: Automatically fetches complete article content from URLs when RSS snippets are too short
- **Intelligent Text Extraction**: Uses JSDOM to parse HTML and extract clean text content
- **Smart Chunking Algorithm**: 
  - Splits content into ~1500 character chunks with 150-character overlap
  - Breaks at paragraph, sentence, or line boundaries for better context preservation
  - Maintains content relationships between chunks
- **Enhanced Chunk IDs**: Format: `{clean-url}-{chunk-number}-of-{total-chunks}`
- **Robust Error Handling**: 10-second timeouts, graceful fallbacks, comprehensive logging
- **Comprehensive Metadata**: Tracks word count, character count, source links, and timestamps

#### Processing Pipeline (`src/workers/processor.ts`)

- **Orchestrated Processing**: Coordinates the complete content processing workflow
- **Stage Management**: Currently handles chunking, ready for future embedding and vector stages
- **Progress Tracking**: Detailed logging and progress reporting

#### Usage Examples:

```typescript
import { chunkContent } from './src/workers/chunker.js';

// Chunk content with full article fetching (default)
const result = await chunkContent();

// Chunk content without fetching full articles
const result = await chunkContent(undefined, false);

// Process specific RSS file
const result = await chunkContent('./data/raw/specific-file.json');
```

#### Chunk Data Structure:

```json
{
  "totalItems": 71,
  "totalChunks": 227,
  "chunks": [
    {
      "id": "arstechnica.com-tech-policy-2025-11-article-title--1-of-8",
      "chunkIndex": 0,
      "content": "Full article text chunk...",
      "wordCount": 211,
      "charCount": 1352,
      "sourceItem": {
        "id": "original-rss-id",
        "title": "Article Title",
        "link": "https://...",
        "pubDate": "2025-11-24T...",
        "source": "Source Name",
        "categories": ["tag1", "tag2"]
      },
      "timestamp": "2025-11-24T22:41:39.917Z"
    }
  ]
}

### Stage 3: Embeddings & Vector Upsert ✅

#### LLM Client (`src/lib/llmClient.ts`)

- **OpenAI Integration**: Embeddings and chat completions via OpenAI API
- **Batch Processing**: Efficient batch embedding with configurable batch sizes
- **Error Handling**: Automatic retries with exponential backoff for rate limits
- **Token Tracking**: Monitor API usage and costs
- **Model Support**: `text-embedding-3-small`, `text-embedding-3-large`, `text-embedding-ada-002`

#### Vector Client (`src/lib/vectorClient.ts`)

- **Chroma Integration**: Local vector database with persistent storage
- **CRUD Operations**: Upsert, query, delete, and collection management
- **Advanced Queries**: Semantic search with metadata filtering
- **Automatic Embedding**: Generates embeddings during upsert if not provided
- **Collection Stats**: Track collection size, metadata, and health

#### Database Client (`src/lib/db.ts`)

- **SQLite Storage**: Lightweight metadata database with WAL mode
- **Embedding Tracking**: Track processing status, errors, and completion
- **RSS Item Storage**: Store raw RSS items with full metadata
- **Statistics**: Query embedding stats, processing progress, and errors

#### Embedder Worker (`src/workers/embedder.ts`)

- **Automated Pipeline**: Process all chunks from `/data/chunks` directory
- **Batch Processing**: Configurable batch size (default: 50 chunks)
- **Rate Limiting**: Configurable delays to respect API limits
- **Progress Tracking**: Real-time progress reporting and status updates
- **Error Recovery**: Skip failed chunks, continue processing, detailed error logging
- **Idempotency**: Skip already-processed files, resume from failures

#### Retriever Worker (`src/workers/retriever.ts`)

- **Multiple Query Strategies**:
  - Time-based filtering (1h, 6h, 12h, 24h, 3d, 7d)
  - Semantic similarity search
  - Source-based filtering
  - Topic-based retrieval
- **Hybrid Scoring**: Combine recency and relevance scores
- **Diversity Filtering**: Avoid over-representation from single sources
- **Rich Results**: Return chunks with full metadata and relevance scores

#### Rich Metadata Schema (`src/lib/metadataUtils.ts`)

- **16+ Metadata Fields**: title, source, URL, categories, timestamps, word count, etc.
- **Validation & Normalization**: Ensure data quality and consistency
- **Analytics Support**: Extract patterns, compute statistics
- **Vector Compatibility**: Seamless conversion to Chroma format

#### Usage Examples:

```typescript
import { EmbedderWorker } from './src/workers/embedder.js';
import { retrieveByQuery, retrieveRecentChunks } from './src/workers/retriever.js';

// Embed all chunks
const embedder = new EmbedderWorker();
await embedder.embedAndUpsert();

// Retrieve recent chunks
const recentChunks = await retrieveRecentChunks('24h', 50);

// Semantic search
const results = await retrieveByQuery('artificial intelligence breakthroughs', {
  timeWindow: '7d',
  limit: 20,
});
```

## 📝 Configuration

### Environment Variables (`.env`)

The project uses centralized configuration management through `src/lib/config.ts`. Copy `.env.example` to `.env` and configure:

#### OpenAI Configuration (Stage 3 - Embeddings)
```bash
OPENAI_API_KEY=sk-your-openai-api-key
EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_BATCH_SIZE=50
EMBEDDING_MAX_RETRIES=3
```

#### Chroma Vector Database Configuration
```bash
VECTOR_DB_TYPE=chroma
CHROMA_DATA_PATH=./data/chroma
CHROMA_COLLECTION_NAME=rss_chunks
VECTOR_DIMENSION=1536
```

**Starting Chroma:**
```bash
npm run chroma:up        # Start Chroma in Docker
npm run chroma:down      # Stop Chroma
npm run chroma:logs      # View Chroma logs
npm run chroma:restart   # Restart Chroma
```

Chroma runs on `http://localhost:8000` by default and stores data persistently in `./data/chroma`.

#### Processing Configuration
```bash
EMBEDDING_CONCURRENCY=1
EMBEDDING_DELAY_MS=1000
EMBEDDING_BATCH_SIZE=50
```

#### General LLM Configuration
```bash
LLM_API_KEY=your-openai-api-key
LLM_MODEL=gpt-4o-mini
```

#### Application Configuration
```bash
# Database
METADB_URL=sqlite:./data/metadb.sqlite

# Application
APP_SECRET=your_app_secret
SCHEDULE_CRON="0 7 * * *"
DATA_DIR=./data

# Fetching
FETCH_HOURS_BACK=24

# Email (Optional)
SMTP_URL=smtp://user:pass@smtp.server:587
```

### Configuration Testing

Test your configuration setup:

```bash
npm run test:config
```

This will validate all environment variables, create required directories, and show a configuration summary.

### Feed Configuration (`feeds.json`)

```json
{
  "feeds": [
    {
      "name": "TechCrunch",
      "url": "https://feeds.feedburner.com/TechCrunch",
      "category": "technology",
      "active": true
    }
  ]
}
```

## 🔧 Available Commands

### Core Operations
```bash
npm run dev       # Start development server
npm run fetch     # Fetch RSS items
npm run chunk     # Extract and chunk content
npm run process   # Complete processing pipeline
npm run embed     # Generate embeddings and upsert to vector database
npm run digest    # Generate daily digest
```

### Testing & Debugging
```bash
npm run test:config     # Test configuration setup
npm run test:embedding  # Test OpenAI embedding functionality
npm run test:chroma     # Test Chroma vector database
npm run test:embedder   # Test embedder worker
npm run test:queries    # Test vector queries
```

### Vector Database Management
```bash
npm run embed:status    # Check embedding processing status
npm run vector:query    # Interactive vector database queries
npm run vector:reset    # Reset vector database
```

### Chroma Database Management
```bash
npm run chroma:up       # Start Chroma in Docker
npm run chroma:down     # Stop Chroma
npm run chroma:logs     # View Chroma logs
npm run chroma:restart  # Restart Chroma
```

### Development
```bash
npm run build     # Build TypeScript
npm run lint      # Run ESLint
npm run test      # Run tests
```

## 📊 Current Status

- ✅ **Stage 0**: Project setup and skeleton
- ✅ **Stage 1**: RSS fetcher implementation
- ✅ **Stage 2**: Content extraction & chunking with full article fetching
- ✅ **Stage 3**: Embeddings & vector upsert with rich metadata
- 🔄 **Stage 4**: Retrieval, clustering & summarization (IN PROGRESS)
  - ✅ Retrieval system complete
  - ❌ Clustering algorithm (TODO)
  - ❌ Digest generation (TODO)
- ⏳ **Stage 5**: Preference memory (TODO)
- ⏳ **Stage 6**: Feedback UI (TODO)
- ⏳ **Stage 7**: Feed discovery (TODO)

### Stage 2 Results
- **Average improvement**: 227 chunks vs 40 chunks (5.7x more content)
- **Content quality**: Average chunk size increased from 132 to 1,150 characters
- **Article success rate**: ~50% full articles fetched successfully
- **Supported sites**: Excellent support for Ars Technica, partial for WIRED (CSS parsing issues)
- **Chunk ID format**: `{clean-url}-{chunk-num}-of-{total-chunks}`

### Stage 3 Results
- **Vector Database**: Chroma running locally with persistent storage
- **Embeddings**: OpenAI `text-embedding-3-small` (1536 dimensions)
- **Rich Metadata**: 16+ metadata fields per chunk (title, source, categories, timestamps, etc.)
- **Batch Processing**: Configurable batch size and rate limiting for API efficiency
- **Status Tracking**: SQLite database tracks embedding progress and errors
- **Query Capabilities**: Semantic search, time-based filtering, source filtering, hybrid scoring
- **Available Commands**: `npm run embed`, `npm run embed:status`, `npm run vector:query`

## 🧪 Testing

### RSS Client Testing
The RSS client has been tested with multiple feed sources and handles:
- Network timeouts and connection errors
- Invalid RSS/Atom feeds
- Time-based filtering
- Data persistence and retrieval

### Content Processing Testing
The chunker has been tested with:
- Various article lengths (from 100 chars to 56KB)
- Different website structures (Ars Technica, WIRED, external sites)
- Error handling for failed article fetches
- Intelligent text extraction and cleaning
- Chunk boundary optimization for readability

### Embeddings & Vector Database Testing
The embedding and vector systems have been tested with:
- OpenAI API integration and error handling
- Chroma vector database operations (upsert, query, delete)
- Batch processing with rate limiting
- Metadata filtering and semantic search
- Retrieval strategies (time-based, semantic, hybrid)
- Test scripts: `npm run test:embedding`, `npm run test:chroma`, `npm run test:retriever`

## 📋 Next Steps

### 🔄 Current Focus: Complete Stage 4 - RAG Pipeline

**Priority 1: Implement Clustering System** (`src/workers/summarizer.ts`)
- Implement embedding-based clustering (k-means or hierarchical)
- Add LLM-assisted topic labeling and cluster naming
- Implement cluster quality validation and optimization
- Support configurable cluster count (3-6 clusters)

**Priority 2: Implement Digest Generator** (`src/workers/digestGenerator.ts`)
- Orchestrate retrieval → clustering → summarization pipeline
- Generate cluster summaries using LLM
- Create HTML digest templates with responsive design
- Support multiple output formats (HTML, text, JSON, Slack)
- Add source attribution and generation metadata

**Priority 3: Testing & Validation**
- End-to-end digest generation test
- Quality validation for clustering and summaries
- Performance optimization (target: <30s for 100 chunks)
- Acceptance criteria validation

# Costs Dashboard
https://platform.openai.com/usage