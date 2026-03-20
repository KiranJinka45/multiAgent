-- Semantic Memories Table (Phase 19 Hardening)
CREATE TABLE IF NOT EXISTS public.semantic_memories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id TEXT NOT NULL,
    project_id UUID,
    type TEXT NOT NULL,
    content TEXT NOT NULL,
    embedding VECTOR(1536),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for tenant-specific vector search
CREATE INDEX IF NOT EXISTS semantic_memories_embedding_idx ON public.semantic_memories 
USING hnsw (embedding vector_cosine_ops);

-- Search function with tenant isolation
CREATE OR REPLACE FUNCTION public.match_semantic_memories (
  query_embedding VECTOR(1536),
  match_threshold FLOAT,
  match_count INT,
  p_tenant_id TEXT
)
RETURNS TABLE (
  id UUID,
  type TEXT,
  content TEXT,
  similarity FLOAT,
  metadata JSONB
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    sm.id,
    sm.type,
    sm.content,
    1 - (sm.embedding <=> query_embedding) AS similarity,
    sm.metadata
  FROM public.semantic_memories sm
  WHERE sm.tenant_id = p_tenant_id
    AND 1 - (sm.embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;
