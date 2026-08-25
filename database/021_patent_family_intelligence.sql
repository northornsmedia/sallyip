ALTER TABLE ip_entities DROP CONSTRAINT IF EXISTS ip_entities_entity_type_check;
ALTER TABLE ip_entities ADD CONSTRAINT ip_entities_entity_type_check CHECK (entity_type IN ('patent','patent_claim','patent_family','trademark','case','legislation','party','person','product','argument','evidence','event','deadline','licence','domain','document'));

CREATE TABLE IF NOT EXISTS patent_families (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  matter_id uuid NOT NULL REFERENCES matters(id) ON DELETE CASCADE,
  family_entity_id uuid NOT NULL REFERENCES ip_entities(id) ON DELETE CASCADE,
  name text NOT NULL,
  family_type text NOT NULL DEFAULT 'declared' CHECK (family_type IN ('simple','extended','declared')),
  earliest_priority_date date,
  source_status text NOT NULL DEFAULT 'user_supplied' CHECK (source_status IN ('user_supplied','retrieved','verified')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS patent_family_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES patent_families(id) ON DELETE CASCADE,
  patent_entity_id uuid NOT NULL REFERENCES ip_entities(id) ON DELETE CASCADE,
  application_number text,
  publication_number text,
  jurisdiction text,
  kind_code text,
  filing_date date,
  priority_date date,
  publication_date date,
  grant_date date,
  legal_status text NOT NULL DEFAULT 'unknown',
  source_basis text NOT NULL DEFAULT 'user_supplied' CHECK (source_basis IN ('user_supplied','uploaded_document','retrieved_source','live_database')),
  source_reference text,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(family_id,patent_entity_id)
);

CREATE TABLE IF NOT EXISTS patent_family_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES patent_families(id) ON DELETE CASCADE,
  from_member_id uuid NOT NULL REFERENCES patent_family_members(id) ON DELETE CASCADE,
  to_member_id uuid NOT NULL REFERENCES patent_family_members(id) ON DELETE CASCADE,
  relationship_type text NOT NULL CHECK (relationship_type IN ('claims_priority_to','continuation_of','divisional_of','national_phase_of','validation_of','family_equivalent')),
  source_basis text NOT NULL DEFAULT 'user_supplied' CHECK (source_basis IN ('user_supplied','uploaded_document','retrieved_source','live_database')),
  source_passage_id uuid REFERENCES source_passages(id) ON DELETE SET NULL,
  note text,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(family_id,from_member_id,to_member_id,relationship_type),
  CHECK (from_member_id<>to_member_id)
);

CREATE INDEX IF NOT EXISTS patent_families_matter_idx ON patent_families(matter_id,updated_at DESC);
CREATE INDEX IF NOT EXISTS patent_family_members_family_idx ON patent_family_members(family_id,priority_date,filing_date);
CREATE INDEX IF NOT EXISTS patent_family_links_family_idx ON patent_family_links(family_id,relationship_type);
