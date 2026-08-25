CREATE TABLE IF NOT EXISTS patent_novelty_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  matter_id uuid NOT NULL REFERENCES matters(id) ON DELETE CASCADE,
  prior_art_project_id uuid NOT NULL REFERENCES prior_art_projects(id) ON DELETE CASCADE,
  claim_id uuid NOT NULL REFERENCES patent_claims(id) ON DELETE CASCADE,
  candidate_id uuid NOT NULL REFERENCES prior_art_candidates(id) ON DELETE CASCADE,
  reference_source_id uuid REFERENCES legal_sources(id) ON DELETE SET NULL,
  governing_authority_passage_id uuid REFERENCES source_passages(id) ON DELETE SET NULL,
  title text NOT NULL,
  jurisdiction text NOT NULL,
  legal_test text NOT NULL,
  direct_and_unambiguous boolean NOT NULL DEFAULT false,
  enabling_disclosure boolean NOT NULL DEFAULT false,
  public_availability_checked boolean NOT NULL DEFAULT false,
  conclusion text NOT NULL DEFAULT 'unreviewed' CHECK (conclusion IN ('unreviewed','anticipated','not_anticipated','insufficient_evidence')),
  conclusion_note text,
  review_status text NOT NULL DEFAULT 'draft' CHECK (review_status IN ('draft','in_review','accepted','reopened')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(prior_art_project_id,candidate_id)
);

CREATE TABLE IF NOT EXISTS patent_novelty_review_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  analysis_id uuid NOT NULL REFERENCES patent_novelty_analyses(id) ON DELETE CASCADE,
  action text NOT NULL,
  previous_status text,
  new_status text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS novelty_analyses_matter_idx ON patent_novelty_analyses(matter_id,updated_at DESC);

CREATE OR REPLACE FUNCTION enforce_patent_novelty_analysis() RETURNS trigger AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM prior_art_projects p JOIN prior_art_candidates c ON c.project_id=p.id
    WHERE p.id=NEW.prior_art_project_id AND c.id=NEW.candidate_id AND p.claim_id=NEW.claim_id
      AND p.matter_id=NEW.matter_id AND p.user_id=NEW.user_id
  ) THEN RAISE EXCEPTION 'Novelty analysis claim and reference must belong to the same prior-art project'; END IF;

  IF NEW.review_status='accepted' THEN
    IF NEW.conclusion='unreviewed' THEN RAISE EXCEPTION 'Accepted novelty analysis requires a conclusion'; END IF;
    IF NEW.governing_authority_passage_id IS NULL OR NOT EXISTS (
      SELECT 1 FROM source_passages sp JOIN legal_sources s ON s.id=sp.source_id
      WHERE sp.id=NEW.governing_authority_passage_id AND s.user_id=NEW.user_id
        AND s.matter_id=NEW.matter_id AND s.verified_at IS NOT NULL AND s.authority_tier=1
    ) THEN RAISE EXCEPTION 'Accepted novelty analysis requires verified Tier-1 governing authority'; END IF;
    IF NEW.reference_source_id IS NULL OR NOT EXISTS (
      SELECT 1 FROM legal_sources s WHERE s.id=NEW.reference_source_id AND s.user_id=NEW.user_id
        AND s.matter_id=NEW.matter_id AND s.verified_at IS NOT NULL
    ) THEN RAISE EXCEPTION 'Accepted novelty analysis requires a verified source record for the selected reference'; END IF;
    IF NEW.conclusion='anticipated' THEN
      IF NOT NEW.direct_and_unambiguous OR NOT NEW.enabling_disclosure OR NOT NEW.public_availability_checked
      THEN RAISE EXCEPTION 'Anticipation requires direct, unambiguous, enabling disclosure and checked public availability'; END IF;
      IF NOT EXISTS (SELECT 1 FROM prior_art_candidates c WHERE c.id=NEW.candidate_id AND c.timing_status='pre_critical')
      THEN RAISE EXCEPTION 'Anticipation requires verified pre-critical publication timing'; END IF;
      IF NOT EXISTS (SELECT 1 FROM prior_art_element_mappings m WHERE m.candidate_id=NEW.candidate_id)
        OR EXISTS (
          SELECT 1 FROM prior_art_element_mappings m
          LEFT JOIN source_passages sp ON sp.id=m.evidence_passage_id
          LEFT JOIN legal_sources s ON s.id=sp.source_id
          WHERE m.candidate_id=NEW.candidate_id AND (
            m.review_status<>'accepted' OR m.disclosure_status NOT IN ('explicit','implicit')
            OR m.evidence_passage_id IS NULL OR s.verified_at IS NULL OR s.matter_id<>NEW.matter_id OR s.id<>NEW.reference_source_id
          )
        )
      THEN RAISE EXCEPTION 'Anticipation requires every claim limitation to have accepted verified evidence in this single reference'; END IF;
    ELSIF NEW.conclusion='not_anticipated' THEN
      IF EXISTS (SELECT 1 FROM prior_art_element_mappings m WHERE m.candidate_id=NEW.candidate_id AND m.review_status<>'accepted')
        OR NOT EXISTS (SELECT 1 FROM prior_art_element_mappings m WHERE m.candidate_id=NEW.candidate_id AND m.review_status='accepted' AND m.disclosure_status IN ('not_found','disputed'))
      THEN RAISE EXCEPTION 'Non-anticipation requires complete review and at least one accepted missing or disputed limitation'; END IF;
    ELSIF NEW.conclusion='insufficient_evidence' AND coalesce(length(trim(NEW.conclusion_note)),0)<20 THEN
      RAISE EXCEPTION 'Insufficient-evidence conclusion requires a recorded research gap';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS patent_novelty_analysis_invariant ON patent_novelty_analyses;
CREATE TRIGGER patent_novelty_analysis_invariant
BEFORE INSERT OR UPDATE ON patent_novelty_analyses
FOR EACH ROW EXECUTE FUNCTION enforce_patent_novelty_analysis();

CREATE OR REPLACE FUNCTION protect_accepted_patent_novelty() RETURNS trigger AS $$
BEGIN
  IF OLD.review_status='accepted' AND NEW.review_status='accepted' AND (
    NEW.candidate_id IS DISTINCT FROM OLD.candidate_id OR NEW.claim_id IS DISTINCT FROM OLD.claim_id
    OR NEW.reference_source_id IS DISTINCT FROM OLD.reference_source_id
    OR NEW.governing_authority_passage_id IS DISTINCT FROM OLD.governing_authority_passage_id
    OR NEW.direct_and_unambiguous IS DISTINCT FROM OLD.direct_and_unambiguous
    OR NEW.enabling_disclosure IS DISTINCT FROM OLD.enabling_disclosure
    OR NEW.public_availability_checked IS DISTINCT FROM OLD.public_availability_checked
    OR NEW.conclusion IS DISTINCT FROM OLD.conclusion OR NEW.conclusion_note IS DISTINCT FROM OLD.conclusion_note
  ) THEN RAISE EXCEPTION 'Accepted novelty analysis must be reopened before substantive changes'; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS protect_accepted_patent_novelty ON patent_novelty_analyses;
CREATE TRIGGER protect_accepted_patent_novelty BEFORE UPDATE ON patent_novelty_analyses FOR EACH ROW EXECUTE FUNCTION protect_accepted_patent_novelty();

CREATE OR REPLACE FUNCTION protect_novelty_supporting_mapping() RETURNS trigger AS $$
DECLARE candidate_uuid uuid;
BEGIN
  candidate_uuid=CASE WHEN TG_OP='DELETE' THEN OLD.candidate_id ELSE NEW.candidate_id END;
  IF EXISTS (SELECT 1 FROM patent_novelty_analyses a WHERE a.candidate_id=candidate_uuid AND a.review_status='accepted')
  THEN RAISE EXCEPTION 'Accepted novelty analysis must be reopened before element mappings change'; END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS protect_novelty_supporting_mapping ON prior_art_element_mappings;
CREATE TRIGGER protect_novelty_supporting_mapping BEFORE UPDATE OR DELETE ON prior_art_element_mappings FOR EACH ROW EXECUTE FUNCTION protect_novelty_supporting_mapping();

CREATE OR REPLACE FUNCTION protect_novelty_source_verification() RETURNS trigger AS $$
BEGIN
  IF OLD.verified_at IS NOT NULL AND NEW.verified_at IS NULL AND EXISTS (
    SELECT 1 FROM source_passages sp WHERE sp.source_id=OLD.id AND (
      EXISTS (SELECT 1 FROM patent_novelty_analyses a WHERE a.governing_authority_passage_id=sp.id AND a.review_status='accepted')
      OR EXISTS (SELECT 1 FROM prior_art_element_mappings m JOIN patent_novelty_analyses a ON a.candidate_id=m.candidate_id WHERE m.evidence_passage_id=sp.id AND a.review_status='accepted')
    )
  ) OR OLD.verified_at IS NOT NULL AND NEW.verified_at IS NULL AND EXISTS (
    SELECT 1 FROM patent_novelty_analyses a WHERE a.reference_source_id=OLD.id AND a.review_status='accepted'
  ) THEN RAISE EXCEPTION 'Accepted novelty analysis must be reopened before source verification is withdrawn'; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS protect_novelty_source_verification ON legal_sources;
CREATE TRIGGER protect_novelty_source_verification BEFORE UPDATE OF verified_at ON legal_sources FOR EACH ROW EXECUTE FUNCTION protect_novelty_source_verification();
