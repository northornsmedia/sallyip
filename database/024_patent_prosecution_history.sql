CREATE TABLE IF NOT EXISTS patent_prosecution_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  matter_id uuid NOT NULL REFERENCES matters(id) ON DELETE CASCADE,
  patent_entity_id uuid NOT NULL REFERENCES ip_entities(id) ON DELETE CASCADE,
  event_entity_id uuid NOT NULL REFERENCES ip_entities(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('filing','office_action','examiner_objection','applicant_response','argument','claim_amendment','interview','allowance','grant','appeal','opposition','other')),
  event_date date,
  sequence integer NOT NULL,
  title text NOT NULL,
  content text,
  claim_number integer,
  prior_claim_text text,
  amended_claim_text text,
  source_passage_id uuid REFERENCES source_passages(id) ON DELETE SET NULL,
  source_basis text NOT NULL CHECK (source_basis IN ('user_supplied','uploaded_document','retrieved_source','live_database')),
  review_status text NOT NULL DEFAULT 'unreviewed' CHECK (review_status IN ('unreviewed','accepted','rejected','needs_research')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (patent_entity_id,sequence)
);

CREATE TABLE IF NOT EXISTS prosecution_amendment_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL UNIQUE REFERENCES patent_prosecution_events(id) ON DELETE CASCADE,
  added_terms text[] NOT NULL DEFAULT '{}',
  removed_terms text[] NOT NULL DEFAULT '{}',
  retained_ratio numeric(5,4),
  scope_signal text NOT NULL CHECK (scope_signal IN ('potential_narrowing','potential_broadening','mixed_change','no_material_text_change','insufficient')),
  estoppel_review_required boolean NOT NULL DEFAULT false,
  added_matter_review_required boolean NOT NULL DEFAULT false,
  admission_candidates jsonb NOT NULL DEFAULT '[]'::jsonb,
  explanation text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS prosecution_events_matter_idx ON patent_prosecution_events(matter_id,patent_entity_id,sequence);
CREATE INDEX IF NOT EXISTS prosecution_events_source_idx ON patent_prosecution_events(source_passage_id);

