CREATE OR REPLACE FUNCTION enforce_litigation_evidence_invariants() RETURNS trigger AS $$
BEGIN
  IF TG_TABLE_NAME = 'chronology_events' THEN
    IF NEW.review_status = 'verified' AND NOT EXISTS (
      SELECT 1 FROM chronology_event_passages ep
      JOIN source_passages sp ON sp.id=ep.passage_id
      JOIN legal_sources s ON s.id=sp.source_id
      WHERE ep.event_id=NEW.id AND ep.relation_type='supports' AND s.verified_at IS NOT NULL
    ) THEN RAISE EXCEPTION 'Verified chronology events require a verified supporting pinpoint passage'; END IF;
  ELSIF TG_TABLE_NAME = 'evidence_matrix_items' THEN
    IF NEW.assessment_status = 'supported' AND NOT EXISTS (
      SELECT 1 FROM evidence_matrix_passages mp
      JOIN source_passages sp ON sp.id=mp.passage_id
      JOIN legal_sources s ON s.id=sp.source_id
      WHERE mp.item_id=NEW.id AND mp.evidence_type='supports' AND s.verified_at IS NOT NULL
    ) THEN RAISE EXCEPTION 'Supported evidence items require a verified supporting pinpoint passage'; END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
