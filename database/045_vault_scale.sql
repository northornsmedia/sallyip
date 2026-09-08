CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS source_passages_content_trgm_idx ON source_passages USING gin (content gin_trgm_ops);
CREATE INDEX IF NOT EXISTS knowledge_chunks_content_trgm_idx ON knowledge_chunks USING gin (content gin_trgm_ops);
CREATE INDEX IF NOT EXISTS legal_sources_matter_idx ON legal_sources(matter_id, created_at DESC);
CREATE INDEX IF NOT EXISTS source_passages_source_idx ON source_passages(source_id);

CREATE TABLE IF NOT EXISTS vault_review_tables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  matter_id uuid NOT NULL REFERENCES matters(id) ON DELETE CASCADE,
  name text NOT NULL,
  columns jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','running','ready','failed')),
  result_summary text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS vault_review_rows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id uuid NOT NULL REFERENCES vault_review_tables(id) ON DELETE CASCADE,
  source_id uuid REFERENCES legal_sources(id) ON DELETE SET NULL,
  cells jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'extracted' CHECK (status IN ('extracted','needs_review','confirmed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(table_id, source_id)
);

CREATE INDEX IF NOT EXISTS vault_review_tables_matter_idx ON vault_review_tables(matter_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS vault_review_rows_table_idx ON vault_review_rows(table_id);
