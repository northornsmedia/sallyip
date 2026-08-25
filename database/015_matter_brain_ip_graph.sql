CREATE TABLE IF NOT EXISTS matters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  client_name text,
  matter_type text NOT NULL DEFAULT 'general_ip',
  jurisdictions text[] NOT NULL DEFAULT '{}',
  description text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','on_hold','closed','archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS matter_facts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_id uuid NOT NULL REFERENCES matters(id) ON DELETE CASCADE,
  fact_type text NOT NULL,
  label text NOT NULL,
  value jsonb NOT NULL,
  confidence numeric(4,3) CHECK (confidence BETWEEN 0 AND 1),
  source_id uuid,
  status text NOT NULL DEFAULT 'asserted' CHECK (status IN ('asserted','verified','disputed','superseded')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ip_entities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  matter_id uuid REFERENCES matters(id) ON DELETE CASCADE,
  entity_type text NOT NULL CHECK (entity_type IN ('patent','patent_claim','trademark','case','legislation','party','person','product','argument','evidence','event','deadline','licence','domain','document')),
  canonical_identifier text,
  name text NOT NULL,
  jurisdiction text,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_status text NOT NULL DEFAULT 'user_supplied' CHECK (source_status IN ('user_supplied','retrieved','verified','inferred')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ip_relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  matter_id uuid REFERENCES matters(id) ON DELETE CASCADE,
  from_entity_id uuid NOT NULL REFERENCES ip_entities(id) ON DELETE CASCADE,
  relationship_type text NOT NULL,
  to_entity_id uuid NOT NULL REFERENCES ip_entities(id) ON DELETE CASCADE,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  confidence numeric(4,3) CHECK (confidence BETWEEN 0 AND 1),
  source_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(from_entity_id,relationship_type,to_entity_id)
);

CREATE TABLE IF NOT EXISTS legal_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  matter_id uuid REFERENCES matters(id) ON DELETE CASCADE,
  title text NOT NULL,
  source_type text NOT NULL,
  authority_tier smallint NOT NULL DEFAULT 5 CHECK (authority_tier BETWEEN 1 AND 5),
  jurisdiction text,
  citation text,
  official_url text,
  issuing_body text,
  publication_date date,
  effective_from date,
  effective_to date,
  authority_status text NOT NULL DEFAULT 'unknown' CHECK (authority_status IN ('current','historic','superseded','reversed','distinguished','unknown')),
  retrieval_method text NOT NULL DEFAULT 'uploaded' CHECK (retrieval_method IN ('uploaded','live_database','official_web','curated','model_proposed')),
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS source_passages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid NOT NULL REFERENCES legal_sources(id) ON DELETE CASCADE,
  locator_type text NOT NULL DEFAULT 'paragraph',
  locator text NOT NULL,
  content text NOT NULL,
  checksum_sha256 text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS legal_propositions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  matter_id uuid REFERENCES matters(id) ON DELETE CASCADE,
  proposition text NOT NULL,
  jurisdiction text,
  confidence text NOT NULL DEFAULT 'insufficient' CHECK (confidence IN ('high','moderate','low','insufficient')),
  verification_status text NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending','supported','qualified','rejected')),
  contrary_authority_checked boolean NOT NULL DEFAULT false,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS proposition_sources (
  proposition_id uuid NOT NULL REFERENCES legal_propositions(id) ON DELETE CASCADE,
  passage_id uuid NOT NULL REFERENCES source_passages(id) ON DELETE CASCADE,
  support_type text NOT NULL CHECK (support_type IN ('supports','contradicts','distinguishes','background')),
  verification_note text,
  PRIMARY KEY(proposition_id,passage_id)
);

CREATE TABLE IF NOT EXISTS specialist_agent_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  matter_id uuid REFERENCES matters(id) ON DELETE SET NULL,
  conversation_id uuid REFERENCES conversations(id) ON DELETE SET NULL,
  task_class text NOT NULL,
  specialists text[] NOT NULL,
  jurisdictions text[] NOT NULL DEFAULT '{}',
  research_mode text NOT NULL DEFAULT 'quick',
  source_basis text NOT NULL DEFAULT 'model_knowledge',
  verification_status text NOT NULL DEFAULT 'not_run',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE conversations ADD COLUMN IF NOT EXISTS matter_id uuid REFERENCES matters(id) ON DELETE SET NULL;
ALTER TABLE knowledge_sources ADD COLUMN IF NOT EXISTS matter_id uuid REFERENCES matters(id) ON DELETE CASCADE;
ALTER TABLE artifacts ADD COLUMN IF NOT EXISTS matter_id uuid REFERENCES matters(id) ON DELETE SET NULL;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS provenance jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS matters_user_updated_idx ON matters(user_id,updated_at DESC);
CREATE INDEX IF NOT EXISTS matter_facts_matter_idx ON matter_facts(matter_id,fact_type);
CREATE INDEX IF NOT EXISTS ip_entities_matter_type_idx ON ip_entities(matter_id,entity_type);
CREATE INDEX IF NOT EXISTS ip_entities_identifier_idx ON ip_entities(canonical_identifier);
CREATE INDEX IF NOT EXISTS ip_relationships_matter_idx ON ip_relationships(matter_id,relationship_type);
CREATE INDEX IF NOT EXISTS legal_sources_matter_tier_idx ON legal_sources(matter_id,authority_tier);
CREATE INDEX IF NOT EXISTS legal_propositions_matter_idx ON legal_propositions(matter_id,verification_status);
