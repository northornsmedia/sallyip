import React, { useState } from 'react';
import { ArrowRight, Check } from 'lucide-react';
import MarketingLayout from '../MarketingLayout';
import { Hero, Section, Reveal, Eyebrow, CTASection, Breadcrumbs, Shot, go } from '../ui';
import { ProductShot, VerifiedPanel } from '../shots';
import { BENCHMARKS } from '../bench-data';
import { OfficeActionDemo, TrademarkDemo } from '../demos';

export function ProductPage({ route }) {
  const groups = [
    { h: 'RESEARCH', items: [['Prior art', 'Limitation-level claim mapping to retrieved passages.', '/novelty-search'], ['Novelty', 'Feature-to-art matrices with stated gaps.', '/novelty-search'], ['Inventive step', 'Obviousness analysis with cited combinations.', '/novelty-search'], ['FTO', 'Product features × claim limitations.', '/novelty-search'], ['Patent families', 'Family graphs with priority pointers.', '/modules'], ['Prosecution history', 'Timelines per application.', '/modules']] },
    { h: 'CREATE', items: [['Patent drafting', 'US §111(a)/(b) with §101 + §112 checks.', '/office-action-defense'], ['Claims', 'Support-pointed claim sets.', '/claim-charts'], ['Office action response', 'Rejection → argument → amendment.', '/office-action-defense'], ['Contracts & playbooks', 'Templates, risk flags, reusable runs.', '/developer-api']] },
    { h: 'PROTECT', items: [['Trademark clearance', 'Screening with review states.', '/trademarks'], ['Trademark intelligence', 'Variants, goods terms, coverage.', '/trademarks'], ['Portfolio analysis', 'Developing — stated as such.', '/roadmap']] },
    { h: 'VERIFY', items: [['Verification desk', 'Proposition → source → passage.', '/verification-logs'], ['Evidence mapping', 'Every chart row pinned to text.', '/claim-charts'], ['Citation verification', 'Exact/fuzzy/missing per quote.', '/verification-logs']] },
    { h: 'ENFORCE', items: [['Litigation evidence', 'Chronologies with sources.', '/ip-intelligence'], ['Infringement analysis', 'Element mapping support.', '/claim-charts'], ['Chronologies', 'Ordered, sourced timelines.', '/ip-intelligence']] },
  ];
  return (
    <MarketingLayout route={route} active="/product">
      <Hero eyebrow="Product" title={<>One intelligent workspace<br />for IP.</>} lede="Research, drafting, prosecution, clearance, verification and enforcement — scoped to the matter, gated on evidence, ready for practitioner review." primary={<button className="ent-btn ent-btn-primary" onClick={() => go('/novelty-search')}>See novelty search <ArrowRight /></button>} secondary={<button className="ent-btn ent-btn-ghost" onClick={() => go('/enterprise')}>Request a Demo</button>} meta="12+ SPECIALIST WORKSPACES · MATTER-SCOPED · AUDIT-LOGGED" />
      <div className="ent-wrap"><Reveal><ProductShot id="workspaces" eager /></Reveal></div>
      <Section>
        <Reveal><Eyebrow>Modules by lifecycle</Eyebrow><h2 className="ent-h2">From disclosure to dispute.</h2></Reveal>
        {groups.map((g) => (
          <Reveal key={g.h}>
            <div className="ent-kicker" style={{ marginTop: 36 }}>{g.h}</div>
            <div className="ent-areas">
              {g.items.map((it) => <a key={it[0]} className="ent-area" href={it[2]} onClick={(e) => { e.preventDefault(); go(it[2]); }}><h3>{it[0]}</h3><p>{it[1]}</p><span>Open →</span></a>)}
            </div>
          </Reveal>
        ))}
      </Section>
      <Section>
        <Reveal><Eyebrow>Walkthrough</Eyebrow><h2 className="ent-h2">Rejection to response.</h2></Reveal>
        <Reveal><ProductShot id="patent-drafting" /></Reveal>
        <Reveal><OfficeActionDemo /></Reveal>
      </Section>
      <CTASection title="Try the workspace on real IP work." body="Start with prior art or an office action. Every output links to the passage behind it." />
    </MarketingLayout>
  );
}

export function SolutionsPage({ route }) {
  const auds = [
    ['Law firms', 'Boutiques drowning in office actions; Am Law teams needing defensible throughput.', 'OA response + claim QA + audit trails per matter.', 'Matter isolation, role-based access, redacted logs.'],
    ['In-house IP teams', 'Portfolio risk spread across products, counsel, and outside firms.', 'FTO matrices, family graphs, contract review with risk flags.', 'Organisation knowledge vaults, admin controls.'],
    ['Patent attorneys', 'Drafting and prosecution under time pressure with no room for dangling citations.', 'Drafting with §101/§112 screens; OA parsing + amendments.', 'Exact-quote verification on every citation.'],
    ['Trademark professionals', 'Knockout through factor analysis with a record of every call.', 'Clearance projects, variant + goods review, sync to intelligence.', 'Research support only — never an opinion.'],
    ['IP litigation teams', 'Chronologies and evidence maps that must survive scrutiny.', 'Evidence workspace, claim charts, verification desk.', 'SHA-stamped provenance where implemented; full trails.'],
    ['R&D / innovation', 'Disclosures that stall between lab notebook and filing decision.', 'Invention interview, novelty screening, disclosure structuring.', 'Guidance plus practitioner review gate.'],
    ['Universities / education', 'Clinics and TTOs needing rigorous, affordable tooling.', 'Free qualifying access, benchmarks, provenance tools.', 'Transparent evaluation and methods.'],
  ];
  return (
    <MarketingLayout route={route} active="/solutions">
      <Hero eyebrow="Solutions" title="Built around how IP work actually happens." lede="Seven audiences, one evidentiary backbone. No “boost productivity” slogans — problem, workflow, product fit, and trust, per team." primary={<button className="ent-btn ent-btn-primary" onClick={() => go('/enterprise')}>Talk to us <ArrowRight /></button>} secondary={<button className="ent-btn ent-btn-ghost" onClick={() => go('/product')}>See the product</button>} />
      <Section>
        {auds.map((a, i) => (
          <Reveal key={a[0]}>
            <div style={{ padding: '32px 0', borderTop: i === 0 ? '1px solid rgba(255,255,255,.09)' : undefined, borderBottom: '1px solid rgba(255,255,255,.06)' }}>
              <div className="ent-kicker">{String(i + 1).padStart(2, '0')} · {a[0]}</div>
              <div className="ent-split3" style={{ display: 'grid', gap: 24 }}>
                <div><b style={{ fontSize: 13 }}>PROBLEM</b><p style={{ color: '#b8bdc9', fontSize: 14, lineHeight: 1.65 }}>{a[1]}</p></div>
                <div><b style={{ fontSize: 13 }}>WORKFLOW → PRODUCT</b><p style={{ color: '#b8bdc9', fontSize: 14, lineHeight: 1.65 }}>{a[2]}</p></div>
                <div><b style={{ fontSize: 13 }}>TRUST</b><p style={{ color: '#b8bdc9', fontSize: 14, lineHeight: 1.65 }}>{a[3]}</p></div>
              </div>
            </div>
          </Reveal>
        ))}
      </Section>
      <CTASection title="Tell us how your team works." body="We will map your matters to the right workflows — and tell you plainly where SallyIP is guidance-only today." />
    </MarketingLayout>
  );
}

export function EnterprisePage({ route }) {
  const rows = [
    ['Matter-based access', 'Every source, passage, run and export scoped by user + matter. Viewer reads; researcher+ mutates.'],
    ['Organisation knowledge', 'Shared vaults, IP graph entities, and versioned playbooks — provenance attached.'],
    ['Auditability', 'Security events, workflow runs, verification events and citation ledger. Confidential fields redacted, never stored raw in logs.'],
    ['Admin controls', 'Roles viewer / researcher / admin / owner. Login throttling (10 attempts / 10 min). Revocation effective on next check.'],
    ['Deployment', 'Hosted web app + serverless API. VPC / on-prem and SSO: planned — ask for current status, not assumed.'],
    ['Integrations', 'Word add-in (task pane: load playbooks, run, insert). Official search: EPO, EUIPO, USPTO, CourtListener with honest status.'],
    ['API', 'Matters, playbooks, contracts, citations, vault reviews, eval runs — documented endpoints with auth. See Developer API.'],
    ['Governance', 'No SOC 2 / ISO / HIPAA / DPA / zero-retention claims unless verified. Unavailable = Planned / In development / omitted.'],
  ];
  return (
    <MarketingLayout route={route} active="/enterprise">
      <Hero eyebrow="Enterprise" title="Enterprise AI for IP teams." lede="Confidential matters, governed access, and an audit trail a litigator would respect — built on controls that exist today." primary={<button className="ent-btn ent-btn-primary" onClick={() => go('/security')}>Review security <ArrowRight /></button>} secondary={<button className="ent-btn ent-btn-ghost" onClick={() => go('/benchmarks')}>See the evidence</button>} meta="RBAC · AUDIT LOGS · MATTER ISOLATION · HONEST ROADMAP" />
      <Section>
        <Reveal><Eyebrow>What enterprise gets</Eyebrow></Reveal>
        {rows.map((r) => <Reveal key={r[0]}><div style={{ padding: '24px 0', borderBottom: '1px solid rgba(255,255,255,.06)' }}><b style={{ fontSize: 17 }}>{r[0]}</b><p style={{ color: '#b8bdc9', fontSize: 14.5, lineHeight: 1.65, margin: '8px 0 0', maxWidth: '70ch' }}>{r[1]}</p></div></Reveal>)}
      </Section>
      <Section>
        <Reveal><Eyebrow>Support & benchmarks</Eyebrow><h2 className="ent-h2">Governed, measured, supported.</h2><p className="ent-sub">Admin onboarding, matter migration, practitioner-review workflows. Benchmarks published with failures — <button className="ent-textlink" onClick={() => go('/benchmarks')}>open benchmarks →</button></p></Reveal>
      </Section>
      <CTASection title="Request an enterprise review." body="We will walk your matters, access model, and audit needs — and document what is shipped vs planned in writing." />
    </MarketingLayout>
  );
}

export function SecurityPage({ route }) {
  const controls = [
    ['Authentication', 'Email + password (8+ chars), session cookies, logout revocation. Login throttling: 10 attempts / 10 min per identifier, 30-min window pruning.'],
    ['Matter isolation', 'App-level tenant isolation: every matter, source, passage, run and export filtered by user + matter. Viewer role reads; researcher+ required for create/update/run.'],
    ['Database security', 'Neon Postgres, parameterized queries throughout. No raw interpolation of user input into SQL.'],
    ['Model / provider policy', 'Primary engine configurable via env; malformed config ignored safely. Provider status (EPO/EUIPO/USPTO/CourtListener) reported honestly — unavailable means unavailable, never simulated.'],
    ['Encryption', 'TLS in transit via hosting platform. At-rest encryption via platform/database defaults. Customer-managed keys (BYOK): planned, not claimed.'],
    ['Audit logging', 'security_events table: signup, login success/failure, rate limits, logout, playbook runs, contract reviews. Confidential fields redacted; oversized strings truncated. Failures fall back to stderr sink with typed error.'],
    ['Confidentiality modes', 'Matters private by default. No automatic publication or sharing; visibility changes are explicit. Uploaded files are never executed.'],
    ['Data handling & retention', 'Document text extracted, chunked, embedded and stored per workspace. Exact retention windows: see Trust center — not overstated here.'],
    ['Access controls', 'Roles: viewer (0) / researcher (1) / admin (2) / owner (3). Mutations on matters, contracts, playbooks require researcher+.'],
    ['Incident process', 'Security contact and responsible disclosure via Trust center. Audit fallback ensures failures are observable.'],
    ['Subprocessors / providers', 'Hosting, database, model and official-search providers listed in Trust center with status. Certifications (SOC 2 / ISO / HIPAA / DPA / zero-retention / regional hosting): not claimed unless verified.'],
  ];
  return (
    <MarketingLayout route={route} active="/security">
      <Hero eyebrow="Security" title="Built for confidential work." lede="Implemented controls only. Anything not shipped is marked Planned / In development — or omitted entirely." primary={<button className="ent-btn ent-btn-primary" onClick={() => go('/trust')}>Trust center <ArrowRight /></button>} secondary={<button className="ent-btn ent-btn-ghost" onClick={() => go('/enterprise')}>Enterprise</button>} meta="AUTH · ISOLATION · RBAC · AUDIT LOGS · HONEST SCOPE" />
      <Section>
        <Reveal><Eyebrow>Implemented controls</Eyebrow></Reveal>
        {controls.map((c) => <Reveal key={c[0]}><div style={{ padding: '22px 0', borderBottom: '1px solid rgba(255,255,255,.06)' }}><b style={{ fontSize: 16 }}>{c[0]}</b><p style={{ color: '#b8bdc9', fontSize: 14.5, lineHeight: 1.65, margin: '8px 0 0', maxWidth: '72ch' }}>{c[1]}</p></div></Reveal>)}
        <Reveal><div style={{ marginTop: 28, border: '1px solid rgba(255,255,255,.1)', borderRadius: 12, padding: 22, fontSize: 14, color: '#b8bdc9', lineHeight: 1.65 }}><b style={{ color: '#fff' }}>What we do not claim.</b> SOC 2, ISO 27001/42001, HIPAA, DPA zero-retention guarantees, and regional-hosting promises are not listed here because they are not verified in-repo. When they are, they will appear with artifact, date, and scope.</div></Reveal>
      </Section>
      <CTASection title="Review the controls with your team." body="Security architecture, responsible disclosure, and contact — all in the trust center." />
    </MarketingLayout>
  );
}

export function BenchmarksPage({ route }) {
  const [tab, setTab] = useState('All');
  const tabs = ['All', 'Verification', 'Legal reasoning', 'Hallucination defence', 'Patent retrieval', 'External'];
  const match = (b) => tab === 'All' || (tab === 'Verification' && /Grounding|Frozen/.test(b.name)) || (tab === 'Hallucination defence' && /Adversarial|Ablation|Stanford/.test(b.name)) || (tab === 'Patent retrieval' && /Retrieval/.test(b.name)) || (tab === 'Legal reasoning' && /Frozen|Stanford/.test(b.name)) || (tab === 'External' && false);
  return (
    <MarketingLayout route={route} active="/benchmarks">
      <Hero eyebrow="Benchmarks" title="Measured, not merely claimed." lede="Every number carries sample size, model, date, methodology and status — including the blocked release. Citation integrity is not legal correctness." primary={<button className="ent-btn ent-btn-primary" onClick={() => go('/verification-logs')}>How verification works <ArrowRight /></button>} secondary={<button className="ent-btn ent-btn-ghost" onClick={() => go('/resources')}>All resources</button>} meta="N, MODEL, DATE, COMMIT, METHOD, STATUS — ALWAYS" />
      <Section>
        <Reveal>
          <div className="ent-demo-tabs" role="group" aria-label="Benchmark filters" style={{ border: '1px solid rgba(255,255,255,.1)', borderRadius: 12, marginBottom: 8 }}>
            {tabs.map((t) => <button key={t} type="button" aria-pressed={tab === t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>{t}</button>)}
          </div>
        </Reveal>
        <Reveal>
          <div className="ent-table-wrap" tabIndex={0} role="region" aria-label="Benchmark results table, scrollable">
          <table className="ent-table">
            <caption className="sr-only">Benchmark results with sample, model, date, result and status</caption>
            <thead><tr><th scope="col">Benchmark (sample · model · date)</th><th scope="col">Recorded result</th><th scope="col">Status</th></tr></thead>
            <tbody>
              {BENCHMARKS.filter(match).map((b) => (
                <tr key={b.name}><td><b>{b.name}</b><br /><small style={{ color: '#8b91a1' }}>{b.meta}</small></td><td>{b.metrics}</td><td><span className={`ent-status ${b.status === 'BLOCKED' ? 'blocked' : b.status === 'PENDING' ? 'pending' : 'ok'}`}>{b.status.replace('_', ' ')}</span></td></tr>
              ))}
            </tbody>
          </table>
          </div>
          {tab === 'External' && <p className="ent-sub">Peer-reviewed context: general LLMs hallucinate on 58–88% of legal queries (Dahl et al., Stanford HAI 2024); purpose-built RAG tools 17–33% (Magesh et al. 2024–2025). Harvey / Genie / Solve / DeepIP publish no public hallucination measurements (observed Sep 2026).</p>}
          <p style={{ fontSize: 12.5, color: '#8b91a1' }}>Sources: benchmarks/cross-bench-report.md, regression_report_p0_full.md, ablation reports, eval_scorecard_sample_25.md. Machine-readable latest.json via benchmarks pipeline. Legal correctness requires practitioner grading — pending.</p>
        </Reveal>
      </Section>
      <CTASection title="Inspect the method, not the marketing." body="Verification methodology, run references, and the blocked-release disclosure — all linked." />
    </MarketingLayout>
  );
}

export function PricingPage({ route }) {
  const plans = [
    { n: 'Solo Practitioner', p: '$99', per: '/ month', d: 'Independent patent attorneys & agents.', f: ['Grounded research queries with evidence trails', 'Prior-art & novelty scans (metered)', 'Citation + quote verification on every answer', 'OA analyzer with rejection breakdown', 'DOCX export for review drafts'] },
    { n: 'IP Boutique & Firm', p: '$299', per: '/ attorney / month', d: 'Collaborative patent & trademark practice.', f: ['Everything in Solo', 'Shared matter vaults + IP graph', 'Claim charts + FTO matrices', 'Playbooks versioned per workflow', 'Priority support'], hot: true },
    { n: 'Enterprise', p: 'Custom', per: 'annual', d: 'Corporate departments & large firms.', f: ['Everything in Boutique', 'Admin controls + audit exports', 'Matter migration + onboarding', 'Roadmap input; SSO/VPC as available', 'Dedicated support contact'] },
    { n: 'Education', p: 'Free', per: 'qualifying labs', d: 'Law schools, clinics, TTOs.', f: ['Classroom + clinic access', 'Benchmarks & provenance tools', 'Disclosure drafting sandboxes', 'Institutional onboarding'] },
  ];
  return (
    <MarketingLayout route={route} active="/pricing">
      <Hero eyebrow="Pricing" title="Pricing for modern IP practice." lede="Every plan includes exact-quote verification, citation-integrity gating, and matter-scoped work. No accuracy percentages sold as guarantees." primary={<button className="ent-btn ent-btn-primary" onClick={() => go('/enterprise')}>Request a Demo <ArrowRight /></button>} secondary={<button className="ent-btn ent-btn-ghost" onClick={() => go('/education')}>Education access</button>} />
      <Section>
        <div className="ent-grid3 ent-grid4">
          {plans.map((pl) => (
            <Reveal key={pl.n}>
              <div style={{ border: pl.hot ? '1px solid #5b5bf0' : '1px solid rgba(255,255,255,.1)', borderRadius: 12, padding: 26, background: '#101218', height: '100%' }}>
                {pl.hot && <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.1em', color: '#a5a6ff', marginBottom: 10 }}>MOST POPULAR</div>}
                <h3 style={{ margin: '0 0 6px', fontSize: 18 }}>{pl.n}</h3>
                <p style={{ fontSize: 12.5, color: '#8b91a1', margin: '0 0 14px' }}>{pl.d}</p>
                <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-.03em' }}>{pl.p} <span style={{ fontSize: 12, color: '#8b91a1', fontWeight: 500 }}>{pl.per}</span></div>
                <ul className="ent-bullets" style={{ marginTop: 18 }}>{pl.f.map((f) => <li key={f}><Check />{f}</li>)}</ul>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal><p style={{ fontSize: 12.5, color: '#8b91a1', marginTop: 20 }}>Compliance notes (SOC 2 / zero-retention / DPA) appear only when verified — see Security. Education: <button className="ent-textlink" onClick={() => go('/education')}>apply →</button></p></Reveal>
      </Section>
      <CTASection title="Start with a matter, not a slide deck." body="Bring an office action or a clearance candidate. We will work it — with evidence — in the demo." />
    </MarketingLayout>
  );
}
