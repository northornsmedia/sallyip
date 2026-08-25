CREATE TABLE IF NOT EXISTS legal_workflow_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  matter_id uuid NOT NULL REFERENCES matters(id) ON DELETE CASCADE,
  conversation_id uuid REFERENCES conversations(id) ON DELETE SET NULL,
  workflow_type text NOT NULL CHECK (workflow_type IN ('claim_chart','fto','patentability','trademark_clearance','evidence_chronology','verification')),
  instruction text NOT NULL,
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running','completed','partial','failed')),
  result_summary text,
  warnings jsonb NOT NULL DEFAULT '[]'::jsonb,
  failed_steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  generated_artifact_id uuid REFERENCES artifacts(id) ON DELETE SET NULL,
  verification_status text NOT NULL DEFAULT 'unverified',
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE TABLE IF NOT EXISTS legal_workflow_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_run_id uuid NOT NULL REFERENCES legal_workflow_runs(id) ON DELETE CASCADE,
  ordinal integer NOT NULL,
  step_key text NOT NULL,
  service_name text NOT NULL,
  status text NOT NULL CHECK (status IN ('running','completed','skipped','failed','needs_review')),
  source_basis text NOT NULL DEFAULT 'none',
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_message text,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  UNIQUE(workflow_run_id,ordinal)
);

CREATE INDEX IF NOT EXISTS legal_workflow_runs_matter_idx ON legal_workflow_runs(matter_id,started_at DESC);
CREATE INDEX IF NOT EXISTS legal_workflow_steps_run_idx ON legal_workflow_steps(workflow_run_id,ordinal);
