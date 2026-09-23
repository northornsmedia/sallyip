import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  Check,
  ChevronDown,
  ChevronUp,
  FileCode,
  FileText,
  FolderOpen,
  Globe,
  Layers,
  Lock,
  Search,
  Shield,
  ShieldCheck,
  Sparkles,
  Zap
} from 'lucide-react';
import SallyTopNav from './sally-topnav';
import ModernGradientFooter from './modern-gradient-footer';
import '../pricing-apple.css';

// ---------------- Document Library Breakdown (410 Documents) ----------------
const DOCUMENT_DOMAINS = [
  {
    id: 'patents',
    title: 'Patent Prosecution & Drafting',
    count: '110 Templates',
    badge: '110 DOCS',
    templates: [
      'Provisional Patent Application Specification & Disclosure Form',
      'Utility Patent Specification & Claims Template (Software & Algorithms)',
      'Utility Patent Specification & Claims Template (Biotechnology & Pharma)',
      'Utility Patent Specification & Claims Template (Mechanical & Devices)',
      'Utility Patent Specification & Claims Template (Electrical & Circuits)',
      'Section 101 Subject Matter Eligibility Rebuttal Architecture',
      'Section 102 Novelty Anticipation Rejection Response',
      'Section 103 Obviousness / Non-Obviousness Traverse Structure',
      'Section 112 Written Description & Antecedent Basis Response',
      'Information Disclosure Statement (IDS) Filing Framework',
      'Inventor Declaration and Power of Attorney Package',
      'PCT International Application Filing & Demand Request Forms',
    ],
  },
  {
    id: 'trademarks',
    title: 'Trademarks & Brand Protection',
    count: '85 Templates',
    badge: '85 DOCS',
    templates: [
      'Comprehensive Trademark Clearance & Risk Assessment Memo',
      'Trademark Application Filing Checklist & Goods Classification',
      'Section 2(d) Likelihood of Confusion Response Shell',
      'Section 2(e)(1) Merely Descriptive Rebuttal Argument Pack',
      'Cease & Desist Demand Letter (Infringing Domain & Mark Use)',
      'Trademark Co-Existence and Consent Agreement',
      'Exclusive Trademark License and Quality Control Schedule',
      'Assignment of Registered Trademark with Goodwill Schedule',
      'Notice of Opposition (TTAB Prosecution Framework)',
      'Statement of Use (SOU) and Extension Request Filings',
    ],
  },
  {
    id: 'trade-secrets',
    title: 'Trade Secrets & IP Employment',
    count: '65 Templates',
    badge: '65 DOCS',
    templates: [
      'Mutual Non-Disclosure & Confidentiality Agreement (Strict)',
      'Unilateral Technical Evaluation NDA with Residuals Disclaimer',
      'Employee Proprietary Information & Inventions Agreement (PIIA)',
      'Executive Restrictive Covenant & Non-Compete Agreement',
      'Trade Secret Audit Protocol & Clean Room Procedures Schedule',
      'Defend Trade Secrets Act (DTSA) Whistleblower Notice Provision',
      'Contractor IP Ownership & Work-Made-For-Hire Agreement',
      'Visitor Confidentiality & Facility Inspection Access Agreement',
    ],
  },
  {
    id: 'licensing',
    title: 'Commercial Licensing & Tech Transactions',
    count: '70 Templates',
    badge: '70 DOCS',
    templates: [
      'Master Software-as-a-Service (SaaS) Subscription Agreement',
      'On-Premise Enterprise Software License and Maintenance Terms',
      'Open Source Software Compliance & Copyleft Policy Schedule',
      'University Technology Transfer & Spin-Out License Agreement',
      'Joint Development & Foreground Intellectual Property Allocation',
      'Patent Pool Cross-Licensing & Fair-FRAND Royalty Terms',
      'OEM Commercial Manufacturing & Technical Data Distribution',
      'API Usage Terms of Service & Developer Data License',
    ],
  },
  {
    id: 'litigation',
    title: 'IP Litigation & Dispute Resolution',
    count: '50 Templates',
    badge: '50 DOCS',
    templates: [
      'Formal Patent Infringement Notice & Safe Harbor Inquiry',
      'Rule 11 Preliminary Infringement Contentions Matrix',
      'Rule 11 Invalidity Contentions & Prior Art Mapping Chart',
      'Motion for Preliminary Injunction Briefing Skeleton',
      'Protective Order for Highly Confidential Source Code Review',
      'Patent Settlement, Release & Covenant-Not-To-Sue Agreement',
      'ITC Section 337 Unfair Importation Complaint Skeleton',
      'Markman Claim Construction Chart & Proposed Definitions',
    ],
  },
  {
    id: 'strategy',
    title: 'IP Strategy, Audit & Due Diligence',
    count: '30 Templates',
    badge: '30 DOCS',
    templates: [
      'Comprehensive IP Portfolio Audit & Gap Analysis Checklist',
      'M&A Intellectual Property Due Diligence Questionnaire',
      'Freedom-to-Operate (FTO) Formal Legal Opinion Letter Shell',
      'IP Asset Valuation, Assignment & Capitalization Schedule',
      'Patent Landscaping & Competitor Radar Reporting Matrix',
      'IP Holding Company Intercompany Royalty License Protocol',
    ],
  },
];

// ---------------- Frequently Asked Questions ----------------
const FAQS = [
  {
    q: 'How does credit deduction work?',
    a: 'Each conversational prompt or legal research query consumes 0.1 credit (meaning 1 credit gives you 10 query interactions). Generating a full structured document, patent application, or legal draft consumes 1.0 credit. Monthly plan credits automatically reset at the start of your billing cycle, and additional credit packs can be added on-demand.',
  },
  {
    q: 'What happens if I exceed my monthly credits?',
    a: 'You are never blocked from completing critical filings. You can purchase on-demand add-on credit bundles directly from your billing dashboard anytime without needing to upgrade your plan tier. Add-on packs roll over perpetually.',
  },
  {
    q: 'Can multiple team members share a subscription?',
    a: 'Yes. The Business, Enterprise, and Enterprise+ plans support multi-user team workspaces with shared credit pools, unified billing, and granular Role-Based Access Control (Partner, Associate, Patent Agent, Reviewer).',
  },
  {
    q: 'Is client confidentiality maintained?',
    a: 'Yes. Sally IP operates under strict enterprise confidentiality safeguards. All client data is encrypted in transit (TLS 1.3) and at rest (AES-256). Crucially, Sally IP does NOT train its foundational or domain models on client prompts, documents, or uploads. Your work product remains completely isolated.',
  },
  {
    q: 'What document export formats are supported?',
    a: 'Drafts can be exported as Microsoft Word (.docx), searchable PDF (.pdf), plain text (.txt), or Markdown (.md), ready for immediate client review or filing preparation.',
  },
];

export default function PricingPage({ onHome, onChat, onAuth, onBenchmarks, onNavigate }) {
  // Pro Tier card toggle: '300' (Professional) vs '600' (Business - Most Popular)
  const [proTierOption, setProTierOption] = useState('600');
  // Enterprise card toggle: '900' (Enterprise) vs '1499' (Enterprise+ - Maximum Allowance)
  const [enterpriseTierOption, setEnterpriseTierOption] = useState('900');

  // Interactive Credit Estimator State
  const [queriesPerMonth, setQueriesPerMonth] = useState(300);
  const [draftsPerMonth, setDraftsPerMonth] = useState(25);

  // Document Library Domain Active Tab
  const [activeDomain, setActiveDomain] = useState('patents');

  // FAQ Accordion State
  const [expandedFaq, setExpandedFaq] = useState(null);

  // Calculate required credits based on user input
  const estimatedCredits = Math.ceil(queriesPerMonth * 0.1 + draftsPerMonth * 1.0);

  // Recommended plan based on calculation
  let recommendedPlanName = 'Starter (Free)';
  if (estimatedCredits > 900) recommendedPlanName = 'Enterprise+ (1,499 Credits)';
  else if (estimatedCredits > 600) recommendedPlanName = 'Enterprise (900 Credits)';
  else if (estimatedCredits > 300) recommendedPlanName = 'Business (600 Credits) — Recommended';
  else if (estimatedCredits > 15) recommendedPlanName = 'Professional (300 Credits)';

  const handleNavChat = () => {
    if (onNavigate) onNavigate('chat');
    else if (onChat) onChat();
    else window.location.hash = 'chat';
  };

  const handleNavAuth = () => {
    if (onNavigate) onNavigate('auth');
    else if (onAuth) onAuth();
    else window.location.hash = 'auth';
  };

  const handleNavBenchmarks = () => {
    if (onNavigate) onNavigate('benchmarks');
    else if (onBenchmarks) onBenchmarks();
    else window.location.hash = 'benchmarks';
  };

  const handleScrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    if (window.location.hash) {
      const targetId = window.location.hash.slice(1);
      setTimeout(() => {
        const el = document.getElementById(targetId);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, []);

  return (
    <div className="app-pricing-root">
      {/* ---------------- Topnav ---------------- */}
      <SallyTopNav
        activePage="pricing"
        onNavigate={(page) => {
          if (onNavigate) {
            onNavigate(page);
          } else if (page === 'home') {
            onHome ? onHome() : (window.location.hash = 'home');
          } else if (page === 'pricing') {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          } else if (page === 'benchmarks') {
            handleNavBenchmarks();
          } else if (page === 'chat') {
            handleNavChat();
          } else if (page === 'auth') {
            handleNavAuth();
          } else {
            window.location.hash = page;
          }
        }}
        onOpenChat={handleNavChat}
        onOpenAuth={handleNavAuth}
      />

      <main className="app-pricing-container">
        {/* ===================================================================
            1. Hero & Value Proposition
            =================================================================== */}
        <section className="app-pricing-hero">
          <div className="app-pricing-badge">
            <span className="dot" />
            <span>THE NEXT-GENERATION AI LEGAL & IP CO-PILOT</span>
          </div>

          <h1 className="app-pricing-title">
            Turn Your IP Work Into a Smarter, Faster Workflow
          </h1>

          <p className="app-pricing-subtitle">
            Move from initial question → deep research → professional patent, trademark, and copyright drafts in one unified workspace.
          </p>

          {/* Key Stats & Accreditations */}
          <div className="app-stats-row">
            <div className="app-stat-pill">
              <FileText size={14} />
              <span>410+ Curated Legal & IP Templates</span>
            </div>
            <div className="app-stat-pill">
              <Zap size={14} />
              <span>Sub-second Citation & Case Law Retrieval</span>
            </div>
            <div className="app-stat-pill">
              <Globe size={14} />
              <span>Multi-Jurisdiction: USPTO, EPO, UKIPO, JPO, CNIPA</span>
            </div>
            <div className="app-stat-pill">
              <ShieldCheck size={14} />
              <span>Zero Data Retention (Data Never Used for Training)</span>
            </div>
          </div>
        </section>

        {/* ===================================================================
            2 & 3. Subscription Tiers & Pricing Model (Pricing Cards)
            =================================================================== */}
        <section id="pricing" className="app-pricing-grid-3">
          {/* Card 1: Starter (Free Forever) */}
          <div className="app-plan-card">
            <div>
              <div className="app-card-top-row">
                <span className="app-card-badge">FREE FOREVER</span>
                <span style={{ fontSize: '11px', color: '#71717a' }}>Students & Trials</span>
              </div>

              <h3 className="app-card-title">Starter</h3>
              <div className="app-card-target">Free Exploration</div>
              <p className="app-card-desc">
                Essential AI IP research and basic document generation for individuals exploring AI-powered workflows.
              </p>

              <div className="app-card-pricing-block">
                <span className="app-card-price">£0</span>
                <span className="app-card-period">/ month</span>
              </div>

              {/* Allocation Pill */}
              <div className="app-card-allocation-row">
                <div className="app-alloc-badge">
                  <div className="app-alloc-num">15 Credits</div>
                  <div className="app-alloc-lbl">Monthly Refill</div>
                </div>
                <div className="app-alloc-badge">
                  <div className="app-alloc-num">20 Docs</div>
                  <div className="app-alloc-lbl">Library Access</div>
                </div>
              </div>

              <ul className="app-features-list">
                <li className="app-feature-row">
                  <Check className="app-feature-check" />
                  <span><strong>15 credits</strong> replenished every month</span>
                </li>
                <li className="app-feature-row">
                  <Check className="app-feature-check" />
                  <span>Access to <strong>20 curated IP documents</strong> (from 410 total)</span>
                </li>
                <li className="app-feature-row">
                  <Check className="app-feature-check" />
                  <span><strong>0.1 credit per prompt query</strong> (up to 150 prompt interactions/mo)</span>
                </li>
                <li className="app-feature-row">
                  <Check className="app-feature-check" />
                  <span><strong>1 credit per drafted document</strong> (up to 15 drafts/mo)</span>
                </li>
                <li className="app-feature-row">
                  <Check className="app-feature-check" />
                  <span>Natural language conversational IP search</span>
                </li>
                <li className="app-feature-row">
                  <Check className="app-feature-check" />
                  <span>Standard patent & trademark concepts guidance</span>
                </li>
                <li className="app-feature-row">
                  <Check className="app-feature-check" />
                  <span>Basic export formats (Text / Markdown)</span>
                </li>
              </ul>
            </div>

            <button
              className="sh-btn-minimal app-card-cta"
              onClick={handleNavAuth}
            >
              <span>Get Started Free</span>
              <ArrowRight size={14} />
            </button>
          </div>

          {/* Card 2: Professional & Business (Pro Tier Toggle) */}
          <div className="app-plan-card featured">
            <div>
              <div className="app-card-top-row">
                <span className="app-card-badge">
                  {proTierOption === '600' ? 'MOST POPULAR' : 'INDIVIDUAL PRACTICE'}
                </span>
                <span style={{ fontSize: '11px', color: '#60a5fa' }}>
                  {proTierOption === '600' ? 'Boutique & IP Teams' : 'Solo Attorneys & Associates'}
                </span>
              </div>

              {/* Interactive Pro Toggle: 300 vs 600 Credits */}
              <div className="app-card-tier-toggle">
                <button
                  type="button"
                  className={`app-tier-toggle-btn ${proTierOption === '300' ? 'active' : ''}`}
                  onClick={() => setProTierOption('300')}
                >
                  <span>Professional · 300</span>
                </button>
                <button
                  type="button"
                  className={`app-tier-toggle-btn ${proTierOption === '600' ? 'active' : ''}`}
                  onClick={() => setProTierOption('600')}
                >
                  <span>Business · 600</span>
                  <span className="app-tier-pop-tag">Popular</span>
                </button>
              </div>

              <h3 className="app-card-title">
                {proTierOption === '600' ? 'Business' : 'Professional'}
              </h3>
              <div className="app-card-target">
                {proTierOption === '600' ? 'Boutique Firms & IP Teams' : 'Solo Attorneys & Senior Associates'}
              </div>
              <p className="app-card-desc">
                {proTierOption === '600'
                  ? 'Enhanced volume, multi-jurisdiction drafting, and collaboration tools for boutique firms and growing IP teams.'
                  : 'Expanded research power and drafting capacity for solo patent agents, trademark attorneys, and senior associates.'}
              </p>

              <div className="app-card-pricing-block">
                <span className="app-card-price">
                  {proTierOption === '600' ? '£699' : '£499'}
                </span>
                <span className="app-card-period">/ month</span>
              </div>

              {/* Allocation Pill */}
              <div className="app-card-allocation-row">
                <div className="app-alloc-badge" style={{ borderColor: 'rgba(59, 130, 246, 0.3)' }}>
                  <div className="app-alloc-num" style={{ color: '#60a5fa' }}>
                    {proTierOption === '600' ? '600 Credits' : '300 Credits'}
                  </div>
                  <div className="app-alloc-lbl">Monthly Refill</div>
                </div>
                <div className="app-alloc-badge" style={{ borderColor: 'rgba(59, 130, 246, 0.3)' }}>
                  <div className="app-alloc-num" style={{ color: '#60a5fa' }}>
                    {proTierOption === '600' ? '300+ Docs' : '200 Docs'}
                  </div>
                  <div className="app-alloc-lbl">Library Access</div>
                </div>
              </div>

              <ul className="app-features-list">
                {proTierOption === '600' ? (
                  <>
                    <li className="app-feature-row">
                      <Check className="app-feature-check" />
                      <span><strong>600 credits per month</strong> (up to 6,000 queries or 600 drafts)</span>
                    </li>
                    <li className="app-feature-row">
                      <Check className="app-feature-check" />
                      <span><strong>Expanded 300+ document library access</strong> with updates</span>
                    </li>
                    <li className="app-feature-row">
                      <Check className="app-feature-check" />
                      <span>Advanced multi-jurisdiction claim drafting (USPTO, EPO, UKIPO, JPO)</span>
                    </li>
                    <li className="app-feature-row">
                      <Check className="app-feature-check" />
                      <span>Iterative antecedent basis checking & claim tree visualization</span>
                    </li>
                    <li className="app-feature-row">
                      <Check className="app-feature-check" />
                      <span>Multi-format exports (Microsoft Word .docx, PDF, Markdown)</span>
                    </li>
                    <li className="app-feature-row">
                      <Check className="app-feature-check" />
                      <span>Higher concurrency & priority processing speeds</span>
                    </li>
                    <li className="app-feature-row">
                      <Check className="app-feature-check" />
                      <span>Priority email & dedicated chat support</span>
                    </li>
                  </>
                ) : (
                  <>
                    <li className="app-feature-row">
                      <Check className="app-feature-check" />
                      <span><strong>300 credits per month</strong> (up to 3,000 queries or 300 drafts)</span>
                    </li>
                    <li className="app-feature-row">
                      <Check className="app-feature-check" />
                      <span>Access to <strong>200 curated IP documents & templates</strong></span>
                    </li>
                    <li className="app-feature-row">
                      <Check className="app-feature-check" />
                      <span>Advanced patent claim prosecution & drafting engine</span>
                    </li>
                    <li className="app-feature-row">
                      <Check className="app-feature-check" />
                      <span>Trademark specification generator & office action builder</span>
                    </li>
                    <li className="app-feature-row">
                      <Check className="app-feature-check" />
                      <span><strong>0.1 credit</strong> per prompt | <strong>1 credit</strong> per generated document</span>
                    </li>
                    <li className="app-feature-row">
                      <Check className="app-feature-check" />
                      <span>Priority email support & standard API access</span>
                    </li>
                  </>
                )}
              </ul>
            </div>

            <button
              className="sh-btn-apple app-card-cta"
              onClick={handleNavChat}
            >
              <span>{proTierOption === '600' ? 'Upgrade to Business' : 'Upgrade to Professional'}</span>
              <ArrowRight size={14} />
            </button>
          </div>

          {/* Card 3: Enterprise & Enterprise+ (Enterprise Tier Toggle) */}
          <div className="app-plan-card">
            <div>
              <div className="app-card-top-row">
                <span className="app-card-badge">
                  {enterpriseTierOption === '1499' ? 'MAXIMUM ALLOWANCE' : 'FULL LIBRARY'}
                </span>
                <span style={{ fontSize: '11px', color: '#a1a1aa' }}>
                  {enterpriseTierOption === '1499' ? 'Global Practices' : 'In-House Departments'}
                </span>
              </div>

              {/* Interactive Enterprise Toggle: 900 vs 1,499 Credits */}
              <div className="app-card-tier-toggle">
                <button
                  type="button"
                  className={`app-tier-toggle-btn ${enterpriseTierOption === '900' ? 'active' : ''}`}
                  onClick={() => setEnterpriseTierOption('900')}
                >
                  <span>Enterprise · 900</span>
                </button>
                <button
                  type="button"
                  className={`app-tier-toggle-btn ${enterpriseTierOption === '1499' ? 'active' : ''}`}
                  onClick={() => setEnterpriseTierOption('1499')}
                >
                  <span>Enterprise+ · 1,499</span>
                </button>
              </div>

              <h3 className="app-card-title">
                {enterpriseTierOption === '1499' ? 'Enterprise+' : 'Enterprise'}
              </h3>
              <div className="app-card-target">
                {enterpriseTierOption === '1499' ? 'High-Volume Global IP Practices' : 'In-House Corporate IP Departments'}
              </div>
              <p className="app-card-desc">
                {enterpriseTierOption === '1499'
                  ? 'The flagship tier for high-volume enterprise IP departments and multinational law firms with rigorous demands.'
                  : 'Unrestricted access to the entire 410-document library with early feature access and firm-wide styling.'}
              </p>

              <div className="app-card-pricing-block">
                <span className="app-card-price">
                  {enterpriseTierOption === '1499' ? '£1,499' : '£999'}
                </span>
                <span className="app-card-period">/ month</span>
              </div>

              {/* Allocation Pill */}
              <div className="app-card-allocation-row">
                <div className="app-alloc-badge">
                  <div className="app-alloc-num">
                    {enterpriseTierOption === '1499' ? '1,499 Credits' : '900 Credits'}
                  </div>
                  <div className="app-alloc-lbl">Monthly Refill</div>
                </div>
                <div className="app-alloc-badge">
                  <div className="app-alloc-num">All 410 Docs</div>
                  <div className="app-alloc-lbl">Full Library</div>
                </div>
              </div>

              <ul className="app-features-list">
                {enterpriseTierOption === '1499' ? (
                  <>
                    <li className="app-feature-row">
                      <Check className="app-feature-check" />
                      <span><strong>1,499 credits per month</strong> (highest monthly allowance)</span>
                    </li>
                    <li className="app-feature-row">
                      <Check className="app-feature-check" />
                      <span><strong>Complete 410-document library unlocked</strong></span>
                    </li>
                    <li className="app-feature-row">
                      <Check className="app-feature-check" />
                      <span>Dedicated GPU priority queue & ultra-low latency generation</span>
                    </li>
                    <li className="app-feature-row">
                      <Check className="app-feature-check" />
                      <span>Custom API integrations & automated webhook endpoints</span>
                    </li>
                    <li className="app-feature-row">
                      <Check className="app-feature-check" />
                      <span>Enterprise SSO (SAML 2.0 / Okta / Azure AD) authentication</span>
                    </li>
                    <li className="app-feature-row">
                      <Check className="app-feature-check" />
                      <span>Strict confidentiality guarantee: Zero model training on client data</span>
                    </li>
                    <li className="app-feature-row">
                      <Check className="app-feature-check" />
                      <span>24/7 dedicated concierge support & bespoke training workshops</span>
                    </li>
                  </>
                ) : (
                  <>
                    <li className="app-feature-row">
                      <Check className="app-feature-check" />
                      <span><strong>900 credits per month</strong> (up to 9,000 queries or 900 drafts)</span>
                    </li>
                    <li className="app-feature-row">
                      <Check className="app-feature-check" />
                      <span><strong>Unrestricted access to all 410 documents</strong> in the library</span>
                    </li>
                    <li className="app-feature-row">
                      <Check className="app-feature-check" />
                      <span>Patent claim scaffolding & trade secret protection templates</span>
                    </li>
                    <li className="app-feature-row">
                      <Check className="app-feature-check" />
                      <span>Early access to beta releases & upcoming legal models</span>
                    </li>
                    <li className="app-feature-row">
                      <Check className="app-feature-check" />
                      <span>Custom template uploads & firm-specific style guide enforcement</span>
                    </li>
                    <li className="app-feature-row">
                      <Check className="app-feature-check" />
                      <span>Centralized billing & firm-wide usage dashboards</span>
                    </li>
                    <li className="app-feature-row">
                      <Check className="app-feature-check" />
                      <span>Dedicated onboarding manager & SLA</span>
                    </li>
                  </>
                )}
              </ul>
            </div>

            <button
              className="sh-btn-minimal app-card-cta"
              onClick={handleNavChat}
            >
              <span>{enterpriseTierOption === '1499' ? 'Upgrade to Enterprise+' : 'Upgrade to Enterprise'}</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </section>

        {/* ===================================================================
            4. How the Credit System Works & Interactive Credit Calculator
            =================================================================== */}
        <section className="app-credit-system-box">
          <div className="app-credit-system-grid">
            <div>
              <div className="app-pricing-badge" style={{ marginBottom: 14 }}>
                <span className="dot" />
                <span>USAGE-BASED PREDICTABILITY</span>
              </div>
              <h3 style={{ fontSize: 'clamp(28px, 3.2vw, 40px)', fontWeight: 700, margin: '0 0 16px', letterSpacing: '-0.03em' }}>
                How the Credit System Works
              </h3>
              <p style={{ fontSize: '14px', lineHeight: 1.6, color: '#9496a1', margin: '0 0 24px' }}>
                Sally IP operates on a transparent, predictable credit model. Every query and drafted document has a clear, fixed credit cost.
                No lock-in: purchase on-demand add-on credit packs anytime without tier upgrades.
              </p>

              <table className="app-credit-rules-table">
                <thead>
                  <tr>
                    <th>Action</th>
                    <th>Credit Cost</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Conversational Prompt / Query</td>
                    <td>0.1 Credit (10 queries = 1.0)</td>
                  </tr>
                  <tr>
                    <td>Full Draft Document Generated</td>
                    <td>1.0 Credit</td>
                  </tr>
                  <tr>
                    <td>Monthly Allowance Renewal</td>
                    <td>Automatically resets monthly</td>
                  </tr>
                  <tr>
                    <td>Additional Credit Packs</td>
                    <td>Available on-demand anytime</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Interactive Credit Calculator */}
            <div className="app-calc-wrap">
              <div style={{ fontSize: '15px', fontWeight: 600, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Sparkles size={16} color="#60a5fa" />
                <span>Credit Needs Estimator</span>
              </div>

              <div className="app-calc-slider-row">
                <div className="app-calc-slider-header">
                  <span>Conversational Prompts & Research Queries / month</span>
                  <span style={{ color: '#60a5fa', fontWeight: 600 }}>{queriesPerMonth} queries ({(queriesPerMonth * 0.1).toFixed(0)} credits)</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="5000"
                  step="50"
                  value={queriesPerMonth}
                  onChange={(e) => setQueriesPerMonth(parseInt(e.target.value, 10))}
                  className="app-slider-input"
                />
              </div>

              <div className="app-calc-slider-row">
                <div className="app-calc-slider-header">
                  <span>Complete Legal Documents Drafted / month</span>
                  <span style={{ color: '#60a5fa', fontWeight: 600 }}>{draftsPerMonth} drafts ({draftsPerMonth} credits)</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="500"
                  step="5"
                  value={draftsPerMonth}
                  onChange={(e) => setDraftsPerMonth(parseInt(e.target.value, 10))}
                  className="app-slider-input"
                />
              </div>

              <div className="app-calc-result-box">
                <div>
                  <div style={{ fontSize: '11px', color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Estimated Requirement</div>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: '#ffffff' }}>{estimatedCredits} Credits / mo</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '11px', color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Recommended Tier</div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#60a5fa' }}>{recommendedPlanName}</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===================================================================
            5. The 5 Core Capabilities of Sally IP
            =================================================================== */}
        <section id="modules" className="app-capabilities-section">
          <div style={{ textAlign: 'center', maxWidth: 840, margin: '0 auto' }}>
            <div className="app-pricing-badge">
              <span className="dot" />
              <span>END-TO-END WORKSPACE</span>
            </div>
            <h2 style={{ fontSize: 'clamp(32px, 4vw, 52px)', fontWeight: 700, letterSpacing: '-0.035em', margin: '0 0 14px' }}>
              The 5 Core Capabilities of Sally IP
            </h2>
            <p style={{ fontSize: '15px', color: '#9496a1', lineHeight: 1.6, margin: 0 }}>
              Engineered specifically for intellectual property practitioners to bridge disclosure intake, research, and filing.
            </p>
          </div>

          <div className="app-cap-grid">
            {/* Capability 1 */}
            <div className="app-cap-card">
              <div className="app-cap-icon-box">
                <Search size={18} />
              </div>
              <h4 className="app-cap-title">1. Explore IP Information</h4>
              <p className="app-cap-desc">
                Ask complex questions in natural language. Instantly review patentability criteria
                (35 U.S.C. §§ 101, 102, 103, 112 / EPC Articles 52, 54, 56) and navigate Nice Classification and confusion standards with legal precision.
              </p>
            </div>

            {/* Capability 2 */}
            <div className="app-cap-card">
              <div className="app-cap-icon-box">
                <FolderOpen size={18} />
              </div>
              <h4 className="app-cap-title">2. Work With Professional Resources</h4>
              <p className="app-cap-desc">
                Gain immediate access to up to 410 vetted legal documents and templates. Eliminates wasted hours searching through scattered,
                outdated online templates—continually updated to reflect recent judicial precedents.
              </p>
            </div>

            {/* Capability 3 */}
            <div className="app-cap-card">
              <div className="app-cap-icon-box">
                <Zap size={18} />
              </div>
              <h4 className="app-cap-title">3. Start Documents Faster</h4>
              <p className="app-cap-desc">
                Transform invention disclosure briefs, technical schematics, or brand decks into structured first drafts in seconds.
                Automatically formats claims, abstract, background, and detailed specifications at only 1 credit per draft.
              </p>
            </div>

            {/* Capability 4 */}
            <div className="app-cap-card">
              <div className="app-cap-icon-box">
                <FileCode size={18} />
              </div>
              <h4 className="app-cap-title">4. Refine Your Work Interactively</h4>
              <p className="app-cap-desc">
                Collaborate with Sally to iteratively strengthen claims, expand embodiments, address potential prior art rejections,
                or tighten non-disclosure clauses with antecedent basis verification.
              </p>
            </div>

            {/* Capability 5 (Span 2) */}
            <div className="app-cap-card span-2">
              <div className="app-cap-icon-box">
                <Layers size={18} />
              </div>
              <h4 className="app-cap-title">5. Turn Ideas Into Practical IP Workflows</h4>
              <p className="app-cap-desc">
                Connects the dots when you are uncertain where to begin across the end-to-end prosecution pipeline:
              </p>
              <div className="app-workflow-chain">
                <span className="app-wf-node">Idea / Disclosure</span>
                <span className="app-wf-arrow">→</span>
                <span className="app-wf-node">Prior Art Landscape</span>
                <span className="app-wf-arrow">→</span>
                <span className="app-wf-node">Claim Scaffolding</span>
                <span className="app-wf-arrow">→</span>
                <span className="app-wf-node">Formal Draft</span>
                <span className="app-wf-arrow">→</span>
                <span className="app-wf-node">Filing Preparation</span>
              </div>
            </div>
          </div>
        </section>

        {/* ===================================================================
            6. The 4-Step User Workflow
            =================================================================== */}
        <section id="lifecycle" className="app-steps-section">
          <div style={{ textAlign: 'center', maxWidth: 840, margin: '0 auto' }}>
            <div className="app-pricing-badge">
              <span className="dot" />
              <span>THE PRACTITIONER WORKFLOW</span>
            </div>
            <h2 style={{ fontSize: 'clamp(32px, 4vw, 52px)', fontWeight: 700, letterSpacing: '-0.035em', margin: '0 0 14px' }}>
              The 4-Step User Workflow
            </h2>
            <p style={{ fontSize: '15px', color: '#9496a1', lineHeight: 1.6, margin: 0 }}>
              From initial technical inquiry to fileable statutory work-product.
            </p>
          </div>

          <div className="app-steps-grid">
            <div className="app-step-card">
              <div className="app-step-num">STEP 01</div>
              <h4 className="app-step-title">ASK</h4>
              <p className="app-step-desc">
                Type your IP question in natural language. Ingest raw invention memos, technical schematics, or office action rejection notices.
              </p>
            </div>

            <div className="app-step-card">
              <div className="app-step-num">STEP 02</div>
              <h4 className="app-step-title">EXPLORE</h4>
              <p className="app-step-desc">
                Review relevant legal precedents, Nice classifications, limitation-level prior art mappings, and curated repository templates.
              </p>
            </div>

            <div className="app-step-card">
              <div className="app-step-num">STEP 03</div>
              <h4 className="app-step-title">DRAFT</h4>
              <p className="app-step-desc">
                Generate a structured initial legal draft with claims, statutory arguments, specifications, and full citation grounding.
              </p>
            </div>

            <div className="app-step-card">
              <div className="app-step-num">STEP 04</div>
              <h4 className="app-step-title">REFINE</h4>
              <p className="app-step-desc">
                Interactively expand claims, run antecedent basis audits, polish language with firm styling, and export to DOCX or XML.
              </p>
            </div>
          </div>
        </section>

        {/* ===================================================================
            7. Document Library Breakdown (410 Documents)
            =================================================================== */}
        <section className="app-library-section">
          <div style={{ textAlign: 'center', maxWidth: 840, margin: '0 auto' }}>
            <div className="app-pricing-badge">
              <span className="dot" />
              <span>CURATED LEGAL REPOSITORY</span>
            </div>
            <h2 style={{ fontSize: 'clamp(32px, 4vw, 52px)', fontWeight: 700, letterSpacing: '-0.035em', margin: '0 0 14px' }}>
              Document Library Breakdown (410 Documents)
            </h2>
            <p style={{ fontSize: '15px', color: '#9496a1', lineHeight: 1.6, margin: 0 }}>
              Explore the 6 core domains of attorney-vetted templates continually updated to reflect recent judicial precedents.
            </p>
          </div>

          {/* Domain Tab Buttons */}
          <div className="app-library-tabs">
            {DOCUMENT_DOMAINS.map((domain) => (
              <button
                key={domain.id}
                className={`app-lib-tab-btn ${activeDomain === domain.id ? 'active' : ''}`}
                onClick={() => setActiveDomain(domain.id)}
              >
                <span>{domain.title}</span>
                <span className="app-lib-count-badge">{domain.count}</span>
              </button>
            ))}
          </div>

          {/* Active Domain Content */}
          {(() => {
            const activeData = DOCUMENT_DOMAINS.find((d) => d.id === activeDomain) || DOCUMENT_DOMAINS[0];
            return (
              <div className="app-library-content">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <h4 style={{ fontSize: '18px', fontWeight: 600, color: '#fff', margin: 0 }}>
                    {activeData.title}
                  </h4>
                  <span className="app-card-badge">{activeData.badge}</span>
                </div>

                <div className="app-lib-templates-grid">
                  {activeData.templates.map((tmpl, idx) => (
                    <div key={idx} className="app-lib-item">
                      <FileText />
                      <span>{tmpl}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </section>

        {/* ===================================================================
            8. Enterprise Security, Privacy & Ethics
            =================================================================== */}
        <section id="security" className="app-security-section">
          <div style={{ textAlign: 'center', maxWidth: 840, margin: '0 auto' }}>
            <div className="app-pricing-badge">
              <span className="dot" />
              <span>SECURITY & CONFIDENTIALITY</span>
            </div>
            <h2 style={{ fontSize: 'clamp(32px, 4vw, 52px)', fontWeight: 700, letterSpacing: '-0.035em', margin: '0 0 14px' }}>
              Enterprise Security, Privacy & Ethics
            </h2>
            <p style={{ fontSize: '15px', color: '#9496a1', lineHeight: 1.6, margin: 0 }}>
              Built for confidential attorney-client work product with strict enterprise safeguards.
            </p>
          </div>

          <div className="app-security-grid">
            <div className="app-sec-card">
              <div className="app-sec-icon"><Shield size={18} /></div>
              <h4 className="app-sec-title">Zero Data Retention</h4>
              <p className="app-sec-desc">
                Sally IP does not train its foundational or domain models on client prompts, documents, or uploads. All session inference is ephemeral.
              </p>
            </div>

            <div className="app-sec-card">
              <div className="app-sec-icon"><Lock size={18} /></div>
              <h4 className="app-sec-title">Bank-Grade Encryption</h4>
              <p className="app-sec-desc">
                End-to-end cryptographic encryption in transit (TLS 1.3) and at rest (AES-256) with optional client-managed KMS keys (BYOK).
              </p>
            </div>

            <div className="app-sec-card">
              <div className="app-sec-icon"><ShieldCheck size={18} /></div>
              <h4 className="app-sec-title">Role-Based Access Control</h4>
              <p className="app-sec-desc">
                Granular workspace permissions for firms and corporate legal departments (Partner, Associate, Patent Agent, Reviewer).
              </p>
            </div>

            <div className="app-sec-card">
              <div className="app-sec-icon"><FileText size={18} /></div>
              <h4 className="app-sec-title">Audit Logs & Compliance</h4>
              <p className="app-sec-desc">
                Detailed telemetry logs of all generated drafts, statutory citations, and matter exports for legal auditing and billing records.
              </p>
            </div>
          </div>
        </section>

        {/* ===================================================================
            9. Frequently Asked Questions (FAQ)
            =================================================================== */}
        <section className="app-faq-section">
          <div className="app-faq-header">
            <div className="app-pricing-badge">
              <span className="dot" />
              <span>FREQUENTLY ASKED QUESTIONS</span>
            </div>
            <h3>Frequently asked questions.</h3>
          </div>

          <div className="app-faq-list">
            {FAQS.map((faq, idx) => {
              const isOpen = expandedFaq === idx;
              return (
                <div key={idx} className="app-faq-item">
                  <button
                    className="app-faq-question"
                    onClick={() => setExpandedFaq(isOpen ? null : idx)}
                  >
                    <span>{faq.q}</span>
                    {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>
                  {isOpen && (
                    <div className="app-faq-answer">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {/* ---------------- Modern Minimalist Footer ---------------- */}
      <ModernGradientFooter
        onDemoClick={handleNavChat}
        onNavigate={(target) => {
          if (onNavigate) {
            onNavigate(target);
          } else if (target === 'home') {
            onHome ? onHome() : (window.location.hash = 'home');
          } else if (target === 'benchmarks') {
            handleNavBenchmarks();
          } else if (target === 'chat') {
            handleNavChat();
          } else {
            window.location.hash = target;
          }
        }}
      />
    </div>
  );
}
