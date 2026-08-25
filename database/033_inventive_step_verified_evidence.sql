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
      WHERE st.analysis_id=NEW.id AND st.required AND st.step_key<>'conclusion' AND NOT EXISTS (
        SELECT 1 FROM inventive_step_step_evidence se
        JOIN source_passages sp ON sp.id=se.passage_id JOIN legal_sources s ON s.id=sp.source_id
        WHERE se.step_id=st.id AND s.verified_at IS NOT NULL
      )
    ) THEN RAISE EXCEPTION 'Accepted inventive-step analysis requires verified pinpoint evidence for every substantive framework step'; END IF;
    IF NOT EXISTS (SELECT 1 FROM inventive_step_references r WHERE r.analysis_id=NEW.id AND r.reference_role='closest_prior_art')
    THEN RAISE EXCEPTION 'Accepted inventive-step analysis requires accepted pre-critical closest prior art'; END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION protect_accepted_inventive_step_authority() RETURNS trigger AS $$
BEGIN
  IF OLD.verified_at IS NOT NULL AND NEW.verified_at IS NULL AND EXISTS (
    SELECT 1 FROM source_passages sp
    WHERE sp.source_id=OLD.id AND (
      EXISTS (SELECT 1 FROM inventive_step_analyses a WHERE a.governing_authority_passage_id=sp.id AND a.review_status='accepted')
      OR EXISTS (SELECT 1 FROM inventive_step_step_evidence se JOIN inventive_step_analysis_steps st ON st.id=se.step_id JOIN inventive_step_analyses a ON a.id=st.analysis_id WHERE se.passage_id=sp.id AND a.review_status='accepted')
    )
  ) THEN RAISE EXCEPTION 'Accepted inventive-step analysis must be reopened before evidence verification is withdrawn'; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
