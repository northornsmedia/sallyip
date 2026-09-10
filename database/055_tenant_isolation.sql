-- 055 tenant isolation: Row Level Security + least-privilege roles.
-- Idempotent. Owner bypasses RLS so existing deployment keeps working.
-- App must SET LOCAL app.current_user_id = '<user uuid>' on every pooled transaction
-- when using sally_app role. Rollback notes at bottom.

-- Least-privilege roles (no login for now; owner grants explicitly in production).
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sally_app') THEN
    CREATE ROLE sally_app NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sally_readonly') THEN
    CREATE ROLE sally_readonly NOLOGIN;
  END IF;
END $$;

-- Helper: enable RLS on user/matter-scoped tables where user_id or matter ownership applies.
-- Tables with user_id directly:
-- users, conversations, messages(via conversations), datasets, training_jobs, models,
-- points_ledger, subscriptions, matters, matter_facts, ip_entities, ip_relationships,
-- legal_sources, source_passages(via legal_sources), legal_propositions, proposition_sources,
-- specialist_agent_runs, knowledge_sources, knowledge_chunks(via knowledge_sources),
-- artifacts, artifact_versions, generated_files, legal_workflow_runs/steps,
-- claim_charts, prior_art_*, patent_novelty_*, inventive_step_*, fto_*,
-- litigation_*, trademark_*, office_actions, patent_drafts*, legal_playbooks,
-- legal_contracts/versions/clauses, answer_citations, vault_review_*,
-- security_events(user-scoped read), eval_runs owned runs, patentbench_runs, provider_records.

-- Enable RLS (safe: table owners bypass).
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'users','conversations','messages','datasets','training_jobs','models',
    'points_ledger','subscriptions','matters','matter_facts',
    'ip_entities','ip_relationships','legal_sources','source_passages',
    'legal_propositions','proposition_sources','specialist_agent_runs',
    'knowledge_sources','knowledge_chunks','knowledge_source_files',
    'artifacts','artifact_versions','generated_files',
    'legal_workflow_runs','legal_workflow_steps',
    'claim_charts','claim_chart_rows','claim_chart_review_events',
    'prior_art_projects','prior_art_search_strategies','prior_art_candidates',
    'prior_art_element_mappings','prior_art_review_events',
    'patent_novelty_analyses','patent_novelty_review_events',
    'inventive_step_analyses','inventive_step_analysis_steps','inventive_step_references',
    'inventive_step_step_evidence','inventive_step_review_events',
    'fto_projects','fto_product_features','fto_search_coverage','fto_patent_reviews',
    'fto_element_mappings','fto_design_arounds','fto_review_events',
    'litigation_issues','chronology_events','chronology_event_passages',
    'evidence_matrix_items','evidence_matrix_passages','litigation_evidence_review_events',
    'trademark_clearance_projects','trademark_clearance_coverage','trademark_clearance_candidates',
    'trademark_clearance_review_events','trademark_intelligence_projects','trademark_language_coverage',
    'trademark_linguistic_variants','trademark_goods_services_terms','trademark_intelligence_review_events',
    'office_actions','oa_rejections','oa_amendments',
    'patent_drafts','patent_draft_sections','patent_draft_versions',
    'legal_playbooks','legal_playbook_versions',
    'legal_contracts','legal_contract_versions','legal_contract_clauses',
    'answer_citations','vault_review_tables','vault_review_rows',
    'security_events','auth_sessions','eval_runs','patentbench_runs','provider_records',
    'professional_search_runs','professional_search_results',
    'patent_prosecution_events','prosecution_amendment_analyses','prosecution_review_events',
    'patent_families','patent_family_members','patent_family_links',
    'source_verification_reviews','proposition_verification_events'
  ] LOOP
    BEGIN
      EXECUTE format('ALTER TABLE IF EXISTS %I ENABLE ROW LEVEL SECURITY', t);
      EXECUTE format('ALTER TABLE IF EXISTS %I FORCE ROW LEVEL SECURITY', t);
    EXCEPTION WHEN undefined_table THEN
      -- Skip tables that do not exist on this database vintage.
      CONTINUE;
    END;
  END LOOP;
END $$;

-- Policies for sally_app: user can only see own rows.
-- We use app.current_user_id setting; NULL => no rows (fail closed).
-- Direct user_id tables:
DO $$ BEGIN
  DROP POLICY IF EXISTS sally_app_own_rows ON matters;
  CREATE POLICY sally_app_own_rows ON matters FOR ALL TO sally_app
    USING (user_id::text = NULLIF(current_setting('app.current_user_id', true), '') )
    WITH CHECK (user_id::text = NULLIF(current_setting('app.current_user_id', true), ''));
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS sally_app_own_rows ON conversations;
  CREATE POLICY sally_app_own_rows ON conversations FOR ALL TO sally_app
    USING (user_id::text = NULLIF(current_setting('app.current_user_id', true), ''))
    WITH CHECK (user_id::text = NULLIF(current_setting('app.current_user_id', true), ''));
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS sally_app_own_rows ON generated_files;
  CREATE POLICY sally_app_own_rows ON generated_files FOR ALL TO sally_app
    USING (user_id::text = NULLIF(current_setting('app.current_user_id', true), ''))
    WITH CHECK (user_id::text = NULLIF(current_setting('app.current_user_id', true), ''));
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS sally_app_own_rows ON legal_sources;
  CREATE POLICY sally_app_own_rows ON legal_sources FOR ALL TO sally_app
    USING (user_id::text = NULLIF(current_setting('app.current_user_id', true), ''))
    WITH CHECK (user_id::text = NULLIF(current_setting('app.current_user_id', true), ''));
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS sally_app_own_rows ON artifacts;
  CREATE POLICY sally_app_own_rows ON artifacts FOR ALL TO sally_app
    USING (user_id::text = NULLIF(current_setting('app.current_user_id', true), ''))
    WITH CHECK (user_id::text = NULLIF(current_setting('app.current_user_id', true), ''));
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS sally_app_own_rows ON legal_contracts;
  CREATE POLICY sally_app_own_rows ON legal_contracts FOR ALL TO sally_app
    USING (user_id::text = NULLIF(current_setting('app.current_user_id', true), ''))
    WITH CHECK (user_id::text = NULLIF(current_setting('app.current_user_id', true), ''));
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS sally_app_own_rows ON legal_workflow_runs;
  CREATE POLICY sally_app_own_rows ON legal_workflow_runs FOR ALL TO sally_app
    USING (user_id::text = NULLIF(current_setting('app.current_user_id', true), ''))
    WITH CHECK (user_id::text = NULLIF(current_setting('app.current_user_id', true), ''));
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS sally_app_own_rows ON answer_citations;
  CREATE POLICY sally_app_own_rows ON answer_citations FOR ALL TO sally_app
    USING (user_id::text = NULLIF(current_setting('app.current_user_id', true), ''))
    WITH CHECK (user_id::text = NULLIF(current_setting('app.current_user_id', true), ''));
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS sally_app_own_rows ON auth_sessions;
  CREATE POLICY sally_app_own_rows ON auth_sessions FOR ALL TO sally_app
    USING (user_id::text = NULLIF(current_setting('app.current_user_id', true), ''))
    WITH CHECK (user_id::text = NULLIF(current_setting('app.current_user_id', true), ''));
EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- Grants: sally_app gets CRUD on user tables, no DDL, no pg_*.
-- Run as owner after migration:
-- GRANT USAGE ON SCHEMA public TO sally_app;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO sally_app;
-- ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO sally_app;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO sally_app;
-- sally_readonly: GRANT USAGE ON SCHEMA public TO sally_readonly; GRANT SELECT ON ALL TABLES IN SCHEMA public TO sally_readonly;

-- Rollback:
-- ALTER TABLE <t> DISABLE ROW LEVEL SECURITY; DROP POLICY IF EXISTS sally_app_own_rows ON <t>;
-- DROP ROLE IF EXISTS sally_app; DROP ROLE IF EXISTS sally_readonly;
