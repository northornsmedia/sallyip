CREATE TABLE IF NOT EXISTS patentbench_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  name text NOT NULL DEFAULT 'PatentBench v1',
  dataset_version text NOT NULL DEFAULT 'v1-seed',
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS patentbench_runs_created_idx ON patentbench_runs(created_at DESC);
