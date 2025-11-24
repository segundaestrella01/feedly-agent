// Fetcher worker: retrieves unread items from Feedly
export async function fetchFeedlyItems() {
  // TODO: Fetch unread items and save to data/raw + metadata to DB
  console.log('Fetching Feedly items...');
}

if (require.main === module) {
  fetchFeedlyItems();
}