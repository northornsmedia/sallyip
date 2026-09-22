import React, { useState } from 'react';

// All demo content is synthetic and labelled DEMO DATA. No client matters.
export function NoveltyDemo() {
  const [q, setQ] = useState('Distributed ledger consensus with verifiable inference logs');
  const [sel, setSel] = useState(0);
  const refs = [
    { id: 'US9,842,110', title: 'Consensus protocol with audit trail', passage: '…a consensus module that writes each round decision to an append-only log, wherein verifiers replay …', state: 'Partial — log replay disclosed; verifiable inference not shown' },
    { id: 'EP3,421,908', title: 'Grounded inference pipeline', passage: '…an inference pipeline that cites the retrieved passage for each generated proposition and refuses when …', state: 'Supports novelty gap — citation-gated generation not combined with consensus' },
    { id: 'US11,203,554', title: 'Retrieval-gated answering', passage: '…withholding answer output where no passage exceeds the relevance threshold (zero results valid) …', state: 'Context — thresholding disclosed, no ledger binding' },
  ];
  return (
    <div className="ent-demo">
      <ol className="ent-demo-tabs" aria-label="Demo progress">
        <li aria-current="step">1 · Query</li><li>2 · Results</li><li>3 · Claim mapping</li>
      </ol>
      <div className="ent-demo-body">
        <div>
          <label htmlFor="novelty-q" style={{ fontSize: 12, color: '#8b91a1', marginBottom: 8, display: 'block' }}>INVENTION QUERY (DEMO DATA)</label>
          <input id="novelty-q" type="text" autoComplete="off" value={q} onChange={(e) => setQ(e.target.value)} style={{ width: '100%', background: '#0a0b0f', border: '1px solid rgba(255,255,255,.12)', borderRadius: 8, color: '#fff', padding: '12px 14px', fontSize: 14 }} />
          <div style={{ marginTop: 14 }} role="listbox" aria-label="Reference passages (demo data)">
            {refs.map((r, i) => (
              <button key={r.id} type="button" role="option" aria-selected={sel === i} className={`ent-claim ${sel === i ? 'active' : ''}`} onClick={() => setSel(i)}>
                <b>{r.id}</b> — {r.title}
              </button>
            ))}
          </div>
        </div>
        <div className="ent-evidence">
          <div style={{ fontSize: 11, letterSpacing: '.1em', color: '#5d6372', marginBottom: 8 }}>EVIDENCE PASSAGE → MAPPING</div>
          <p style={{ margin: '0 0 10px' }}><mark>{refs[sel].passage}</mark></p>
          <p style={{ margin: 0, fontSize: 13 }}><b style={{ color: '#fff' }}>{refs[sel].state}</b></p>
          <p style={{ fontSize: 12, color: '#8b91a1' }}>Query: “{q.slice(0, 80)}” · hybrid lexical + vector retrieval, thresholded; zero results is valid.</p>
        </div>
      </div>
      <div className="ent-demo-note">DEMO DATA — synthetic passages for illustration. Production results link to retrieved matter vault passages with exact-quote states.</div>
    </div>
  );
}

export function ClaimChartDemo() {
  const [sel, setSel] = useState(0);
  const rows = [
    { lim: '[1a] a consensus module writing round decisions to an append-only log', ev: 'US9,842,110 col.4: “writes each round decision to an append-only log, wherein verifiers replay…”', v: 'VERIFIED · exact quote' },
    { lim: '[1b] a citation gate withholding output absent supporting passages', ev: 'EP3,421,908 ¶42: “withholds generation where no retrieved passage exceeds threshold…”', v: 'VERIFIED · exact quote' },
    { lim: '[1c] binding the log hash to each cited proposition', ev: 'No passage retrieved above threshold — marked RESEARCH REQUIRED, never asserted.', v: 'RESEARCH REQUIRED' },
  ];
  return (
    <div className="ent-demo">
      <ol className="ent-demo-tabs" aria-label="Demo progress">
        <li aria-current="step">Select limitation</li><li>Evidence</li><li>Verification</li>
      </ol>
      <div className="ent-demo-body">
        <div role="listbox" aria-label="Claim limitations (demo data)">{rows.map((r, i) => <button key={i} type="button" role="option" aria-selected={sel === i} className={`ent-claim ${sel === i ? 'active' : ''}`} onClick={() => setSel(i)}>{r.lim}</button>)}</div>
        <div className="ent-evidence"><p style={{ margin: '0 0 10px' }}><mark>{rows[sel].ev}</mark></p><p style={{ margin: 0 }}><b style={{ color: '#fff' }}>{rows[sel].v}</b></p></div>
      </div>
      <div className="ent-demo-note">DEMO DATA — select a limitation to highlight its evidence passage and verification state.</div>
    </div>
  );
}

export function OfficeActionDemo() {
  const [step, setStep] = useState(0);
  const steps = [
    { t: 'Rejection', b: 'Examiner rejects claim 1 under 35 U.S.C. §103 over US9,842,110 in view of EP3,421,908. (DEMO DATA)' },
    { t: 'Authority', b: 'Retrieved: US9,842,110 col.4; EP3,421,908 ¶42; MPEP §2141 rationale requirements.' },
    { t: 'Argument', b: 'No motivation to combine: ledger replay teaches away from inference gating; missing limitation [1c] unaddressed.' },
    { t: 'Amendment', b: 'Proposed: add “binding the log hash to each cited proposition” with §112 support pointer; QA audit flags antecedent basis.' },
  ];
  return (
    <div className="ent-demo">
      <div className="ent-demo-tabs" role="group" aria-label="Office action steps">{steps.map((s, i) => <button key={i} type="button" aria-pressed={step === i} className={step === i ? 'active' : ''} onClick={() => setStep(i)}>{i + 1} · {s.t}</button>)}</div>
      <div style={{ padding: 26 }}>
        <div className="ent-evidence" role="status" aria-live="polite">{steps[step].b}</div>
        <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
          <button type="button" className="ent-btn ent-btn-ghost ent-btn-sm" disabled={step === 0} onClick={() => setStep(step - 1)}>Back</button>
          <button type="button" className="ent-btn ent-btn-primary ent-btn-sm" disabled={step === steps.length - 1} onClick={() => setStep(step + 1)}>Next</button>
        </div>
      </div>
      <div className="ent-demo-note">DEMO DATA — rejection → authority → argument → amendment walkthrough.</div>
    </div>
  );
}

export function TrademarkDemo() {
  const [sel, setSel] = useState(0);
  const cands = [
    { mark: 'SALLYIP', goods: 'Cl. 9 / 42 — identical', risk: 'Knockout — identical mark, overlapping goods. Counsel review required.' },
    { mark: 'SALLY IP LABS', goods: 'Cl. 42 — highly similar', risk: 'High similarity: appearance, sound, commercial impression converge.' },
    { mark: 'SALIIP', goods: 'Cl. 9 — phonetic variant', risk: 'Phonetic risk flagged; channels-of-trade overlap under review.' },
  ];
  return (
    <div className="ent-demo">
      <ol className="ent-demo-tabs" aria-label="Demo progress">
        <li aria-current="step">Mark</li><li>Candidates</li><li>Evidence</li>
      </ol>
      <div className="ent-demo-body">
        <div role="listbox" aria-label="Trademark candidates (demo data)">{cands.map((c, i) => <button key={i} type="button" role="option" aria-selected={sel === i} className={`ent-claim ${sel === i ? 'active' : ''}`} onClick={() => setSel(i)}><b>{c.mark}</b> · {c.goods}</button>)}</div>
        <div className="ent-evidence">{cands[sel].risk} <br /><span style={{ fontSize: 12, color: '#8b91a1' }}>Research support only — never a clearance opinion. EUIPO/USPTO sources feed evidence; decisions are audit-logged.</span></div>
      </div>
      <div className="ent-demo-note">DEMO DATA — synthetic candidates for illustration.</div>
    </div>
  );
}

export function VerificationDemo() {
  const [sel, setSel] = useState(0);
  const props = [
    { p: 'SallyIP removes citations that point nowhere before display.', s: 'Source [S3] vault passage v12 · exact quote verified word-for-word.', v: 'VERIFIED' },
    { p: 'A real citation can still support a wrong conclusion.', s: 'Entailment graded “does not support” despite intact citation — flagged, not passed.', v: 'QUALIFIED' },
    { p: 'Missing evidence means the answer is qualified or refused.', s: 'Zero passages above threshold — RESEARCH REQUIRED, no assertion made.', v: 'RESEARCH REQUIRED' },
  ];
  return (
    <div className="ent-demo">
      <ol className="ent-demo-tabs" aria-label="Demo progress">
        <li aria-current="step">Proposition</li><li>Source</li><li>Verdict</li>
      </ol>
      <div className="ent-demo-body">
        <div role="listbox" aria-label="Verification propositions (demo data)">{props.map((r, i) => <button key={i} type="button" role="option" aria-selected={sel === i} className={`ent-claim ${sel === i ? 'active' : ''}`} onClick={() => setSel(i)}>{r.p}</button>)}</div>
        <div className="ent-evidence"><p style={{ margin: '0 0 10px' }}>{props[sel].s}</p><p style={{ margin: 0 }}><b style={{ color: '#fff' }}>{props[sel].v}</b> · No evidence, no assertion.</p></div>
      </div>
      <div className="ent-demo-note">DEMO DATA — proposition → source → exact passage → verdict.</div>
    </div>
  );
}
