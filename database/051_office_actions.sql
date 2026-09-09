CREATE TABLE IF NOT EXISTS office_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  matter_id uuid REFERENCES matters(id) ON DELETE SET NULL,
  patent_entity_id uuid REFERENCES ip_entities(id) ON DELETE SET NULL,
  title text NOT NULL,
  oa_type text NOT NULL DEFAULT 'non-final' CHECK (oa_type IN ('non-final','final','advisory','restriction','other')),
  mailing_date date,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','in_review','responded','closed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS oa_rejections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id uuid NOT NULL REFERENCES office_actions(id) ON DELETE CASCADE,
  rejection_type text NOT NULL CHECK (rejection_type IN ('101','102','103','112','other')),
  claim_numbers integer[] NOT NULL DEFAULT '{}',
  references_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  examiner_excerpt text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','addressed','withdrawn')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS oa_amendments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id uuid NOT NULL REFERENCES office_actions(id) ON DELETE CASCADE,
  rejection_id uuid REFERENCES oa_rejections(id) ON DELETE SET NULL,
  claim_number integer,
  original_text text NOT NULL DEFAULT '',
  amended_text text NOT NULL,
  strategy text NOT NULL DEFAULT 'moderate' CHECK (strategy IN ('broad','moderate','conservative')),
  qa_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  new_matter_risk boolean NOT NULL DEFAULT false,
  review_status text NOT NULL DEFAULT 'draft' CHECK (review_status IN ('draft','accepted','rejected')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS office_actions_user_idx ON office_actions(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS oa_rejections_action_idx ON oa_rejections(action_id);
CREATE INDEX IF NOT EXISTS oa_amendments_action_idx ON oa_amendments(action_id);
