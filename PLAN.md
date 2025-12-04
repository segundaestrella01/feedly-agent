# RSS Learning-Resources AI Agent (RAG-based)

A personal AI assistant that fetches RSS feeds, embeds and clusters content, and generates a daily digest tailored to your interests using a Retrieval-Augmented Generation (RAG) workflow.

---

## ⚡ Minimal Tech Stack
- Node.js + TypeScript  
- Vector DB: Qdrant (docker) or Chroma local, or Pinecone hosted  
- LLM + Embeddings: OpenAI API (or Anthropic)  
- Metadata DB: SQLite (via Prisma or sqlite3)  
- HTTP: Express or Fastify  
- Scheduler: node-cron or system cron  
- Delivery: SMTP (Nodemailer) or Slack webhook  
- Optional UI: tiny React or plain HTML  

### `.env` (minimum)
```
LLM_API_KEY=...
EMBEDDING_MODEL=text-embedding-3-small
LLM_MODEL=gpt-4o-mini
VECTOR_DB_URL=http://localhost:6333
METADB_URL=sqlite:./data/metadb.sqlite
SMTP_URL=smtp://user:pass@smtp.server:587
APP_SECRET=some_random_secret
SCHEDULE_CRON="0 7 * * *"
```

---

# 📁 Project Layout
```
/project
  /src
    /lib
      rssClient.ts
      llmClient.ts
      vectorClient.ts
      db.ts
    /workers
      fetcher.ts
      chunker.ts
      embedder.ts
      retriever.ts
      summarizer.ts
      memory.ts
      notifier.ts
    /api
      app.ts
  /data
    metadb.sqlite
  package.json
  tsconfig.json
  .env
  feeds.json
  docker-compose.yml (optional)
```

---

# 🏗 Step-by-Step Guide

### **Stage 0 — Content Processing -  Repo & Skeleton** ✅ 
1. Initialize repo and install dependencies.
2. Create `.env` with variables above.
3. Create project folder structure.
4. Acceptance: `npm run dev` starts server and reads `.env`.

---

### **Stage 1 — Content Processing - RSS Fetcher** ✅ 
1. Implement `rssClient.ts` using a Node.js RSS parser (e.g., `rss-parser`).
2. Maintain a feed URL list in `.env` or `feeds.json`.
3. Fetch recent items from all feeds.
4. Save raw items to `/data/raw` and metadata in SQLite `items` table.
5. Acceptance: `npm run fetch` stores recent RSS items.
---

### **Stage 2 — Content Processing - Content Extraction & Chunking** ✅ 
1. Extract full text from RSS items (use content field or fetch article URL + extract text).
2. Implement `chunker.ts` to split text (~1500 chars/chunk).
3. Save chunks with metadata in DB or JSON.
4. Acceptance: Chunks exist in `/data/chunks/`.

---

### **Stage 3 — Content Processing - Embeddings & Vector Upsert** ✅ 
1. Implement `llmClient.embed(texts[])` to generate embeddings.
2. Upsert embeddings + metadata into vector DB (`vectorClient.upsert()`).
3. Acceptance: Nearest neighbor queries return inserted chunks.

---

### **Stage 4 — RAG - Retrieval, Clustering & Summarization**
1. Implement `retriever.ts`: ✅
   - Query vector DB for relevant chunks (e.g., last 24h).
   - Select top-N chunks.
2. Implement `summarizer.ts`: ✅
   - Cluster chunks using k-means on embeddings.
   - Support configurable cluster count (3-6 clusters).
   - Calculate Silhouette score for cluster quality.
3. Implement `digestGenerator.ts`: 🚧 IN PROGRESS
   - Call LLM to summarize clusters.
   - Compose daily digest and post to Notion.
   - See `STAGE4_DIGEST_PLAN.md` for detailed implementation plan.
4. Acceptance: `npm run digest` creates Notion page with clusters + links.

---

### **Stage 5 — Preference Memory**
1. Store user preferences in SQLite (`preferences` table) as embedding vectors.
2. Update preference vector after user feedback (clicks/bookmarks).
3. Re-rank retrieved chunks by similarity to preference vector.
4. Acceptance: Relevant future items appear higher in digest.

---

### **Stage 6 — Feedback & Human-in-the-Loop UI**
1. Implement small API endpoints:
   - `GET /digest` → show digest
   - `POST /feedback` → record like/dislike/save
   - `GET /suggested-feeds` → list candidate feeds
   - `POST /subscribe-feed` → approve subscription
2. Digest UI includes buttons to post feedback.
3. Acceptance: Feedback updates preferences & affects ranking.

---

### **Stage 7 — Feed Discovery & Suggestions**
1. Generate keyword lists from high-interest clusters.
2. Search for relevant feeds or directories.
3. Display in `/suggested-feeds`; subscribe only on approval.
4. Acceptance: Suggestions are thematic; subscribing is gated.

---

### **Stage 8 — Evaluation & Metrics**
1. Store interactions: clicks, likes, saves.
2. Compute metrics: CTR, precision@k, preference drift.
3. Acceptance: Metrics available for tuning ranking parameters.

---

### **Stage 9 — Deployment**
1. Choose hosting (local machine or VPS).
2. Schedule `npm run digest` with cron or `node-cron`.
3. Ensure vector DB is running.
4. Secure endpoints with `APP_SECRET`.
5. Acceptance: Daily digest runs automatically.


# 📝 Acceptance Criteria (MVP)
- `npm run fetch` retrieves RSS items.  
- `npm run process` chunks + embeds + upserts vectors.  
- `npm run digest` produces digest with 3–6 clusters + links.  
- Feedback updates preferences and affects future ranking.  
- Suggested feeds appear; subscription requires approval.

---

# ✅ Next Immediate Tasks
**Current Focus: Stage 4 - Digest Generation**
- See `STAGE4_DIGEST_PLAN.md` for detailed implementation plan
- Start with Phase 1: Add chat completion support to LLMClient
- Then Phase 2: Implement cluster summarization
- Then Phase 3: Build digest composition pipeline and Notion client
- Finally Phase 4: Add Notion integration and CLI options

---

# 🔮 Follow-up Improvements

### Automatic k Optimization for Clustering
- **Problem**: Currently, the number of clusters (k) is fixed and may not be optimal for the data
- **Current State**: Silhouette score is calculated to measure cluster quality but no action is taken when it indicates poor clustering
- **Proposed Solution**: Implement automatic k optimization that:
  - Tries multiple k values (e.g., k-2 to k+2, or range 3-8)
  - Calculates Silhouette score for each k
  - Selects the k value that produces the highest Silhouette score
  - Falls back to original k if optimization fails or takes too long
- **Benefits**:
  - Better cluster quality automatically
  - Adapts to varying amounts of content
  - Reduces need for manual k tuning
- **Implementation Notes**:
  - Add `optimizeK` option to `ClusteringOptions`
  - Cache results to avoid re-clustering
  - Set reasonable bounds (min k=2, max k=10 or sqrt(n))
  - Consider computational cost vs. quality tradeoff

### Enhanced Digest Features
- **Personalization**: Use preference vectors to re-rank articles within clusters
- **Trend Detection**: Highlight emerging topics or trending articles with special callouts
- **Source Diversity**: Ensure clusters include articles from multiple sources
- **Time-based Grouping**: Separate breaking news from evergreen content
- **Notion Database Views**: Create filtered views (by quality score, topic count, time window)
- **Notion Relations**: Link related digests or create topic tracking across digests
- **Notion Automation**: Use Notion's built-in automation for notifications
- **Scheduling**: Use node-cron to generate and post digests automatically to Notion
- **Rich Media**: Include article images/thumbnails in Notion bookmarks
- **Tagging**: Add Notion tags/multi-select properties for topics

### Advanced Summarization
- **Multi-level Summaries**: Generate both brief (1 sentence) and detailed (paragraph) summaries
- **Quote Extraction**: Pull notable quotes from articles
- **Entity Recognition**: Identify and highlight key people, companies, technologies
- **Sentiment Analysis**: Indicate overall sentiment (positive/negative/neutral) per cluster
- **Controversy Detection**: Flag clusters with conflicting viewpoints
- **Related Topics**: Suggest connections between clusters
