/**
 * Test Digest Workflow
 * 
 * This script tests the complete digest generation workflow:
 * 1. Simulate retrieval of clustered content
 * 2. Generate topic labels for each cluster
 * 3. Summarize each cluster
 * 4. Compose a digest
 * 
 * This simulates the actual digest generation process.
 */

import 'dotenv/config';
import { LLMClient } from '../lib/llmClient.js';
import type { ChatMessage, Cluster, ChunkMetadata } from '../types/index.js';

// Helper to create mock metadata
function createMockMetadata(
  title: string,
  url: string,
  source: string,
  publishedDate: string,
): ChunkMetadata {
  return {
    title,
    source_url: url,
    source,
    published_date: publishedDate,
    chunk_index: 0,
    total_chunks: 1,
    word_count: 50,
    char_count: 300,
    content_type: 'article',
    processed_date: new Date().toISOString(),
    embedded_date: new Date().toISOString(),
    chunk_id: `chunk_${Date.now()}_${Math.random()}`,
  };
}

// Mock data simulating real RSS content clusters
const mockClusters: Cluster[] = [
  {
    id: 0,
    size: 3,
    centroid: [],
    chunks: [
      {
        id: '1',
        content: 'OpenAI releases GPT-5 with enhanced reasoning capabilities and improved context understanding.',
        metadata: createMockMetadata(
          'GPT-5 Released with Enhanced Reasoning',
          'https://example.com/gpt5',
          'AI News',
          '2024-12-01T00:00:00Z',
        ),
        distance: 0.1,
        score: 0.9,
      },
      {
        id: '2',
        content: 'New transformer architecture reduces training time by 50% while maintaining accuracy.',
        metadata: createMockMetadata(
          'Breakthrough in Transformer Efficiency',
          'https://example.com/transformer',
          'ML Research',
          '2024-12-01T00:00:00Z',
        ),
        distance: 0.15,
        score: 0.85,
      },
      {
        id: '3',
        content: 'Anthropic announces Claude 4 with improved safety features and longer context windows.',
        metadata: createMockMetadata(
          'Claude 4 Announcement',
          'https://example.com/claude4',
          'AI News',
          '2024-12-02T00:00:00Z',
        ),
        distance: 0.12,
        score: 0.88,
      },
    ],
    representativeChunk: {
      id: '1',
      content: 'OpenAI releases GPT-5 with enhanced reasoning capabilities.',
      metadata: createMockMetadata(
        'GPT-5 Released',
        'https://example.com/gpt5',
        'AI News',
        '2024-12-01T00:00:00Z',
      ),
      distance: 0.1,
      score: 0.9,
    },
  },
  {
    id: 1,
    size: 2,
    centroid: [],
    chunks: [
      {
        id: '4',
        content: 'EU Parliament debates new AI regulation framework focusing on transparency and accountability.',
        metadata: createMockMetadata(
          'EU AI Regulation Discussions',
          'https://example.com/eu-ai',
          'Policy Watch',
          '2024-12-02T00:00:00Z',
        ),
        distance: 0.08,
        score: 0.92,
      },
      {
        id: '5',
        content: 'US Senate proposes bipartisan AI safety bill requiring impact assessments for large models.',
        metadata: createMockMetadata(
          'US AI Safety Bill Proposed',
          'https://example.com/us-bill',
          'Policy Watch',
          '2024-12-03T00:00:00Z',
        ),
        distance: 0.11,
        score: 0.89,
      },
    ],
    representativeChunk: {
      id: '4',
      content: 'EU Parliament debates new AI regulation framework.',
      metadata: createMockMetadata(
        'EU AI Regulation',
        'https://example.com/eu-ai',
        'Policy Watch',
        '2024-12-02T00:00:00Z',
      ),
      distance: 0.08,
      score: 0.92,
    },
  },
];

async function generateTopicLabel(client: LLMClient, cluster: Cluster): Promise<string> {
  const titles = cluster.chunks.map(chunk => chunk.metadata?.title || 'Untitled');
  
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: 'You are an expert at analyzing article topics and creating concise, descriptive labels.',
    },
    {
      role: 'user',
      content: `Based on these article titles, generate a concise topic label (3-5 words):

${titles.map((title, i) => `${i + 1}. ${title}`).join('\n')}

Return only the topic label, nothing else.`,
    },
  ];

  const result = await client.chatCompletion(messages, {
    temperature: 0.3,
    maxTokens: 50,
  });

  return result.content.trim();
}

async function summarizeCluster(
  client: LLMClient,
  cluster: Cluster,
  topicLabel: string,
): Promise<string> {
  const articles = cluster.chunks.map(chunk => ({
    title: chunk.metadata?.title || 'Untitled',
    content: chunk.content,
    source: chunk.metadata?.source || 'Unknown',
  }));

  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: 'You are an expert at summarizing technical articles and identifying key insights.',
    },
    {
      role: 'user',
      content: `Topic: ${topicLabel}

Summarize the main themes and key takeaways from these articles in 2-3 sentences:

${articles.map((a, i) => `${i + 1}. ${a.title} (${a.source})\n   ${a.content}`).join('\n\n')}`,
    },
  ];

  const result = await client.chatCompletion(messages, {
    temperature: 0.7,
    maxTokens: 200,
  });

  return result.content.trim();
}

async function testDigestWorkflow() {
  const SECONDS = 60;
  console.log('🧪 Testing Complete Digest Workflow\n');
  console.log('='.repeat(SECONDS));

  const client = new LLMClient();

  console.log(`\n📊 Processing ${mockClusters.length} clusters...\n`);

  for (const cluster of mockClusters) {
    console.log(`\n--- Cluster ${cluster.id + 1} (${cluster.size} articles) ---`);

    // Step 1: Generate topic label
    console.log('🏷️  Generating topic label...');
    const topicLabel = await generateTopicLabel(client, cluster);
    console.log(`   Topic: "${topicLabel}"`);

    // Step 2: Summarize cluster
    console.log('📝 Generating summary...');
    const summary = await summarizeCluster(client, cluster, topicLabel);
    console.log(`   Summary: ${summary}`);

    // Step 3: List articles
    console.log('📰 Articles:');
    cluster.chunks.forEach((chunk, i) => {
      console.log(`   ${i + 1}. ${chunk.metadata?.title}`);
      console.log(`      ${chunk.metadata?.source_url}`);
      const publishedDate = chunk.metadata?.published_date
        ? new Date(chunk.metadata.published_date).toLocaleDateString()
        : 'Unknown date';
      console.log(`      Source: ${chunk.metadata?.source} | ${publishedDate}`);
    });
  }

  console.log('\n' + '='.repeat(SECONDS));
  console.log('\n✅ Digest workflow test complete!');
  console.log(`📊 Total clusters processed: ${mockClusters.length}`);
  console.log(`📰 Total articles: ${mockClusters.reduce((sum, c) => sum + c.size, 0)}`);
}

async function main() {
  try {
    await testDigestWorkflow();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

main();
