-- Workflow types evolve faster than check constraints. The application layer
-- (WORKFLOW_TYPES in legal-task-planner.js) is the source of truth; a closed
-- DB enum only breaks inserts for new workflow types (e.g. ip_transaction
-- killed every NDA-with-matter request with a 400). Drop it, keep history.
ALTER TABLE legal_workflow_runs DROP CONSTRAINT IF EXISTS legal_workflow_runs_workflow_type_check;
