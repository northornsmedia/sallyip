-- Canonical patent intelligence layer: provider records normalised from every
-- connected office (USPTO, EPO/OPS, WIPO, UKIPO journal, InPASS journal) into
-- one record shape. Family resolution is a priority-data heuristic (NOT
-- INPADOC); family_key values carry their method so downstream consumers know.
CREATE TABLE IF NOT EXISTS provider_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  matter_id uuid REFERENCES matters(id) ON DELETE SET NULL,
  provider text NOT NULL,
  provider_version text NOT NULL DEFAULT 'v1',
  external_id text,
  country text,
  pub_number text,
  kind text,
  normalized_number text,
  title text,
  publication_date date,
  filing_date date,
  priority_date date,
  priority_numbers jsonb NOT NULL DEFAULT '[]'::jsonb,
  family_key text,
  family_method text NOT NULL DEFAULT 'unresolved' CHECK (family_method IN ('unresolved','shared-priority','same-number-stem','manual')),
  inventors jsonb NOT NULL DEFAULT '[]'::jsonb,
  assignees jsonb NOT NULL DEFAULT '[]'::jsonb,
  legal_status text,
  status_as_of date,
  entity_id uuid REFERENCES ip_entities(id) ON DELETE SET NULL,
  raw jsonb NOT NULL DEFAULT '{}'::jsonb,
  retrieved_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, provider, external_id)
);

CREATE INDEX IF NOT EXISTS provider_records_matter_idx ON provider_records(matter_id, retrieved_at DESC);
CREATE INDEX IF NOT EXISTS provider_records_family_idx ON provider_records(family_key) WHERE family_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS provider_records_number_idx ON provider_records(normalized_number) WHERE normalized_number IS NOT NULL;
