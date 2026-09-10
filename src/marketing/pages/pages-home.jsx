import React, { useState } from 'react';
import { ArrowRight, Check } from 'lucide-react';
import MarketingLayout from '../MarketingLayout';
import { Hero, Section, Split, Shot, Reveal, Eyebrow, CTASection, Breadcrumbs, go } from '../ui';
import { NoveltyDemo, ClaimChartDemo, VerificationDemo } from '../demos';

const STAGES = [
  { id: 'Discover', d: 'Invention disclosures ingested, structured, and screened before drafting starts.', w: 'Invention interview + disclosure structuring' },
  { id: 'Research', d: 'Prior art with limitation-by-limitation claim mapping to retrieved passages.', w: 'Prior-art search · novelty · inventive step' },
  { id: 'Draft', d: 'US provisional/nonprovisional drafting with §101 screening and §112 support checks.', w: 'Patent drafting studio' },
  { id: 'Prosecute', d: 'Rejection parsing (§101/102/103/112), amendments, and claim-QA audit.', w: 'Office-action response' },
  { id: 'Clear', d: 'Trademark candidate screening with review states and audit-logged decisions.', w: 'Trademark clearance & intelligence' },
  { id: 'Verify', d: 'Exact-quote verification, citation-integrity guard, entailment grading.', w: 'Verification desk' },
  { id: 'Enforce', d: 'Chronologies, evidence mapping, and claim charts for litigation support.', w: 'Litigation evidence workspace' },
];

const SHOWCASES = [
  { k: 'MATTER WORKSPACE', t: 'Every matter, all its context, in one place.', b: 'Sources, vault passages, IP graph, playbooks and audit trails scoped to the matter — never bleeding across clients.', bullets: ['Matter-scoped vault and IP graph', 'Playbooks versioned per workflow', 'Full audit trail per action'], label: 'MATTER / ACME-2026-014 · VAULT · 18,420 PASSAGES' },
  { k: 'VERIFICATION DESK', t: 'Review what the model actually relied on.', b: 'Each proposition shows its source, exact passage, and entailment grade. Missing quotes are rejected at attach time.', bullets: ['Proposition → source → passage', 'Exact + fuzzy quote states', 'Fail-closed: unverified never passes silently'], label: 'VERIFICATION DESK · 3 PROPOSITIONS · 1 QUALIFIED' },
  { k: 'NOVELTY SEARCH', t: 'Novelty mapped feature-by-feature to art.', b: 'Invention features compared against retrieved references with stated gaps — not a score, a mapping.', bullets: ['Feature-to-limitation matrices', 'Official sources: EPO, USPTO', 'Honest unavailable-provider reporting'], label: 'NOVELTY / LEDGER-CONSENSUS · 3 REFERENCES' },
  { k: 'OFFICE ACTION RESPONSE', t: 'Rejections answered with cited authority.', b: 'Parses §101/102/103/112 rejections, drafts amendments, and audits claim support before anything leaves the desk.', bullets: ['Rejection breakdown per statute', 'Amendment drafting + QA audit', 'MPEP-grounded reasoning'], label: 'OA / NON-FINAL §103 · 4 STEPS' },
  { k: 'TRADEMARK INTELLIGENCE', t: 'Clearance work with a paper trail.', b: 'Candidates, variants, goods terms and language coverage tracked through review states — research support, never an opinion.', bullets: ['Variant + goods-term review', 'Intelligence-to-clearance sync', 'Every review audit-logged'], label: 'CLEARANCE / SALLYIP · 3 CANDIDATES' },
  { k: 'CONTRACTS + LITIGATION', t: 'Contracts reviewed. Evidence ordered.', b: 'Clause-level risk flags for contracts; chronologies and evidence maps for disputes — all matter-scoped.', bullets: ['Template variables validated', 'Risk flags: uncapped liability et al.', 'Evidence chronologies with sources'], label: 'CONTRACTS · LITIGATION EVIDENCE' },
];

function FakeShot({ label, lines }) {
  return (
    <Shot label={label}>
      <div style={{ display: 'grid', gap: 10 }}>
        {lines.map((l, i) => (
          <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', fontSize: 13.5, color: i === 0 ? '#fff' : '#b8bdc9' }}>
            <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#5d6372' }}>{String(i + 1).padStart(2, '0')}</span>
            <span style={{ lineHeight: 1.6 }}>{l}</span>
          </div>
        ))}
        <div style={{ marginTop: 6, fontSize: 11.5, fontFamily: 'monospace', color: '#3fb97f' }}>✓ 2 exact-quote verified · 1 qualified — nothing asserted without evidence</div>
      </div>
    </Shot>
  );
}

export default function HomePage({ route }) {
  const [stage, setStage] = useState(1);
  const s = STAGES[stage];
  return (
    <MarketingLayout route={route} active="/">
      <Hero
        eyebrow="Verification-first IP intelligence"
        title={<>IP intelligence,<br />from creation to<br /><em>enforcement.</em></>}
        lede="SallyIP is a verification-first AI workspace for intellectual property professionals, bringing research, drafting, analysis, evidence and matter context into one connected platform."
        primary={<button className="ent-btn ent-btn-primary" onClick={() => go('/product')}>Explore SallyIP <ArrowRight /></button>}
        secondary={<button className="ent-btn ent-btn-ghost" onClick={() => go('/enterprise')}>Request a Demo</button>}
        meta="EVIDENCE FIRST · EXACT-QUOTE VERIFIED · PRACTITIONER REVIEW REQUIRED"
      />

      {/* 2 trust */}
      <Section tight>
        <Reveal><p style={{ fontSize: 20, letterSpacing: '-.02em', margin: '0 0 18px' }}>Built for intellectual property work. <span style={{ color: '#8b91a1' }}>Not adapted to it.</span></p></Reveal>
        <Reveal>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', fontSize: 13, color: '#b8bdc9' }}>
            {['Patents — shipped workflows', 'Trademarks — shipped workflows', 'Copyright — guidance & research', 'Designs — educational coverage', 'Trade Secrets — guidance + NDA review', 'Enforcement — chronologies & charts'].map((t) => (
              <span key={t} style={{ border: '1px solid rgba(255,255,255,.1)', borderRadius: 99, padding: '8px 14px' }}>{t}</span>
            ))}
          </div>
          <p style={{ fontSize: 12.5, color: '#5d6372', marginTop: 14 }}>Shipped capabilities vs guidance coverage vs developing monitoring — scope stated plainly on every area page.</p>
        </Reveal>
      </Section>

      {/* 3 one platform journey */}
      <Section>
        <Reveal><Eyebrow>One platform</Eyebrow><h2 className="ent-h2">One workspace.<br />Every stage of IP work.</h2></Reveal>
        <Reveal>
          <div className="ent-journey" role="tablist">
            {STAGES.map((st, i) => <button key={st.id} className={stage === i ? 'active' : ''} onClick={() => setStage(i)}>{st.id}</button>)}
          </div>
          <div className="ent-journey-panel">
            <div className="ent-kicker">{s.id} · {s.w}</div>
            <p style={{ fontSize: 18, margin: '0 0 10px', maxWidth: '60ch', lineHeight: 1.6 }}>{s.d}</p>
            <button className="ent-textlink" onClick={() => go('/product')}>See the workflow →</button>
          </div>
        </Reveal>
      </Section>

      {/* 4 product experience */}
      <Section>
        <Reveal><Eyebrow>Product experience</Eyebrow><h2 className="ent-h2">Real workflows.<br />Real evidence.</h2><p className="ent-sub">Screenshots are restrained compositions of actual SallyIP workspaces — chat, matter, verification, claim charts, research.</p></Reveal>
        {SHOWCASES.map((sc, i) => (
          <Split key={sc.k} kicker={sc.k} title={sc.t} body={sc.b} bullets={sc.bullets}
            cta={<button className="ent-textlink" onClick={() => go('/product')}>Explore {sc.k.toLowerCase()} →</button>}
            flip={i % 2 === 1}
            visual={<FakeShot label={sc.label} lines={['Matter vault passage [S3] retrieved first — generation gated on evidence.', '“writes each round decision to an append-only log, wherein verifiers replay…”', 'Entailment: partial — replay disclosed; binding to citations not shown.']} />} />
        ))}
        <Reveal>
          <div style={{ marginTop: 8 }}><NoveltyDemo /></div>
          <div style={{ marginTop: 20 }}><ClaimChartDemo /></div>
        </Reveal>
      </Section>

      {/* 5 verification */}
      <Section>
        <Reveal><Eyebrow>Why SallyIP</Eyebrow><h2 className="ent-h2">Don’t just generate.<br /><em>Verify.</em></h2><p className="ent-sub">Five gates stand between a question and an answer. <b style={{ color: '#fff' }}>No evidence, no assertion.</b></p></Reveal>
        <Reveal>
          <div className="ent-chain">
            {[['Question', 'Matter-scoped, jurisdiction-aware. Ambiguity is clarified before retrieval.'], ['Authority', 'Hybrid lexical + vector retrieval with relevance thresholds. <code>Zero results is valid.</code>'], ['Evidence', 'Exact-quote verification of every cited passage — exact, fuzzy, or missing, recorded per quote.'], ['Reasoning', 'Entailment grading per proposition: entails · partial · context · contradicts · does not support.'], ['Verified output', 'VERIFIED / QUALIFIED / RESEARCH REQUIRED. Dangling labels removed; misses flagged, never silently passed.']].map((r) => (
              <div className="ent-chain-row" key={r[0]}><b>{r[0]}</b><p dangerouslySetInnerHTML={{ __html: r[1] }} /></div>
            ))}
          </div>
        </Reveal>
        <Reveal><VerificationDemo /><p style={{ fontSize: 12.5, color: '#8b91a1' }}>Citation integrity is not legal correctness: a real citation can still support a wrong conclusion — which is why entailment checks and practitioner review exist.</p></Reveal>
      </Section>

      {/* 6 areas */}
      <Section>
        <Reveal><Eyebrow>Coverage</Eyebrow><h2 className="ent-h2">Six areas. Honest scope.</h2></Reveal>
        <Reveal>
          <div className="ent-areas">
            {[['Patents', 'Prior art, novelty, FTO, drafting, office actions, families.', '/patents'], ['Trademarks', 'Clearance, intelligence, similarity review.', '/trademarks'], ['Copyright', 'Guidance & research support. No clearance workflow.', '/copyright'], ['Design rights', 'Educational coverage. Workflow in development.', '/design-rights'], ['Trade secrets', 'Guidance + NDA review tooling.', '/trade-secrets'], ['Litigation & enforcement', 'Chronologies, evidence maps, claim charts.', '/ip-intelligence']].map((a) => (
              <a key={a[0]} className="ent-area" href={a[2]} onClick={(e) => { e.preventDefault(); go(a[2]); }}><h3>{a[0]}</h3><p>{a[1]}</p><span>Open →</span></a>
            ))}
          </div>
        </Reveal>
      </Section>

      {/* 7 benchmarks */}
      <Section>
        <Reveal><Eyebrow>Evidence</Eyebrow><h2 className="ent-h2">Measured, not merely claimed.</h2><p className="ent-sub">Grounding bench 100: 100% authority recall (95/95) · 100% zero dangling citations · 72.5% exact-quote verification (87/120) — gemini-flash-lite-latest, 2026-09-09. Frozen P0 full run disclosed as BLOCKED: entailment 66.7% FAIL, unsupported-proposition 81.0% FAIL. Legal correctness requires practitioner grading (pending).</p></Reveal>
        <Reveal><button className="ent-btn ent-btn-ghost" onClick={() => go('/benchmarks')}>Open benchmarks <ArrowRight /></button></Reveal>
      </Section>

      {/* 8 enterprise */}
      <Section>
        <Reveal><Eyebrow>Enterprise</Eyebrow><h2 className="ent-h2">Built for confidential work.</h2><p className="ent-sub">Matter isolation by user-scoped access, role-based mutations (viewer / researcher / admin / owner), login throttling, redacted audit logging. What isn’t implemented isn’t claimed — see Security for the exact control list.</p></Reveal>
        <Reveal><div style={{ display: 'flex', gap: 12 }}><button className="ent-btn ent-btn-primary" onClick={() => go('/enterprise')}>Explore Enterprise <ArrowRight /></button><button className="ent-btn ent-btn-ghost" onClick={() => go('/security')}>Security controls</button></div></Reveal>
      </Section>

      <CTASection title={<>Built for the people shaping<br />the world’s intellectual property.</>} body="Research, drafting, prosecution, clearance and enforcement — verified against evidence, scoped to the matter, ready for practitioner review." />
      <div className="ent-wrap" style={{ paddingBottom: 40 }}><Breadcrumbs trail={[]} /></div>
    </MarketingLayout>
  );
}
