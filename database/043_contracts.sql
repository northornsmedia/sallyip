CREATE TABLE IF NOT EXISTS legal_contract_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  contract_type text NOT NULL,
  jurisdiction text NOT NULL DEFAULT 'General',
  body_template text NOT NULL,
  variables jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_system boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS legal_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  matter_id uuid REFERENCES matters(id) ON DELETE SET NULL,
  template_id uuid REFERENCES legal_contract_templates(id) ON DELETE SET NULL,
  title text NOT NULL,
  contract_type text NOT NULL,
  jurisdiction text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','review','approved','signed','archived')),
  active_version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS legal_contract_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES legal_contracts(id) ON DELETE CASCADE,
  version integer NOT NULL,
  content text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(contract_id, version)
);

CREATE TABLE IF NOT EXISTS legal_contract_clauses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES legal_contracts(id) ON DELETE CASCADE,
  version integer NOT NULL,
  ordinal integer NOT NULL,
  heading text NOT NULL DEFAULT '',
  body text NOT NULL,
  risk_level text NOT NULL DEFAULT 'green' CHECK (risk_level IN ('green','amber','red')),
  note text,
  UNIQUE(contract_id, version, ordinal)
);

CREATE INDEX IF NOT EXISTS legal_contracts_user_idx ON legal_contracts(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS legal_contract_versions_contract_idx ON legal_contract_versions(contract_id, version DESC);

-- NOTE: template bodies use real newlines (not \n escapes); Postgres stores them verbatim.
INSERT INTO legal_contract_templates(slug, title, contract_type, jurisdiction, body_template, variables) VALUES
('nda-mutual', 'Mutual NDA', 'nda', 'General', '# Mutual Non-Disclosure Agreement

Between {{party_a}} and {{party_b}} (Effective: {{effective_date}}).

## 1. Confidential Information
All non-public information disclosed for {{purpose}}.

## 2. Term
{{term_months}} months from Effective Date.

## 3. No licence
Nothing assigns IP. Discloser retains all rights.

## 4. Return or destroy
On request, return or destroy Confidential Information.

Signed:

{{party_a}}: ___________   {{party_b}}: ___________', '["party_a","party_b","effective_date","purpose","term_months"]'),
('nda-unilateral', 'Unilateral NDA', 'nda', 'General', '# Unilateral NDA

Discloser: {{discloser}}. Recipient: {{recipient}}. Effective: {{effective_date}}.

## 1. Scope
Confidential Information disclosed for {{purpose}} only.

## 2. Term
{{term_months}} months.

## 3. No IP transfer
No licence or assignment is granted.', '["discloser","recipient","effective_date","purpose","term_months"]'),
('msa-services', 'Master Services Agreement', 'msa', 'General', '# Master Services Agreement

Between {{provider}} and {{client}} (Effective: {{effective_date}}).

## 1. Services
Provider supplies {{services}} under Statements of Work.

## 2. Fees
{{payment_terms}}.

## 3. Liability
Liability is capped at {{liability_cap}}. Neither party accepts unlimited liability.

## 4. Termination
Either party may terminate on {{notice_days}} days notice.', '["provider","client","effective_date","services","payment_terms","liability_cap","notice_days"]'),
('saas-agreement', 'SaaS Subscription Agreement', 'saas', 'General', '# SaaS Subscription Agreement

Provider {{provider}} supplies {{product}} to {{client}}.

## 1. Licence
Non-exclusive, non-transferable subscription for {{seats}} seats.

## 2. Data
Provider processes data only on documented instructions.

## 3. SLA
{{sla}} uptime, credits as sole remedy.

## 4. Liability cap
Capped at {{liability_cap}}.', '["provider","product","client","seats","sla","liability_cap"]'),
('employment-ip', 'Employment Agreement (IP clause)', 'employment', 'General', '# Employment Agreement

Employer {{employer}}, Employee {{employee}}, Start {{start_date}}.

## 1. Role
{{role}}.

## 2. IP assignment
Employee assigns work-product IP created in scope of duties, subject to applicable inventor-rights law.

## 3. Confidentiality
Employee keeps employer confidential information confidential during and {{post_months}} months after employment.', '["employer","employee","start_date","role","post_months"]'),
('ip-assignment', 'IP Assignment Agreement', 'assignment', 'General', '# IP Assignment

Assignor {{assignor}} assigns to Assignee {{assignee}} the IP in {{schedule}} for {{consideration}}.

## 1. Warranties
Assignor warrants ownership and authority to assign.

## 2. Further assurance
Assignor will execute further documents on request.', '["assignor","assignee","schedule","consideration"]'),
('ip-licence', 'IP Licence Agreement', 'licence', 'General', '# IP Licence

Licensor {{licensor}} grants Licensee {{licensee}} a {{exclusivity}} licence to {{ip_description}} in {{territory}} for {{term}}.

## 1. Royalties
{{royalties}}.

## 2. No assignment
Licensee may not sub-license without consent.', '["licensor","licensee","exclusivity","ip_description","territory","term","royalties"]')
ON CONFLICT (slug) DO UPDATE SET body_template=EXCLUDED.body_template, variables=EXCLUDED.variables;
