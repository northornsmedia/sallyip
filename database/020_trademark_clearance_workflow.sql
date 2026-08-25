CREATE TABLE IF NOT EXISTS trademark_clearance_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  matter_id uuid NOT NULL REFERENCES matters(id) ON DELETE CASCADE,
  target_mark_entity_id uuid NOT NULL REFERENCES ip_entities(id) ON DELETE CASCADE,
  title text NOT NULL,
  jurisdictions text[] NOT NULL DEFAULT '{}',
  nice_classes integer[] NOT NULL DEFAULT '{}',
  goods_services text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','searching','in_review','complete')),
  overall_risk text NOT NULL DEFAULT 'unassessed' CHECK (overall_risk IN ('unassessed','limited','low','moderate','high')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS trademark_clearance_coverage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES trademark_clearance_projects(id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (channel IN ('matter_graph','official_registry','common_law','company_names','domains','social','marketplaces')),
  status text NOT NULL DEFAULT 'not_run' CHECK (status IN ('not_run','running','completed','not_configured','failed')),
  source_basis text NOT NULL DEFAULT 'none' CHECK (source_basis IN ('none','user_supplied','uploaded_document','retrieved_source','live_database')),
  result_count integer NOT NULL DEFAULT 0,
  search_run_id uuid REFERENCES professional_search_runs(id) ON DELETE SET NULL,
  note text,
  searched_at timestamptz,
  UNIQUE(project_id,channel)
);

CREATE TABLE IF NOT EXISTS trademark_clearance_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES trademark_clearance_projects(id) ON DELETE CASCADE,
  candidate_entity_id uuid NOT NULL REFERENCES ip_entities(id) ON DELETE CASCADE,
  analysis_id uuid NOT NULL REFERENCES trademark_similarity_analyses(id) ON DELETE CASCADE,
  source_basis text NOT NULL CHECK (source_basis IN ('user_supplied','uploaded_document','retrieved_source','live_database','matter_graph')),
  source_reference text,
  review_status text NOT NULL DEFAULT 'unreviewed' CHECK (review_status IN ('unreviewed','relevant','irrelevant','potential_conflict','needs_research')),
  review_note text,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_id,candidate_entity_id)
);

CREATE TABLE IF NOT EXISTS trademark_clearance_review_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES trademark_clearance_projects(id) ON DELETE CASCADE,
  candidate_id uuid NOT NULL REFERENCES trademark_clearance_candidates(id) ON DELETE CASCADE,
  previous_status text,
  new_status text NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS trademark_clearance_projects_matter_idx ON trademark_clearance_projects(matter_id,updated_at DESC);
CREATE INDEX IF NOT EXISTS trademark_clearance_candidates_project_idx ON trademark_clearance_candidates(project_id,created_at);
CREATE INDEX IF NOT EXISTS trademark_clearance_review_project_idx ON trademark_clearance_review_events(project_id,created_at DESC);
