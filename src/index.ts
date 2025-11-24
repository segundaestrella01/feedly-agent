// Main entry point
import { createApp } from './api/app';

async function main() {
  console.log('Starting Feedly Agent...');
  
  // TODO: Load environment variables
  // TODO: Initialize database
  // TODO: Start API server
  
  createApp();
}

if (require.main === module) {
  main().catch(console.error);
}