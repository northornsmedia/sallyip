CREATE OR REPLACE FUNCTION protect_accepted_novelty_mapping()
RETURNS trigger AS $$
DECLARE
  parent_status text;
BEGIN
  SELECT novelty_status INTO parent_status FROM prior_art_candidates WHERE id = COALESCE(NEW.candidate_id,OLD.candidate_id);
  IF parent_status = 'potentially_anticipates' THEN
    IF TG_OP = 'DELETE' OR NEW.disclosure_status NOT IN ('explicit','implicit') OR NEW.review_status <> 'accepted' THEN
      RAISE EXCEPTION 'accepted single-reference novelty mapping must be reopened before an element can be weakened or removed';
    END IF;
  END IF;
  RETURN COALESCE(NEW,OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS protect_prior_art_mapping ON prior_art_element_mappings;
CREATE TRIGGER protect_prior_art_mapping
BEFORE UPDATE OR DELETE ON prior_art_element_mappings
FOR EACH ROW EXECUTE FUNCTION protect_accepted_novelty_mapping();

