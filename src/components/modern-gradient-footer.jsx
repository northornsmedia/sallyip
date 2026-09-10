import React, { useState } from 'react';
import { ArrowDown, Check, Download, Sparkles } from 'lucide-react';
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
    <div className="viroka-footer-root">
      {/* Ambient Radial Glows */}
      <div className="viroka-ambient-glow-top" />
      <div className="viroka-ambient-glow-bottom" />

      {/* Perspective 3D Wireframe Grid Horizon */}
      <div className="viroka-grid-floor">
        <div className="viroka-grid-floor-lines" />
      </div>

      <div className="viroka-footer-inner">
        {/* 1. Hero / CTA Block */}
        <div className="viroka-cta-hero">
          <div className="viroka-logo-squircle">
            <img
              src="/sallyip-brand-mark.png"
              alt="SallyIP"
              className="viroka-logo-img"
            />
          </div>

          <h2 className="viroka-cta-title">
            Uncover a new approach to IP intelligence
          </h2>

          <p className="viroka-cta-desc">
            Get SallyIP now and be part of a community of patent attorneys,
            legal engineers, and innovators across Fortune 500 companies.
          </p>

          <button
            type="button"
            className="viroka-cta-btn"
            onClick={onDemoClick ? onDemoClick : () => handleLink('chat')}
          >
            <span>Get started for free</span>
            <Download size={16} />
          </button>
        </div>

        {/* 2. 4-Column Navigation Links */}
        <div className="viroka-links-grid">
          {/* Column 1 */}
          <div>
            <div className="viroka-col-header">// Product</div>
            <ul className="viroka-col-list">
              <li><button type="button" className="viroka-nav-link" onClick={() => handleLink('modules')}>What's New</button></li>
              <li><button type="button" className="viroka-nav-link" onClick={() => handleLink('modules')}>Novelty Search</button></li>
              <li><button type="button" className="viroka-nav-link" onClick={() => handleLink('modules')}>Claim Charts</button></li>
              <li><button type="button" className="viroka-nav-link" onClick={() => handleLink('modules')}>Office Action Defense</button></li>
              <li><button type="button" className="viroka-nav-link" onClick={() => handleLink('modules')}>Developer API</button></li>
              <li><button type="button" className="viroka-nav-link" onClick={() => handleLink('modules')}>All Modules</button></li>
            </ul>
          </div>

          {/* Column 2 */}
          <div>
            <div className="viroka-col-header">// Support</div>
            <ul className="viroka-col-list">
              <li><button type="button" className="viroka-nav-link" onClick={() => handleLink('chat')}>Documentation</button></li>
              <li><button type="button" className="viroka-nav-link" onClick={() => handleLink('chat')}>Help Center</button></li>
              <li><button type="button" className="viroka-nav-link" onClick={() => handleLink('chat')}>Support Community</button></li>
              <li><button type="button" className="viroka-nav-link" onClick={() => handleLink('security')}>Enterprise Support</button></li>
              <li><button type="button" className="viroka-nav-link" onClick={() => handleLink('security')}>Verification Logs</button></li>
              <li><button type="button" className="viroka-nav-link" onClick={() => handleLink('security')}>System Audits</button></li>
            </ul>
          </div>

          {/* Column 3 */}
          <div>
            <div className="viroka-col-header">// Resources</div>
            <ul className="viroka-col-list">
              <li><button type="button" className="viroka-nav-link" onClick={() => handleLink('benchmarks')}>Our Benchmarks</button></li>
              <li><button type="button" className="viroka-nav-link" onClick={() => handleLink('lifecycle')}>Lifecycle Guide</button></li>
              <li><button type="button" className="viroka-nav-link" onClick={() => handleLink('pricing')}>Pricing</button></li>
              <li><button type="button" className="viroka-nav-link" onClick={() => handleLink('performance')}>Roadmap</button></li>
              <li><button type="button" className="viroka-nav-link" onClick={() => handleLink('pricing')}>Free for Education</button></li>
              <li><button type="button" className="viroka-nav-link" onClick={() => handleLink('benchmarks')}>Newsletter</button></li>
            </ul>
          </div>

          {/* Column 4 */}
          <div>
            <div className="viroka-col-header">// About</div>
            <ul className="viroka-col-list">
              <li><button type="button" className="viroka-nav-link" onClick={() => handleLink('home')}>About Us</button></li>
              <li><button type="button" className="viroka-nav-link" onClick={() => handleLink('security')}>Security & Compliance</button></li>
              <li><button type="button" className="viroka-nav-link" onClick={() => handleLink('performance')}>Performance</button></li>
              <li><button type="button" className="viroka-nav-link" onClick={() => handleLink('home')}>Careers</button></li>
              <li><button type="button" className="viroka-nav-link" onClick={() => handleLink('home')}>Partners</button></li>
              <li><button type="button" className="viroka-nav-link" onClick={() => handleLink('security')}>Trust Center</button></li>
            </ul>
          </div>
        </div>

        {/* 3. Subtle Horizontal Divider */}
        <div className="viroka-divider" />

        {/* 4. Newsletter & Signup Bottom Split */}
        <div className="viroka-bottom-split">
          <div className="viroka-newsletter-info">
            <h4>Never miss an update</h4>
            <p>
              Get all the latest legal intelligence, statutory updates, and product releases from SallyIP.
              Delivered directly to your inbox. We'll rarely send more than once a month.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="viroka-form-wrap">
            <div className="viroka-input-row">
              <input
                type="email"
                placeholder="example@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="viroka-email-input"
                required
              />
              <button type="submit" className="viroka-join-btn">
                {submitted ? 'Joined!' : 'Join'}
              </button>
            </div>

            <label className="viroka-consent-label">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="viroka-consent-checkbox"
              />
              <span>I agree to receive product and research updates from SallyIP</span>
            </label>
          </form>
        </div>

        {/* 5. Legal Bar */}
        <div className="viroka-legal-bar">
          <span>© 2026 SallyIP. Designed for Legal Excellence</span>
          <div className="viroka-legal-links">
            <a href="#privacy" className="viroka-legal-link">Privacy Policy</a>
            <a href="#terms" className="viroka-legal-link">Terms of Service</a>
          </div>
        </div>
      </div>
    </div>
  );
}
