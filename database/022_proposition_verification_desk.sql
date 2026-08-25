ALTER TABLE legal_propositions ADD COLUMN IF NOT EXISTS issue text;
ALTER TABLE legal_propositions ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE TABLE IF NOT EXISTS source_verification_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_id uuid NOT NULL REFERENCES legal_sources(id) ON DELETE CASCADE,
  existence_confirmed boolean NOT NULL DEFAULT false,
  pinpoint_confirmed boolean NOT NULL DEFAULT false,
  current_status_checked boolean NOT NULL DEFAULT false,
  verification_method text NOT NULL CHECK (verification_method IN ('official_database','official_web','uploaded_original','manual_review')),
  note text,
  reviewed_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS proposition_verification_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  proposition_id uuid NOT NULL REFERENCES legal_propositions(id) ON DELETE CASCADE,
  previous_status text,
  new_status text NOT NULL,
  previous_confidence text,
  new_confidence text NOT NULL,
  rationale jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS source_verification_reviews_source_idx ON source_verification_reviews(source_id,reviewed_at DESC);
CREATE INDEX IF NOT EXISTS proposition_verification_events_proposition_idx ON proposition_verification_events(proposition_id,created_at DESC);
