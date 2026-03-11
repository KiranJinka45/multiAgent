-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create table for storing code embeddings
CREATE TABLE IF NOT EXISTS public.project_code_embeddings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    chunk_content TEXT NOT NULL,
    embedding VECTOR(1536), -- Dimension for OpenAI text-embedding-3-small
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for vector search (HNSW is performant for large datasets)
CREATE INDEX IF NOT EXISTS code_embedding_idx ON public.project_code_embeddings 
USING hnsw (embedding vector_cosine_ops);

-- Index for project-specific filtering
CREATE INDEX IF NOT EXISTS code_embedding_project_idx ON public.project_code_embeddings (project_id);

-- RLS
ALTER TABLE public.project_code_embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous read embeddings" ON public.project_code_embeddings
    FOR SELECT USING (true);

CREATE POLICY "Allow service_role full access embeddings" ON public.project_code_embeddings
    FOR ALL USING (auth.role() = 'service_role');

-- Search function for RAG
CREATE OR REPLACE FUNCTION public.match_code_chunks (
  query_embedding VECTOR(1536),
  match_threshold FLOAT,
  match_count INT,
  tech_stack_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  project_id UUID,
  file_path TEXT,
  chunk_content TEXT,
  similarity FLOAT,
  metadata JSONB
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    pce.id,
    pce.project_id,
    pce.file_path,
    pce.chunk_content,
    1 - (pce.embedding <=> query_embedding) AS similarity,
    pce.metadata
  FROM public.project_code_embeddings pce
  WHERE 1 - (pce.embedding <=> query_embedding) > match_threshold
    AND (tech_stack_filter IS NULL OR (pce.metadata->>'tech_stack') ILIKE '%' || tech_stack_filter || '%')
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;
