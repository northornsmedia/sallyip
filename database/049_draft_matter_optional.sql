ALTER TABLE legal_workflow_runs ALTER COLUMN matter_id DROP NOT NULL;
CREATE INDEX IF NOT EXISTS legal_workflow_runs_user_idx ON legal_workflow_runs(user_id, started_at DESC);
