CREATE OR REPLACE FUNCTION protect_verified_litigation_evidence() RETURNS trigger AS $$
DECLARE parent_status text;
BEGIN
  IF TG_TABLE_NAME = 'chronology_event_passages' THEN
    SELECT review_status INTO parent_status FROM chronology_events WHERE id=OLD.event_id;
    IF parent_status='verified' AND OLD.relation_type='supports' AND (TG_OP='DELETE' OR NEW.relation_type<>'supports') THEN
      RAISE EXCEPTION 'Cannot remove or weaken evidence supporting a verified chronology event';
    END IF;
  ELSE
    SELECT assessment_status INTO parent_status FROM evidence_matrix_items WHERE id=OLD.item_id;
    IF parent_status='supported' AND OLD.evidence_type='supports' AND (TG_OP='DELETE' OR NEW.evidence_type<>'supports') THEN
      RAISE EXCEPTION 'Cannot remove or weaken evidence supporting a resolved evidence item';
    END IF;
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS protect_chronology_evidence ON chronology_event_passages;
CREATE TRIGGER protect_chronology_evidence BEFORE UPDATE OR DELETE ON chronology_event_passages
FOR EACH ROW EXECUTE FUNCTION protect_verified_litigation_evidence();
DROP TRIGGER IF EXISTS protect_matrix_evidence ON evidence_matrix_passages;
CREATE TRIGGER protect_matrix_evidence BEFORE UPDATE OR DELETE ON evidence_matrix_passages
FOR EACH ROW EXECUTE FUNCTION protect_verified_litigation_evidence();
