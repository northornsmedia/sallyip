CREATE TABLE IF NOT EXISTS patent_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  matter_id uuid NOT NULL REFERENCES matters(id) ON DELETE CASCADE,
  patent_entity_id uuid NOT NULL REFERENCES ip_entities(id) ON DELETE CASCADE,
  claim_entity_id uuid NOT NULL REFERENCES ip_entities(id) ON DELETE CASCADE,
  claim_number integer NOT NULL,
  claim_type text NOT NULL CHECK (claim_type IN ('independent','dependent')),
  depends_on integer[] NOT NULL DEFAULT '{}',
  claim_text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(patent_entity_id,claim_number)
);

CREATE TABLE IF NOT EXISTS patent_claim_elements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id uuid NOT NULL REFERENCES patent_claims(id) ON DELETE CASCADE,
  ordinal integer NOT NULL,
  element_text text NOT NULL,
  normalized_concept text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(claim_id,ordinal)
);

CREATE TABLE IF NOT EXISTS claim_chart_rows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  matter_id uuid NOT NULL REFERENCES matters(id) ON DELETE CASCADE,
  claim_element_id uuid NOT NULL REFERENCES patent_claim_elements(id) ON DELETE CASCADE,
  target_entity_id uuid REFERENCES ip_entities(id) ON DELETE SET NULL,
  chart_type text NOT NULL CHECK (chart_type IN ('infringement','prior_art')),
  evidence_passage_id uuid REFERENCES source_passages(id) ON DELETE SET NULL,
  mapping_status text NOT NULL DEFAULT 'unmapped' CHECK (mapping_status IN ('mapped','partial','missing','disputed','unmapped')),
  confidence numeric(4,3) CHECK (confidence BETWEEN 0 AND 1),
  comments text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS trademark_similarity_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  matter_id uuid NOT NULL REFERENCES matters(id) ON DELETE CASCADE,
  mark_a_entity_id uuid REFERENCES ip_entities(id) ON DELETE SET NULL,
  mark_b_entity_id uuid REFERENCES ip_entities(id) ON DELETE SET NULL,
  jurisdiction text,
  visual_score numeric(5,2) NOT NULL,
  phonetic_score numeric(5,2) NOT NULL,
  conceptual_score numeric(5,2) NOT NULL,
  goods_services_score numeric(5,2) NOT NULL,
  overall_score numeric(5,2) NOT NULL,
  factors jsonb NOT NULL DEFAULT '{}'::jsonb,
  legal_conclusion_status text NOT NULL DEFAULT 'screening_only',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS patent_claims_matter_idx ON patent_claims(matter_id,patent_entity_id,claim_number);
CREATE INDEX IF NOT EXISTS claim_chart_rows_matter_idx ON claim_chart_rows(matter_id,chart_type);
CREATE INDEX IF NOT EXISTS trademark_similarity_matter_idx ON trademark_similarity_analyses(matter_id,created_at DESC);
