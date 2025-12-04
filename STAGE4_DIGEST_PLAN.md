# Stage 4: Digest Generation & Notion Integration

**Goal**: Generate AI-powered daily digests from clustered content and post them to Notion as rich, formatted pages.

---

## Overview

This stage implements the complete digest generation pipeline:
1. **LLM Chat Completion** - Add chat capabilities to LLMClient for summarization
2. **Cluster Summarization** - Generate topic labels, summaries, and key takeaways
3. **Digest Composition** - Orchestrate the full pipeline
4. **Notion Integration** - Post formatted digests to Notion database

---

## Phase 1: LLM Chat Completion Support

### 1.1 Add Chat Completion Types (`src/types/embedding.ts`)

```typescript
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
}

export interface ChatCompletionResult {
  content: string;
  tokens: {
    prompt: number;
    completion: number;
    total: number;
  };
  model: string;
  finishReason: string;
}
```

### 1.2 Extend LLMClient (`src/lib/llmClient.ts`)

Add new methods:
- `chatCompletion(messages: ChatMessage[], options?: ChatCompletionOptions): Promise<ChatCompletionResult>`
- `generateTopicLabel(chunks: QueryResult[]): Promise<string>`
- `summarizeCluster(chunks: QueryResult[], topicLabel: string): Promise<ClusterSummary>`

Configuration (`.env`):
```bash
LLM_MODEL=gpt-4o-mini
LLM_TEMPERATURE=0.7
LLM_MAX_TOKENS=1000
```

### 1.3 Testing

- Create `src/scripts/testChatCompletion.ts`
- Test basic chat completion
- Test topic label generation
- Test cluster summarization
- Verify token usage tracking

---

## Phase 2: Cluster Summarization

### 2.1 Add Digest Types (`src/types/digest.ts`)

```typescript
export interface ClusterSummary {
  clusterId: number;
  topicLabel: string;
  summary: string;
  keyTakeaways: string[];
  articleCount: number;
  representativeArticles: ArticleReference[];
  metadata: {
    silhouetteScore?: number;
    avgRelevanceScore?: number;
  };
}

export interface ArticleReference {
  title: string;
  source: string;
  url?: string;
  publishedAt?: string;
  excerpt: string;
}

export interface DigestContent {
  title: string;
  generatedAt: string;
  timeWindow: string;
  clusters: ClusterSummary[];
  metadata: DigestMetadata;
}

export interface DigestMetadata {
  totalArticles: number;
  clusterCount: number;
  avgSilhouetteScore?: number;
  processingTime: number;
  model: string;
}
```

### 2.2 Implement Cluster Summarization (`src/workers/digestGenerator.ts`)

Functions to implement:
- `generateTopicLabel(cluster: Cluster): Promise<string>`
- `summarizeCluster(cluster: Cluster, topicLabel: string): Promise<ClusterSummary>`
- `extractKeyTakeaways(cluster: Cluster): Promise<string[]>`
- `formatArticleReferences(cluster: Cluster): ArticleReference[]`

Prompts to use:
- **Topic Labeling**: "Based on these article titles and excerpts, generate a concise, descriptive topic label (3-5 words)..."
- **Summarization**: "Summarize the main themes and insights from these articles in 2-3 sentences..."
- **Key Takeaways**: "Extract 3-5 key takeaways or insights from these articles as bullet points..."

### 2.3 Testing

- Create `src/scripts/testDigestSummarization.ts`
- Test topic label generation for sample clusters
- Test cluster summarization quality
- Verify key takeaways extraction
- Check article reference formatting

---

## Phase 3: Digest Composition

### 3.1 Implement Digest Pipeline (`src/workers/digestGenerator.ts`)

Main function:
```typescript
export async function generateDigest(
  timeWindow: TimeWindow = '24h',
  clusterCount = 5,
  options?: DigestOptions
): Promise<DigestContent>
```

Pipeline steps:
1. Retrieve recent content using `retriever.ts`
2. Cluster content using `summarizer.ts`
3. Generate topic labels for each cluster
4. Summarize each cluster
5. Extract key takeaways
6. Format article references
7. Compose final digest with metadata

### 3.2 Add Notion Client (`src/lib/notionClient.ts`)

Set up Notion API integration:
- Install `@notionhq/client` package
- Create NotionClient class with authentication
- Implement methods:
  - `createDatabase()` - Create digest database if not exists
  - `addDigestEntry()` - Add new digest page to database
  - `formatAsNotionBlocks()` - Convert digest to Notion block structure

Database schema:
```typescript
interface DigestDatabaseSchema {
  title: string;           // Digest title with date
  generatedAt: Date;       // Timestamp
  timeWindow: string;      // "24h", "7d", etc.
  clusterCount: number;    // Number of topics
  articleCount: number;    // Total articles
  qualityScore: number;    // Silhouette score
  content: NotionBlock[];  // Rich content blocks
}
```

### 3.3 Notion Block Formatting

Convert digest to Notion blocks:
- **Heading 1**: Digest title with emoji
- **Callout**: Summary stats (topics, articles, quality)
- **Table of Contents**: Auto-generated from headings
- **Heading 2**: Each cluster topic label
- **Paragraph**: Cluster summary
- **Bulleted List**: Key takeaways
- **Toggle List**: Collapsible article list
- **Bookmark**: Article links with previews
- **Divider**: Separate clusters visually

### 3.4 Testing

- Create `src/scripts/testDigestGeneration.ts`
- Test full pipeline end-to-end
- Verify Notion block formatting
- Test Notion API connection
- Validate database entry creation

---

## Phase 4: Notion Integration & CLI

### 4.1 Install Notion SDK

```bash
npm install @notionhq/client
```

### 4.2 Update Environment Variables (`.env`)

```bash
# LLM Configuration
LLM_MODEL=gpt-4o-mini
LLM_TEMPERATURE=0.7
LLM_MAX_TOKENS=1000

# Digest Configuration
DIGEST_TIME_WINDOW=24h
DIGEST_CLUSTER_COUNT=5

# Notion Configuration
NOTION_API_KEY=secret_xxxxxxxxxxxxx
NOTION_DATABASE_ID=xxxxxxxxxxxxx
NOTION_ENABLE_TOC=true
NOTION_COLLAPSE_ARTICLES=true
```

### 4.3 Notion Setup Guide

1. Create a Notion integration at https://www.notion.so/my-integrations
2. Copy the "Internal Integration Token" to `.env` as `NOTION_API_KEY`
3. Create a new database in Notion for digests
4. Share the database with your integration
5. Copy the database ID from the URL to `.env` as `NOTION_DATABASE_ID`

Database properties to create:
- **Title** (title) - Digest title
- **Generated** (date) - Generation timestamp
- **Window** (select) - Time window (24h, 7d, etc.)
- **Topics** (number) - Cluster count
- **Articles** (number) - Total articles
- **Quality** (number) - Silhouette score

### 4.4 Update Digest Script

Enhance `src/workers/digestGenerator.ts` CLI:
- Support command-line arguments (time window, cluster count)
- Add `--window` flag (1h, 6h, 12h, 24h, 3d, 7d)
- Add `--clusters` flag (3-10 clusters)
- Add `--verbose` flag for detailed logging
- Add `--dry-run` flag to preview without posting to Notion

Example usage:
```bash
npm run digest                      # Default: 24h, 5 clusters, post to Notion
npm run digest -- --window 7d       # Last 7 days
npm run digest -- --clusters 8      # 8 clusters
npm run digest -- --dry-run         # Preview without posting
npm run digest -- --verbose         # Detailed logging
```

### 4.5 Testing

- Test Notion API authentication
- Test database entry creation
- Test block formatting and rendering
- Test different time windows
- Test different cluster counts
- Verify rich formatting in Notion (headings, bullets, bookmarks)

---

## LLM Prompts

### Topic Labeling
```
Based on the following article titles and excerpts, generate a concise, descriptive topic label (3-5 words) that captures the main theme:

Articles:
{article_list}

Return only the topic label, nothing else.
```

### Cluster Summarization
```
Summarize the main themes and insights from these articles in 2-3 clear, concise sentences:

Articles:
{article_list}

Focus on the key patterns, trends, or insights that emerge across these articles.
```

### Key Takeaways Extraction
```
Extract 3-5 key takeaways or insights from these articles as bullet points:

Articles:
{article_list}

Each takeaway should be:
- Specific and actionable
- Supported by the article content
- Concise (1-2 sentences max)
```

---

## Expected Output - Notion Page Structure

### Database Properties
```
Title: 📰 Daily Digest - December 4, 2025
Generated: December 4, 2025 7:00 AM
Window: 24h
Topics: 5
Articles: 47
Quality: 0.72
```

### Page Content Structure

```
📰 Daily Digest - December 4, 2025
[Heading 1]

💡 5 topics from 47 articles • Quality Score: 0.72 (Good)
[Callout - Info]

Table of Contents
[Auto-generated from headings]

---
[Divider]

🤖 AI & Machine Learning
[Heading 2]

Recent developments in AI focus on improved reasoning capabilities, efficiency
optimizations, and regulatory discussions across major tech companies and
research institutions.
[Paragraph]

Key Takeaways
[Heading 3]

• OpenAI released GPT-5 with improved reasoning capabilities
• New research shows transformers can be 10x more efficient
• AI regulation discussions intensify in the EU
[Bulleted List]

📚 Articles (12)
[Toggle Heading - Collapsed by default]

  🔗 GPT-5 Announcement
  [Bookmark with preview]
  TechCrunch • 2 hours ago
  OpenAI today announced the release of GPT-5, featuring enhanced reasoning...

  🔗 Transformer Efficiency Breakthrough
  [Bookmark with preview]
  ArXiv • 5 hours ago
  Researchers at Stanford demonstrate a novel architecture that reduces...

  [... 10 more article bookmarks ...]

[End Toggle]

---
[Divider]

[... more clusters ...]

---
[Divider]

ℹ️ Generation Metadata
[Callout - Gray]

Generated: December 4, 2025 at 7:00 AM
Time Window: Last 24 hours
Model: gpt-4o-mini
Processing Time: 12.3 seconds
Total Articles: 47
Clusters: 5
Average Silhouette Score: 0.72
```

---

## Implementation Checklist

### Phase 1: LLM Chat Completion Support
- [ ] Add chat completion types to `src/types/embedding.ts`
- [ ] Extend `LLMClient` with `chatCompletion()` method
- [ ] Add `generateTopicLabel()` helper method
- [ ] Add `summarizeCluster()` helper method
- [ ] Update `.env.example` with LLM configuration
- [ ] Create `src/scripts/testChatCompletion.ts`
- [ ] Test basic chat completion
- [ ] Test topic label generation
- [ ] Test cluster summarization
- [ ] Verify token usage tracking

### Phase 2: Cluster Summarization
- [ ] Create `src/types/digest.ts` with digest types
- [ ] Export digest types from `src/types/index.ts`
- [ ] Implement `generateTopicLabel()` in `digestGenerator.ts`
- [ ] Implement `summarizeCluster()` in `digestGenerator.ts`
- [ ] Implement `extractKeyTakeaways()` in `digestGenerator.ts`
- [ ] Implement `formatArticleReferences()` in `digestGenerator.ts`
- [ ] Create `src/scripts/testDigestSummarization.ts`
- [ ] Test topic label generation quality
- [ ] Test cluster summarization quality
- [ ] Test key takeaways extraction
- [ ] Verify article reference formatting

### Phase 3: Digest Composition
- [ ] Implement main `generateDigest()` function
- [ ] Create `src/lib/notionClient.ts`
- [ ] Install `@notionhq/client` package
- [ ] Implement NotionClient class with authentication
- [ ] Implement `formatAsNotionBlocks()` method
- [ ] Implement `createDatabase()` method
- [ ] Implement `addDigestEntry()` method
- [ ] Create `src/scripts/testDigestGeneration.ts`
- [ ] Test full pipeline end-to-end
- [ ] Verify Notion block formatting
- [ ] Test Notion API connection

### Phase 4: Notion Integration & CLI
- [ ] Set up Notion integration and get API key
- [ ] Create Notion database for digests
- [ ] Configure database properties (Title, Generated, Window, Topics, Articles, Quality)
- [ ] Share database with integration
- [ ] Update `.env` with Notion configuration
- [ ] Add CLI argument parsing to `digestGenerator.ts`
- [ ] Implement `--window` flag
- [ ] Implement `--clusters` flag
- [ ] Implement `--dry-run` flag
- [ ] Implement `--verbose` flag
- [ ] Test CLI with various arguments
- [ ] Test Notion entry creation
- [ ] Verify rich formatting in Notion
- [ ] Update README with Notion setup guide

### Final Testing & Documentation
- [ ] Run full acceptance test: `npm run digest`
- [ ] Verify digest appears in Notion database
- [ ] Verify digest contains clusters with summaries
- [ ] Verify digest contains article links as bookmarks
- [ ] Test with different time windows (1h, 24h, 7d)
- [ ] Test with different cluster counts (3, 5, 8)
- [ ] Verify Notion formatting (headings, bullets, callouts, toggles)
- [ ] Test table of contents generation
- [ ] Measure and optimize LLM token usage
- [ ] Document Notion setup process
- [ ] Add troubleshooting guide for Notion API
- [ ] Update PLAN.md with completion status

---

## Quality Metrics & Optimization

### Clustering Quality
- **Silhouette Score**: -1 to 1 (target: > 0.5)
  - < 0.3: Poor clustering (consider adjusting k)
  - 0.3-0.5: Fair clustering
  - 0.5-0.7: Good clustering
  - > 0.7: Excellent clustering

### LLM Token Usage
- **Topic Label**: ~50-100 tokens per cluster
- **Summary**: ~200-400 tokens per cluster
- **Key Takeaways**: ~150-300 tokens per cluster
- **Total per digest**: ~2,000-4,000 tokens (5 clusters)
- **Cost estimate**: $0.01-0.02 per digest (gpt-4o-mini)

### Performance Targets
- **Retrieval**: < 1 second
- **Clustering**: < 5 seconds (100 chunks)
- **LLM Summarization**: < 10 seconds (5 clusters)
- **Notion API**: < 5 seconds
- **Total Pipeline**: < 25 seconds

### Quality Checks
- [ ] All clusters have meaningful topic labels
- [ ] Summaries are coherent and accurate
- [ ] Key takeaways are specific and actionable
- [ ] Article references include all metadata
- [ ] No duplicate articles across clusters
- [ ] Notion page renders correctly with proper formatting
- [ ] Bookmarks display with link previews
- [ ] Toggle blocks work correctly (collapsible articles)
- [ ] Table of contents generates properly
- [ ] Callouts display with correct colors and icons
- [ ] Database properties are populated correctly

---

## Next Steps

1. **Start with Phase 1**: Add chat completion support to LLMClient
2. **Then Phase 2**: Implement cluster summarization functions
3. **Then Phase 3**: Build digest composition pipeline and Notion client
4. **Finally Phase 4**: Add CLI options and complete Notion integration

**Acceptance Criteria**: Running `npm run digest` should create a beautifully formatted digest page in your Notion database with clustered topics, summaries, key takeaways, and article links.

