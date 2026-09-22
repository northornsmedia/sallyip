import React from 'react';
import MarketingLayout from '../MarketingLayout';
import { Hero, Section, Reveal, Eyebrow, CTASection, Shot, go } from '../ui';
import { NoveltyDemo, ClaimChartDemo, OfficeActionDemo, TrademarkDemo, VerificationDemo } from '../demos';
import { ProductShot } from '../shots';

function AreaShell({ route, eyebrow, scope, shipped, guidance, developing, children, links }) {
  return (
    <MarketingLayout route={route} active={route.path}>
      <Hero eyebrow={eyebrow} title={route.h1} lede={route.description} primary={<button className="ent-btn ent-btn-primary" onClick={() => go('/product')}>Explore SallyIP →</button>} secondary={<button className="ent-btn ent-btn-ghost" onClick={() => go('/benchmarks')}>See evidence</button>} meta={scope} />
      <Section>
        <Reveal>
          <div style={{ border: '1px solid rgba(255,255,255,.1)', borderRadius: 12, padding: 22, fontSize: 14, lineHeight: 1.65, color: '#b8bdc9' }}>
            <b style={{ color: '#fff' }}>Scope, stated plainly.</b><br />
            {shipped && <span><b style={{ color: '#7fe0ab' }}>Shipped:</b> {shipped}<br /></span>}
            {guidance && <span><b style={{ color: '#ecd08a' }}>Guidance & research support:</b> {guidance}<br /></span>}
            {developing && <span><b style={{ color: '#a5a6ff' }}>Developing:</b> {developing}</span>}
          </div>
        </Reveal>
        {children}
        <Reveal>
          <div style={{ marginTop: 28, display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 14 }}>
            {(links || []).map((l) => <button key={l[1]} className="ent-textlink" onClick={() => go(l[1])}>{l[0]} →</button>)}
          </div>
        </Reveal>
      </Section>
      <CTASection title="Work it with evidence." body="Practitioner review required. Nothing here is filing-ready output." />
    </MarketingLayout>
  );
}

export function IpHubPage({ route }) {
  return (
    <MarketingLayout route={route} active="/ip-intelligence">
      <Hero eyebrow="IP intelligence" title={<>Built for intellectual<br />property work.<br />Not adapted to it.</>} lede="Shipped patent and trademark workflows. Honest guidance coverage for copyright, designs and trade secrets. Developing monitoring stated as developing." primary={<button className="ent-btn ent-btn-primary" onClick={() => go('/patents')}>Start with patents →</button>} secondary={<button className="ent-btn ent-btn-ghost" onClick={() => go('/trademarks')}>Trademarks</button>} />
      <Section>
        <Reveal>
          <div className="ent-areas">
            {[['Patents', 'Research, drafting, prosecution — shipped.', '/patents'], ['Trademarks', 'Clearance + intelligence — shipped.', '/trademarks'], ['Copyright', 'Guidance & research — no clearance workflow.', '/copyright'], ['Design rights', 'Educational coverage — workflow planned.', '/design-rights'], ['Trade secrets', 'Guidance + NDA review tooling.', '/trade-secrets'], ['Enforcement', 'Chronologies, charts, verification.', '/ip-intelligence']].map((a) => (
              <a key={a[0]} className="ent-area" href={a[2]} onClick={(e) => { e.preventDefault(); go(a[2]); }}><h3>{a[0]}</h3><p>{a[1]}</p><span>Open →</span></a>
            ))}
          </div>
        </Reveal>
      </Section>
      <CTASection title="One workspace across all six." body="Matter context carries from disclosure through enforcement — with scope honesty at every step." />
    </MarketingLayout>
  );
}

export function PatentsPage({ route }) {
  return (
    <AreaShell route={route} eyebrow="Patents" scope="SHIPPED WORKFLOWS · EPO / USPTO INTEGRATED · PRACTITIONER REVIEW REQUIRED"
      shipped="prior-art search with claim mapping; novelty + inventive step; FTO matrices; US drafting with §101/§112 screens; OA response with QA; claim charts; families; prosecution timelines."
      links={[['Novelty search', '/novelty-search'], ['Claim charts', '/claim-charts'], ['Office action defense', '/office-action-defense'], ['All modules', '/modules']]}>
      <Reveal><div style={{ marginTop: 28 }}><NoveltyDemo /></div></Reveal>
      <Reveal><ProductShot id="patent-drafting" /></Reveal>
      <Reveal><div style={{ marginTop: 20 }}><OfficeActionDemo /></div></Reveal>
      <Reveal><p className="ent-sub" style={{ marginTop: 24 }}>Official sources reported honestly: when EPO/USPTO/CourtListener is unavailable, the product says so instead of simulating results. Every run persisted with audit trail.</p></Reveal>
    </AreaShell>
  );
}

export function TrademarksPage({ route }) {
  return (
    <AreaShell route={route} eyebrow="Trademarks" scope="SHIPPED: CLEARANCE + INTELLIGENCE · RESEARCH SUPPORT, NEVER AN OPINION"
      shipped="candidate screening with review states; variant + goods/services analysis with language coverage; similarity review; intelligence-to-clearance sync, all audit-logged."
      developing="trademark monitoring and portfolio intelligence."
      links={[['Office action defense', '/office-action-defense'], ['Verification logs', '/verification-logs'], ['Solutions', '/solutions']]}>
      <Reveal><ProductShot id="chat-actions-focus" /></Reveal>
      <Reveal><div style={{ marginTop: 20 }}><TrademarkDemo /></div></Reveal>
      <Reveal><div style={{ marginTop: 24 }}><h2 className="ent-h2" style={{ fontSize: 22 }}>The clearance process, step by step</h2><ol style={{ color: '#b8bdc9', lineHeight: 1.75, fontSize: 14.5 }}><li><b style={{ color: '#fff' }}>Knockout</b> — identical marks, identical goods; fast elimination.</li><li><b style={{ color: '#fff' }}>Similarity expansion</b> — phonetic, visual, conceptual variants across classes.</li><li><b style={{ color: '#fff' }}>Factor analysis</b> — similarity, relatedness, channels, strength, and jurisdiction factors.</li><li><b style={{ color: '#fff' }}>Risk judgment</b> — counsel decides; SallyIP records evidence + decision.</li></ol></div></Reveal>
    </AreaShell>
  );
}

export function CopyrightPage({ route }) {
  return (
    <AreaShell route={route} eyebrow="Copyright" scope="GUIDANCE & RESEARCH SUPPORT · NO AUTOMATED CLEARANCE"
      guidance="ownership/authorship, infringement-factor structure, licensing anatomy, AI-copyright issues — via evidence-grounded answers, vault review support, and playbook checklists."
      links={[['IP intelligence', '/ip-intelligence'], ['Documentation', '/documentation']]}>
      <Reveal><div style={{ marginTop: 24 }}><Shot label="GUIDANCE SESSION · COPYRIGHT OWNERSHIP"><p style={{ fontSize: 14, color: '#b8bdc9', lineHeight: 1.7, margin: 0 }}>Ask evidence-grounded questions; upload documents for review support. Every answer shows sources — or states evidence is insufficient. Practitioner review required; fact- and jurisdiction-specific.</p></Shot></div></Reveal>
    </AreaShell>
  );
}

export function DesignRightsPage({ route }) {
  return (
    <AreaShell route={route} eyebrow="Design rights" scope="EDUCATIONAL COVERAGE · DEDICATED WORKFLOW IN DEVELOPMENT"
      guidance="registered vs unregistered protection, novelty/individual character, scope and remedies overview, portfolio interaction."
      developing="dedicated design production workflow."
      links={[['Patents', '/patents'], ['Trademarks', '/trademarks']]}>
      <Reveal><p className="ent-sub" style={{ marginTop: 24 }}>Use SallyIP today for evidence-grounded research and document review support. Get notified via the newsletter when the workflow ships.</p></Reveal>
    </AreaShell>
  );
}

export function TradeSecretsPage({ route }) {
  return (
    <AreaShell route={route} eyebrow="Trade secrets" scope="GUIDANCE + SHIPPED NDA REVIEW TOOLING"
      shipped="NDA/contract drafting and review with clause splitting and risk flags (e.g., uncapped liability)."
      guidance="reasonable measures, confidentiality terms, misappropriation-response structure. No automated misappropriation determination."
      links={[['Copyright', '/copyright'], ['Developer API', '/developer-api']]}>
      <Reveal><div style={{ marginTop: 24 }}><Shot label="NDA REVIEW · RISK FLAGS"><p style={{ fontSize: 14, color: '#b8bdc9', lineHeight: 1.7, margin: 0 }}>Clause 7.2 — <mark style={{ background: 'rgba(224,101,95,.3)', color: '#fff' }}>uncapped liability</mark> flagged for review. Survival, scope, and residual-knowledge terms extracted to review table.</p></Shot></div></Reveal>
    </AreaShell>
  );
}

export function NoveltyPage({ route }) {
  return (
    <MarketingLayout route={route} active="/product">
      <Hero eyebrow="Novelty search" title="Novelty, mapped to evidence." lede="Invention features compared limitation-by-limitation against retrieved passages — with verification states, not a score." primary={<button className="ent-btn ent-btn-primary" onClick={() => go('/claim-charts')}>Next: claim charts →</button>} secondary={<button className="ent-btn ent-btn-ghost" onClick={() => go('/product')}>All modules</button>} meta="INTERACTIVE DEMO BELOW · DEMO DATA LABELLED" />
      <Section>
        <Reveal><Eyebrow>1 · Problem</Eyebrow><p className="ent-sub">Keyword search misses scope; fluent summaries hide gaps. Counsel needs to see which feature is disclosed where — and which gap is real.</p></Reveal>
        <Reveal><Eyebrow>2 · How SallyIP handles it</Eyebrow><p className="ent-sub">Hybrid retrieval → feature extraction → limitation matrices → exact-quote verification → QUALIFIED where evidence is thin.</p></Reveal>
        <Reveal><NoveltyDemo /></Reveal>
        <Reveal><div style={{ marginTop: 20 }}><VerificationDemo /></div></Reveal>
        <Reveal><p className="ent-sub" style={{ marginTop: 20 }}>Outputs: mapping matrix, per-feature verdicts, exportable report. Related: <button className="ent-textlink" onClick={() => go('/claim-charts')}>claim charts →</button> · <button className="ent-textlink" onClick={() => go('/office-action-defense')}>office actions →</button> · <button className="ent-textlink" onClick={() => go('/security')}>security →</button></p></Reveal>
      </Section>
      <CTASection title="Map your disclosure against the art." body="Bring claims or features. We will show the mapping — gaps included." />
    </MarketingLayout>
  );
}

export function ClaimChartsPage({ route }) {
  return (
    <MarketingLayout route={route} active="/product">
      <Hero eyebrow="Claim charts" title="Every limitation earns its evidence." lede="Element-by-element charts where each row links to the exact passage behind it — verified, qualified, or marked research-required." primary={<button className="ent-btn ent-btn-primary" onClick={() => go('/office-action-defense')}>Next: office actions →</button>} secondary={<button className="ent-btn ent-btn-ghost" onClick={() => go('/novelty-search')}>Novelty search</button>} />
      <Section>
        <Reveal><ClaimChartDemo /></Reveal>
        <Reveal><p className="ent-sub" style={{ marginTop: 20 }}>Steps: import claims → retrieve → map → verify → review. Missing quotes rejected at attach time; dangling labels stripped before display. Outputs feed FTO, invalidity, and litigation evidence workspaces.</p></Reveal>
      </Section>
      <CTASection title="Chart a claim against real passages." body="Select a limitation. Inspect the passage. Trust the verdict — or see exactly why it is qualified." />
    </MarketingLayout>
  );
}

export function OfficeActionPage({ route }) {
  return (
    <MarketingLayout route={route} active="/product">
      <Hero eyebrow="Office action defense" title="Answer rejections with authority." lede="§101/102/103/112 rejection parsing, amendment drafting, and claim-QA audit — every argument pinned to authority." primary={<button className="ent-btn ent-btn-primary" onClick={() => go('/claim-charts')}>See claim charts →</button>} secondary={<button className="ent-btn ent-btn-ghost" onClick={() => go('/novelty-search')}>Novelty search</button>} />
      <Section>
        <Reveal><OfficeActionDemo /></Reveal>
        <Reveal><p className="ent-sub" style={{ marginTop: 20 }}>Verification: cited rejections checked against retrieved office-action text; case-law quotes exact-verified; amendments carry §112 support pointers and antecedent-basis QA. Practitioner review required — drafts are starting points.</p></Reveal>
      </Section>
      <CTASection title="Bring a non-final rejection." body="We will parse it live and draft the response skeleton — with receipts." />
    </MarketingLayout>
  );
}
