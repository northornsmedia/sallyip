import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  Check,
  ChevronDown,
  ChevronUp,
  Cpu,
  Database,
  Globe,
  Layers,
  Lock,
  MessageSquare,
  Network,
  Scale,
  Send,
  Shield,
  ShieldCheck,
  Sparkles,
  Workflow,
  Zap,
} from 'lucide-react';
import SallyTopNav from './sally-topnav';
import ModernGradientFooter from './modern-gradient-footer';
import './benchmarks-redesign.css';

const PARTNERS = [
  { name: 'Logoipsum', icon: '✦' },
  { name: 'Intercom', icon: '⚡' },
  { name: 'LiveChat', icon: '💬' },
  { name: 'Postman', icon: '🚀' },
  { name: 'Datadog', icon: '🐕' },
];

const TESTIMONIALS = [
  {
    quote: "Our team designs elevated customer loyalty and card issues in hours instead of months.",
    name: "David Miller",
    role: "Director of Product",
    company: "FintechOne",
  },
  {
    quote: "The zero-error execution standard SallyIP delivers gives our IP practice unmatched speed and precision.",
    name: "Sarah Jenkins",
    role: "Patent Partner",
    company: "Apex Legal",
  },
  {
    quote: "We slashed project lead turnaround times by over 60% while maintaining absolute grounding.",
    name: "Alex Reed",
    role: "VP of Engineering",
    company: "CloudScale",
  },
  {
    quote: "Autonomous agent evaluation helped eliminate hallucinations in complex claim drafting.",
    name: "Elena Rostova",
    role: "Chief IP Counsel",
    company: "BioTech IP",
  },
  {
    quote: "Our multi-type agent pipeline long-term evaluation is effortlessly verified in production.",
    name: "James Cole",
    role: "Head of AI",
    company: "CognitiveCore",
  },
  {
    quote: "Working with SallyIP turned our prototype into a validated enterprise offering in record time.",
    name: "Lisa Wong",
    role: "Founder & CEO",
    company: "InnovateX",
  },
];

export default function BenchmarksPage({
  onHome,
  onChat,
  onAuth,
  onPricing,
}) {
  const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' | 'yearly'

  return (
    <div className="bm-page-root">
      {/* Top Navigation */}
      <SallyTopNav
        activePage="benchmarks"
        onNavigate={(page) => {
          if (page === 'home') onHome ? onHome() : (window.location.hash = 'home');
          else if (page === 'pricing') onPricing ? onPricing() : (window.location.hash = 'pricing');
          else if (page === 'chat') onChat ? onChat() : (window.location.hash = 'chat');
          else if (page === 'auth') onAuth ? onAuth() : (window.location.hash = 'auth');
          else window.location.hash = page;
        }}
        onOpenChat={onChat}
        onOpenAuth={onAuth}
      />

      {/* 1. HERO SECTION */}
      <section className="bm-hero">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bm-pill-badge"
        >
          <Sparkles size={13} />
          <span>Automate Your AI Workflows</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.08 }}
          className="bm-hero-title"
        >
          Automate Your AI Workflows
          <br />
          With AI Agent
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.16 }}
          className="bm-hero-subtitle"
        >
          Build, orchestrate, and benchmark autonomous AI specialist agents across
          intellectual property, patent analysis, and complex regulatory workflows.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.24 }}
          className="bm-hero-ctas"
        >
          <button className="bm-btn-primary" onClick={onChat}>
            Get Started Free <ArrowRight size={15} />
          </button>
          <button className="bm-btn-secondary" onClick={onPricing}>
            Explore Plans
          </button>
        </motion.div>

        {/* Arched Celestial Horizon Glow */}
        <div className="bm-horizon-stage">
          <div className="bm-horizon-glow" />
          <div className="bm-horizon-arc" />
        </div>
      </section>

      {/* 2. SOCIAL PROOF / PARTNERS STRIP */}
      <section className="bm-partners-section">
        <div className="bm-partners-label">
          Trusted by Industry Leaders Worldwide
        </div>
        <div className="bm-partners-row">
          {PARTNERS.map((p, i) => (
            <div key={i} className="bm-partner-item">
              <span style={{ fontSize: '18px', color: '#c084fc' }}>{p.icon}</span>
              <span>{p.name}</span>
            </div>
          ))}
        </div>
      </section>

      {/* 3. STATEMENT / VISION BANNER */}
      <section className="bm-statement-section">
        <div className="bm-pill-badge">
          <Sparkles size={13} />
          <span>About Us</span>
        </div>

        <h2 className="bm-statement-heading">
          Built On Creativity, Collaboration, And Top Excellence, SallyIP Is A
          Dynamic Platform Committed To Achieving Exceptional Grounded Results.
        </h2>

        <button className="bm-btn-purple" onClick={onChat}>
          Explore Platform <ArrowRight size={15} />
        </button>
      </section>

      {/* 4. 2x2 FEATURE CARDS GRID */}
      <section className="bm-features-section">
        <div className="bm-section-header">
          <div className="bm-pill-badge">
            <Layers size={13} />
            <span>All-in-one Platform</span>
          </div>
          <h2 className="bm-section-title">
            Build, Scale And Manage
            <br />
            Entire AI Workforce
          </h2>
          <p className="bm-section-subtitle">
            Deploy self-evaluating agents that coordinate seamlessly with your
            team, backed by verifiable citations and deterministic safety checks.
          </p>
        </div>

        <div className="bm-grid-2x2">
          {/* Card 1: Seamless API Integrations */}
          <div className="bm-feature-card">
            <div>
              <div className="bm-card-icon-bubble">
                <Network size={20} />
              </div>
              <h3 className="bm-card-title">Seamless API Integrations</h3>
              <p className="bm-card-desc">
                Connect directly into USPTO, EPO, WIPO, CourtListener, and your
                internal databases in minutes.
              </p>
            </div>
            <div className="bm-card-visual">
              {/* Fan-out Tree Graphic */}
              <svg width="280" height="150" viewBox="0 0 280 150" fill="none">
                <path d="M140 120 L40 40" stroke="#7c3aed" strokeWidth="2" strokeDasharray="4 4" />
                <path d="M140 120 L90 40" stroke="#8b5cf6" strokeWidth="2" />
                <path d="M140 120 L140 40" stroke="#6366f1" strokeWidth="2" />
                <path d="M140 120 L190 40" stroke="#3b82f6" strokeWidth="2" />
                <path d="M140 120 L240 40" stroke="#06b6d4" strokeWidth="2" strokeDasharray="4 4" />
                
                {/* Satellite Nodes */}
                <circle cx="40" cy="40" r="14" fill="#1e1b4b" stroke="#7c3aed" strokeWidth="2" />
                <circle cx="90" cy="40" r="14" fill="#1e1b4b" stroke="#8b5cf6" strokeWidth="2" />
                <circle cx="140" cy="40" r="14" fill="#1e1b4b" stroke="#6366f1" strokeWidth="2" />
                <circle cx="190" cy="40" r="14" fill="#1e1b4b" stroke="#3b82f6" strokeWidth="2" />
                <circle cx="240" cy="40" r="14" fill="#1e1b4b" stroke="#06b6d4" strokeWidth="2" />
                
                {/* Central Hub Node */}
                <circle cx="140" cy="120" r="20" fill="#7c3aed" />
                <circle cx="140" cy="120" r="12" fill="#ffffff" />
              </svg>
            </div>
          </div>

          {/* Card 2: Trusted Authentication */}
          <div className="bm-feature-card">
            <div>
              <div className="bm-card-icon-bubble">
                <ShieldCheck size={20} />
              </div>
              <h3 className="bm-card-title">Trusted Authentication</h3>
              <p className="bm-card-desc">
                Role-based access tokens, SOC2-audited access logs, and full
                cryptographic provenance on every generated proposition.
              </p>
            </div>
            <div className="bm-card-visual">
              {/* Security Matrix Graphic */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', padding: '16px' }}>
                <div style={{ background: '#13141f', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '8px 12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>SOC2 Type II</div>
                  <div style={{ fontSize: '13px', color: '#4ade80', fontWeight: 600 }}>Active</div>
                </div>
                <div style={{ background: '#13141f', border: '1px solid rgba(139,92,246,0.4)', borderRadius: '10px', padding: '8px 12px', textAlign: 'center', boxShadow: '0 0 15px rgba(124,58,237,0.3)' }}>
                  <div style={{ fontSize: '11px', color: '#c084fc' }}>Verified Hub</div>
                  <div style={{ fontSize: '13px', color: '#ffffff', fontWeight: 600 }}>256-Bit</div>
                </div>
                <div style={{ background: '#13141f', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '8px 12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>Audit Trail</div>
                  <div style={{ fontSize: '13px', color: '#4ade80', fontWeight: 600 }}>Immutable</div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Multi-Channel Automation */}
          <div className="bm-feature-card">
            <div>
              <div className="bm-card-icon-bubble">
                <Zap size={20} />
              </div>
              <h3 className="bm-card-title">Multi-Channel Automation</h3>
              <p className="bm-card-desc">
                Simultaneously dispatch tasks to patent filing queues, Slack notifications,
                email alerts, and external document management systems.
              </p>
            </div>
            <div className="bm-card-visual">
              {/* Central Glowing Orb & Connectors */}
              <svg width="280" height="150" viewBox="0 0 280 150" fill="none">
                <line x1="50" y1="75" x2="140" y2="75" stroke="#7c3aed" strokeWidth="2" />
                <line x1="140" y1="75" x2="230" y2="75" stroke="#7c3aed" strokeWidth="2" />
                <line x1="70" y1="35" x2="140" y2="75" stroke="#6366f1" strokeWidth="2" />
                <line x1="210" y1="35" x2="140" y2="75" stroke="#6366f1" strokeWidth="2" />
                
                <circle cx="140" cy="75" r="24" fill="#7c3aed" filter="drop-shadow(0 0 16px #8b5cf6)" />
                <circle cx="140" cy="75" r="14" fill="#ffffff" />
                
                <circle cx="50" cy="75" r="12" fill="#1e1b4b" stroke="#8b5cf6" strokeWidth="2" />
                <circle cx="230" cy="75" r="12" fill="#1e1b4b" stroke="#8b5cf6" strokeWidth="2" />
                <circle cx="70" cy="35" r="10" fill="#1e1b4b" stroke="#3b82f6" strokeWidth="2" />
                <circle cx="210" cy="35" r="10" fill="#1e1b4b" stroke="#3b82f6" strokeWidth="2" />
              </svg>
            </div>
          </div>

          {/* Card 4: Visual Workflow Designer */}
          <div className="bm-feature-card">
            <div>
              <div className="bm-card-icon-bubble">
                <Workflow size={20} />
              </div>
              <h3 className="bm-card-title">Visual Workflow Designer</h3>
              <p className="bm-card-desc">
                Build decision trees, review thresholds, and confidence gating
                with zero code using intuitive visual node blocks.
              </p>
            </div>
            <div className="bm-card-visual">
              {/* Mini UI Canvas Builder Mockup */}
              <div style={{ background: '#12131e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', width: '85%', padding: '14px 18px', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#4ade80' }} />
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#ffffff' }}>Claim Evaluator</span>
                  </div>
                  <span style={{ fontSize: '11px', background: 'rgba(124,58,237,0.3)', color: '#c084fc', padding: '2px 8px', borderRadius: '99px', fontWeight: 600 }}>99.8% Acc</span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <div style={{ flex: 1, height: '6px', background: '#7c3aed', borderRadius: '3px' }} />
                  <div style={{ flex: 1, height: '6px', background: '#3b82f6', borderRadius: '3px' }} />
                  <div style={{ flex: 1, height: '6px', background: '#10b981', borderRadius: '3px' }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. FULL-WIDTH WORKFORCE SHOWCASE */}
      <section className="bm-workforce-section">
        <div className="bm-workforce-container">
          <div className="bm-pill-badge">
            <Cpu size={13} />
            <span>Autonomous Intelligence</span>
          </div>

          <h2 className="bm-section-title">
            Build, Scale And Manage
            <br />
            Entire AI Workforce
          </h2>
          <p className="bm-section-subtitle" style={{ margin: '0 auto' }}>
            Multi-agent consensus ensures no single point of failure. Every citation,
            claim chart, and statutory assertion is verified in real-time.
          </p>

          <div className="bm-workforce-visual">
            <svg width="100%" height="240" viewBox="0 0 700 240" fill="none" style={{ maxWidth: '640px' }}>
              {/* Circuit Lines */}
              <path d="M350 120 L150 60" stroke="#7c3aed" strokeWidth="2" strokeDasharray="5 5" />
              <path d="M350 120 L200 190" stroke="#8b5cf6" strokeWidth="2" />
              <path d="M350 120 L550 60" stroke="#6366f1" strokeWidth="2" strokeDasharray="5 5" />
              <path d="M350 120 L500 190" stroke="#3b82f6" strokeWidth="2" />

              {/* Central Master Node */}
              <circle cx="350" cy="120" r="34" fill="#7c3aed" filter="drop-shadow(0 0 25px #8b5cf6)" />
              <circle cx="350" cy="120" r="22" fill="#ffffff" />
              <path d="M344 120 L348 124 L356 116" stroke="#7c3aed" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

              {/* Satellite Node 1: Prior Art */}
              <circle cx="150" cy="60" r="20" fill="#1e1b4b" stroke="#7c3aed" strokeWidth="2" />
              <text x="150" y="95" fill="#c084fc" fontSize="11" textAnchor="middle" fontWeight="600">Prior Art</text>

              {/* Satellite Node 2: Claim Chart */}
              <circle cx="200" cy="190" r="20" fill="#1e1b4b" stroke="#8b5cf6" strokeWidth="2" />
              <text x="200" y="225" fill="#c084fc" fontSize="11" textAnchor="middle" fontWeight="600">Claim Charts</text>

              {/* Satellite Node 3: Verification */}
              <circle cx="550" cy="60" r="20" fill="#1e1b4b" stroke="#6366f1" strokeWidth="2" />
              <text x="550" y="95" fill="#a5b4fc" fontSize="11" textAnchor="middle" fontWeight="600">Verifier</text>

              {/* Satellite Node 4: Office Action */}
              <circle cx="500" cy="190" r="20" fill="#1e1b4b" stroke="#3b82f6" strokeWidth="2" />
              <text x="500" y="225" fill="#93c5fd" fontSize="11" textAnchor="middle" fontWeight="600">OA Defense</text>
            </svg>
          </div>
        </div>
      </section>

      {/* 6. PRICING / EVALUATION PLANS */}
      <section className="bm-pricing-section">
        <div className="bm-pill-badge">
          <Sparkles size={13} />
          <span>Pricing</span>
        </div>

        <h2 className="bm-section-title">Simple Plans, Scalable Power</h2>
        <p className="bm-section-subtitle" style={{ margin: '0 auto' }}>
          Transparent pricing tailored for independent legal engineers, boutique
          practices, and enterprise corporate patent teams.
        </p>

        {/* Monthly / Yearly Toggle */}
        <div className="bm-billing-toggle">
          <button
            type="button"
            className={`bm-toggle-btn ${billingCycle === 'monthly' ? 'active' : ''}`}
            onClick={() => setBillingCycle('monthly')}
          >
            Monthly
          </button>
          <button
            type="button"
            className={`bm-toggle-btn ${billingCycle === 'yearly' ? 'active' : ''}`}
            onClick={() => setBillingCycle('yearly')}
          >
            Yearly
          </button>
          <span className="bm-save-badge">Save 20%</span>
        </div>

        {/* 3 Pricing Cards */}
        <div className="bm-pricing-grid">
          {/* Card 1: Starter */}
          <div className="bm-price-card">
            <div className="bm-price-card-tier">Starter</div>
            <div className="bm-price-card-number">
              $0
              <span className="bm-price-period">/ month</span>
            </div>
            <button className="bm-btn-secondary" style={{ width: '100%' }} onClick={onAuth}>
              Get Started Free
            </button>

            <ul className="bm-price-features">
              <li className="bm-price-feature-item">
                <Check size={16} className="bm-check-icon" /> 100 Baseline Benchmark Queries
              </li>
              <li className="bm-price-feature-item">
                <Check size={16} className="bm-check-icon" /> Statutory Category Verification
              </li>
              <li className="bm-price-feature-item">
                <Check size={16} className="bm-check-icon" /> Community Evaluation Hub
              </li>
              <li className="bm-price-feature-item">
                <Check size={16} className="bm-check-icon" /> Standard API Access
              </li>
            </ul>
          </div>

          {/* Card 2: Professional (Featured) */}
          <div className="bm-price-card featured">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="bm-price-card-tier" style={{ color: '#c084fc' }}>Professional</div>
              <span style={{ fontSize: '11px', background: '#7c3aed', color: '#fff', padding: '2px 8px', borderRadius: '999px', fontWeight: 600 }}>POPULAR</span>
            </div>
            <div className="bm-price-card-number">
              {billingCycle === 'monthly' ? '$49' : '$39'}
              <span className="bm-price-period">/ month</span>
            </div>
            <button className="bm-btn-purple" style={{ width: '100%' }} onClick={onPricing}>
              Upgrade to Pro
            </button>

            <ul className="bm-price-features">
              <li className="bm-price-feature-item">
                <Check size={16} className="bm-check-icon" /> Unlimited Benchmark Evaluation Runs
              </li>
              <li className="bm-price-feature-item">
                <Check size={16} className="bm-check-icon" /> Zero-Dangling Citation Verification
              </li>
              <li className="bm-price-feature-item">
                <Check size={16} className="bm-check-icon" /> Custom Portfolio Accuracy Gating
              </li>
              <li className="bm-price-feature-item">
                <Check size={16} className="bm-check-icon" /> Automated Office Action Defense
              </li>
              <li className="bm-price-feature-item">
                <Check size={16} className="bm-check-icon" /> Priority API Latency
              </li>
            </ul>
          </div>

          {/* Card 3: Enterprise */}
          <div className="bm-price-card">
            <div className="bm-price-card-tier">Enterprise</div>
            <div className="bm-price-card-number">
              {billingCycle === 'monthly' ? '$99' : '$79'}
              <span className="bm-price-period">/ month</span>
            </div>
            <button className="bm-btn-secondary" style={{ width: '100%' }} onClick={onPricing}>
              Contact Sales
            </button>

            <ul className="bm-price-features">
              <li className="bm-price-feature-item">
                <Check size={16} className="bm-check-icon" /> Dedicated Multi-Agent Cluster
              </li>
              <li className="bm-price-feature-item">
                <Check size={16} className="bm-check-icon" /> Private VPC & On-Prem Deployment
              </li>
              <li className="bm-price-feature-item">
                <Check size={16} className="bm-check-icon" /> Custom Legal Taxonomy Fine-Tuning
              </li>
              <li className="bm-price-feature-item">
                <Check size={16} className="bm-check-icon" /> 24/7 Dedicated Legal AI Architect
              </li>
              <li className="bm-price-feature-item">
                <Check size={16} className="bm-check-icon" /> SOC2 & HIPAA Compliance Guarantees
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* 7. TESTIMONIALS SECTION */}
      <section className="bm-testimonials-section">
        <div className="bm-pill-badge">
          <MessageSquare size={13} />
          <span>Testimonials</span>
        </div>

        <h2 className="bm-section-title">What Our Users Are Saying</h2>
        <p className="bm-section-subtitle" style={{ margin: '0 auto 48px auto' }}>
          Hear how leading firms and technology teams automate complex IP workflows.
        </p>

        <div className="bm-testimonials-grid">
          {TESTIMONIALS.map((t, idx) => (
            <div key={idx} className="bm-testi-card">
              <p className="bm-testi-quote">"{t.quote}"</p>
              <div className="bm-testi-author">
                <div className="bm-testi-avatar">
                  {t.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <div className="bm-testi-name">{t.name}</div>
                  <div className="bm-testi-role">{t.role} · {t.company}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Modern Gradient Footer matching exact design */}
      <ModernGradientFooter
        onDemoClick={onChat}
        onNavigate={(page) => {
          if (page === 'home') onHome ? onHome() : (window.location.hash = 'home');
          else if (page === 'pricing') onPricing ? onPricing() : (window.location.hash = 'pricing');
          else if (page === 'chat') onChat ? onChat() : (window.location.hash = 'chat');
          else if (page === 'auth') onAuth ? onAuth() : (window.location.hash = 'auth');
          else window.location.hash = page;
        }}
      />
    </div>
  );
}
