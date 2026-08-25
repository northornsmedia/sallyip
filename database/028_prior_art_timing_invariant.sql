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
    RAISE EXCEPTION 'novelty anticipation requires pre-critical timing and every element accepted against this single reference';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prior_art_single_reference_novelty ON prior_art_candidates;
CREATE TRIGGER prior_art_single_reference_novelty
BEFORE INSERT OR UPDATE OF novelty_status,timing_status ON prior_art_candidates
FOR EACH ROW EXECUTE FUNCTION enforce_single_reference_novelty();

