UPDATE legal_sources s
SET verified_at=NULL
WHERE verified_at IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM source_verification_reviews r
    WHERE r.source_id=s.id
      AND r.existence_confirmed
      AND r.pinpoint_confirmed
      AND r.current_status_checked
  );

CREATE OR REPLACE FUNCTION enforce_legal_source_verification_review()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.verified_at IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM source_verification_reviews r
    WHERE r.source_id=NEW.id
      AND r.existence_confirmed
      AND r.pinpoint_confirmed
      AND r.current_status_checked
  ) THEN
    RAISE EXCEPTION 'legal source verification requires a completed verification review';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS legal_source_verification_review_guard ON legal_sources;
CREATE TRIGGER legal_source_verification_review_guard
BEFORE INSERT OR UPDATE OF verified_at ON legal_sources
FOR EACH ROW EXECUTE FUNCTION enforce_legal_source_verification_review();
