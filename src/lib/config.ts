import 'dotenv/config';
import type { TimeWindow } from '../types/retrieval.js';

/**
 * Configuration Management Module
 *
 * Centralizes all environment variable handling with validation,
 * type safety, and default values according to the Stage 3.6 plan.
 */

// Constants for validation
const MAX_BATCH_SIZE = 1000;
const MAX_RETRIES = 10;
const OPENAI_SMALL_EMBEDDING_DIMENSION = 1536;
const OPENAI_LARGE_EMBEDDING_DIMENSION = 3072;
const MAX_DELAY_MS = 10000;
const MAX_CONCURRENCY = 10;
const SEPARATOR_LENGTH = 50;
const DEFAULT_TIME_WINDOW: TimeWindow = '24h';

export interface AppConfig {
  // OpenAI Configuration (Stage 3.1 - LLM Client)
  openai: {
    apiKey: string;
    embeddingModel: string;
    embeddingBatchSize: number;
    embeddingMaxRetries: number;
  };

  // Chroma Configuration (Stage 3.2 - Vector Database)
  chroma: {
    dbType: string;
    dataPath: string;
    collectionName: string;
    vectorDimension: number;
  };

  // Processing Configuration (Stage 3.4 - Embedder Worker)
  processing: {
    embeddingConcurrency: number;
    embeddingDelayMs: number;
  };

  // General LLM Configuration
  llm: {
    apiKey: string;
    model: string;
  };

  // Database Configuration
  database: {
    metadbUrl: string;
  };

  // Application Configuration
  app: {
    secret: string;
    scheduleCron: string;
    dataDir: string;
  };

  // Time Window Configuration
  timeWindow: TimeWindow;

  // Email Configuration (optional)
  email?: {
    smtpUrl: string;
  };
}

/**
 * Convert TimeWindow to hours for backward compatibility
 */
export function timeWindowToHours(timeWindow: TimeWindow): number {
  const timeMap: Record<TimeWindow, number> = {
    '1h': 1,
    '6h': 6,
    '12h': 12,
    '24h': 24,
    '3d': 72,
    '7d': 168,
  };
  return timeMap[timeWindow];
}

/**
 * Get time window from environment variable
 */
function getTimeWindowFromEnv(): TimeWindow {
  const validTimeWindows: TimeWindow[] = ['1h', '6h', '12h', '24h', '3d', '7d'];

  if (process.env.TIME_WINDOW) {
    const timeWindow = process.env.TIME_WINDOW as TimeWindow;
    if (validTimeWindows.includes(timeWindow)) {
      return timeWindow;
    }
    console.warn(`⚠️  Invalid TIME_WINDOW value: ${process.env.TIME_WINDOW}. Using default: ${DEFAULT_TIME_WINDOW}`);
  }

  return DEFAULT_TIME_WINDOW;
}

/**
 * Load and validate configuration from environment variables
 */
function loadConfig(): AppConfig {
  // Required environment variables validation
  const requiredVars = [
    'OPENAI_API_KEY',
    'LLM_API_KEY',
  ];

  const missing = requiredVars.filter(varName => !process.env[varName]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  // Determine time window with backward compatibility
  const timeWindow = getTimeWindowFromEnv();

  return {
    // OpenAI Configuration (Stage 3.1 - LLM Client)
    openai: {
      apiKey: process.env.OPENAI_API_KEY!,
      embeddingModel: process.env.EMBEDDING_MODEL || 'text-embedding-3-small',
      embeddingBatchSize: parseInt(process.env.EMBEDDING_BATCH_SIZE || '50', 10),
      embeddingMaxRetries: parseInt(process.env.EMBEDDING_MAX_RETRIES || '3', 10),
    },

    // Chroma Configuration (Stage 3.2 - Vector Database)
    chroma: {
      dbType: process.env.VECTOR_DB_TYPE || 'chroma',
      dataPath: process.env.CHROMA_DATA_PATH || './data/chroma',
      collectionName: process.env.CHROMA_COLLECTION_NAME || 'rss_chunks',
      vectorDimension: parseInt(process.env.VECTOR_DIMENSION || '1536', 10),
    },

    // Processing Configuration (Stage 3.4 - Embedder Worker)
    processing: {
      embeddingConcurrency: parseInt(process.env.EMBEDDING_CONCURRENCY || '1', 10),
      embeddingDelayMs: parseInt(process.env.EMBEDDING_DELAY_MS || '1000', 10),
    },

    // General LLM Configuration
    llm: {
      apiKey: process.env.LLM_API_KEY!,
      model: process.env.LLM_MODEL || 'gpt-4o-mini',
    },

    // Database Configuration
    database: {
      metadbUrl: process.env.METADB_URL || 'sqlite:./data/metadb.sqlite',
    },

    // Application Configuration
    app: {
      secret: process.env.APP_SECRET || 'default_dev_secret_change_in_production',
      scheduleCron: process.env.SCHEDULE_CRON || '0 7 * * *',
      dataDir: process.env.DATA_DIR || './data',
    },

    // Time Window Configuration
    timeWindow,

    // Email Configuration (optional)
    ...(process.env.SMTP_URL && {
      email: {
        smtpUrl: process.env.SMTP_URL,
      },
    }),
  };
}

/**
 * Validate configuration values
 */
function validateConfig(config: AppConfig): void {
  // Validate embedding batch size
  if (config.openai.embeddingBatchSize < 1 || config.openai.embeddingBatchSize > MAX_BATCH_SIZE) {
    throw new Error(`EMBEDDING_BATCH_SIZE must be between 1 and ${MAX_BATCH_SIZE}`);
  }

  // Validate embedding max retries
  if (config.openai.embeddingMaxRetries < 1 || config.openai.embeddingMaxRetries > MAX_RETRIES) {
    throw new Error(`EMBEDDING_MAX_RETRIES must be between 1 and ${MAX_RETRIES}`);
  }

  // Validate vector dimension
  if (config.chroma.vectorDimension !== OPENAI_SMALL_EMBEDDING_DIMENSION && config.chroma.vectorDimension !== OPENAI_LARGE_EMBEDDING_DIMENSION) {
    console.warn(`Warning: VECTOR_DIMENSION is ${config.chroma.vectorDimension}. OpenAI text-embedding-3-small uses ${OPENAI_SMALL_EMBEDDING_DIMENSION} dimensions.`);
  }

  // Validate embedding delay
  if (config.processing.embeddingDelayMs < 0 || config.processing.embeddingDelayMs > MAX_DELAY_MS) {
    throw new Error(`EMBEDDING_DELAY_MS must be between 0 and ${MAX_DELAY_MS}`);
  }

  // Validate concurrency
  if (config.processing.embeddingConcurrency < 1 || config.processing.embeddingConcurrency > MAX_CONCURRENCY) {
    throw new Error(`EMBEDDING_CONCURRENCY must be between 1 and ${MAX_CONCURRENCY}`);
  }

  // Validate time window
  const validTimeWindows: TimeWindow[] = ['1h', '6h', '12h', '24h', '3d', '7d'];
  if (!validTimeWindows.includes(config.timeWindow)) {
    throw new Error(`TIME_WINDOW must be one of: ${validTimeWindows.join(', ')}`);
  }
}

/**
 * Get the application configuration
 */
let cachedConfig: AppConfig | null = null;

export function getConfig(): AppConfig {
  if (!cachedConfig) {
    cachedConfig = loadConfig();
    validateConfig(cachedConfig);
  }
  return cachedConfig;
}

/**
 * Print configuration summary for debugging
 */
export function printConfigSummary(): void {
  const config = getConfig();

  console.log('📋 Configuration Summary:');
  console.log('='.repeat(SEPARATOR_LENGTH));
  console.log(`🤖 OpenAI Model: ${config.openai.embeddingModel}`);
  console.log(`📦 Batch Size: ${config.openai.embeddingBatchSize}`);
  console.log(`🔄 Max Retries: ${config.openai.embeddingMaxRetries}`);
  console.log(`🗄️ Vector DB: ${config.chroma.dbType} (${config.chroma.collectionName})`);
  console.log(`📐 Vector Dimensions: ${config.chroma.vectorDimension}`);
  console.log(`⚡ Concurrency: ${config.processing.embeddingConcurrency}`);
  console.log(`⏱️ Delay: ${config.processing.embeddingDelayMs}ms`);
  console.log(`📁 Data Directory: ${config.app.dataDir}`);
  console.log(`📊 Database: ${config.database.metadbUrl}`);
  console.log(`🕐 Time Window: ${config.timeWindow} (${timeWindowToHours(config.timeWindow)} hours)`);
  console.log('='.repeat(SEPARATOR_LENGTH));
}

/**
 * Ensure required directories exist
 */
export async function ensureDirectories(): Promise<void> {
  const config = getConfig();
  const { promises: fs } = await import('fs');
  const path = await import('path');

  const requiredDirs = [
    config.app.dataDir,
    config.chroma.dataPath,
    path.join(config.app.dataDir, 'raw'),
    path.join(config.app.dataDir, 'chunks'),
  ];

  for (const dir of requiredDirs) {
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (error) {
      // Directory may already exist
      const err = error as Error & { code?: string };
      if (err.code !== 'EEXIST') {
        throw new Error(`Failed to create directory ${dir}: ${err.message}`);
      }
    }
  }
}

/**
 * Environment-specific configuration helpers
 */
export const isDevelopment = (): boolean => process.env.NODE_ENV === 'development';
export const isProduction = (): boolean => process.env.NODE_ENV === 'production';
export const isTest = (): boolean => process.env.NODE_ENV === 'test';

// Export the configuration for direct access
export const config = getConfig();

export default config;