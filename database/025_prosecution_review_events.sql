ALTER TABLE patent_prosecution_events ADD COLUMN IF NOT EXISTS review_note text;
ALTER TABLE patent_prosecution_events ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;

CREATE TABLE IF NOT EXISTS prosecution_review_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  prosecution_event_id uuid NOT NULL REFERENCES patent_prosecution_events(id) ON DELETE CASCADE,
  previous_status text,
  new_status text NOT NULL CHECK (new_status IN ('unreviewed','accepted','rejected','needs_research')),
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS prosecution_review_event_idx ON prosecution_review_events(prosecution_event_id,created_at DESC);

