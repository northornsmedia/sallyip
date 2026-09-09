-- Jurisdiction packs: versioned per-country law bundles. Pack content lives in
-- legal_sources with source_type='jurisdiction_pack' and matter_id NULL (global).
-- No passage text is seeded here; curation adds verified passages per authority.
ALTER TABLE legal_sources ALTER COLUMN user_id DROP NOT NULL;

CREATE TABLE IF NOT EXISTS jurisdiction_packs (
  code text PRIMARY KEY,
  name text NOT NULL,
  version integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'skeleton' CHECK (status IN ('skeleton','partial','deep')),
  notes text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO jurisdiction_packs(code, name, status, notes) VALUES
('US', 'United States', 'skeleton', 'Authority catalog only. Feed: 35 U.S.C., MPEP chapters, TM Act (Lanham), landmark Federal Circuit opinions.'),
('IN', 'India', 'skeleton', 'Authority catalog only. Feed: Patents Act 1970, Patent Rules, IPO Manual, §3(d)/(e) jurisprudence, opposition procedure.'),
('GB', 'United Kingdom', 'skeleton', 'Authority catalog only. Feed: Patents Act 1977, MOPP, Trade Marks Act 1994, Patents Court procedure.')
ON CONFLICT (code) DO NOTHING;

CREATE INDEX IF NOT EXISTS legal_sources_pack_idx ON legal_sources(jurisdiction) WHERE matter_id IS NULL AND source_type = 'jurisdiction_pack';

-- Authority catalog: titles and issuing bodies only. official_url is set ONLY
-- where the address is certain; full text arrives via curation, never invented.
INSERT INTO legal_sources(user_id, matter_id, title, source_type, authority_tier, jurisdiction, citation, official_url, issuing_body, authority_status, retrieval_method) VALUES
(NULL, NULL, 'United States Code, Title 35 — Patents', 'jurisdiction_pack', 1, 'US', '35 U.S.C. §§ 101, 102, 103, 112', NULL, 'U.S. Congress', 'current', 'curated'),
(NULL, NULL, 'Manual of Patent Examining Procedure (MPEP)', 'jurisdiction_pack', 1, 'US', 'MPEP (37 CFR Ch. I cross-referenced)', 'https://www.uspto.gov/web/offices/pac/mpep', 'USPTO', 'current', 'curated'),
(NULL, NULL, 'Lanham Act — Trademark Act of 1946', 'jurisdiction_pack', 1, 'US', '15 U.S.C. §§ 1051–1129', NULL, 'U.S. Congress', 'current', 'curated'),
(NULL, NULL, 'USPTO — Office portal and fees', 'jurisdiction_pack', 2, 'US', NULL, 'https://www.uspto.gov', 'USPTO', 'current', 'curated'),
(NULL, NULL, 'The Patents Act, 1970 (as amended)', 'jurisdiction_pack', 1, 'IN', 'Patents Act, 1970 §§ 3(d), 3(e), opposition Ch. V', NULL, 'Parliament of India', 'current', 'curated'),
(NULL, NULL, 'Manual of Patent Office Practice and Procedure', 'jurisdiction_pack', 1, 'IN', 'Indian Patent Office Manual', NULL, 'Indian Patent Office', 'current', 'curated'),
(NULL, NULL, 'The Trade Marks Act, 1999', 'jurisdiction_pack', 1, 'IN', 'Trade Marks Act, 1999', NULL, 'Parliament of India', 'current', 'curated'),
(NULL, NULL, 'InPASS — Indian Patent Advanced Search System', 'jurisdiction_pack', 2, 'IN', NULL, 'https://ipindiaservices.gov.in/publicsearch', 'Indian Patent Office', 'current', 'curated'),
(NULL, NULL, 'Patents Act 1977', 'jurisdiction_pack', 1, 'GB', 'Patents Act 1977 (as amended)', NULL, 'UK Parliament', 'current', 'curated'),
(NULL, NULL, 'Manual of Patents Practice (MOPP)', 'jurisdiction_pack', 1, 'GB', 'MOPP', 'https://www.gov.uk/guidance/manual-of-patents-practice-mopp', 'UK Intellectual Property Office', 'current', 'curated'),
(NULL, NULL, 'Trade Marks Act 1994', 'jurisdiction_pack', 1, 'GB', 'Trade Marks Act 1994', NULL, 'UK Parliament', 'current', 'curated'),
(NULL, NULL, 'UK Intellectual Property Office', 'jurisdiction_pack', 2, 'GB', NULL, 'https://www.gov.uk/government/organisations/intellectual-property-office', 'UK Intellectual Property Office', 'current', 'curated');
