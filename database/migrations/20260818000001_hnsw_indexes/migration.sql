CREATE INDEX "DocumentEmbedding_embedding_idx" 
ON "DocumentEmbedding" 
USING hnsw (embedding vector_cosine_ops);

CREATE INDEX "AIMemory_embedding_idx" 
ON "AIMemory" 
USING hnsw (embedding vector_cosine_ops);
