CREATE TABLE IF NOT EXISTS legal_playbooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  workflow_type text NOT NULL CHECK (workflow_type IN ('invention_intake','patent_dispute','document_review','official_search','verification_desk','trademark_intelligence','trademark_similarity','trademark_clearance','prosecution_history','patent_family','novelty','inventive_step','prior_art','fto','claim_chart','patentability','evidence_chronology','copyright_analysis','ip_transaction','contract_draft','contract_review')),
  definition jsonb NOT NULL DEFAULT '{}'::jsonb,
  default_jurisdiction text,
  is_template boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS legal_playbook_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  playbook_id uuid NOT NULL REFERENCES legal_playbooks(id) ON DELETE CASCADE,
  version integer NOT NULL,
  definition jsonb NOT NULL,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(playbook_id, version)
);

ALTER TABLE legal_workflow_runs ADD COLUMN IF NOT EXISTS playbook_id uuid REFERENCES legal_playbooks(id) ON DELETE SET NULL;
ALTER TABLE legal_workflow_runs ADD COLUMN IF NOT EXISTS playbook_version integer;

CREATE INDEX IF NOT EXISTS legal_playbooks_user_idx ON legal_playbooks(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS legal_playbook_versions_playbook_idx ON legal_playbook_versions(playbook_id, version DESC);
CREATE INDEX IF NOT EXISTS legal_workflow_runs_playbook_idx ON legal_workflow_runs(playbook_id);
