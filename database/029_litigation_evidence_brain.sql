CREATE TABLE IF NOT EXISTS litigation_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  matter_id uuid NOT NULL REFERENCES matters(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  issue_type text NOT NULL DEFAULT 'other' CHECK (issue_type IN ('infringement','validity','ownership','remedy','procedure','evidence','other')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','developing','resolved','closed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chronology_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  matter_id uuid NOT NULL REFERENCES matters(id) ON DELETE CASCADE,
  issue_id uuid REFERENCES litigation_issues(id) ON DELETE SET NULL,
  event_date date NOT NULL,
  date_precision text NOT NULL DEFAULT 'day' CHECK (date_precision IN ('day','month','year','approximate')),
  title text NOT NULL,
  description text,
  significance text,
  provenance_basis text NOT NULL DEFAULT 'user_supplied' CHECK (provenance_basis IN ('user_supplied','uploaded_document','retrieved_source','inference')),
  review_status text NOT NULL DEFAULT 'proposed' CHECK (review_status IN ('proposed','verified','disputed','rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chronology_event_passages (
  event_id uuid NOT NULL REFERENCES chronology_events(id) ON DELETE CASCADE,
  passage_id uuid NOT NULL REFERENCES source_passages(id) ON DELETE CASCADE,
  relation_type text NOT NULL DEFAULT 'supports' CHECK (relation_type IN ('supports','contradicts','context')),
  note text,
  PRIMARY KEY(event_id,passage_id)
);

CREATE TABLE IF NOT EXISTS evidence_matrix_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  matter_id uuid NOT NULL REFERENCES matters(id) ON DELETE CASCADE,
  issue_id uuid NOT NULL REFERENCES litigation_issues(id) ON DELETE CASCADE,
  required_fact text NOT NULL,
  legal_relevance text,
  burden text,
  witness_entity_id uuid REFERENCES ip_entities(id) ON DELETE SET NULL,
  assessment_status text NOT NULL DEFAULT 'gap' CHECK (assessment_status IN ('gap','partially_supported','supported','disputed','not_required')),
  gap_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS evidence_matrix_passages (
  item_id uuid NOT NULL REFERENCES evidence_matrix_items(id) ON DELETE CASCADE,
  passage_id uuid NOT NULL REFERENCES source_passages(id) ON DELETE CASCADE,
  evidence_type text NOT NULL CHECK (evidence_type IN ('supports','contradicts','context')),
  weight text NOT NULL DEFAULT 'unassessed' CHECK (weight IN ('strong','moderate','weak','unassessed')),
  note text,
  PRIMARY KEY(item_id,passage_id)
);

CREATE TABLE IF NOT EXISTS litigation_evidence_review_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  matter_id uuid NOT NULL REFERENCES matters(id) ON DELETE CASCADE,
  object_type text NOT NULL CHECK (object_type IN ('chronology_event','evidence_item')),
  object_id uuid NOT NULL,
  previous_status text,
  new_status text NOT NULL,
  rationale text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS litigation_issues_matter_idx ON litigation_issues(matter_id,updated_at DESC);
CREATE INDEX IF NOT EXISTS chronology_events_matter_date_idx ON chronology_events(matter_id,event_date,id);
CREATE INDEX IF NOT EXISTS evidence_matrix_items_issue_idx ON evidence_matrix_items(issue_id,assessment_status);
CREATE INDEX IF NOT EXISTS litigation_evidence_review_idx ON litigation_evidence_review_events(matter_id,created_at DESC);

CREATE OR REPLACE FUNCTION enforce_litigation_evidence_invariants() RETURNS trigger AS $$
BEGIN
  IF TG_TABLE_NAME = 'chronology_events' AND NEW.review_status = 'verified' THEN
    IF NOT EXISTS (
      SELECT 1 FROM chronology_event_passages ep
      JOIN source_passages sp ON sp.id=ep.passage_id
      JOIN legal_sources s ON s.id=sp.source_id
      WHERE ep.event_id=NEW.id AND ep.relation_type='supports' AND s.verified_at IS NOT NULL
    ) THEN RAISE EXCEPTION 'Verified chronology events require a verified supporting pinpoint passage'; END IF;
  END IF;
  IF TG_TABLE_NAME = 'evidence_matrix_items' AND NEW.assessment_status = 'supported' THEN
    IF NOT EXISTS (
      SELECT 1 FROM evidence_matrix_passages mp
      JOIN source_passages sp ON sp.id=mp.passage_id
      JOIN legal_sources s ON s.id=sp.source_id
      WHERE mp.item_id=NEW.id AND mp.evidence_type='supports' AND s.verified_at IS NOT NULL
    ) THEN RAISE EXCEPTION 'Supported evidence items require a verified supporting pinpoint passage'; END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS chronology_evidence_invariant ON chronology_events;
CREATE TRIGGER chronology_evidence_invariant BEFORE INSERT OR UPDATE OF review_status ON chronology_events
FOR EACH ROW EXECUTE FUNCTION enforce_litigation_evidence_invariants();
DROP TRIGGER IF EXISTS matrix_evidence_invariant ON evidence_matrix_items;
CREATE TRIGGER matrix_evidence_invariant BEFORE INSERT OR UPDATE OF assessment_status ON evidence_matrix_items
FOR EACH ROW EXECUTE FUNCTION enforce_litigation_evidence_invariants();

CREATE OR REPLACE FUNCTION protect_verified_litigation_evidence() RETURNS trigger AS $$
DECLARE parent_status text;
BEGIN
  IF TG_TABLE_NAME = 'chronology_event_passages' THEN
    SELECT review_status INTO parent_status FROM chronology_events WHERE id=OLD.event_id;
    IF parent_status='verified' AND OLD.relation_type='supports' THEN
      RAISE EXCEPTION 'Cannot remove or weaken evidence supporting a verified chronology event';
    END IF;
  ELSE
    SELECT assessment_status INTO parent_status FROM evidence_matrix_items WHERE id=OLD.item_id;
    IF parent_status='supported' AND OLD.evidence_type='supports' THEN
      RAISE EXCEPTION 'Cannot remove or weaken evidence supporting a resolved evidence item';
    END IF;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS protect_chronology_evidence ON chronology_event_passages;
CREATE TRIGGER protect_chronology_evidence BEFORE DELETE ON chronology_event_passages
FOR EACH ROW EXECUTE FUNCTION protect_verified_litigation_evidence();
DROP TRIGGER IF EXISTS protect_matrix_evidence ON evidence_matrix_passages;
CREATE TRIGGER protect_matrix_evidence BEFORE DELETE ON evidence_matrix_passages
FOR EACH ROW EXECUTE FUNCTION protect_verified_litigation_evidence();
