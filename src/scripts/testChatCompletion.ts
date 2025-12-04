/**
 * Test Chat Completion
 *
 * This script tests the chat completion functionality of the LLMClient.
 * It verifies:
 * - Basic chat completion
 * - Token usage tracking
 * - Different temperature settings
 * - Error handling
 */

import 'dotenv/config';
import { LLMClient } from '../lib/llmClient.js';
import type { ChatMessage } from '../types/index.js';

async function testBasicChatCompletion() {
  console.log('\n=== Test 1: Basic Chat Completion ===');
  
  const client = new LLMClient();
  
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: 'You are a helpful assistant that provides concise answers.',
    },
    {
      role: 'user',
      content: 'What is the capital of France?',
    },
  ];

  try {
    const result = await client.chatCompletion(messages);
    
    console.log('✅ Chat completion successful');
    console.log('Response:', result.content);
    console.log('Model:', result.model);
    console.log('Tokens:', result.tokens);
    console.log('Finish reason:', result.finishReason);
    
    return true;
  } catch (error) {
    console.error('❌ Chat completion failed:', error);
    return false;
  }
}

async function testTopicLabelGeneration() {
  console.log('\n=== Test 2: Topic Label Generation ===');
  
  const client = new LLMClient();
  
  const articleTitles = [
    'GPT-5 Released with Enhanced Reasoning',
    'New Transformer Architecture Reduces Training Time by 50%',
    'AI Regulation Discussions Heat Up in EU Parliament',
    'OpenAI Announces Partnership with Major Tech Companies',
  ];

  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: 'You are an expert at analyzing article topics and creating concise labels.',
    },
    {
      role: 'user',
      content: `Based on these article titles, generate a concise topic label (3-5 words):

${articleTitles.map((title, i) => `${i + 1}. ${title}`).join('\n')}

Return only the topic label, nothing else.`,
    },
  ];

  try {
    const result = await client.chatCompletion(messages, {
      temperature: 0.3, // Lower temperature for more focused output
      maxTokens: 50,
    });
    
    console.log('✅ Topic label generation successful');
    console.log('Topic Label:', result.content.trim());
    console.log('Tokens used:', result.tokens.total);
    
    return true;
  } catch (error) {
    console.error('❌ Topic label generation failed:', error);
    return false;
  }
}

async function testSummarization() {
  console.log('\n=== Test 3: Cluster Summarization ===');
  
  const client = new LLMClient();
  
  const articles = [
    {
      title: 'GPT-5 Released',
      excerpt: 'OpenAI announces GPT-5 with improved reasoning capabilities...',
    },
    {
      title: 'Transformer Efficiency Breakthrough',
      excerpt: 'Researchers demonstrate 10x efficiency improvement in transformers...',
    },
  ];

  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: 'You are an expert at summarizing technical articles.',
    },
    {
      role: 'user',
      content: `Summarize the main themes from these articles in 2-3 sentences:

${articles.map((a, i) => `${i + 1}. ${a.title}\n   ${a.excerpt}`).join('\n\n')}`,
    },
  ];

  try {
    const result = await client.chatCompletion(messages, {
      temperature: 0.7,
      maxTokens: 200,
    });
    
    console.log('✅ Summarization successful');
    console.log('Summary:', result.content);
    console.log('Tokens used:', result.tokens.total);
    
    return true;
  } catch (error) {
    console.error('❌ Summarization failed:', error);
    return false;
  }
}

async function testErrorHandling() {
  console.log('\n=== Test 4: Error Handling ===');
  
  const client = new LLMClient();
  
  try {
    // Test with empty messages array
    await client.chatCompletion([]);
    console.log('❌ Should have thrown error for empty messages');
    return false;
  } catch (error) {
    console.log('✅ Correctly handled empty messages error');
    return true;
  }
}

async function main() {
  console.log('🧪 Testing Chat Completion Functionality\n');
  console.log('='.repeat(50));
  
  const results = await Promise.all([
    testBasicChatCompletion(),
    testTopicLabelGeneration(),
    testSummarization(),
    testErrorHandling(),
  ]);
  
  console.log('\n' + '='.repeat(50));
  console.log('\n📊 Test Results:');
  console.log(`✅ Passed: ${results.filter(r => r).length}/${results.length}`);
  console.log(`❌ Failed: ${results.filter(r => !r).length}/${results.length}`);
  
  if (results.every(r => r)) {
    console.log('\n🎉 All tests passed!');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

