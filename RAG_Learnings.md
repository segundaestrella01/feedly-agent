# Embeddings
Embeddings capture semantic meaning because they encode the meaning of text into numbers in a way that preserves relationships between ideas.
An embedding is a vector produced by a model trained to understand relationships between texts.
Each dimension in the vector loosely represents a latent concept (not human-interpretable).
There are hundreds or thousands of such hidden features.
A text’s embedding is its “coordinate” along all those concepts at once.

Models are trained with objectives that force them to:
- Bring related texts closer
- Push unrelated texts apart

Embedding is needed because **do retrieval by meaning, not string matching**

# Clustering

Clustering is needed because:
- You retrieve many chunks and need to organize them by topic
- It makes digest clearer and cheaper to generate
- It provides structure for summarization

How it's done:

1. Retrieve recent chunks and extract embeddings
2. Run k-means on embedding vectors
3. Group chunks by cluster ID
4. Pick representatives per cluster
5. Summarize each cluster with the LLM
6. Assemble digest