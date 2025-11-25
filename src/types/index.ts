/**
 * Types Index
 * 
 * Central export point for all type definitions.
 * This file re-exports all types from domain-specific modules.
 */

// RSS and Feed Types
export * from './rss.js';

// Content Processing Types
export * from './content.js';

// Embedding and LLM Types
export * from './embedding.js';

// Vector Database Types
export * from './vector.js';

// Retrieval System Types
export * from './retrieval.js';

// Database Types
export * from './database.js';

// Common utility types
export interface ConfigurationError extends Error {
  code: string;
  details?: Record<string, unknown>;
}

export interface ProcessingError extends Error {
  stage: string;
  context?: Record<string, unknown>;
}

// Status and monitoring types
export interface ServiceHealth {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastCheck: Date;
  details?: Record<string, unknown>;
}

export interface SystemStatus {
  database: ServiceHealth;
  vectorStore: ServiceHealth;
  llmService: ServiceHealth;
  overall: 'operational' | 'degraded' | 'down';
}

// Environment and configuration
export interface EnvironmentConfig {
  NODE_ENV: 'development' | 'production' | 'test';
  DATA_DIR: string;
  LOG_LEVEL: 'debug' | 'info' | 'warn' | 'error';
}

// File and path types
export interface FileOperation {
  path: string;
  operation: 'read' | 'write' | 'delete' | 'move';
  size?: number;
  timestamp: Date;
}

export interface DirectoryStructure {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  children?: DirectoryStructure[];
}