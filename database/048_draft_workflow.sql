ALTER TABLE legal_workflow_runs DROP CONSTRAINT IF EXISTS legal_workflow_runs_workflow_type_check;
ALTER TABLE legal_workflow_runs ADD CONSTRAINT legal_workflow_runs_workflow_type_check CHECK (workflow_type IN ('claim_chart','fto','patentability','invention_intake','trademark_clearance','evidence_chronology','verification','patent_drafting'));

ALTER TABLE legal_playbooks DROP CONSTRAINT IF EXISTS legal_playbooks_workflow_type_check;
ALTER TABLE legal_playbooks ADD CONSTRAINT legal_playbooks_workflow_type_check CHECK (workflow_type IN ('invention_intake','patent_dispute','document_review','official_search','verification_desk','trademark_intelligence','trademark_similarity','trademark_clearance','prosecution_history','patent_family','novelty','inventive_step','prior_art','fto','claim_chart','patentability','evidence_chronology','copyright_analysis','ip_transaction','contract_draft','contract_review','patent_drafting'));
