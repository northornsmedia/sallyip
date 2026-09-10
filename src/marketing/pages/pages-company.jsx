import React from 'react';
import MarketingLayout from '../MarketingLayout';
import { Hero, Section, Reveal, Eyebrow, CTASection, go } from '../ui';

const COPY = {
  '/resources': { e: 'Resources', b: ['Every hub, guide, benchmark, comparison and definition — nothing more than two clicks away.', 'Hubs: IP AI, patents, trademarks, copyright, design rights, trade secrets.', 'Research: benchmarks, verification methodology, machine-readable latest.json.', 'Comparisons and glossary linked throughout.'], links: [['Patents', '/patents'], ['Benchmarks', '/benchmarks'], ['Documentation', '/documentation']] },
  '/about': { e: 'About', b: ['SallyIP exists because fluent answers are not enough for IP practice.', 'General legal AI covers every area thinly. IP needs traceability: exact passages, entailment grades, published miss rates.', 'Operating rule: no evidence, no assertion. Research tools, not legal advice.'], links: [['Security', '/security'], ['Benchmarks', '/benchmarks'], ['Careers', '/careers']] },
  '/whats-new': { e: 'Changelog', b: ['September 2026: versioned legal playbooks with matter-scoped runs and audit logging.', 'Contract drafting/review: 7 seed templates, clause risk flags, versioning, export.', 'Citation ledger + answer guard; vault review tables; USPTO + CourtListener providers; RBAC + login throttling; eval harness + flywheel exports; Word add-in task pane.'], links: [['Roadmap', '/roadmap'], ['Documentation', '/documentation'], ['Modules', '/modules']] },
  '/modules': { e: 'Modules', b: ['RESEARCH: prior art, novelty, inventive step, FTO, families, prosecution history.', 'CREATE: drafting with §101/§112 screens, claims, OA response, contracts/playbooks.', 'PROTECT: clearance, intelligence, portfolio (developing). VERIFY: desk, evidence mapping, citation checks, charts. ENFORCE: litigation evidence, chronologies.'], links: [['Novelty search', '/novelty-search'], ['Claim charts', '/claim-charts'], ['Office action defense', '/office-action-defense']] },
  '/developer-api': { e: 'Developer API', b: ['Serverless endpoints: matters, playbooks, contracts, citations, vault reviews, eval runs, plus domain workspaces (novelty, FTO, clearance, OA, families).', 'Auth via session cookies; role-gated mutations (researcher+). Rate and size limits enforced; oversized payloads rejected.', 'Start in docs; run the grounding probe; export flywheel JSONL for evaluation.'], links: [['Documentation', '/documentation'], ['System audits', '/system-audits'], ['Enterprise', '/enterprise']] },
  '/documentation': { e: 'Documentation', b: ['Matters: create, scope vault sources, attach IP graph entities, run playbooks against matter context.', 'Verification: read VERIFIED / QUALIFIED / RESEARCH REQUIRED; inspect quote states; never ship qualified text as verified.', 'Ingestion: PDF-first, rights confirmation required, files never executed; embeddings stored per workspace.'], links: [['Help center', '/help'], ['Verification logs', '/verification-logs'], ['Developer API', '/developer-api']] },
  '/help': { e: 'Help center', b: ['Accounts: signup/login, session lifetime, what to do after repeated failures (throttling).', 'Uploads: PDF up to stated limit; searchable vs scanned handling; validation errors explained.', 'Exports: DOCX/specification, chart CSV, audit JSON — all from verified content only.'], links: [['Documentation', '/documentation'], ['Community', '/community'], ['Enterprise support', '/enterprise-support']] },
  '/community': { e: 'Community', b: ['Researchers and university labs sharing frozen datasets, ablation fixtures, and evaluation practice.', 'IP teams contributing playbooks and benchmark reproductions — private by default, shared by choice.', 'Monthly eval snapshots keep methods current; corrections welcome.'], links: [['Benchmarks', '/benchmarks'], ['Education', '/education'], ['Newsletter', '/newsletter']] },
  '/enterprise-support': { e: 'Enterprise support', b: ['Onboarding: matter inventory, vault migration, role mapping, playbook porting.', 'Training: verification-desk review, OA workflow, clearance review states for your counsel.', 'Operations: audit exports, provider-status review, roadmap briefings.'], links: [['Enterprise', '/enterprise'], ['Trust center', '/trust'], ['Help center', '/help']] },
  '/verification-logs': { e: 'Verification', b: ['Five gates: hybrid retrieval → exact-quote check → citation-integrity guard → entailment grade → answer mode.', 'Missing quotes rejected at attach; dangling labels stripped before display; zero results is valid.', 'Citation integrity ≠ legal correctness — entailment + practitioner review close the gap.'], links: [['Benchmarks', '/benchmarks'], ['System audits', '/system-audits'], ['Novelty search', '/novelty-search']] },
  '/system-audits': { e: 'Audits', b: ['Recorded: security events (auth, throttling, runs, reviews), workflow runs with playbook version, verification events, citation ledger rows.', 'Redacted: content-bearing fields replaced; long strings truncated; IP + user-agent retained for abuse review.', 'Exportable for matter review; failures observable via fallback sink.'], links: [['Security', '/security'], ['Verification logs', '/verification-logs'], ['Trust center', '/trust']] },
  '/lifecycle-guide': { e: 'Lifecycle guide', b: ['Discover: disclosures structured early; novelty screened before drafting.', 'Research → Draft → Prosecute → Clear → Verify → Enforce: each stage names its SallyIP workflow and its evidence.', 'Handoffs carry matter context — no re-uploading, no lost provenance.'], links: [['Product', '/product'], ['Patents', '/patents'], ['Trademarks', '/trademarks']] },
  '/roadmap': { e: 'Roadmap', b: ['Now: patent + trademark workspaces, contracts, playbooks, citation ledger, vault reviews, 4 official providers, RBAC, eval harness.', 'Next: trademark monitoring + portfolio intelligence (in development); retrieval metric revision for family resolution.', 'Planned: SSO/VPC options, customer-managed keys, regional hosting — stated as planned until shipped.'], links: [["What's new", '/whats-new'], ['Enterprise', '/enterprise'], ['Newsletter', '/newsletter']] },
  '/education': { e: 'Education', b: ['Free qualifying access for law schools, clinics, and TTOs: research, drafting sandboxes, provenance tools.', 'Benchmarks and methods open for coursework; frozen datasets reproducible locally.', 'Apply with institutional email; onboarding per cohort.'], links: [['Community', '/community'], ['Benchmarks', '/benchmarks'], ['Pricing', '/pricing']] },
  '/newsletter': { e: 'Newsletter', b: ['Monthly: eval snapshot with numbers (including failures), methodology notes, product releases.', 'No spam, no “AI magic” — rarely more than once a month, unsubscribe anytime.', 'Past snapshots referenced from Benchmarks and Resources.'], links: [['Benchmarks', '/benchmarks'], ["What's new", '/whats-new'], ['Roadmap', '/roadmap']] },
  '/performance': { e: 'Performance', b: ['Marketing split from app bundle: lazy-loaded workspaces, minimal public JS, no animation frameworks on public pages.', 'Images lazy, media deferred, reveals via IntersectionObserver at 60fps; reduced-motion respected.', 'Measured: public JS bundle, LCP, CLS, INP risk, HTML size — before/after in the redesign report.'], links: [['Trust center', '/trust'], ['Documentation', '/documentation']] },
  '/careers': { e: 'Careers', b: ['We hire people who check citations: engineers, IP specialists, evaluation scientists, designers.', 'Work: verification systems, retrieval quality, honest benchmarks, calm enterprise UX.', 'Write with evidence of yours; practitioner backgrounds welcome.'], links: [['About', '/about'], ['Partners', '/partners'], ['Education', '/education']] },
  '/partners': { e: 'Partners', b: ['Universities: shared benchmarks and provenance research.', 'Boutiques: design partners shaping OA and clearance workflows.', 'Enterprise: governed pilots with audit exports and written scope.'], links: [['Enterprise', '/enterprise'], ['Community', '/community'], ['Trust center', '/trust']] },
  '/trust': { e: 'Trust center', b: ['Claimed only if implemented: auth, isolation, RBAC, throttling, redacted audit logs, honest provider status.', 'Not claimed: SOC 2, ISO, HIPAA, DPA zero-retention, regional hosting — until verified with artifact + date.', 'Contact: security disclosures via enterprise support channel; corrections published.'], links: [['Security', '/security'], ['System audits', '/system-audits'], ['Benchmarks', '/benchmarks']] },
};

export function GenericPage({ route }) {
  const c = COPY[route.path] || { e: 'SallyIP', b: [route.description], links: [['Product', '/product']] };
  return (
    <MarketingLayout route={route} active={route.path}>
      <Hero eyebrow={c.e} title={route.h1} lede={route.description} primary={<button className="ent-btn ent-btn-primary" onClick={() => go('/product')}>Explore SallyIP →</button>} secondary={<button className="ent-btn ent-btn-ghost" onClick={() => go('/enterprise')}>Request a Demo</button>} />
      <Section>
        {c.b.map((p, i) => <Reveal key={i}><p className="ent-sub" style={{ marginBottom: 16 }}>{p}</p></Reveal>)}
        <Reveal>
          <div style={{ marginTop: 12, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {c.links.map((l) => <button key={l[1]} className="ent-textlink" onClick={() => go(l[1])}>{l[0]} →</button>)}
          </div>
        </Reveal>
      </Section>
      <CTASection title="See it on your work." body="A short demo on your matter type — with sources shown, gaps admitted." />
    </MarketingLayout>
  );
}

export function ResourcesPage({ route }) {
  return <GenericPage route={route} />;
}
export function AboutPage({ route }) {
  return <GenericPage route={route} />;
}
