// Single source of truth for enterprise marketing routes.
// Used by SPA router AND static prerender generator. Keep honest — no invented certs.
export const SITE_URL = 'https://sallyip.com';

export const NAV = [
  {
    label: 'Product', path: '/product',
    menu: [
      { h: 'Workspace', links: [
        { t: 'Product overview', d: 'One workspace for IP work', to: '/product' },
        { t: 'Matter workspace', d: 'Matters, vault, context', to: '/modules' },
        { t: 'All modules', d: 'Research → enforce', to: '/modules' },
      ]},
      { h: 'Research', links: [
        { t: 'Prior art', d: 'Limitation-level mapping', to: '/novelty-search' },
        { t: 'Novelty search', d: 'Interactive claim mapping', to: '/novelty-search' },
        { t: 'Claim charts', d: 'Evidence-linked charts', to: '/claim-charts' },
      ]},
      { h: 'Drafting & prosecution', links: [
        { t: 'Office action defense', d: 'Rejection → argument', to: '/office-action-defense' },
        { t: 'Developer API', d: 'Build on SallyIP', to: '/developer-api' },
        { t: "What's new", d: 'Latest releases', to: '/whats-new' },
      ]},
      { h: 'Verify & enforce', links: [
        { t: 'Verification logs', d: 'How answers are gated', to: '/verification-logs' },
        { t: 'Benchmarks', d: 'Measured, failures shown', to: '/benchmarks' },
        { t: 'Enterprise', d: 'Confidential deployment', to: '/enterprise' },
      ]},
    ],
  },
  {
    label: 'Solutions', path: '/solutions',
    menu: [
      { h: 'By team', links: [
        { t: 'Law firms', d: 'Boutiques & Am Law', to: '/solutions' },
        { t: 'In-house IP', d: 'Portfolio & risk', to: '/solutions' },
        { t: 'Litigation teams', d: 'Evidence chronologies', to: '/solutions' },
      ]},
      { h: 'By role', links: [
        { t: 'Patent attorneys', d: 'Drafting & prosecution', to: '/solutions' },
        { t: 'Trademark professionals', d: 'Clearance & intelligence', to: '/trademarks' },
        { t: 'R&D / innovation', d: 'Disclosure to filing', to: '/solutions' },
      ]},
      { h: 'Education', links: [
        { t: 'Universities', d: 'Clinics & TTOs', to: '/education' },
        { t: 'Education program', d: 'Free qualifying access', to: '/education' },
      ]},
    ],
  },
  {
    label: 'IP Intelligence', path: '/ip-intelligence',
    menu: [
      { h: 'Coverage', links: [
        { t: 'Patents', d: 'Research → prosecution', to: '/patents' },
        { t: 'Trademarks', d: 'Clearance & intelligence', to: '/trademarks' },
        { t: 'Copyright', d: 'Guidance & research', to: '/copyright' },
      ]},
      { h: 'More', links: [
        { t: 'Design rights', d: 'Educational coverage', to: '/design-rights' },
        { t: 'Trade secrets', d: 'Guidance + NDA review', to: '/trade-secrets' },
        { t: 'IP intelligence hub', d: 'All areas', to: '/ip-intelligence' },
      ]},
    ],
  },
  { label: 'Benchmarks', path: '/benchmarks' },
  {
    label: 'Resources', path: '/resources',
    menu: [
      { h: 'Learn', links: [
        { t: 'Documentation', d: 'How to use SallyIP', to: '/documentation' },
        { t: 'Lifecycle guide', d: 'Creation → enforcement', to: '/lifecycle-guide' },
        { t: 'Help center', d: 'Answers & support', to: '/help' },
      ]},
      { h: 'Proof', links: [
        { t: 'Benchmarks', d: 'Open measurements', to: '/benchmarks' },
        { t: 'Verification logs', d: 'How gating works', to: '/verification-logs' },
        { t: 'System audits', d: 'What is logged', to: '/system-audits' },
      ]},
      { h: 'Company', links: [
        { t: "What's new", d: 'Changelog', to: '/whats-new' },
        { t: 'Roadmap', d: 'Now / next / planned', to: '/roadmap' },
        { t: 'Newsletter', d: 'Monthly, rarely more', to: '/newsletter' },
      ]},
    ],
  },
  { label: 'Enterprise', path: '/enterprise' },
];

// Every marketing route. title/description/h1 must be unique. body is static HTML for prerender.
export const ROUTES = [
  { path: '/', title: 'SallyIP — IP intelligence, from creation to enforcement', description: 'SallyIP is a verification-first AI workspace for IP professionals — research, drafting, analysis, evidence and matter context in one connected platform. No evidence, no assertion.', h1: 'IP intelligence, from creation to enforcement.', kind: 'home' },
  { path: '/product', title: 'One intelligent workspace for IP — SallyIP Product', description: 'Prior art, novelty, FTO, drafting, office actions, trademarks, verification and litigation evidence in one matter-scoped workspace.', h1: 'One intelligent workspace for IP.', kind: 'product' },
  { path: '/solutions', title: 'Solutions for IP teams — Law firms, in-house, R&D — SallyIP', description: 'How law firms, in-house IP teams, patent attorneys, trademark professionals, litigators, R&D and universities use SallyIP.', h1: 'Built around how IP work actually happens.', kind: 'solutions' },
  { path: '/ip-intelligence', title: 'IP intelligence across patents, trademarks, copyright and more — SallyIP', description: 'Shipped patent and trademark workflows, honest guidance coverage for copyright, designs and trade secrets, and developing monitoring.', h1: 'Built for intellectual property work. Not adapted to it.', kind: 'ip-hub' },
  { path: '/patents', title: 'Patent AI: research, drafting & prosecution — SallyIP', description: 'Prior-art search, novelty, FTO, US drafting with 101/112 screens, office-action response — every conclusion traceable to evidence.', h1: 'Patent work, verified end to end.', kind: 'patents' },
  { path: '/trademarks', title: 'Trademark clearance & intelligence — SallyIP', description: 'Candidate screening, confusion-factor analysis and review trails as research support for practitioner clearance judgment.', h1: 'Trademark clearance with receipts.', kind: 'trademarks' },
  { path: '/copyright', title: 'Copyright research & risk guide — SallyIP', description: 'Ownership, infringement factors, licensing and AI-copyright issues: guidance and research support, honestly scoped.', h1: 'Copyright research, honestly scoped.', kind: 'copyright' },
  { path: '/design-rights', title: 'Design rights protection & enforcement guide — SallyIP', description: 'Registered and unregistered design protection, scope and enforcement: educational coverage and research support.', h1: 'Design rights, plainly explained.', kind: 'design-rights' },
  { path: '/trade-secrets', title: 'Trade secret protection & misappropriation guide — SallyIP', description: 'Reasonable measures, NDAs and misappropriation response. Guidance plus shipped NDA and contract review tooling.', h1: 'Protecting confidential information.', kind: 'trade-secrets' },
  { path: '/benchmarks', title: 'SallyIP benchmarks: measured, failures shown', description: 'Open benchmark results with sample sizes, models, dates and blocked releases. Mechanical rates published, legal correctness pending practitioner grading.', h1: 'Measured, not merely claimed.', kind: 'benchmarks' },
  { path: '/security', title: 'Security for confidential IP work — SallyIP', description: 'Implemented controls only: authentication, matter isolation, role-based access, audit logging, provider policy, data handling. No invented certifications.', h1: 'Built for confidential work.', kind: 'security' },
  { path: '/enterprise', title: 'Enterprise AI for IP teams — SallyIP', description: 'Matter-based access, organisation knowledge, auditability, admin controls, integrations and governance for serious IP practice.', h1: 'Enterprise AI for IP teams.', kind: 'enterprise' },
  { path: '/pricing', title: 'Pricing for modern IP practice — SallyIP', description: 'Solo, boutique, enterprise and education plans. Every plan includes citation verification and matter-scoped work.', h1: 'Pricing for modern IP practice.', kind: 'pricing' },
  { path: '/resources', title: 'Resources: guides, benchmarks, glossary — SallyIP', description: 'Every public SallyIP page in one place: hubs, guides, benchmarks, comparisons and glossary.', h1: 'All resources, one page.', kind: 'generic' },
  { path: '/about', title: 'About SallyIP — verification-first IP intelligence', description: 'Why SallyIP exists: fluent answers are not enough for IP practice. Evidence, provenance and published miss rates.', h1: 'Progress without provenance isn’t progress.', kind: 'generic' },
  // product detail
  { path: '/novelty-search', title: 'Novelty search with claim mapping — SallyIP', description: 'Interactive novelty analysis: invention features mapped limitation-by-limitation to retrieved passages, with verification states.', h1: 'Novelty, mapped to evidence.', kind: 'detail-novelty' },
  { path: '/claim-charts', title: 'Claim charts linked to evidence — SallyIP', description: 'Element-by-element claim charts where each limitation links to the exact passage that supports or undermines it.', h1: 'Every limitation earns its evidence.', kind: 'detail-claims' },
  { path: '/office-action-defense', title: 'Office action response with grounding — SallyIP', description: 'Rejection parsing for 101/102/103/112, amendment drafting and claim-QA audit — all traceable to authority.', h1: 'Answer rejections with authority.', kind: 'detail-oa' },
  { path: '/whats-new', title: "What's new in SallyIP — changelog", description: 'Playbooks, contract review, citation ledger, vault reviews, official-search expansion, RBAC and eval harness — shipped September 2026.', h1: "What's new.", kind: 'generic' },
  { path: '/modules', title: 'All SallyIP modules — research to enforcement', description: 'Prior art, novelty, inventive step, FTO, drafting, office actions, families, trademarks, verification, litigation and contracts.', h1: 'Every stage of IP work.', kind: 'generic' },
  { path: '/developer-api', title: 'Developer API for IP workflows — SallyIP', description: 'Serverless endpoints for matters, playbooks, contracts, citations, vault reviews and eval runs. Docs and rate limits.', h1: 'Build on verified IP primitives.', kind: 'generic' },
  { path: '/documentation', title: 'SallyIP documentation — how to work verified', description: 'Matters, vault ingestion, verification desk, playbooks, contracts and official search — how each workflow operates.', h1: 'Documentation.', kind: 'generic' },
  { path: '/help', title: 'Help center — SallyIP', description: 'Accounts, matters, uploads, verification states, exports and troubleshooting.', h1: 'Help center.', kind: 'generic' },
  { path: '/community', title: 'Community — SallyIP', description: 'Researchers, university labs and IP teams sharing benchmarks, playbooks and evaluation practice.', h1: 'A responsible contribution loop.', kind: 'generic' },
  { path: '/enterprise-support', title: 'Enterprise support — SallyIP', description: 'Onboarding, matter migration, admin training and practitioner review workflows for firms and departments.', h1: 'Support for serious practice.', kind: 'generic' },
  { path: '/verification-logs', title: 'Verification logs: how answers are gated — SallyIP', description: 'Exact-quote verification, citation-integrity guard, entailment grading and VERIFIED / QUALIFIED / RESEARCH REQUIRED modes.', h1: "Don't just generate. Verify.", kind: 'generic' },
  { path: '/system-audits', title: 'System audits & audit trails — SallyIP', description: 'Security events, workflow runs, verification events and citation ledgers: what is recorded and what is redacted.', h1: 'Every consequential action leaves a trail.', kind: 'generic' },
  { path: '/lifecycle-guide', title: 'IP lifecycle guide: creation to enforcement — SallyIP', description: 'Discover, research, draft, prosecute, clear, verify, enforce — what happens at each stage and which SallyIP workflow fits.', h1: 'One workspace. Every stage of IP work.', kind: 'generic' },
  { path: '/lifecycle', title: 'IP lifecycle: creation to enforcement — SallyIP', description: 'Discover, research, draft, prosecute, clear, verify, enforce — what happens at each stage and which SallyIP workflow fits.', h1: 'One workspace. Every stage of IP work.', kind: 'generic' },
  { path: '/roadmap', title: 'Roadmap: now, next, planned — SallyIP', description: 'Shipped workflows, in-development monitoring and portfolio intelligence, and planned capabilities stated without hype.', h1: 'Where SallyIP is going.', kind: 'generic' },
  { path: '/education', title: 'SallyIP for education — universities & clinics', description: 'Free qualifying access for law schools, clinical programs and university TTOs, plus benchmarks and provenance tools.', h1: 'Free for qualifying education.', kind: 'generic' },
  { path: '/newsletter', title: 'SallyIP newsletter — monthly research notes', description: 'Eval snapshots, methodology notes and product releases. Rarely more than once a month.', h1: 'Notes worth opening.', kind: 'generic' },
  { path: '/performance', title: 'Performance: fast by construction — SallyIP', description: 'Minimal public JS, code-split marketing, lazy media and honest measurement of LCP, CLS and bundle size.', h1: 'Fast is a feature.', kind: 'generic' },
  { path: '/careers', title: 'Careers at SallyIP', description: 'Build verification-first AI for the people shaping the world’s intellectual property.', h1: 'Do work that holds up.', kind: 'generic' },
  { path: '/partners', title: 'Partners — SallyIP', description: 'Universities, IP boutiques and enterprise design partners working on evaluated, provenance-aware IP AI.', h1: 'Partners in rigor.', kind: 'generic' },
  { path: '/trust', title: 'Trust center — SallyIP', description: 'Implemented controls, responsible disclosure, security contact and honest scope: what is claimed and what is planned.', h1: 'Trust, stated plainly.', kind: 'generic' },
];

export const FOOTER = [
  { h: 'Product', links: [
    { t: "What's new", to: '/whats-new' },
    { t: 'Novelty search', to: '/novelty-search' },
    { t: 'Claim charts', to: '/claim-charts' },
    { t: 'Office action defense', to: '/office-action-defense' },
    { t: 'Developer API', to: '/developer-api' },
    { t: 'All modules', to: '/modules' },
  ]},
  { h: 'Support', links: [
    { t: 'Documentation', to: '/documentation' },
    { t: 'Help center', to: '/help' },
    { t: 'Community', to: '/community' },
    { t: 'Enterprise support', to: '/enterprise-support' },
    { t: 'Verification logs', to: '/verification-logs' },
    { t: 'System audits', to: '/system-audits' },
  ]},
  { h: 'Resources', links: [
    { t: 'Benchmarks', to: '/benchmarks' },
    { t: 'Lifecycle guide', to: '/lifecycle-guide' },
    { t: 'Pricing', to: '/pricing' },
    { t: 'Roadmap', to: '/roadmap' },
    { t: 'Education', to: '/education' },
    { t: 'Newsletter', to: '/newsletter' },
  ]},
  { h: 'About', links: [
    { t: 'About', to: '/about' },
    { t: 'Security', to: '/security' },
    { t: 'Performance', to: '/performance' },
    { t: 'Careers', to: '/careers' },
    { t: 'Partners', to: '/partners' },
    { t: 'Trust center', to: '/trust' },
  ]},
];

export function isMarketingPath(p) {
  return ROUTES.some(r => r.path === p);
}
