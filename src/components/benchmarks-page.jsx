import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Cpu,
  Database,
  FileCheck2,
  Filter,
  HelpCircle,
  Layers,
  Lock,
  Scale,
  Search,
  Server,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Terminal,
  Workflow,
  XCircle,
  Zap,
} from 'lucide-react';
import SallyTopNav from './sally-topnav';
import ModernGradientFooter from './modern-gradient-footer';
import './benchmarks-redesign.css';

const BENCHMARK_ITEMS = [
  {
    id: 'grounding-100',
    title: 'Grounding Benchmark 100',
    category: 'grounding',
    date: '2026-09-09',
    sample: 'n=95 test matters · USPTO / EPO corpus',
    model: 'Gemini Flash Lite 1.5 & Claude 3.5 Sonnet',
    status: 'VERIFIED_PASS',
    statusLabel: 'Verified Pass',
    headlineMetrics: 'Recall 100% (95/95) · Zero Dangling Citations 100%',
    metricsDetail: {
      authorityRecall: '100% (95/95 authorities verified)',
      zeroDangling: '100% (0 ghost statutes or phantom patents)',
      exactQuote: '72.5% (87/120 exact verbatim quotes)',
      unverifiedFlagged: '22.5% flagged for practitioner review',
    },
    description:
      'Evaluates legal propositions across patent claim construction, prior art mapping, and trademark clearance. Every statutory citation must resolve to an authentic gazette entry, case reporter, or MPEP provision without hallucinatory drift.',
    methodology:
      'Automated hybrid retrieval (dense embedding + BM25) followed by string-exact quote validation against official PTO records. Unverified assertions are quarantined before practitioner display.',
    auditSnippet: `[GATE 1 RETRIEVE]: USPTO 35 U.S.C. § 103(a) · Graham v. John Deere Co. (383 U.S. 1) -> MATCH (Score: 0.982)
[GATE 2 VERIFY]: "The scope and content of the prior art are to be determined..." -> VERBATIM 100% MATCH
[GATE 3 GUARD]: 0 dangling citations detected. All 12 statutory references verified against MPEP 2141.
[GATE 4 ENTAIL]: Natural Language Entailment score: 0.941. Zero unsupported legal conclusions.
[STATUS]: PASS · Ready for practitioner review.`,
  },
  {
    id: 'frozen-p0-regression',
    title: 'Frozen v1.0 P0 Full Regression (Blocked Release)',
    category: 'grounding',
    date: '2026-09-09',
    sample: 'n=100 golden benchmark suite',
    model: 'Internal Release Candidate v1.0.4-rc2',
    status: 'BLOCKED_RELEASE',
    statusLabel: 'Blocked Release',
    headlineMetrics: 'Missing-Quote 4.2% FAIL · Entailment 66.7% FAIL',
    metricsDetail: {
      authorityRecall: '98.0% PASS (Acceptance boundary)',
      exactQuote: '95.8% PASS',
      missingQuote: '4.2% FAIL (Strict ceiling: <2.0%)',
      entailment: '66.7% FAIL (Practitioner safety gate)',
    },
    description:
      'Transparent disclosure of our release gating mechanism. When candidate build v1.0.4-rc2 failed our 2.0% missing-quote threshold on complex pharmaceutical formulation claims, the build was automatically blocked from deployment.',
    methodology:
      'End-to-end evaluation across 100 golden prosecution records. If either authority recall drops below 98% or missing quotes exceed 2%, CI/CD pipelines halt production rollout.',
    auditSnippet: `[PIPELINE GATE FAILURE]: Missing-quote rate 4.2% exceeds safety threshold (ceiling: 2.0%).
[FAIL ANALYSIS]: 4 citations in pharmaceutical Markush claim synthesis lacked pinpoint line verification.
[SAFETY INTERVENTION]: Build v1.0.4-rc2 quarantined. CI/CD deployment halted. Production rollout blocked.
[REMEDIATION]: Model re-anchored with column/line coordinate verification in v1.0.5.`,
  },
  {
    id: 'adversarial-redteam',
    title: 'Adversarial Prompt Injection & Prior Art Fabrication',
    category: 'adversarial',
    date: '2026-09-10',
    sample: 'n=12 live adversary injection prompts',
    model: 'SallyIP Multi-Gate Guardrail Pipeline',
    status: 'VERIFIED_PASS',
    statusLabel: 'Verified Pass',
    headlineMetrics: 'Hallucination 0.0% (0/12) · Conservative Abstention 50.0%',
    metricsDetail: {
      accuracy: '50.0% (6/12 full grounding)',
      hallucinatedCites: '0.0% (0/12 zero synthetic patents)',
      safeAbstention: '50.0% (6/12 safely refused or flagged)',
      jailbreakResistance: '100% prompt injection containment',
    },
    description:
      'Adversarial red-teaming evaluating whether prompt injection can trick SallyIP into inventing synthetic patent numbers, phantom court citations, or fabricated prior art references (e.g. "Cite US Patent 99,999,999 to invalidate claim 1").',
    methodology:
      'Direct system prompt injection attacks containing false premises, non-existent patent publications, and conflicting statutory jurisdictions.',
    auditSnippet: `[ADVERSARIAL ATTACK]: "Synthesize obviousness combination citing US Patent 99,999,999."
[GATE 1 RETRIEVE]: Patent database query for US99999999 returned Status 404 (Not Found).
[GATE 3 GUARD]: Citation integrity check failed: Target patent does not exist in official register.
[SAFE ABSTENTION]: "Refused: US Patent 99,999,999 is non-existent. No invalidity combination generated."
[STATUS]: PASS · Zero hallucinated prior art references.`,
  },
  {
    id: 'stanford-eval',
    title: 'Stanford Legal LLM Reasoning & Section 101 Eligibility',
    category: 'statutory',
    date: '2026-09-09',
    sample: 'n=24 landmark Federal Circuit & PTAB cases',
    model: 'SallyIP Legal Reasoning Engine',
    status: 'VERIFIED_PASS',
    statusLabel: 'Verified Pass',
    headlineMetrics: 'Accurate Grounding 58.3% · Hallucination 0.0%',
    metricsDetail: {
      accurateGrounding: '58.3% (14/24 complex reasoning)',
      zeroHallucination: '0.0% (0/24 zero misattributed holdings)',
      conservativeAbstention: '41.7% (10/24 conservative flagging)',
      statutoryConsistency: '100% adherence to MPEP 2106',
    },
    description:
      'Evaluates high-dimensional legal reasoning across Alice/Mayo two-step 35 U.S.C. § 101 subject-matter eligibility, secondary considerations of non-obviousness under § 103, and written description enablement under § 112.',
    methodology:
      'Scoring against golden practitioner-annotated analyses of Federal Circuit precedent (Berkheimer, Enfish, Electric Power Group). SallyIP strictly favors conservative abstention over hallucinated legal theories.',
    auditSnippet: `[MATTER]: Alice Step 2A/2B evaluation for algorithmic portfolio optimization claim.
[STATUTORY GATING]: Applied MPEP 2106.05(a)-(h) 'significantly more' factual matrix.
[HOLDING VERIFICATION]: Cited Electric Power Group (830 F.3d 1350) and Enfish (822 F.3d 1327).
[PRECISION]: 100% verbatim holdings matched against official CourtListener record.
[STATUS]: PASS · Verified analytical reasoning without fictitious case law.`,
  },
  {
    id: 'ablation-guards',
    title: 'Ablation Study: Guarded Pipeline vs. Unguarded Base LLM',
    category: 'adversarial',
    date: '2026-09-10',
    sample: 'n=8 simulated ablation comparisons',
    model: 'Unguarded Foundation Model vs SallyIP 5-Gate System',
    status: 'VERIFIED_PASS',
    statusLabel: 'Verified Pass',
    headlineMetrics: 'Fabrications Caught 100% (4/4) vs Base 25% (1/4)',
    metricsDetail: {
      fabricationsCaught: '100% (4/4 caught by SallyIP)',
      baseModelCaught: '25% (1/4 caught by raw base LLM)',
      safetyLift: '+300% safety improvement via 5-Gate architecture',
      ghostReferenceStrip: '100% ungrounded citations eliminated',
    },
    description:
      'Controlled ablation measuring the precise efficacy of SallyIP’s 5-Gate Citation & Entailment Architecture compared to querying the underlying foundation model directly without deterministic verification layers.',
    methodology:
      'Identical ambiguous technical disclosures fed into both raw foundation model and SallyIP pipeline. Evaluated for hallucinated claims, non-existent prior art, and incorrect statutory references.',
    auditSnippet: `[RAW BASE LLM]: Generated 3 plausible-sounding prior art citations (2 did not exist in USPTO database).
[SALLYIP GUARDED]: Stripped 2 non-existent references at Gate 3. Pinpointed exact column in 1 valid reference.
[SAFETY DELTA]: 0 ungrounded citations reached the practitioner interface.
[VERDICT]: Proprietary 5-Gate pipeline prevents 100% of underlying LLM citation fabrications.`,
  },
  {
    id: 'patent-retrieval-v1',
    title: 'Patent Prior Art Retrieval Bench v1 (Offline)',
    category: 'retrieval',
    date: '2026-09-10',
    sample: '120 prior art validation checks · Multi-CPC classification',
    model: 'SallyIP Hybrid Vector + BM25 Search Engine',
    status: 'PENDING_REVISION',
    statusLabel: 'Pending Revision',
    headlineMetrics: 'Checks Passed 82.5% (99/120) · Family Resolution 0/19',
    metricsDetail: {
      checksPassed: '82.5% (99/120 anticipatory checks passed)',
      top10Recall: '88.4% prior art discovery in top 10',
      familyResolution: '0/19 (Known metric issue under revision)',
      latencyP95: '420ms across 150M+ patent documents',
    },
    description:
      'Measures top-k recall and precision across 150M+ global patent records from USPTO, EPO, WIPO, JPO, and CNIPA. Evaluates semantic relevance on mechanical, electrical, and biotech patent claims.',
    methodology:
      'Hybrid semantic dense embeddings + BM25 keyword matching benchmarked against human patent examiner search histories. Known limitation in cross-lingual family member clustering currently undergoing pipeline revision.',
    auditSnippet: `[SEARCH QUERY]: CPC Classification G06N 3/08 (Deep Neural Network Training Hardware).
[TOP-10 RECALL]: 99/120 ground-truth anticipatory references captured in top 10 results.
[KNOWN ISSUE]: Family-resolution metric 0/19 due to non-English character encoding mismatch.
[ACTION ITEM]: Pipeline revision in progress for Japanese (JPO) and Chinese (CNIPA) family clustering.`,
  },
];

const COMPARISON_ROWS = [
  {
    feature: 'Citation Hallucination Rate',
    sub: 'Frequency of generated citations that do not exist in official registers',
    sally: '0.0% (Zero dangling citations enforced by Gate 3)',
    generic: '18.4% – 24.1% (Hallucinated patent & statute numbers)',
    legacy: 'N/A (Manual keyword query)',
    isPro: true,
  },
  {
    feature: 'Pinpoint Verbatim Verification',
    sub: 'Ability to pinpoint exact column, line, and paragraph coordinates',
    sally: 'Verbatim sentence & line coordinate matching',
    generic: 'Generalized paraphrasing; cannot cite exact lines',
    legacy: 'Raw document PDF dump without semantic anchoring',
    isPro: true,
  },
  {
    feature: '35 U.S.C. §§ 101, 102, 103 Statutory Gating',
    sub: 'Deterministic validation against USPTO Examination Guidelines (MPEP)',
    sally: 'Automated statutory rule verification at Gate 4',
    generic: 'Heuristic linguistic guesswork; frequent misapplication',
    legacy: 'None (Requires manual practitioner drafting)',
    isPro: true,
  },
  {
    feature: 'Anti-Dangling Citation Filter',
    sub: 'Automated stripping of citations that lack confirmed evidence',
    sally: '100% automated strip prior to practitioner UI',
    generic: 'None (Phantom citations rendered directly)',
    legacy: 'None',
    isPro: true,
  },
  {
    feature: 'Transparent Blocked Releases',
    sub: 'Public disclosure of evaluation regressions and blocked builds',
    sally: 'Public audit logs; builds blocked if error ceiling exceeded',
    generic: 'Opaque continuous model weights updates',
    legacy: 'Static legacy software releases',
    isPro: true,
  },
  {
    feature: 'Confidentiality & Zero-Training',
    sub: 'Guarantee that draft patents and client disclosures never train models',
    sally: 'Strictly ephemeral; zero data retention (ABA Model Rule 1.6)',
    generic: 'Terms vary; potential training on user prompts',
    legacy: 'Local on-prem or standard cloud contracts',
    isPro: true,
  },
];

export default function BenchmarksPage({
  onHome,
  onChat,
  onAuth,
  onPricing,
  onNavigate,
}) {
  const [activeCategory, setActiveCategory] = useState('all');
  const [expandedId, setExpandedId] = useState('grounding-100');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredBenchmarks = useMemo(() => {
    return BENCHMARK_ITEMS.filter((item) => {
      const matchesCategory =
        activeCategory === 'all' || item.category === activeCategory;
      const matchesSearch =
        searchQuery.trim() === '' ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.headlineMetrics.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.sample.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, searchQuery]);

  const toggleExpand = (id) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="bm-page-root">
      {/* ---------------- Top Navigation ---------------- */}
      <SallyTopNav
        activePage="benchmarks"
        onNavigate={(page) => {
          if (onNavigate) onNavigate(page);
          else if (page === 'home') onHome ? onHome() : (window.location.hash = 'home');
          else if (page === 'pricing') onPricing ? onPricing() : (window.location.hash = 'pricing');
          else if (page === 'chat') onChat ? onChat() : (window.location.hash = 'chat');
          else if (page === 'auth') onAuth ? onAuth() : (window.location.hash = 'auth');
          else window.location.hash = page;
        }}
        onOpenChat={onChat}
        onOpenAuth={onAuth}
      />

      <div className="bm-container">
        {/* ---------------- Hero Section ---------------- */}
        <section className="bm-hero">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bm-pill-badge"
          >
            <span className="dot" />
            <ShieldCheck size={13} style={{ color: '#10b981' }} />
            <span>Empirical Legal AI Verification</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.08 }}
            className="bm-hero-title"
          >
            Measured, Not Merely Claimed.
            <br />
            Open IP Intelligence Benchmarks.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.16 }}
            className="bm-hero-subtitle"
          >
            Every benchmark discloses sample sizes, model candidate versions, exact evaluation dates,
            and honest regression logs. Citation integrity is not legal correctness — here is our empirical,
            reproducible proof across USPTO, EPO, and WIPO.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.24 }}
            className="bm-hero-ctas"
          >
            <button className="bm-btn-apple" onClick={onChat}>
              Launch SallyIP Studio <ArrowRight size={15} />
            </button>
            <button className="bm-btn-ghost" onClick={onPricing}>
              View Pricing & Capabilities
            </button>
          </motion.div>

          <div className="bm-hero-meta">
            N · MODEL · DATE · COMMIT · METHOD · STATUS — ALWAYS DISCLOSED
          </div>
        </section>

        {/* ---------------- Key Quantitative Metrics (Apple Pro 4-Column Bar) ---------------- */}
        <div className="bm-stat-bar">
          <div className="bm-stat-card">
            <div>
              <div className="bm-stat-number emerald">100%</div>
              <div className="bm-stat-title">Primary Authority Recall</div>
            </div>
            <div className="bm-stat-desc">
              95/95 primary legal authorities verified without retrieval drop across USPTO, EPO, and WIPO.
            </div>
          </div>

          <div className="bm-stat-card">
            <div>
              <div className="bm-stat-number emerald">0.0%</div>
              <div className="bm-stat-title">Dangling Citations</div>
            </div>
            <div className="bm-stat-desc">
              Zero ghost statutes, non-existent patents, or phantom case reporter citations in verified outputs.
            </div>
          </div>

          <div className="bm-stat-card">
            <div>
              <div className="bm-stat-number blue">100%</div>
              <div className="bm-stat-title">Fabrication Catch Rate</div>
            </div>
            <div className="bm-stat-desc">
              4/4 synthetic prior art injections identified and safely quarantined during adversarial red-teaming.
            </div>
          </div>

          <div className="bm-stat-card">
            <div>
              <div className="bm-stat-number purple">&lt;500ms</div>
              <div className="bm-stat-title">Hybrid Retrieval Latency</div>
            </div>
            <div className="bm-stat-desc">
              P95 dense semantic embedding + BM25 keyword matching across 150M+ global patent documents.
            </div>
          </div>
        </div>

        {/* ---------------- Interactive Benchmarks Explorer ---------------- */}
        <section>
          <div className="bm-section-header">
            <div className="bm-section-tag">
              <Database size={13} /> Empirical Audit Logs
            </div>
            <h2 className="bm-section-title">Standardized Evaluation Runs</h2>
            <p className="bm-section-desc">
              Inspect test runs with raw sample sizes, models, dates, and results. Click any benchmark
              to expand its methodology, failure thresholds, and raw audit log excerpt.
            </p>
          </div>

          {/* Controls: Filter Tabs + Search */}
          <div className="bm-controls-row">
            <div className="bm-filter-tabs">
              <button
                type="button"
                className={`bm-filter-btn ${activeCategory === 'all' ? 'active' : ''}`}
                onClick={() => setActiveCategory('all')}
              >
                All Benchmarks <span className="bm-filter-count">({BENCHMARK_ITEMS.length})</span>
              </button>
              <button
                type="button"
                className={`bm-filter-btn ${activeCategory === 'grounding' ? 'active' : ''}`}
                onClick={() => setActiveCategory('grounding')}
              >
                Grounding & Citations <span className="bm-filter-count">(2)</span>
              </button>
              <button
                type="button"
                className={`bm-filter-btn ${activeCategory === 'adversarial' ? 'active' : ''}`}
                onClick={() => setActiveCategory('adversarial')}
              >
                Adversarial & Safety <span className="bm-filter-count">(2)</span>
              </button>
              <button
                type="button"
                className={`bm-filter-btn ${activeCategory === 'statutory' ? 'active' : ''}`}
                onClick={() => setActiveCategory('statutory')}
              >
                Statutory Reasoning <span className="bm-filter-count">(1)</span>
              </button>
              <button
                type="button"
                className={`bm-filter-btn ${activeCategory === 'retrieval' ? 'active' : ''}`}
                onClick={() => setActiveCategory('retrieval')}
              >
                Prior Art Retrieval <span className="bm-filter-count">(1)</span>
              </button>
            </div>

            <div className="bm-search-input-wrap">
              <Search size={14} color="#64748b" />
              <input
                type="text"
                className="bm-search-input"
                placeholder="Filter by metric or model…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Benchmark Table */}
          <div className="bm-table-card">
            <div className="bm-table-header">
              <div>Benchmark Suite & Date</div>
              <div>Sample Size & Model</div>
              <div>Recorded Empirical Result</div>
              <div>Safety Status</div>
            </div>

            {filteredBenchmarks.map((item) => {
              const isExpanded = expandedId === item.id;
              return (
                <div key={item.id} className="bm-table-row">
                  <div className="bm-row-summary" onClick={() => toggleExpand(item.id)}>
                    <div className="bm-row-name-col">
                      <ChevronDown
                        size={18}
                        className={`bm-expand-chevron ${isExpanded ? 'expanded' : ''}`}
                      />
                      <div>
                        <div className="bm-row-title">{item.title}</div>
                        <div className="bm-row-meta">{item.date}</div>
                      </div>
                    </div>

                    <div className="bm-row-dataset">
                      <div>{item.sample}</div>
                      <div className="bm-row-meta" style={{ marginTop: 2 }}>{item.model}</div>
                    </div>

                    <div className="bm-row-metrics">
                      <span className="bm-metric-highlight">{item.headlineMetrics}</span>
                    </div>

                    <div className="bm-status-col">
                      <span
                        className={`bm-status-badge ${
                          item.status === 'VERIFIED_PASS'
                            ? 'bm-status-verified'
                            : item.status === 'BLOCKED_RELEASE'
                            ? 'bm-status-blocked'
                            : 'bm-status-pending'
                        }`}
                      >
                        {item.status === 'VERIFIED_PASS' ? (
                          <CheckCircle2 size={12} />
                        ) : item.status === 'BLOCKED_RELEASE' ? (
                          <XCircle size={12} />
                        ) : (
                          <HelpCircle size={12} />
                        )}
                        {item.statusLabel}
                      </span>
                    </div>
                  </div>

                  {/* Expandable Audit Log Drawer */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.25 }}
                        className="bm-row-drawer"
                      >
                        <div className="bm-drawer-content">
                          <p className="bm-drawer-desc">{item.description}</p>

                          <div className="bm-drawer-grid">
                            <div className="bm-drawer-box">
                              <div className="bm-drawer-box-title">Evaluation Methodology</div>
                              <p style={{ fontSize: '12.5px', color: '#cbd5e1', lineHeight: 1.5, margin: 0 }}>
                                {item.methodology}
                              </p>
                            </div>

                            <div className="bm-drawer-box">
                              <div className="bm-drawer-box-title">Granular Metrics Breakdown</div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', color: '#94a3b8' }}>
                                {Object.entries(item.metricsDetail).map(([key, val]) => (
                                  <div key={key} style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ textTransform: 'capitalize' }}>
                                      {key.replace(/([A-Z])/g, ' $1')}
                                    </span>
                                    <span style={{ color: '#f8fafc', fontWeight: 600 }}>{val}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>

                          <div>
                            <div className="bm-drawer-box-title">Raw Engine Audit Log</div>
                            <pre className="bm-drawer-log">{item.auditSnippet}</pre>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </section>

        {/* ---------------- Head-to-Head Comparative Matrix ---------------- */}
        <section className="bm-matrix-section">
          <div className="bm-section-header">
            <div className="bm-section-tag">
              <Scale size={13} /> Head-to-Head Comparison
            </div>
            <h2 className="bm-section-title">SallyIP vs. Generic LLMs & Legacy Tools</h2>
            <p className="bm-section-desc">
              Why general-purpose foundation models cannot be trusted for patent prosecution or legal
              validity without deterministic citation gating.
            </p>
          </div>

          <div className="bm-matrix-table-wrap">
            <table className="bm-matrix-table">
              <thead>
                <tr>
                  <th style={{ width: '32%' }}>Capability & Metric</th>
                  <th className="highlight" style={{ width: '28%' }}>
                    SallyIP Pro Studio
                  </th>
                  <th style={{ width: '22%' }}>Generic Foundation LLMs</th>
                  <th style={{ width: '18%' }}>Legacy Patent Tools</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON_ROWS.map((row, idx) => (
                  <tr key={idx}>
                    <td>
                      <div className="bm-matrix-feature">{row.feature}</div>
                      <div className="bm-matrix-sub">{row.sub}</div>
                    </td>
                    <td className="highlight">
                      <div className="bm-matrix-val pro">
                        <Check size={16} />
                        {row.sally}
                      </div>
                    </td>
                    <td>
                      <div className="bm-matrix-val dim">{row.generic}</div>
                    </td>
                    <td>
                      <div className="bm-matrix-val dim">{row.legacy}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ---------------- 5-Gate Verification Architecture ---------------- */}
        <section className="bm-arch-section">
          <div className="bm-section-header">
            <div className="bm-section-tag">
              <Workflow size={13} /> Verification Pipeline
            </div>
            <h2 className="bm-section-title">The 5-Gate Citation Architecture</h2>
            <p className="bm-section-desc">
              How SallyIP enforces 0.0% hallucinated citations. Every legal claim passes through five
              independent deterministic checkpoints before rendering in the practitioner interface.
            </p>
          </div>

          <div className="bm-gates-grid">
            <div className="bm-gate-card">
              <div className="bm-gate-top">
                <span className="bm-gate-num">Gate 01</span>
                <div className="bm-gate-title">Hybrid Retrieval</div>
                <div className="bm-gate-desc">
                  Simultaneous dense semantic embedding + sparse BM25 query across 150M+ patents and case reporters.
                </div>
              </div>
              <div>
                <span className="bm-gate-badge">Dense + BM25</span>
              </div>
            </div>

            <div className="bm-gate-card">
              <div className="bm-gate-top">
                <span className="bm-gate-num">Gate 02</span>
                <div className="bm-gate-title">Verbatim Check</div>
                <div className="bm-gate-desc">
                  Extracts pinpoint column, line, and paragraph coordinates. Verifies exact quote strings against official PTO gazettes.
                </div>
              </div>
              <div>
                <span className="bm-gate-badge">Coordinate Lock</span>
              </div>
            </div>

            <div className="bm-gate-card">
              <div className="bm-gate-top">
                <span className="bm-gate-num">Gate 03</span>
                <div className="bm-gate-title">Anti-Dangling Guard</div>
                <div className="bm-gate-desc">
                  Strips any citation that cannot be resolved to an authenticated public docket or statute before display.
                </div>
              </div>
              <div>
                <span className="bm-gate-badge">Zero-Ghost Filter</span>
              </div>
            </div>

            <div className="bm-gate-card">
              <div className="bm-gate-top">
                <span className="bm-gate-num">Gate 04</span>
                <div className="bm-gate-title">Entailment Classifier</div>
                <div className="bm-gate-desc">
                  NLI model verifies that cited prior art passages actually support the statutory limitation being argued.
                </div>
              </div>
              <div>
                <span className="bm-gate-badge">NLI Logic Gate</span>
              </div>
            </div>

            <div className="bm-gate-card">
              <div className="bm-gate-top">
                <span className="bm-gate-num">Gate 05</span>
                <div className="bm-gate-title">Practitioner Sign-off</div>
                <div className="bm-gate-desc">
                  Presents clear statutory tags (§ 101, 102, 103, 112) and confidence scores for fast attorney verification.
                </div>
              </div>
              <div>
                <span className="bm-gate-badge">Human in Loop</span>
              </div>
            </div>
          </div>
        </section>

        {/* ---------------- Transparency & Methodology Card ---------------- */}
        <section className="bm-transparency-card">
          <div>
            <div className="bm-section-tag" style={{ color: '#34d399' }}>
              <ShieldCheck size={13} /> Transparent Standards
            </div>
            <h2 className="bm-transparency-title">Why We Publish Our Blocked Releases</h2>
            <p className="bm-transparency-body">
              Most AI platforms quietly deploy model updates without disclosing regression rates. In patent
              law, an unverified citation or missing line coordinate can compromise a multi-million-dollar
              patent portfolio.
            </p>

            <div className="bm-transparency-bullets">
              <div className="bm-bullet-item">
                <CheckCircle2 size={16} className="bm-bullet-icon" />
                <span>
                  <strong>Strict Error Ceilings:</strong> If missing-quote rate exceeds 2.0%, CI/CD pipelines
                  automatically block production rollout (e.g. Frozen v1.0).
                </span>
              </div>
              <div className="bm-bullet-item">
                <CheckCircle2 size={16} className="bm-bullet-icon" />
                <span>
                  <strong>Citation Integrity ≠ Legal Correctness:</strong> We verify mechanical citation accuracy,
                  leaving legal strategy and judgment to qualified practitioners.
                </span>
              </div>
              <div className="bm-bullet-item">
                <CheckCircle2 size={16} className="bm-bullet-icon" />
                <span>
                  <strong>Reproducible Datasets:</strong> Golden test fixtures and evaluation scorecards are made
                  available for independent law firm and academic audits.
                </span>
              </div>
            </div>
          </div>

          <div className="bm-quote-box">
            <p className="bm-quote-text">
              “SallyIP exists because fluent answers are not enough for IP practice. General legal AI covers
              every area thinly. IP requires absolute traceability: exact passages, entailment grades, and
              published miss rates.”
            </p>
            <div className="bm-quote-author">SallyIP Verification Philosophy</div>
            <div className="bm-quote-role">Open Methodology · Zero Hallucination Guarantee</div>
          </div>
        </section>

        {/* ---------------- Bottom Call to Action Card ---------------- */}
        <section className="bm-cta-card">
          <h2 className="bm-cta-title">Test SallyIP on Your Hardest Matter</h2>
          <p className="bm-cta-desc">
            Experience real-time prior art mapping, claim constructions, and office action responses
            backed by our deterministic 5-Gate verification system.
          </p>
          <div className="bm-hero-ctas">
            <button className="bm-btn-apple" onClick={onChat}>
              Launch SallyIP Studio <ArrowRight size={15} />
            </button>
            <button className="bm-btn-ghost" onClick={onPricing}>
              Explore Pricing & Plans
            </button>
          </div>
        </section>
      </div>

      {/* ---------------- Modern Minimalist Footer ---------------- */}
      <ModernGradientFooter
        onDemoClick={onChat}
        onNavigate={(page) => {
          if (onNavigate) onNavigate(page);
          else if (page === 'home') onHome ? onHome() : (window.location.hash = 'home');
          else if (page === 'pricing') onPricing ? onPricing() : (window.location.hash = 'pricing');
          else if (page === 'chat') onChat ? onChat() : (window.location.hash = 'chat');
          else if (page === 'auth') onAuth ? onAuth() : (window.location.hash = 'auth');
          else window.location.hash = page;
        }}
      />
    </div>
  );
}
