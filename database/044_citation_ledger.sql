ALTER TABLE proposition_sources ADD COLUMN IF NOT EXISTS quote text;
ALTER TABLE proposition_sources ADD COLUMN IF NOT EXISTS quote_match text NOT NULL DEFAULT 'unchecked' CHECK (quote_match IN ('unchecked','exact','fuzzy','missing'));

CREATE TABLE IF NOT EXISTS answer_citations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  matter_id uuid REFERENCES matters(id) ON DELETE CASCADE,
  conversation_id uuid REFERENCES conversations(id) ON DELETE SET NULL,
  agent_run_id uuid REFERENCES specialist_agent_runs(id) ON DELETE SET NULL,
  claim_text text NOT NULL,
  passage_id uuid REFERENCES source_passages(id) ON DELETE SET NULL,
  quote text NOT NULL,
  match_status text NOT NULL DEFAULT 'missing' CHECK (match_status IN ('exact','fuzzy','missing')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS answer_citations_run_idx ON answer_citations(agent_run_id, created_at);
CREATE INDEX IF NOT EXISTS answer_citations_conversation_idx ON answer_citations(conversation_id, created_at);
