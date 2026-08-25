CREATE TABLE IF NOT EXISTS professional_search_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  matter_id uuid NOT NULL REFERENCES matters(id) ON DELETE CASCADE,
  provider text NOT NULL,
  task_type text NOT NULL,
  query text NOT NULL,
  filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_class text NOT NULL DEFAULT 'live_database',
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running','completed','failed','not_configured')),
  result_count integer NOT NULL DEFAULT 0,
  error_code text,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);

CREATE TABLE IF NOT EXISTS professional_search_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  search_run_id uuid NOT NULL REFERENCES professional_search_runs(id) ON DELETE CASCADE,
  external_id text,
  title text,
  official_url text,
  entity_id uuid REFERENCES ip_entities(id) ON DELETE SET NULL,
  rank integer NOT NULL,
  raw_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS professional_search_runs_matter_idx ON professional_search_runs(matter_id,started_at DESC);
CREATE INDEX IF NOT EXISTS professional_search_results_run_idx ON professional_search_results(search_run_id,rank);
