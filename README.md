# RSS Learning-Resources AI Agent

A personal AI assistant that fetches RSS feeds, embeds and clusters content, and generates a daily digest tailored to your interests using a Retrieval-Augmented Generation (RAG) workflow.

## 🚀 Quick Start

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure feeds**:
   ```bash
   cp .env.example .env
   # Edit .env with your API keys
   # Configure RSS feeds in feeds.json
   ```

3. **Fetch RSS items**:
   ```bash
   npm run fetch
   ```

4. **Process content (extract and chunk)**:
   ```bash
   npm run chunk     # Chunk content only
   npm run process   # Complete processing pipeline
   ```

## 📁 Project Structure

```
/project
  /src
    /lib
      rssClient.ts      # RSS feed parsing and management ✅
      llmClient.ts      # LLM API client (TODO)
      vectorClient.ts   # Vector database client (TODO)
      db.ts            # SQLite database client (TODO)
    /workers
      fetcher.ts       # RSS item fetcher ✅
      chunker.ts       # Content extraction & chunking ✅
      processor.ts     # Processing pipeline orchestrator ✅
      embedder.ts      # Text embedding (TODO)
      retriever.ts     # Vector retrieval (TODO)
      summarizer.ts    # Content summarization (TODO)
      memory.ts        # Preference memory (TODO)
      notifier.ts      # Notification delivery (TODO)
    /api
      app.ts           # Web API server (TODO)
  /data
    /raw               # Raw RSS items ✅
    /chunks            # Processed content chunks ✅
    metadb.sqlite      # Metadata database (TODO)
  feeds.json           # RSS feed configuration ✅
```

## ✅ Implemented Features

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

## 📝 Configuration

### Environment Variables (`.env`)

```bash
# Fetch Configuration
FETCH_HOURS_BACK=24
DATA_DIR=./data

# Content Processing
CHUNK_SIZE=1500
CHUNK_OVERLAP=150

# API Keys (for future stages)
LLM_API_KEY=your_openai_api_key
EMBEDDING_MODEL=text-embedding-3-small
LLM_MODEL=gpt-4o-mini
VECTOR_DB_URL=http://localhost:6333
```

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

```bash
npm run dev       # Start development server
npm run fetch     # Fetch RSS items
npm run chunk     # Extract and chunk content
npm run process   # Complete processing pipeline
npm run build     # Build TypeScript
npm run lint      # Run ESLint
npm run test      # Run tests (TODO)
```

## 📊 Current Status

- ✅ **Stage 0**: Project setup and skeleton
- ✅ **Stage 1**: RSS fetcher implementation
- ✅ **Stage 2**: Content extraction & chunking with full article fetching
- 🔄 **Stage 3**: Embeddings & vector upsert (TODO)
- 🔄 **Stage 4**: Retrieval, clustering & summarization (TODO)

### Stage 2 Results
- **Average improvement**: 227 chunks vs 40 chunks (5.7x more content)
- **Content quality**: Average chunk size increased from 132 to 1,150 characters
- **Article success rate**: ~50% full articles fetched successfully
- **Supported sites**: Excellent support for Ars Technica, partial for WIRED (CSS parsing issues)
- **Chunk ID format**: `{clean-url}-{chunk-num}-of-{total-chunks}`

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

## 📋 Next Steps

1. ✅ ~~Implement content chunking worker~~
2. Add LLM client for embeddings
3. Set up vector database integration
4. Implement retrieval and clustering logic
5. Build summarization pipeline

### Immediate Next: Stage 3 - Embeddings & Vector Upsert
- Implement OpenAI embeddings API client
- Set up Qdrant or Pinecone vector database
- Create embedding pipeline for processed chunks
- Implement vector similarity search

For detailed implementation plan, see [PLAN.md](./PLAN.md).

# Costs Dashboard
https://platform.openai.com/usage