-- Brain Observatory: full request/response wire capture for the /accessadmin visualizer
CREATE TABLE IF NOT EXISTS brain_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  kind text NOT NULL,                    -- request | engine_attempt | synthesis | response | error
  conversation_id text,
  user_label text,
  task_class text,
  prompt_excerpt text,
  answer_excerpt text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  latency_ms integer
);
CREATE INDEX IF NOT EXISTS brain_events_kind_idx ON brain_events(kind, created_at DESC);

CREATE TABLE IF NOT EXISTS brain_state (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Adaptive orchestration weights (self-tuning from live outcomes)
CREATE TABLE IF NOT EXISTS brain_engine_stats (
  engine_slug text PRIMARY KEY,
  base_weight smallint NOT NULL DEFAULT 10,
  successes integer NOT NULL DEFAULT 0,
  failures integer NOT NULL DEFAULT 0,
  fast_fails integer NOT NULL DEFAULT 0,          -- instant errors (rate limits / auth)
  timeouts integer NOT NULL DEFAULT 0,            -- slow/aborted engines
  latency_sum_ms bigint NOT NULL DEFAULT 0,
  tokens_generated integer NOT NULL DEFAULT 0,    -- content length proxy, updated per success
  adaptive_weight float NOT NULL DEFAULT 10,
  last_success_at timestamptz,
  last_failure_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO brain_engine_stats (engine_slug,base_weight,adaptive_weight) VALUES
 ('nvidia/nemotron-3.5-lightning:free',16,16),
 ('google/gemma-4-26b-a4b-it:free',13,13),
 ('stealth/ox-alpha',50,50),
 ('liquid/lfm-2.5-2.6b:free',12,12),
 ('dots-studio/dots-3-note-preview:free',9,9)
ON CONFLICT (engine_slug) DO NOTHING;

-- Per-request wire trace: ordered node events composing one brain activation
CREATE TABLE IF NOT EXISTS brain_wire_traces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  conversation_id text,
  task_class text,
  prompt_excerpt text,
  answer_excerpt text,
  total_latency_ms integer,
  engines_completed smallint,
  engines_requested smallint,
  primary_engine text,
  rescue_used boolean NOT NULL DEFAULT false,
  events jsonb NOT NULL DEFAULT '[]'::jsonb   -- [{t,label,detail,status}]
);
CREATE INDEX IF NOT EXISTS brain_wire_traces_created_idx ON brain_wire_traces(created_at DESC);
