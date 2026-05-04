-- Global Experience Memory Table
-- Stores "lessons learned" across projects to improve agent intelligence
CREATE TABLE IF NOT EXISTS public.global_experience_memory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content TEXT NOT NULL,
    embedding VECTOR(1536),
    outcome TEXT CHECK (outcome IN ('success', 'failure')),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- HNSW Index for semantic similarity
CREATE INDEX IF NOT EXISTS experience_embedding_idx ON public.global_experience_memory 
USING hnsw (embedding vector_cosine_ops);

-- Index for outcome filtering
CREATE INDEX IF NOT EXISTS experience_outcome_idx ON public.global_experience_memory (outcome);

-- RLS
ALTER TABLE public.global_experience_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service_role full access experience" ON public.global_experience_memory
    FOR ALL USING (auth.role() = 'service_role');

-- Search function for experience retrieval
CREATE OR REPLACE FUNCTION public.match_experience (
  query_embedding VECTOR(1536),
  match_threshold FLOAT,
  match_count INT
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  outcome TEXT,
  similarity FLOAT,
  metadata JSONB
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    gem.id,
    gem.content,
    gem.outcome,
    1 - (gem.embedding <=> query_embedding) AS similarity,
    gem.metadata
  FROM public.global_experience_memory gem
  WHERE 1 - (gem.embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;
