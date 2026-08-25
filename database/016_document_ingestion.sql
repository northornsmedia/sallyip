ALTER TABLE knowledge_sources ADD COLUMN IF NOT EXISTS legal_source_id uuid REFERENCES legal_sources(id) ON DELETE SET NULL;
ALTER TABLE knowledge_sources ADD COLUMN IF NOT EXISTS original_filename text;
ALTER TABLE knowledge_sources ADD COLUMN IF NOT EXISTS parser_version text NOT NULL DEFAULT 'sally-parser/1';
ALTER TABLE knowledge_sources ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'en';
ALTER TABLE knowledge_sources ADD COLUMN IF NOT EXISTS access_scope text NOT NULL DEFAULT 'matter' CHECK (access_scope IN ('private','matter','team','department','organisation'));

CREATE TABLE IF NOT EXISTS knowledge_source_files (
  source_id uuid PRIMARY KEY REFERENCES knowledge_sources(id) ON DELETE CASCADE,
  content bytea NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS knowledge_sources_user_matter_checksum_idx
  ON knowledge_sources(user_id,matter_id,checksum_sha256)
  WHERE checksum_sha256 IS NOT NULL;
