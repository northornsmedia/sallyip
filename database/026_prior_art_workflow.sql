CREATE TABLE IF NOT EXISTS prior_art_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  matter_id uuid NOT NULL REFERENCES matters(id) ON DELETE CASCADE,
  patent_entity_id uuid NOT NULL REFERENCES ip_entities(id) ON DELETE CASCADE,
  claim_id uuid REFERENCES patent_claims(id) ON DELETE SET NULL,
  title text NOT NULL,
  jurisdiction text,
  critical_date date,
  invention_summary text NOT NULL,
  inventive_concepts text[] NOT NULL DEFAULT '{}',
  synonyms jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'planning' CHECK (status IN ('planning','searching','screening','in_review','complete')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS prior_art_search_strategies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES prior_art_projects(id) ON DELETE CASCADE,
  strategy_type text NOT NULL CHECK (strategy_type IN ('keyword','exact_phrase','classification','citation','inventor','applicant','family','semantic')),
  query text NOT NULL,
  rationale text,
  status text NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','running','completed','failed','not_configured')),
  search_run_id uuid REFERENCES professional_search_runs(id) ON DELETE SET NULL,
  result_count integer NOT NULL DEFAULT 0,
  source_basis text NOT NULL DEFAULT 'none' CHECK (source_basis IN ('none','live_database','uploaded_document','retrieved_source')),
  created_at timestamptz NOT NULL DEFAULT now(),
  searched_at timestamptz
);

CREATE TABLE IF NOT EXISTS prior_art_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES prior_art_projects(id) ON DELETE CASCADE,
  patent_entity_id uuid NOT NULL REFERENCES ip_entities(id) ON DELETE CASCADE,
  search_result_id uuid REFERENCES professional_search_results(id) ON DELETE SET NULL,
  publication_date date,
  priority_date date,
  timing_status text NOT NULL DEFAULT 'unknown' CHECK (timing_status IN ('pre_critical','post_critical','unknown')),
  technical_similarity numeric(5,2) NOT NULL DEFAULT 0 CHECK (technical_similarity BETWEEN 0 AND 100),
  claim_coverage numeric(5,2) NOT NULL DEFAULT 0 CHECK (claim_coverage BETWEEN 0 AND 100),
  family_relevance numeric(5,2) NOT NULL DEFAULT 0 CHECK (family_relevance BETWEEN 0 AND 100),
  citation_relevance numeric(5,2) NOT NULL DEFAULT 0 CHECK (citation_relevance BETWEEN 0 AND 100),
  accessible boolean NOT NULL DEFAULT false,
  quality_score numeric(5,2) NOT NULL DEFAULT 0 CHECK (quality_score BETWEEN 0 AND 100),
  novelty_status text NOT NULL DEFAULT 'unreviewed' CHECK (novelty_status IN ('unreviewed','potentially_anticipates','does_not_anticipate','insufficient_evidence')),
  review_status text NOT NULL DEFAULT 'unreviewed' CHECK (review_status IN ('unreviewed','accepted','rejected','needs_research')),
  review_note text,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_id,patent_entity_id)
);

CREATE TABLE IF NOT EXISTS prior_art_element_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES prior_art_candidates(id) ON DELETE CASCADE,
  claim_element_id uuid NOT NULL REFERENCES patent_claim_elements(id) ON DELETE CASCADE,
  disclosure_status text NOT NULL DEFAULT 'unreviewed' CHECK (disclosure_status IN ('unreviewed','explicit','implicit','not_found','disputed')),
  evidence_passage_id uuid REFERENCES source_passages(id) ON DELETE SET NULL,
  confidence numeric(4,3) CHECK (confidence BETWEEN 0 AND 1),
  review_status text NOT NULL DEFAULT 'unreviewed' CHECK (review_status IN ('unreviewed','accepted','rejected','needs_evidence')),
  note text,
  reviewed_at timestamptz,
  UNIQUE(candidate_id,claim_element_id)
);

CREATE TABLE IF NOT EXISTS prior_art_review_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES prior_art_projects(id) ON DELETE CASCADE,
  candidate_id uuid REFERENCES prior_art_candidates(id) ON DELETE CASCADE,
  mapping_id uuid REFERENCES prior_art_element_mappings(id) ON DELETE CASCADE,
  action text NOT NULL,
  previous_status text,
  new_status text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS prior_art_projects_matter_idx ON prior_art_projects(matter_id,updated_at DESC);
CREATE INDEX IF NOT EXISTS prior_art_strategies_project_idx ON prior_art_search_strategies(project_id,created_at);
CREATE INDEX IF NOT EXISTS prior_art_candidates_project_idx ON prior_art_candidates(project_id,quality_score DESC);
CREATE INDEX IF NOT EXISTS prior_art_mappings_candidate_idx ON prior_art_element_mappings(candidate_id);

CREATE OR REPLACE FUNCTION enforce_single_reference_novelty()
RETURNS trigger AS $$
BEGIN
  IF NEW.novelty_status = 'potentially_anticipates' AND (
    NEW.timing_status <> 'pre_critical' OR EXISTS (
      SELECT 1 FROM prior_art_element_mappings m
      WHERE m.candidate_id = NEW.id
        AND (m.disclosure_status NOT IN ('explicit','implicit') OR m.review_status <> 'accepted')
    ) OR NOT EXISTS (SELECT 1 FROM prior_art_element_mappings m WHERE m.candidate_id = NEW.id)
  ) THEN
    RAISE EXCEPTION 'novelty anticipation requires every element to be accepted against this single reference';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prior_art_single_reference_novelty ON prior_art_candidates;
CREATE TRIGGER prior_art_single_reference_novelty
BEFORE INSERT OR UPDATE OF novelty_status,timing_status ON prior_art_candidates
FOR EACH ROW EXECUTE FUNCTION enforce_single_reference_novelty();

