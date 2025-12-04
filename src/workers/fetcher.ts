import { createRSSClientFromConfig } from '../lib/rssClient.js';
import { getConfig, timeWindowToHours } from '../lib/config.js';

/**
 * Fetcher worker: retrieves RSS items and saves to data/raw
 * Fetches items from configured RSS feeds within the specified time window
 * @returns Array of fetched RSS items, or undefined if no items found
 * @throws Error if RSS fetch fails
 */
export async function fetchRSSItems() {
  try {
    console.log('Starting RSS fetch process...');

    const client = await createRSSClientFromConfig();
    const config = getConfig();

    // Get recent items using unified time window configuration
    const hoursBack = timeWindowToHours(config.timeWindow);
    console.log(`📅 Fetching items from the last ${config.timeWindow} (${hoursBack} hours)`);

    const items = await client.getRecentItems(hoursBack);

    if (items.length === 0) {
      console.log('No new items found in the specified time range');
      return;
    }

    // Save raw items to JSON file
    const savedPath = await client.saveRawItems(items);

    console.log(`✅ Successfully fetched and saved ${items.length} RSS items`);
    console.log(`📁 Saved to: ${savedPath}`);

    // TODO: Save metadata to SQLite database (will implement in next stage)

    return items;

  } catch (error) {
    console.error('❌ Error during RSS fetch:', error);
    throw error;
  }
}

// Run fetcher if this file is executed directly
if (process.argv[1] && (process.argv[1].endsWith('fetcher.ts') || process.argv[1].endsWith('fetcher.js'))) {
  fetchRSSItems()
    .then(() => {
      console.log('✅ Fetch completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Fetch failed:', error);
      process.exit(1);
    });
}