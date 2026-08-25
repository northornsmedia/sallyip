ALTER TABLE ip_entities DROP CONSTRAINT IF EXISTS ip_entities_entity_type_check;
ALTER TABLE ip_entities ADD CONSTRAINT ip_entities_entity_type_check CHECK (entity_type IN ('patent','patent_claim','patent_family','trademark','trademark_variant','goods_service_term','case','legislation','party','person','product','argument','evidence','event','deadline','licence','domain','document'));

CREATE TABLE IF NOT EXISTS trademark_intelligence_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  matter_id uuid NOT NULL REFERENCES matters(id) ON DELETE CASCADE,
  mark_entity_id uuid NOT NULL REFERENCES ip_entities(id) ON DELETE CASCADE,
  clearance_project_id uuid REFERENCES trademark_clearance_projects(id) ON DELETE SET NULL,
  title text NOT NULL,
  base_mark text NOT NULL,
  jurisdictions text[] NOT NULL DEFAULT '{}',
  target_languages text[] NOT NULL DEFAULT '{}',
  review_status text NOT NULL DEFAULT 'draft' CHECK (review_status IN ('draft','in_review','accepted','reopened')),
  conclusion_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS trademark_language_coverage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES trademark_intelligence_projects(id) ON DELETE CASCADE,
  language text NOT NULL,
  script text NOT NULL,
  channel text NOT NULL CHECK (channel IN ('translation','transliteration','phonetic','conceptual','regional_meaning')),
  required boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started','in_progress','completed','not_applicable')),
  source_passage_id uuid REFERENCES source_passages(id) ON DELETE SET NULL,
  note text,
  reviewed_at timestamptz,
  UNIQUE(project_id,language,channel)
);

CREATE TABLE IF NOT EXISTS trademark_linguistic_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES trademark_intelligence_projects(id) ON DELETE CASCADE,
  variant_entity_id uuid UNIQUE REFERENCES ip_entities(id) ON DELETE SET NULL,
  variant_type text NOT NULL CHECK (variant_type IN ('translation','transliteration','phonetic_equivalent','conceptual_equivalent','regional_meaning','slang')),
  language text NOT NULL,
  script text NOT NULL,
  region text,
  variant_text text NOT NULL,
  meaning text,
  source_passage_id uuid REFERENCES source_passages(id) ON DELETE SET NULL,
  source_basis text NOT NULL DEFAULT 'user_supplied' CHECK (source_basis IN ('user_supplied','uploaded_document','retrieved_source','official_source','linguist_review')),
  review_status text NOT NULL DEFAULT 'proposed' CHECK (review_status IN ('proposed','accepted','rejected','needs_evidence','needs_linguist_review')),
  reviewer_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  UNIQUE(project_id,variant_type,language,variant_text)
);

CREATE TABLE IF NOT EXISTS trademark_goods_services_terms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES trademark_intelligence_projects(id) ON DELETE CASCADE,
  term_entity_id uuid UNIQUE REFERENCES ip_entities(id) ON DELETE SET NULL,
  user_description text NOT NULL,
  proposed_wording text NOT NULL,
  nice_class integer CHECK (nice_class BETWEEN 1 AND 45),
  jurisdiction text NOT NULL,
  office text NOT NULL,
  acceptability_status text NOT NULL DEFAULT 'unverified' CHECK (acceptability_status IN ('unverified','accepted_wording','requires_amendment','rejected','unknown')),
  related_terms text[] NOT NULL DEFAULT '{}',
  source_passage_id uuid REFERENCES source_passages(id) ON DELETE SET NULL,
  review_status text NOT NULL DEFAULT 'proposed' CHECK (review_status IN ('proposed','accepted','rejected','needs_evidence','needs_classification_review')),
  reviewer_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz
);

CREATE TABLE IF NOT EXISTS trademark_intelligence_review_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES trademark_intelligence_projects(id) ON DELETE CASCADE,
  variant_id uuid REFERENCES trademark_linguistic_variants(id) ON DELETE CASCADE,
  goods_term_id uuid REFERENCES trademark_goods_services_terms(id) ON DELETE CASCADE,
  action text NOT NULL,
  previous_status text,
  new_status text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS trademark_intelligence_matter_idx ON trademark_intelligence_projects(matter_id,updated_at DESC);
CREATE INDEX IF NOT EXISTS trademark_variants_project_idx ON trademark_linguistic_variants(project_id,language,variant_type);
CREATE INDEX IF NOT EXISTS trademark_goods_project_idx ON trademark_goods_services_terms(project_id,jurisdiction,nice_class);

CREATE OR REPLACE FUNCTION enforce_trademark_variant_review() RETURNS trigger AS $$
BEGIN
  IF NEW.review_status='accepted' AND (NEW.source_passage_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM source_passages sp JOIN legal_sources s ON s.id=sp.source_id JOIN trademark_intelligence_projects p ON p.id=NEW.project_id
    WHERE sp.id=NEW.source_passage_id AND s.user_id=p.user_id AND s.matter_id=p.matter_id AND s.verified_at IS NOT NULL
  )) THEN RAISE EXCEPTION 'Accepted linguistic variant requires a verified pinpoint language source'; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trademark_variant_review_invariant ON trademark_linguistic_variants;
CREATE TRIGGER trademark_variant_review_invariant BEFORE UPDATE OF review_status,source_passage_id ON trademark_linguistic_variants FOR EACH ROW EXECUTE FUNCTION enforce_trademark_variant_review();

CREATE OR REPLACE FUNCTION enforce_trademark_goods_review() RETURNS trigger AS $$
BEGIN
  IF NEW.review_status='accepted' THEN
    IF NEW.nice_class IS NULL OR NEW.acceptability_status<>'accepted_wording' THEN RAISE EXCEPTION 'Accepted goods/services term requires a Nice class and office-accepted wording status'; END IF;
    IF NEW.source_passage_id IS NULL OR NOT EXISTS (
      SELECT 1 FROM source_passages sp JOIN legal_sources s ON s.id=sp.source_id JOIN trademark_intelligence_projects p ON p.id=NEW.project_id
      WHERE sp.id=NEW.source_passage_id AND s.user_id=p.user_id AND s.matter_id=p.matter_id AND s.verified_at IS NOT NULL AND s.authority_tier=1
    ) THEN RAISE EXCEPTION 'Accepted goods/services term requires verified Tier-1 office classification guidance'; END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trademark_goods_review_invariant ON trademark_goods_services_terms;
CREATE TRIGGER trademark_goods_review_invariant BEFORE UPDATE OF review_status,nice_class,acceptability_status,source_passage_id ON trademark_goods_services_terms FOR EACH ROW EXECUTE FUNCTION enforce_trademark_goods_review();

CREATE OR REPLACE FUNCTION enforce_trademark_language_coverage() RETURNS trigger AS $$
BEGIN
  IF NEW.status='completed' AND (NEW.source_passage_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM source_passages sp JOIN legal_sources s ON s.id=sp.source_id JOIN trademark_intelligence_projects p ON p.id=NEW.project_id
    WHERE sp.id=NEW.source_passage_id AND s.user_id=p.user_id AND s.matter_id=p.matter_id AND s.verified_at IS NOT NULL
  )) THEN RAISE EXCEPTION 'Completed language channel requires a verified source passage'; END IF;
  IF NEW.status='not_applicable' AND coalesce(length(trim(NEW.note)),0)<5 THEN RAISE EXCEPTION 'Not-applicable language channel requires a reviewer rationale'; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trademark_language_coverage_invariant ON trademark_language_coverage;
CREATE TRIGGER trademark_language_coverage_invariant BEFORE UPDATE OF status,source_passage_id,note ON trademark_language_coverage FOR EACH ROW EXECUTE FUNCTION enforce_trademark_language_coverage();

CREATE OR REPLACE FUNCTION enforce_trademark_intelligence_acceptance() RETURNS trigger AS $$
BEGIN
  IF NEW.review_status='accepted' THEN
    IF EXISTS (SELECT 1 FROM trademark_language_coverage c WHERE c.project_id=NEW.id AND c.required AND c.status NOT IN ('completed','not_applicable'))
      OR NOT EXISTS (SELECT 1 FROM trademark_language_coverage c WHERE c.project_id=NEW.id AND c.required)
    THEN RAISE EXCEPTION 'Accepted trademark intelligence project requires every language channel to be resolved'; END IF;
    IF EXISTS (SELECT 1 FROM trademark_linguistic_variants v WHERE v.project_id=NEW.id AND v.review_status NOT IN ('accepted','rejected'))
    THEN RAISE EXCEPTION 'Accepted trademark intelligence project requires every proposed linguistic variant to be reviewed'; END IF;
    IF EXISTS (SELECT 1 FROM trademark_goods_services_terms g WHERE g.project_id=NEW.id AND g.review_status<>'accepted')
      OR NOT EXISTS (SELECT 1 FROM trademark_goods_services_terms g WHERE g.project_id=NEW.id)
    THEN RAISE EXCEPTION 'Accepted trademark intelligence project requires accepted goods/services wording'; END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trademark_intelligence_acceptance_invariant ON trademark_intelligence_projects;
CREATE TRIGGER trademark_intelligence_acceptance_invariant BEFORE UPDATE OF review_status ON trademark_intelligence_projects FOR EACH ROW EXECUTE FUNCTION enforce_trademark_intelligence_acceptance();

CREATE OR REPLACE FUNCTION protect_accepted_trademark_intelligence() RETURNS trigger AS $$
DECLARE project_uuid uuid; project_status text;
BEGIN
  project_uuid=CASE WHEN TG_OP='INSERT' THEN NEW.project_id ELSE OLD.project_id END;
  SELECT review_status INTO project_status FROM trademark_intelligence_projects WHERE id=project_uuid;
  IF project_status='accepted' THEN RAISE EXCEPTION 'Accepted trademark intelligence must be reopened before language or classification data changes'; END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS protect_trademark_coverage ON trademark_language_coverage;
CREATE TRIGGER protect_trademark_coverage BEFORE INSERT OR UPDATE OR DELETE ON trademark_language_coverage FOR EACH ROW EXECUTE FUNCTION protect_accepted_trademark_intelligence();
DROP TRIGGER IF EXISTS protect_trademark_variants ON trademark_linguistic_variants;
CREATE TRIGGER protect_trademark_variants BEFORE INSERT OR UPDATE OR DELETE ON trademark_linguistic_variants FOR EACH ROW EXECUTE FUNCTION protect_accepted_trademark_intelligence();
DROP TRIGGER IF EXISTS protect_trademark_goods ON trademark_goods_services_terms;
CREATE TRIGGER protect_trademark_goods BEFORE INSERT OR UPDATE OR DELETE ON trademark_goods_services_terms FOR EACH ROW EXECUTE FUNCTION protect_accepted_trademark_intelligence();

CREATE OR REPLACE FUNCTION protect_verified_trademark_intelligence() RETURNS trigger AS $$
BEGIN
  IF OLD.verified_at IS NOT NULL AND NEW.verified_at IS NULL AND EXISTS (
    SELECT 1 FROM source_passages sp WHERE sp.source_id=OLD.id AND (
      EXISTS (SELECT 1 FROM trademark_linguistic_variants v JOIN trademark_intelligence_projects p ON p.id=v.project_id WHERE v.source_passage_id=sp.id AND (v.review_status='accepted' OR p.review_status='accepted'))
      OR EXISTS (SELECT 1 FROM trademark_goods_services_terms g JOIN trademark_intelligence_projects p ON p.id=g.project_id WHERE g.source_passage_id=sp.id AND (g.review_status='accepted' OR p.review_status='accepted'))
      OR EXISTS (SELECT 1 FROM trademark_language_coverage c JOIN trademark_intelligence_projects p ON p.id=c.project_id WHERE c.source_passage_id=sp.id AND c.status='completed' AND p.review_status='accepted')
    )
  ) THEN RAISE EXCEPTION 'Accepted trademark intelligence must be reopened before source verification is withdrawn'; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS protect_verified_trademark_intelligence ON legal_sources;
CREATE TRIGGER protect_verified_trademark_intelligence BEFORE UPDATE OF verified_at ON legal_sources FOR EACH ROW EXECUTE FUNCTION protect_verified_trademark_intelligence();
