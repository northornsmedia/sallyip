-- Patent Drafting Workspace Schema
-- Tracks structured, section-by-section US patent drafting projects,
-- 35 U.S.C. § 101 eligibility screens, and 35 U.S.C. § 112 support mappings.

CREATE TABLE IF NOT EXISTS patent_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  matter_id uuid REFERENCES matters(id) ON DELETE SET NULL,
  title text NOT NULL,
  filing_type text NOT NULL DEFAULT 'provisional_111b' CHECK (filing_type IN ('provisional_111b', 'nonprovisional_111a')),
  jurisdiction text NOT NULL DEFAULT 'US',
  status text NOT NULL DEFAULT 'intake' CHECK (status IN ('intake', 'claims_drafted', 'spec_in_progress', 'review_ready', 'approved')),
  active_version integer NOT NULL DEFAULT 1,
  invention_summary text NOT NULL DEFAULT '',
  screening_results jsonb NOT NULL DEFAULT '{}'::jsonb,
  support_matrix jsonb NOT NULL DEFAULT '[]'::jsonb,
  attorney_review_notes text,
  is_approved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS patent_draft_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_id uuid NOT NULL REFERENCES patent_drafts(id) ON DELETE CASCADE,
  section_key text NOT NULL CHECK (section_key IN ('title_field', 'background', 'summary', 'drawings', 'detailed_description', 'claims', 'abstract')),
  heading text NOT NULL,
  content text NOT NULL DEFAULT '',
  word_count integer NOT NULL DEFAULT 0,
  token_estimate integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'generating', 'ready', 'reviewed')),
  review_notes text,
  order_index integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(draft_id, section_key)
);

CREATE TABLE IF NOT EXISTS patent_draft_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_id uuid NOT NULL REFERENCES patent_drafts(id) ON DELETE CASCADE,
  version integer NOT NULL,
  full_specification text NOT NULL,
  sections_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(draft_id, version)
);

CREATE INDEX IF NOT EXISTS patent_drafts_user_idx ON patent_drafts(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS patent_drafts_matter_idx ON patent_drafts(matter_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS patent_draft_sections_draft_idx ON patent_draft_sections(draft_id, order_index ASC);
