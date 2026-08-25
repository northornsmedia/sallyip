ALTER TABLE legal_workflow_runs DROP CONSTRAINT IF EXISTS legal_workflow_runs_workflow_type_check;
ALTER TABLE legal_workflow_runs ADD CONSTRAINT legal_workflow_runs_workflow_type_check CHECK (workflow_type IN ('claim_chart','fto','patentability','invention_intake','trademark_clearance','evidence_chronology','verification'));
