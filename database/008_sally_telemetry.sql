CREATE TABLE IF NOT EXISTS sally_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engines_requested smallint NOT NULL,
  engines_completed smallint NOT NULL,
  embedding_dimensions integer NOT NULL DEFAULT 0,
  reranked boolean NOT NULL DEFAULT false,
  synthesis_status text NOT NULL,
  total_latency_ms integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sally_engine_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES sally_requests(id) ON DELETE CASCADE,
  engine_slug text NOT NULL,
  orchestration_weight smallint NOT NULL,
  status text NOT NULL CHECK (status IN ('success','error')),
  latency_ms integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sally_requests_created_idx ON sally_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS sally_engine_metrics_created_idx ON sally_engine_metrics(engine_slug,created_at DESC);
