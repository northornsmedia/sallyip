import React, { useState } from 'react';
import { ArrowRight, Check, ShieldCheck } from 'lucide-react';
import './modern-gradient-footer.css';

export default function ModernGradientFooter({
  onDemoClick,
  onNavigate,
}) {
  const [email, setEmail] = useState('');
  const [agreed, setAgreed] = useState(true);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (email.trim()) {
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 4000);
      setEmail('');
    }
  };

  const handleLink = (hash) => {
    if (onNavigate) {
      onNavigate(hash);
    } else {
      window.location.hash = hash;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <footer className="viroka-footer-root">
      <div className="viroka-footer-inner">
        {/* 1. Hero / CTA Block (Apple Minimalist) */}
        <div className="viroka-cta-hero">
          <div className="viroka-brand-pill">
            <img
              src="/sallyip-brand-mark.png"
              alt="SallyIP"
              className="viroka-brand-logo"
            />
            <span>SALLYIP STUDIO</span>
          </div>

          <h2 className="viroka-cta-title">
            The standard in verified legal intelligence.
          </h2>

          <p className="viroka-cta-desc">
            Experience the patent intelligence copilot trusted by leading patent boutiques,
            corporate IP departments, and Fortune 500 legal engineering teams.
          </p>

          <div className="viroka-cta-actions">
            <button
              type="button"
              className="sh-btn-apple"
              onClick={onDemoClick ? onDemoClick : () => handleLink('chat')}
            >
              <span>Launch SallyIP Studio</span>
              <ArrowRight size={14} />
            </button>
            <button
              type="button"
              className="sh-btn-minimal"
              onClick={() => handleLink('pricing')}
            >
              <span>Compare Plans</span>
            </button>
          </div>
        </div>

        {/* 2. 4-Column Navigation Links */}
        <div className="viroka-links-grid">
          {/* Column 1 */}
          <div>
            <div className="viroka-col-header">Product</div>
            <ul className="viroka-col-list">
              <li><button type="button" className="viroka-nav-link" onClick={() => handleLink('modules')}>What's New in 2026</button></li>
              <li><button type="button" className="viroka-nav-link" onClick={() => handleLink('modules')}>Prior Art Radar</button></li>
              <li><button type="button" className="viroka-nav-link" onClick={() => handleLink('modules')}>Novelty Limitation Mapping</button></li>
              <li><button type="button" className="viroka-nav-link" onClick={() => handleLink('modules')}>Claim Charts & EoU</button></li>
              <li><button type="button" className="viroka-nav-link" onClick={() => handleLink('modules')}>Office Action Defense</button></li>
              <li><button type="button" className="viroka-nav-link" onClick={() => handleLink('modules')}>Developer API & SDK</button></li>
            </ul>
          </div>

          {/* Column 2 */}
          <div>
            <div className="viroka-col-header">Practice Areas</div>
            <ul className="viroka-col-list">
              <li><button type="button" className="viroka-nav-link" onClick={() => handleLink('chat')}>Patent Drafting Studio</button></li>
              <li><button type="button" className="viroka-nav-link" onClick={() => handleLink('chat')}>FTO Product Clearance</button></li>
              <li><button type="button" className="viroka-nav-link" onClick={() => handleLink('chat')}>Trademark Screening</button></li>
              <li><button type="button" className="viroka-nav-link" onClick={() => handleLink('security')}>Enterprise Department Vault</button></li>
              <li><button type="button" className="viroka-nav-link" onClick={() => handleLink('security')}>Verification Logs</button></li>
              <li><button type="button" className="viroka-nav-link" onClick={() => handleLink('security')}>Audit Trails</button></li>
            </ul>
          </div>

          {/* Column 3 */}
          <div>
            <div className="viroka-col-header">Resources</div>
            <ul className="viroka-col-list">
              <li><button type="button" className="viroka-nav-link" onClick={() => handleLink('pricing')}>Pricing & Subscriptions</button></li>
              <li><button type="button" className="viroka-nav-link" onClick={() => handleLink('benchmarks')}>Open Benchmarks</button></li>
              <li><button type="button" className="viroka-nav-link" onClick={() => handleLink('lifecycle')}>Patent Lifecycle Guide</button></li>
              <li><button type="button" className="viroka-nav-link" onClick={() => handleLink('performance')}>System Performance</button></li>
              <li><button type="button" className="viroka-nav-link" onClick={() => handleLink('pricing')}>Academic Scholarship</button></li>
              <li><button type="button" className="viroka-nav-link" onClick={() => handleLink('benchmarks')}>Research Notes</button></li>
            </ul>
          </div>

          {/* Column 4 */}
          <div>
            <div className="viroka-col-header">Company & Trust</div>
            <ul className="viroka-col-list">
              <li><button type="button" className="viroka-nav-link" onClick={() => handleLink('home')}>About SallyIP</button></li>
              <li><button type="button" className="viroka-nav-link" onClick={() => handleLink('security')}>Zero Retention Policy</button></li>
              <li><button type="button" className="viroka-nav-link" onClick={() => handleLink('security')}>Security & Compliance</button></li>
              <li><button type="button" className="viroka-nav-link" onClick={() => handleLink('security')}>SOC 2 & ISO Standards</button></li>
              <li><button type="button" className="viroka-nav-link" onClick={() => handleLink('home')}>Careers</button></li>
              <li><button type="button" className="viroka-nav-link" onClick={() => handleLink('security')}>Trust Center</button></li>
            </ul>
          </div>
        </div>

        {/* 3. Subtle Horizontal Divider */}
        <div className="viroka-divider" />

        {/* 4. Newsletter & Signup Bottom Split */}
        <div className="viroka-bottom-split">
          <div className="viroka-newsletter-info">
            <h4>SallyIP Research Notes</h4>
            <p>
              Receive statutory patent intelligence, benchmark scorecards, and model updates.
              Zero promotional spam. Strictly once per month.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="viroka-form-wrap">
            <div className="viroka-input-row">
              <input
                type="email"
                placeholder="attorney@firm.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="viroka-email-input"
                required
              />
              <button type="submit" className="viroka-join-btn">
                {submitted ? 'Subscribed' : 'Subscribe'}
              </button>
            </div>

            <label className="viroka-consent-label">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="viroka-consent-checkbox"
              />
              <span>Receive monthly IP research notes and release advisories</span>
            </label>
          </form>
        </div>

        {/* 5. Legal & Status Bar */}
        <div className="viroka-legal-bar">
          <div className="viroka-status-pill">
            <span className="viroka-status-dot" />
            <span>All Systems Operational · 99.98% Uptime SLA</span>
          </div>

          <div className="viroka-legal-links">
            <span className="viroka-copy-text">© 2026 SallyIP Inc. Built for Intellectual Property Practitioners.</span>
            <a href="#privacy" className="viroka-legal-link">Privacy</a>
            <a href="#terms" className="viroka-legal-link">Terms</a>
            <a href="#security" className="viroka-legal-link">Security</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
