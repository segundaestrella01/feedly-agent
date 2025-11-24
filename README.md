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
      chunker.ts       # Content chunking (TODO)
      embedder.ts      # Text embedding (TODO)
      retriever.ts     # Vector retrieval (TODO)
      summarizer.ts    # Content summarization (TODO)
      memory.ts        # Preference memory (TODO)
      notifier.ts      # Notification delivery (TODO)
    /api
      app.ts           # Web API server (TODO)
  /data
    /raw               # Raw RSS items ✅
    metadb.sqlite      # Metadata database (TODO)
  feeds.json           # RSS feed configuration ✅
```

## ✅ Implemented Features (Stage 1)

### RSS Client (`src/lib/rssClient.ts`)

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

### RSS Fetcher (`src/workers/fetcher.ts`)

- **Automated Fetching**: Run `npm run fetch` to collect recent RSS items
- **Configuration**: Loads feed URLs from `feeds.json`
- **Error Handling**: Graceful handling of failed feeds
- **Logging**: Detailed logging of fetch operations

## 📝 Configuration

### Environment Variables (`.env`)

```bash
# Fetch Configuration
FETCH_HOURS_BACK=24
DATA_DIR=./data

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
npm run build     # Build TypeScript
npm run lint      # Run ESLint
npm run test      # Run tests (TODO)
```

## 📊 Current Status

- ✅ **Stage 0**: Project setup and skeleton
- ✅ **Stage 1**: RSS fetcher implementation
- 🔄 **Stage 2**: Content extraction & chunking (TODO)
- 🔄 **Stage 3**: Embeddings & vector upsert (TODO)
- 🔄 **Stage 4**: Retrieval, clustering & summarization (TODO)

## 🧪 Testing

The RSS client has been tested with multiple feed sources and handles:
- Network timeouts and connection errors
- Invalid RSS/Atom feeds
- Time-based filtering
- Data persistence and retrieval

## 📋 Next Steps

1. Implement content chunking worker
2. Add LLM client for embeddings
3. Set up vector database integration
4. Implement retrieval and clustering logic
5. Build summarization pipeline

For detailed implementation plan, see [PLAN.md](./PLAN.md).
