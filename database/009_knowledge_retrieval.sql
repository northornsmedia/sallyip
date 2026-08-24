CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS knowledge_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  mime_type text NOT NULL DEFAULT 'application/pdf',
  size_bytes bigint NOT NULL DEFAULT 0,
  checksum_sha256 text,
  rights_confirmed boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'uploaded'
    CHECK (status IN ('uploaded','extracting','embedding','validating','ready','failed')),
  page_count integer,
  passage_count integer NOT NULL DEFAULT 0,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid NOT NULL REFERENCES knowledge_sources(id) ON DELETE CASCADE,
  chunk_index integer NOT NULL,
  page_from integer,
  page_to integer,
  content text NOT NULL,
  token_estimate integer,
  embedding vector(1024),
  embedding_model text NOT NULL DEFAULT 'liquid/lfm-2.5-embedding-350m:free',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(source_id, chunk_index)
);

CREATE INDEX IF NOT EXISTS knowledge_sources_user_created_idx
  ON knowledge_sources(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS knowledge_chunks_source_idx
  ON knowledge_chunks(source_id, chunk_index);
CREATE INDEX IF NOT EXISTS knowledge_chunks_embedding_idx
  ON knowledge_chunks USING hnsw (embedding vector_cosine_ops);

