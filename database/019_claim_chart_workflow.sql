CREATE TABLE IF NOT EXISTS claim_charts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  matter_id uuid NOT NULL REFERENCES matters(id) ON DELETE CASCADE,
  patent_entity_id uuid NOT NULL REFERENCES ip_entities(id) ON DELETE CASCADE,
  claim_id uuid NOT NULL REFERENCES patent_claims(id) ON DELETE CASCADE,
  target_entity_id uuid NOT NULL REFERENCES ip_entities(id) ON DELETE CASCADE,
  chart_type text NOT NULL CHECK (chart_type IN ('infringement','prior_art')),
  title text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','in_review','reviewed','final')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE claim_chart_rows ADD COLUMN IF NOT EXISTS chart_id uuid REFERENCES claim_charts(id) ON DELETE CASCADE;
ALTER TABLE claim_chart_rows ADD COLUMN IF NOT EXISTS review_status text NOT NULL DEFAULT 'unreviewed'
  CHECK (review_status IN ('unreviewed','accepted','rejected','needs_evidence'));
ALTER TABLE claim_chart_rows ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;

CREATE TABLE IF NOT EXISTS claim_chart_review_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  chart_id uuid NOT NULL REFERENCES claim_charts(id) ON DELETE CASCADE,
  row_id uuid NOT NULL REFERENCES claim_chart_rows(id) ON DELETE CASCADE,
  previous_status text,
  new_status text NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS claim_charts_matter_idx ON claim_charts(matter_id,updated_at DESC);
CREATE INDEX IF NOT EXISTS claim_chart_rows_chart_idx ON claim_chart_rows(chart_id,created_at);
CREATE INDEX IF NOT EXISTS claim_chart_review_events_chart_idx ON claim_chart_review_events(chart_id,created_at DESC);
