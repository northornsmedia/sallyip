CREATE TABLE IF NOT EXISTS fto_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  matter_id uuid NOT NULL REFERENCES matters(id) ON DELETE CASCADE,
  product_entity_id uuid NOT NULL REFERENCES ip_entities(id) ON DELETE CASCADE,
  analysis_entity_id uuid UNIQUE REFERENCES ip_entities(id) ON DELETE SET NULL,
  title text NOT NULL,
  jurisdiction text NOT NULL,
  proposed_launch_date date,
  scope_note text,
  patentability_distinguished boolean NOT NULL DEFAULT false,
  overall_conclusion text NOT NULL DEFAULT 'unassessed' CHECK (overall_conclusion IN ('unassessed','lower_identified_risk','moderate_identified_risk','high_identified_risk','indeterminate')),
  conclusion_note text,
  review_status text NOT NULL DEFAULT 'draft' CHECK (review_status IN ('draft','in_review','accepted','reopened')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS fto_product_features (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES fto_projects(id) ON DELETE CASCADE,
  ordinal integer NOT NULL,
  feature_text text NOT NULL,
  source_passage_id uuid REFERENCES source_passages(id) ON DELETE SET NULL,
  review_status text NOT NULL DEFAULT 'unreviewed' CHECK (review_status IN ('unreviewed','accepted','disputed','needs_evidence')),
  note text,
  UNIQUE(project_id,ordinal)
);

CREATE TABLE IF NOT EXISTS fto_search_coverage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES fto_projects(id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (channel IN ('official_patent_search','national_legal_status','family_review','pending_applications')),
  required boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started','in_progress','completed','not_available')),
  source_basis text NOT NULL DEFAULT 'none' CHECK (source_basis IN ('none','live_database','official_web','uploaded_document','manual_verified')),
  search_run_id uuid REFERENCES professional_search_runs(id) ON DELETE SET NULL,
  source_passage_id uuid REFERENCES source_passages(id) ON DELETE SET NULL,
  result_count integer NOT NULL DEFAULT 0,
  note text,
  completed_at timestamptz,
  UNIQUE(project_id,channel)
);

CREATE TABLE IF NOT EXISTS fto_patent_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES fto_projects(id) ON DELETE CASCADE,
  patent_entity_id uuid NOT NULL REFERENCES ip_entities(id) ON DELETE CASCADE,
  claim_id uuid NOT NULL REFERENCES patent_claims(id) ON DELETE CASCADE,
  family_id uuid REFERENCES patent_families(id) ON DELETE SET NULL,
  status_category text NOT NULL DEFAULT 'unknown' CHECK (status_category IN ('active_granted','pending','expired','lapsed','revoked','unknown')),
  status_as_of date,
  expiry_date date,
  territory_status text,
  legal_status_passage_id uuid REFERENCES source_passages(id) ON DELETE SET NULL,
  claim_conclusion text NOT NULL DEFAULT 'unassessed' CHECK (claim_conclusion IN ('unassessed','potential_literal_coverage','partial_coverage','no_literal_coverage','monitor_pending','excluded_not_in_force','indeterminate')),
  uncertainty_note text,
  review_status text NOT NULL DEFAULT 'unreviewed' CHECK (review_status IN ('unreviewed','in_review','accepted','reopened')),
  reviewed_at timestamptz,
  UNIQUE(project_id,claim_id)
);

CREATE TABLE IF NOT EXISTS fto_element_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patent_review_id uuid NOT NULL REFERENCES fto_patent_reviews(id) ON DELETE CASCADE,
  claim_element_id uuid NOT NULL REFERENCES patent_claim_elements(id) ON DELETE CASCADE,
  product_feature_id uuid REFERENCES fto_product_features(id) ON DELETE SET NULL,
  evidence_passage_id uuid REFERENCES source_passages(id) ON DELETE SET NULL,
  mapping_status text NOT NULL DEFAULT 'unreviewed' CHECK (mapping_status IN ('unreviewed','mapped','partial','missing','disputed')),
  confidence numeric(4,3) CHECK (confidence BETWEEN 0 AND 1),
  review_status text NOT NULL DEFAULT 'unreviewed' CHECK (review_status IN ('unreviewed','accepted','rejected','needs_evidence')),
  note text,
  reviewed_at timestamptz,
  UNIQUE(patent_review_id,claim_element_id)
);

CREATE TABLE IF NOT EXISTS fto_design_arounds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES fto_projects(id) ON DELETE CASCADE,
  patent_review_id uuid REFERENCES fto_patent_reviews(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL,
  affected_element_ids uuid[] NOT NULL DEFAULT '{}',
  feasibility text NOT NULL DEFAULT 'unassessed' CHECK (feasibility IN ('unassessed','low','moderate','high','unknown')),
  evidence_passage_id uuid REFERENCES source_passages(id) ON DELETE SET NULL,
  review_status text NOT NULL DEFAULT 'proposed' CHECK (review_status IN ('proposed','accepted','rejected','needs_engineering_review','needs_legal_review')),
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS fto_review_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES fto_projects(id) ON DELETE CASCADE,
  patent_review_id uuid REFERENCES fto_patent_reviews(id) ON DELETE CASCADE,
  mapping_id uuid REFERENCES fto_element_mappings(id) ON DELETE CASCADE,
  action text NOT NULL,
  previous_status text,
  new_status text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS fto_projects_matter_idx ON fto_projects(matter_id,updated_at DESC);
CREATE INDEX IF NOT EXISTS fto_reviews_project_idx ON fto_patent_reviews(project_id,review_status);
CREATE INDEX IF NOT EXISTS fto_mappings_review_idx ON fto_element_mappings(patent_review_id,review_status);
CREATE INDEX IF NOT EXISTS fto_events_project_idx ON fto_review_events(project_id,created_at DESC);

CREATE OR REPLACE FUNCTION enforce_fto_feature_review() RETURNS trigger AS $$
BEGIN
  IF NEW.review_status='accepted' AND (NEW.source_passage_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM source_passages sp JOIN legal_sources s ON s.id=sp.source_id JOIN fto_projects p ON p.id=NEW.project_id
    WHERE sp.id=NEW.source_passage_id AND s.user_id=p.user_id AND s.matter_id=p.matter_id AND s.verified_at IS NOT NULL
  )) THEN RAISE EXCEPTION 'Accepted FTO product feature requires verified pinpoint product evidence'; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS fto_feature_review_invariant ON fto_product_features;
CREATE TRIGGER fto_feature_review_invariant BEFORE UPDATE OF review_status,source_passage_id ON fto_product_features FOR EACH ROW EXECUTE FUNCTION enforce_fto_feature_review();

CREATE OR REPLACE FUNCTION enforce_fto_coverage_review() RETURNS trigger AS $$
DECLARE project_user uuid; project_matter uuid;
BEGIN
  IF NEW.status='completed' THEN
    SELECT user_id,matter_id INTO project_user,project_matter FROM fto_projects WHERE id=NEW.project_id;
    IF NEW.source_basis='none' THEN RAISE EXCEPTION 'Completed FTO coverage requires a real source basis'; END IF;
    IF NEW.source_basis='live_database' AND (NEW.search_run_id IS NULL OR NOT EXISTS (
      SELECT 1 FROM professional_search_runs r WHERE r.id=NEW.search_run_id AND r.user_id=project_user AND r.matter_id=project_matter AND r.status='completed'
    )) THEN RAISE EXCEPTION 'Live FTO coverage requires a completed matter-scoped search run'; END IF;
    IF NEW.source_basis<>'live_database' AND (NEW.source_passage_id IS NULL OR NOT EXISTS (
      SELECT 1 FROM source_passages sp JOIN legal_sources s ON s.id=sp.source_id WHERE sp.id=NEW.source_passage_id AND s.user_id=project_user AND s.matter_id=project_matter AND s.verified_at IS NOT NULL
    )) THEN RAISE EXCEPTION 'Completed non-database FTO coverage requires a verified pinpoint passage'; END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS fto_coverage_review_invariant ON fto_search_coverage;
CREATE TRIGGER fto_coverage_review_invariant BEFORE UPDATE OF status,source_basis,search_run_id,source_passage_id ON fto_search_coverage FOR EACH ROW EXECUTE FUNCTION enforce_fto_coverage_review();

CREATE OR REPLACE FUNCTION enforce_fto_element_mapping() RETURNS trigger AS $$
DECLARE project_uuid uuid; project_user uuid; project_matter uuid;
BEGIN
  IF NEW.review_status='accepted' THEN
    SELECT r.project_id,p.user_id,p.matter_id INTO project_uuid,project_user,project_matter FROM fto_patent_reviews r JOIN fto_projects p ON p.id=r.project_id WHERE r.id=NEW.patent_review_id;
    IF NEW.mapping_status IN ('unreviewed','disputed') THEN RAISE EXCEPTION 'Accepted FTO mapping requires a resolved mapping status'; END IF;
    IF NEW.evidence_passage_id IS NULL OR NOT EXISTS (
      SELECT 1 FROM source_passages sp JOIN legal_sources s ON s.id=sp.source_id WHERE sp.id=NEW.evidence_passage_id AND s.user_id=project_user AND s.matter_id=project_matter AND s.verified_at IS NOT NULL
    ) THEN RAISE EXCEPTION 'Accepted FTO mapping requires verified pinpoint product evidence'; END IF;
    IF NEW.mapping_status IN ('mapped','partial') AND (NEW.product_feature_id IS NULL OR NOT EXISTS (
      SELECT 1 FROM fto_product_features f WHERE f.id=NEW.product_feature_id AND f.project_id=project_uuid AND f.review_status='accepted'
    )) THEN RAISE EXCEPTION 'Mapped FTO limitation requires an accepted project product feature'; END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS fto_element_mapping_invariant ON fto_element_mappings;
CREATE TRIGGER fto_element_mapping_invariant BEFORE UPDATE OF review_status,mapping_status,evidence_passage_id,product_feature_id ON fto_element_mappings FOR EACH ROW EXECUTE FUNCTION enforce_fto_element_mapping();

CREATE OR REPLACE FUNCTION enforce_fto_patent_review() RETURNS trigger AS $$
DECLARE total_count integer; mapped_count integer; missing_count integer; partial_count integer; disputed_count integer;
BEGIN
  IF NEW.review_status='accepted' THEN
    IF NEW.status_category='unknown' OR NEW.status_as_of IS NULL THEN RAISE EXCEPTION 'Accepted FTO patent review requires verified territorial legal status and status date'; END IF;
    IF NEW.legal_status_passage_id IS NULL OR NOT EXISTS (
      SELECT 1 FROM source_passages sp JOIN legal_sources s ON s.id=sp.source_id JOIN fto_projects p ON p.id=NEW.project_id
      WHERE sp.id=NEW.legal_status_passage_id AND s.user_id=p.user_id AND s.matter_id=p.matter_id AND s.verified_at IS NOT NULL
    ) THEN RAISE EXCEPTION 'Accepted FTO patent review requires a verified legal-status pinpoint passage'; END IF;
    SELECT count(*),count(*) FILTER(WHERE review_status='accepted' AND mapping_status='mapped'),count(*) FILTER(WHERE review_status='accepted' AND mapping_status='missing'),count(*) FILTER(WHERE review_status='accepted' AND mapping_status='partial'),count(*) FILTER(WHERE review_status<>'accepted' OR mapping_status IN ('unreviewed','disputed')) INTO total_count,mapped_count,missing_count,partial_count,disputed_count FROM fto_element_mappings WHERE patent_review_id=NEW.id;
    IF total_count=0 OR disputed_count>0 OR mapped_count+missing_count+partial_count<>total_count THEN RAISE EXCEPTION 'Accepted FTO patent review requires lawyer review of every claim element'; END IF;
    IF NEW.claim_conclusion='potential_literal_coverage' AND mapped_count<>total_count THEN RAISE EXCEPTION 'Potential literal coverage requires every claim element to be mapped'; END IF;
    IF NEW.claim_conclusion='no_literal_coverage' AND missing_count=0 THEN RAISE EXCEPTION 'No literal coverage requires at least one accepted missing claim element'; END IF;
    IF NEW.claim_conclusion='partial_coverage' AND (mapped_count+partial_count=0 OR missing_count+partial_count=0) THEN RAISE EXCEPTION 'Partial coverage requires both mapped/partial and missing/partial limitations'; END IF;
    IF NEW.claim_conclusion='monitor_pending' AND NEW.status_category<>'pending' THEN RAISE EXCEPTION 'Monitor-pending conclusion requires a pending application'; END IF;
    IF NEW.claim_conclusion='excluded_not_in_force' AND NEW.status_category NOT IN ('expired','lapsed','revoked') THEN RAISE EXCEPTION 'Not-in-force exclusion requires expired, lapsed, or revoked status'; END IF;
    IF NEW.status_category='active_granted' AND NEW.claim_conclusion IN ('monitor_pending','excluded_not_in_force','unassessed') THEN RAISE EXCEPTION 'Active granted claim requires a substantive FTO mapping conclusion'; END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS fto_patent_review_invariant ON fto_patent_reviews;
CREATE TRIGGER fto_patent_review_invariant BEFORE UPDATE OF review_status,status_category,status_as_of,legal_status_passage_id,claim_conclusion ON fto_patent_reviews FOR EACH ROW EXECUTE FUNCTION enforce_fto_patent_review();

CREATE OR REPLACE FUNCTION enforce_fto_project_acceptance() RETURNS trigger AS $$
BEGIN
  IF NEW.review_status='accepted' THEN
    IF NEW.patentability_distinguished IS NOT TRUE THEN RAISE EXCEPTION 'Accepted FTO project must expressly distinguish FTO from patentability'; END IF;
    IF NEW.overall_conclusion='unassessed' THEN RAISE EXCEPTION 'Accepted FTO project requires an overall conclusion'; END IF;
    IF EXISTS (SELECT 1 FROM fto_search_coverage c WHERE c.project_id=NEW.id AND c.required AND (c.status<>'completed' OR c.source_basis='none'))
      OR NOT EXISTS (SELECT 1 FROM fto_search_coverage c WHERE c.project_id=NEW.id AND c.required)
    THEN RAISE EXCEPTION 'Accepted FTO project requires completion of every required search and status channel'; END IF;
    IF EXISTS (SELECT 1 FROM fto_product_features f WHERE f.project_id=NEW.id AND f.review_status<>'accepted')
      OR NOT EXISTS (SELECT 1 FROM fto_product_features f WHERE f.project_id=NEW.id)
    THEN RAISE EXCEPTION 'Accepted FTO project requires accepted product features'; END IF;
    IF EXISTS (SELECT 1 FROM fto_patent_reviews r WHERE r.project_id=NEW.id AND r.review_status<>'accepted')
      OR NOT EXISTS (SELECT 1 FROM fto_patent_reviews r WHERE r.project_id=NEW.id)
    THEN RAISE EXCEPTION 'Accepted FTO project requires every patent review to be accepted'; END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS fto_project_acceptance_invariant ON fto_projects;
CREATE TRIGGER fto_project_acceptance_invariant BEFORE UPDATE OF review_status,patentability_distinguished,overall_conclusion ON fto_projects FOR EACH ROW EXECUTE FUNCTION enforce_fto_project_acceptance();

CREATE OR REPLACE FUNCTION protect_accepted_fto_work() RETURNS trigger AS $$
DECLARE project_uuid uuid; project_status text; patent_status text;
BEGIN
  IF TG_TABLE_NAME='fto_product_features' OR TG_TABLE_NAME='fto_search_coverage' OR TG_TABLE_NAME='fto_design_arounds' THEN project_uuid=CASE WHEN TG_OP='INSERT' THEN NEW.project_id ELSE OLD.project_id END;
  ELSIF TG_TABLE_NAME='fto_patent_reviews' THEN project_uuid=CASE WHEN TG_OP='INSERT' THEN NEW.project_id ELSE OLD.project_id END;
  ELSE SELECT r.project_id,r.review_status INTO project_uuid,patent_status FROM fto_patent_reviews r WHERE r.id=CASE WHEN TG_OP='INSERT' THEN NEW.patent_review_id ELSE OLD.patent_review_id END; END IF;
  SELECT review_status INTO project_status FROM fto_projects WHERE id=project_uuid;
  IF project_status='accepted' OR patent_status='accepted' THEN RAISE EXCEPTION 'Accepted FTO work must be reopened before evidence, scope, or mappings change'; END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS protect_fto_features ON fto_product_features;
CREATE TRIGGER protect_fto_features BEFORE INSERT OR UPDATE OR DELETE ON fto_product_features FOR EACH ROW EXECUTE FUNCTION protect_accepted_fto_work();
DROP TRIGGER IF EXISTS protect_fto_coverage ON fto_search_coverage;
CREATE TRIGGER protect_fto_coverage BEFORE INSERT OR UPDATE OR DELETE ON fto_search_coverage FOR EACH ROW EXECUTE FUNCTION protect_accepted_fto_work();
DROP TRIGGER IF EXISTS protect_fto_reviews ON fto_patent_reviews;
CREATE TRIGGER protect_fto_reviews BEFORE INSERT OR UPDATE OR DELETE ON fto_patent_reviews FOR EACH ROW EXECUTE FUNCTION protect_accepted_fto_work();
DROP TRIGGER IF EXISTS protect_fto_mappings ON fto_element_mappings;
CREATE TRIGGER protect_fto_mappings BEFORE INSERT OR UPDATE OR DELETE ON fto_element_mappings FOR EACH ROW EXECUTE FUNCTION protect_accepted_fto_work();
DROP TRIGGER IF EXISTS protect_fto_designs ON fto_design_arounds;
CREATE TRIGGER protect_fto_designs BEFORE INSERT OR UPDATE OR DELETE ON fto_design_arounds FOR EACH ROW EXECUTE FUNCTION protect_accepted_fto_work();

CREATE OR REPLACE FUNCTION protect_verified_fto_evidence() RETURNS trigger AS $$
BEGIN
  IF OLD.verified_at IS NOT NULL AND NEW.verified_at IS NULL AND EXISTS (
    SELECT 1 FROM source_passages sp WHERE sp.source_id=OLD.id AND (
      EXISTS (SELECT 1 FROM fto_product_features f JOIN fto_projects p ON p.id=f.project_id WHERE f.source_passage_id=sp.id AND (f.review_status='accepted' OR p.review_status='accepted'))
      OR EXISTS (SELECT 1 FROM fto_element_mappings m JOIN fto_patent_reviews r ON r.id=m.patent_review_id JOIN fto_projects p ON p.id=r.project_id WHERE m.evidence_passage_id=sp.id AND (m.review_status='accepted' OR r.review_status='accepted' OR p.review_status='accepted'))
      OR EXISTS (SELECT 1 FROM fto_patent_reviews r JOIN fto_projects p ON p.id=r.project_id WHERE r.legal_status_passage_id=sp.id AND (r.review_status='accepted' OR p.review_status='accepted'))
      OR EXISTS (SELECT 1 FROM fto_search_coverage c JOIN fto_projects p ON p.id=c.project_id WHERE c.source_passage_id=sp.id AND c.status='completed' AND p.review_status='accepted')
    )
  ) THEN RAISE EXCEPTION 'Accepted FTO work must be reopened before evidence verification is withdrawn'; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS protect_verified_fto_evidence ON legal_sources;
CREATE TRIGGER protect_verified_fto_evidence BEFORE UPDATE OF verified_at ON legal_sources FOR EACH ROW EXECUTE FUNCTION protect_verified_fto_evidence();
