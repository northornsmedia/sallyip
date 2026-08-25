CREATE TABLE IF NOT EXISTS artifacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  title text NOT NULL,
  document_type text NOT NULL DEFAULT 'legal_document',
  active_version integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','review','approved','final','superseded')),
  jurisdiction text,
  practice_area text NOT NULL DEFAULT 'Intellectual Property',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS artifact_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artifact_id uuid NOT NULL REFERENCES artifacts(id) ON DELETE CASCADE,
  version integer NOT NULL,
  content text NOT NULL,
  content_format text NOT NULL DEFAULT 'markdown',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  sources jsonb NOT NULL DEFAULT '[]'::jsonb,
  source_message_id uuid REFERENCES messages(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (artifact_id,version)
);

ALTER TABLE conversations ADD COLUMN IF NOT EXISTS last_active_artifact_id uuid REFERENCES artifacts(id) ON DELETE SET NULL;
ALTER TABLE generated_files ADD COLUMN IF NOT EXISTS artifact_id uuid REFERENCES artifacts(id) ON DELETE SET NULL;
ALTER TABLE generated_files ADD COLUMN IF NOT EXISTS artifact_version integer;
CREATE INDEX IF NOT EXISTS artifacts_conversation_updated_idx ON artifacts(conversation_id,updated_at DESC);
CREATE INDEX IF NOT EXISTS artifact_versions_artifact_version_idx ON artifact_versions(artifact_id,version DESC);
CREATE INDEX IF NOT EXISTS generated_files_artifact_idx ON generated_files(artifact_id,artifact_version);

-- Promote compatible legacy message snapshots into first-class artifacts.
INSERT INTO artifacts(id,user_id,conversation_id,title,active_version,updated_at)
SELECT DISTINCT ON ((m.artifact->>'id')::uuid)
  (m.artifact->>'id')::uuid,c.user_id,m.conversation_id,
  coalesce(nullif(m.artifact->>'title',''),'SallyIP document'),
  greatest(coalesce((m.artifact->>'version')::integer,1),1),m.created_at
FROM messages m JOIN conversations c ON c.id=m.conversation_id
WHERE m.artifact IS NOT NULL AND (m.artifact->>'id') ~* '^[0-9a-f-]{36}$'
ORDER BY (m.artifact->>'id')::uuid,m.created_at DESC
ON CONFLICT (id) DO NOTHING;

INSERT INTO artifact_versions(artifact_id,version,content,metadata)
SELECT (m.artifact->>'id')::uuid,greatest(coalesce((m.artifact->>'version')::integer,1),1),m.artifact->>'content','{"migrated_from":"message_snapshot"}'::jsonb
FROM messages m
WHERE m.artifact IS NOT NULL AND nullif(m.artifact->>'content','') IS NOT NULL AND (m.artifact->>'id') ~* '^[0-9a-f-]{36}$'
ON CONFLICT (artifact_id,version) DO NOTHING;

UPDATE conversations c SET last_active_artifact_id=latest.artifact_id
FROM (
  SELECT DISTINCT ON (m.conversation_id) m.conversation_id,(m.artifact->>'id')::uuid artifact_id
  FROM messages m
  WHERE m.artifact IS NOT NULL AND (m.artifact->>'id') ~* '^[0-9a-f-]{36}$'
  ORDER BY m.conversation_id,m.created_at DESC
) latest WHERE c.id=latest.conversation_id;
