# Feedly Learning-Resources AI Agent (RAG-based)

A personal AI assistant that fetches your Feedly feeds, embeds and clusters content, and generates a daily digest tailored to your interests using a Retrieval-Augmented Generation (RAG) workflow.

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
FEEDLY_TOKEN=...
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
      feedlyClient.ts
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
  docker-compose.yml (optional)
```

---

# 🏗 Step-by-Step Guide

### **Stage 0 — Repo & Skeleton** ✅ 
1. Initialize repo and install dependencies.
2. Create `.env` with variables above.
3. Create project folder structure.
4. Acceptance: `npm run dev` starts server and reads `.env`.

---

### **Stage 1 — Feedly Fetcher**
1. Implement `feedlyClient.ts` with authenticated call to fetch unread items.
2. Save JSON responses in `/data/raw` and metadata in SQLite `items` table.
3. Acceptance: `npm run fetch` stores recent items.

---

### **Stage 2 — Content Extraction & Chunking**
1. Extract main text from Feedly items or article URLs.
2. Implement `chunker.ts` to split text (~1500 chars/chunk).
3. Save chunks with metadata in DB or JSON.
4. Acceptance: Chunks exist in `/data/chunks/`.

---

### **Stage 3 — Embeddings & Vector Upsert**
1. Implement `llmClient.embed(texts[])` to generate embeddings.
2. Upsert embeddings + metadata into vector DB (`vectorClient.upsert()`).
3. Acceptance: Nearest neighbor queries return inserted chunks.

---

### **Stage 4 — Retrieval, Clustering & Summarization**
1. Implement `retriever.ts`:
   - Query vector DB for relevant chunks (e.g., last 24h).
   - Select top-N chunks.
   - Optional clustering: embeddings or LLM-assisted.
2. Call LLM to summarize clusters.
3. Compose daily digest (HTML/email/Slack).
4. Acceptance: `npm run digest` prints digest with clusters + links.

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

---

# 💡 Useful LLM Prompts

**Clustering**
```
Group these article excerpts into 4-6 coherent topics. Return JSON: {id, label, summary(2 sentences), representative: [{title,url}]}.
Input: [{title,excerpt,url}, ...]
```

**Summarization**
```
Summarize these N excerpts into 2 sentences and 3 bullets with key takeaways.
```

**Preference Extraction**
```
Given titles and excerpts that the user liked, return 5 keywords/tags representing user interests.
```

---

# 📝 Acceptance Criteria (MVP)
- `npm run fetch` retrieves Feedly items.  
- `npm run process` chunks + embeds + upserts vectors.  
- `npm run digest` produces digest with 3–6 clusters + links.  
- Feedback updates preferences and affects future ranking.  
- Suggested feeds appear; subscription requires approval.

---

# ✅ Next Immediate Tasks
1. Initialize repo and install deps (Stage 0).  
2. Implement & test Feedly fetcher.  
3. Chunk 5 items locally.  
4. Wire embedding + vector upsert and verify nearest neighbors.  
5. Implement retrieval + LLM summarization for single digest run.
