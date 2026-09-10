import React, { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import MarketingLayout from '../MarketingLayout';
import { Hero, Section, Split, Reveal, Eyebrow, CTASection, Breadcrumbs, go } from '../ui';
import { ProductShot, VerifiedPanel } from '../shots';
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
  { k: 'MATTER WORKSPACE', t: 'Every matter, all its context, in one place.', b: 'Sources, vault passages, IP graph, playbooks and audit trails scoped to the matter — never bleeding across clients.', bullets: ['Matter-scoped vault and IP graph', 'Playbooks versioned per workflow', 'Full audit trail per action'], visual: 'panel-matter' },
  { k: 'VERIFICATION DESK', t: 'Review what the model actually relied on.', b: 'Each proposition shows its source, exact passage, and entailment grade. Missing quotes are rejected at attach time.', bullets: ['Proposition → source → passage', 'Exact + fuzzy quote states', 'Fail-closed: unverified never passes silently'], visual: 'panel-verify' },
  { k: 'NOVELTY SEARCH', t: 'Novelty mapped feature-by-feature to art.', b: 'Invention features compared against retrieved references with stated gaps — not a score, a mapping.', bullets: ['Feature-to-limitation matrices', 'Official sources: EPO, USPTO', 'Honest unavailable-provider reporting'], visual: 'shot-actions' },
  { k: 'OFFICE ACTION RESPONSE', t: 'Rejections answered with cited authority.', b: 'Parses §101/102/103/112 rejections, drafts amendments, and audits claim support before anything leaves the desk.', bullets: ['Rejection breakdown per statute', 'Amendment drafting + QA audit', 'MPEP-grounded reasoning'], visual: 'shot-drafting-focus' },
  { k: 'TRADEMARK INTELLIGENCE', t: 'Clearance work with a paper trail.', b: 'Candidates, variants, goods terms and language coverage tracked through review states — research support, never an opinion.', bullets: ['Variant + goods-term review', 'Intelligence-to-clearance sync', 'Every review audit-logged'], visual: 'panel-tm' },
  { k: 'CONTRACTS + LITIGATION', t: 'Contracts reviewed. Evidence ordered.', b: 'Clause-level risk flags for contracts; chronologies and evidence maps for disputes — all matter-scoped.', bullets: ['Template variables validated', 'Risk flags: uncapped liability et al.', 'Evidence chronologies with sources'], visual: 'panel-contracts' },
];

const PANELS = {
  'panel-matter': { eyebrow: 'MATTER / GENERAL MATTER · VAULT · WORKSPACES', rows: [
    ['[S1] VAULT · §§101–103 PACK', 'Matter passage retrieved first — generation gated on evidence.', 'VERIFIED'],
    ['[S2] PLAYBOOK v3 · OA-RESPONSE', 'Run pinned to playbook version; variables substituted per matter.', 'VERIFIED'],
    ['[S3] AUDIT · EXPORT', 'Security event written with redacted metadata; revocation on next check.', 'QUALIFIED'],
  ]},
  'panel-verify': { eyebrow: 'VERIFICATION DESK · 3 PROPOSITIONS · 1 QUALIFIED', rows: [
    ['P1 · CITATION GATE', '“Withholds generation where no passage exceeds threshold.”', 'VERIFIED · exact'],
    ['P2 · LEDGER BINDING', 'Replay disclosed; binding of log hash to citations not shown.', 'QUALIFIED · partial'],
    ['P3 · ZERO-RESULT RULE', 'No passage above threshold — refused, never asserted.', 'RESEARCH REQUIRED'],
  ]},
  'panel-tm': { eyebrow: 'CLEARANCE · RESEARCH SUPPORT — NEVER AN OPINION', rows: [
    ['SALLY IP LABS · Cl.42', 'Appearance, sound and commercial impression converge — counsel review.', 'QUALIFIED'],
    ['SALIIP · Cl.9 PHONETIC', 'Phonetic risk flagged; channels-of-trade overlap under review.', 'QUALIFIED'],
    ['MONITORING', 'Watch + portfolio intelligence — in development, not claimed as shipped.', 'PLANNED'],
  ]},
  'panel-contracts': { eyebrow: 'CONTRACT REVIEW · CLAUSE 7.2', rows: [
    ['§7.2 LIABILITY CAP', 'Uncapped liability language flagged for counsel review.', 'FLAGGED · review'],
    ['SURVIVAL + SCOPE', 'Survival, scope and residual-knowledge terms extracted to review table.', 'VERIFIED'],
    ['VERSION + EXPORT', 'Versioned draft with redlines; export after review — never auto-final.', 'QUALIFIED'],
  ]},
};

function ShowcaseVisual({ id }) {
  if (id === 'shot-actions') return <ProductShot id="chat-actions-focus" />;
  if (id === 'shot-drafting-focus') return <ProductShot id="patent-drafting-focus" />;
  const p = PANELS[id];
  return <VerifiedPanel eyebrow={p.eyebrow} rows={p.rows} />;
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
      <div className="ent-wrap"><Reveal><ProductShot id="chat-home" eager /></Reveal></div>

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
        <Reveal><Eyebrow>Product experience</Eyebrow><h2 className="ent-h2">Real workflows.<br />Real evidence.</h2><p className="ent-sub">Actual SallyIP workspace captures where they exist; workspace-pattern panels with DEMO DATA where no capture exists in-repo — never faked screenshots.</p></Reveal>
        {SHOWCASES.map((sc, i) => (
          <Split key={sc.k} kicker={sc.k} title={sc.t} body={sc.b} bullets={sc.bullets}
            cta={<button className="ent-textlink" onClick={() => go('/product')}>Explore {sc.k.toLowerCase()} →</button>}
            flip={i % 2 === 1}
            visual={<ShowcaseVisual id={sc.visual} />} />
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
