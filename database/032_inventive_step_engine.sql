CREATE TABLE IF NOT EXISTS inventive_step_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  matter_id uuid NOT NULL REFERENCES matters(id) ON DELETE CASCADE,
  prior_art_project_id uuid NOT NULL REFERENCES prior_art_projects(id) ON DELETE CASCADE,
  claim_id uuid NOT NULL REFERENCES patent_claims(id) ON DELETE CASCADE,
  title text NOT NULL,
  framework text NOT NULL CHECK (framework IN ('epo_problem_solution','uk_pozzoli','us_graham_ksr')),
  jurisdiction text NOT NULL,
  governing_authority_passage_id uuid REFERENCES source_passages(id) ON DELETE SET NULL,
  contrary_evidence_checked boolean NOT NULL DEFAULT false,
  conclusion text NOT NULL DEFAULT 'unassessed' CHECK (conclusion IN ('unassessed','appears_inventive','appears_obvious','indeterminate')),
  conclusion_note text,
  review_status text NOT NULL DEFAULT 'draft' CHECK (review_status IN ('draft','in_review','accepted','reopened')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS inventive_step_analysis_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id uuid NOT NULL REFERENCES inventive_step_analyses(id) ON DELETE CASCADE,
  step_key text NOT NULL,
  ordinal integer NOT NULL,
  label text NOT NULL,
  prompt text NOT NULL,
  required boolean NOT NULL DEFAULT true,
  analysis_text text,
  review_status text NOT NULL DEFAULT 'unreviewed' CHECK (review_status IN ('unreviewed','drafted','accepted','rejected','needs_evidence')),
  reviewer_note text,
  reviewed_at timestamptz,
  UNIQUE(analysis_id,step_key),
  UNIQUE(analysis_id,ordinal)
);

CREATE TABLE IF NOT EXISTS inventive_step_references (
  analysis_id uuid NOT NULL REFERENCES inventive_step_analyses(id) ON DELETE CASCADE,
  candidate_id uuid NOT NULL REFERENCES prior_art_candidates(id) ON DELETE CASCADE,
  reference_role text NOT NULL CHECK (reference_role IN ('closest_prior_art','combination_reference','background')),
  rationale text,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(analysis_id,candidate_id)
);

CREATE TABLE IF NOT EXISTS inventive_step_step_evidence (
  step_id uuid NOT NULL REFERENCES inventive_step_analysis_steps(id) ON DELETE CASCADE,
  passage_id uuid NOT NULL REFERENCES source_passages(id) ON DELETE CASCADE,
  support_type text NOT NULL CHECK (support_type IN ('supports','contradicts','background')),
  evidence_kind text NOT NULL CHECK (evidence_kind IN ('technical','legal_authority','common_general_knowledge','secondary_consideration','other')),
  note text,
  PRIMARY KEY(step_id,passage_id)
);

CREATE TABLE IF NOT EXISTS inventive_step_review_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  analysis_id uuid NOT NULL REFERENCES inventive_step_analyses(id) ON DELETE CASCADE,
  step_id uuid REFERENCES inventive_step_analysis_steps(id) ON DELETE CASCADE,
  action text NOT NULL,
  previous_status text,
  new_status text,
  rationale text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS inventive_step_matter_idx ON inventive_step_analyses(matter_id,updated_at DESC);
CREATE INDEX IF NOT EXISTS inventive_step_steps_idx ON inventive_step_analysis_steps(analysis_id,ordinal);
CREATE INDEX IF NOT EXISTS inventive_step_review_idx ON inventive_step_review_events(analysis_id,created_at DESC);

CREATE OR REPLACE FUNCTION enforce_inventive_step_reference() RETURNS trigger AS $$
DECLARE candidate_timing text; candidate_review text; candidate_project uuid; analysis_project uuid;
BEGIN
  SELECT timing_status,review_status,project_id INTO candidate_timing,candidate_review,candidate_project FROM prior_art_candidates WHERE id=NEW.candidate_id;
  SELECT prior_art_project_id INTO analysis_project FROM inventive_step_analyses WHERE id=NEW.analysis_id;
  IF candidate_project IS DISTINCT FROM analysis_project THEN RAISE EXCEPTION 'Inventive-step reference must belong to the selected prior-art project'; END IF;
  IF NEW.reference_role IN ('closest_prior_art','combination_reference') AND (candidate_timing<>'pre_critical' OR candidate_review<>'accepted') THEN
    RAISE EXCEPTION 'Relied-on inventive-step references require accepted pre-critical candidates';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS inventive_step_reference_invariant ON inventive_step_references;
CREATE TRIGGER inventive_step_reference_invariant BEFORE INSERT OR UPDATE ON inventive_step_references
FOR EACH ROW EXECUTE FUNCTION enforce_inventive_step_reference();

CREATE OR REPLACE FUNCTION enforce_inventive_step_acceptance() RETURNS trigger AS $$
BEGIN
  IF NEW.review_status='accepted' THEN
    IF NEW.conclusion='unassessed' THEN RAISE EXCEPTION 'Accepted inventive-step analysis requires a conclusion'; END IF;
    IF NEW.contrary_evidence_checked IS NOT TRUE THEN RAISE EXCEPTION 'Accepted inventive-step analysis requires contrary-evidence review'; END IF;
    IF NEW.governing_authority_passage_id IS NULL OR NOT EXISTS (
      SELECT 1 FROM source_passages sp JOIN legal_sources s ON s.id=sp.source_id
      WHERE sp.id=NEW.governing_authority_passage_id AND s.user_id=NEW.user_id AND s.matter_id=NEW.matter_id
        AND s.verified_at IS NOT NULL AND s.authority_tier=1 AND lower(s.jurisdiction)=lower(NEW.jurisdiction)
    ) THEN RAISE EXCEPTION 'Accepted inventive-step analysis requires verified governing authority'; END IF;
    IF EXISTS (SELECT 1 FROM inventive_step_analysis_steps st WHERE st.analysis_id=NEW.id AND st.required AND st.review_status<>'accepted')
      OR NOT EXISTS (SELECT 1 FROM inventive_step_analysis_steps st WHERE st.analysis_id=NEW.id AND st.required)
    THEN RAISE EXCEPTION 'Accepted inventive-step analysis requires every framework step to be accepted'; END IF;
    IF EXISTS (
      SELECT 1 FROM inventive_step_analysis_steps st
      WHERE st.analysis_id=NEW.id AND st.required AND st.step_key<>'conclusion'
        AND NOT EXISTS (SELECT 1 FROM inventive_step_step_evidence se WHERE se.step_id=st.id)
    ) THEN RAISE EXCEPTION 'Accepted inventive-step analysis requires pinpoint evidence for every substantive framework step'; END IF;
    IF NOT EXISTS (SELECT 1 FROM inventive_step_references r WHERE r.analysis_id=NEW.id AND r.reference_role='closest_prior_art')
    THEN RAISE EXCEPTION 'Accepted inventive-step analysis requires accepted pre-critical closest prior art'; END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS inventive_step_acceptance_invariant ON inventive_step_analyses;
CREATE TRIGGER inventive_step_acceptance_invariant BEFORE UPDATE OF review_status,conclusion,contrary_evidence_checked,governing_authority_passage_id ON inventive_step_analyses
FOR EACH ROW EXECUTE FUNCTION enforce_inventive_step_acceptance();

CREATE OR REPLACE FUNCTION protect_accepted_inventive_step_analysis() RETURNS trigger AS $$
DECLARE analysis_status text; analysis_uuid uuid;
BEGIN
  IF TG_TABLE_NAME='inventive_step_analysis_steps' THEN analysis_uuid=CASE WHEN TG_OP='INSERT' THEN NEW.analysis_id ELSE OLD.analysis_id END;
  ELSIF TG_TABLE_NAME='inventive_step_references' THEN analysis_uuid=CASE WHEN TG_OP='INSERT' THEN NEW.analysis_id ELSE OLD.analysis_id END;
  ELSE SELECT analysis_id INTO analysis_uuid FROM inventive_step_analysis_steps WHERE id=CASE WHEN TG_OP='INSERT' THEN NEW.step_id ELSE OLD.step_id END; END IF;
  SELECT review_status INTO analysis_status FROM inventive_step_analyses WHERE id=analysis_uuid;
  IF analysis_status='accepted' THEN RAISE EXCEPTION 'Accepted inventive-step analysis must be reopened before evidence or reasoning changes'; END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS protect_inventive_step_steps ON inventive_step_analysis_steps;
CREATE TRIGGER protect_inventive_step_steps BEFORE INSERT OR UPDATE OR DELETE ON inventive_step_analysis_steps FOR EACH ROW EXECUTE FUNCTION protect_accepted_inventive_step_analysis();
DROP TRIGGER IF EXISTS protect_inventive_step_references ON inventive_step_references;
CREATE TRIGGER protect_inventive_step_references BEFORE INSERT OR UPDATE OR DELETE ON inventive_step_references FOR EACH ROW EXECUTE FUNCTION protect_accepted_inventive_step_analysis();
DROP TRIGGER IF EXISTS protect_inventive_step_evidence ON inventive_step_step_evidence;
CREATE TRIGGER protect_inventive_step_evidence BEFORE INSERT OR UPDATE OR DELETE ON inventive_step_step_evidence FOR EACH ROW EXECUTE FUNCTION protect_accepted_inventive_step_analysis();

CREATE OR REPLACE FUNCTION protect_accepted_inventive_step_authority() RETURNS trigger AS $$
BEGIN
  IF OLD.verified_at IS NOT NULL AND NEW.verified_at IS NULL AND EXISTS (
    SELECT 1 FROM source_passages sp JOIN inventive_step_analyses a ON a.governing_authority_passage_id=sp.id
    WHERE sp.source_id=OLD.id AND a.review_status='accepted'
  ) THEN RAISE EXCEPTION 'Accepted inventive-step analysis must be reopened before governing authority verification is withdrawn'; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS protect_inventive_step_authority ON legal_sources;
CREATE TRIGGER protect_inventive_step_authority BEFORE UPDATE OF verified_at ON legal_sources
FOR EACH ROW EXECUTE FUNCTION protect_accepted_inventive_step_authority();
