import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import './modern-gradient-footer.css';

const FAQ_ITEMS = [
  {
    question: "Is training required to get started?",
    answer: "No specialized training is required. SallyIP provides an intuitive zero-configuration interface with ready-to-use templates for novelty search, patent claim charting, and trademark clearance."
  },
  {
    question: "How does the platform ensure regulatory compliance?",
    answer: "Our pipeline enforces strict deterministic proposition verification, ensuring every generated citation links directly to primary USPTO, EPO, or statutory authorities without dangling hallucinated claims."
  },
  {
    question: "How securely is the data stored?",
    answer: "All enterprise matter documents, patent drafts, and client data are encrypted in transit and at rest with AES-256 and stored in SOC2 Type II audited environments with strict zero-data-retention guarantees."
  }
];

export default function ModernGradientFooter({
  onDemoClick,
  onNavigate,
}) {
  const [openFaq, setOpenFaq] = useState(-1);

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? -1 : index);
  };

  const handleLinkClick = (hash) => {
    if (onNavigate) {
      onNavigate(hash);
    } else {
      window.location.hash = hash;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="mg-footer-root">
      {/* 1. FAQ Accordion Cards at the top of the footer gradient */}
      <div className="mg-faq-container">
        {FAQ_ITEMS.map((item, idx) => {
          const isOpen = openFaq === idx;
          return (
            <div key={idx} className="mg-faq-card">
              <button
                type="button"
                className="mg-faq-trigger"
                onClick={() => toggleFaq(idx)}
                aria-expanded={isOpen}
              >
                <span>{item.question}</span>
                <ChevronDown
                  size={18}
                  className={`mg-faq-chevron ${isOpen ? 'open' : ''}`}
                />
              </button>
              {isOpen && (
                <div className="mg-faq-body">
                  {item.answer}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 2. Main Footer Content Row */}
      <div className="mg-footer-main">
        {/* Left Column: Socials, Email & Address */}
        <div className="mg-footer-left">
          <div className="mg-social-row">
            {/* Facebook / Web Icon */}
            <a
              href="https://facebook.com"
              target="_blank"
              rel="noreferrer"
              className="mg-social-icon"
              aria-label="Facebook"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M14.5 9h-2.2c-.8 0-1.3.5-1.3 1.3V12H9v2.5h2v6.5h2.5V14.5h2l.5-2.5h-2.5v-1.5c0-.4.3-.7.7-.7h1.8V9z" />
              </svg>
            </a>

            {/* LinkedIn Icon */}
            <a
              href="https://linkedin.com"
              target="_blank"
              rel="noreferrer"
              className="mg-social-icon"
              aria-label="LinkedIn"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="18" x="3" y="3" rx="4" />
                <path d="M8 11v5" />
                <path d="M8 8v.01" />
                <path d="M12 16v-5" />
                <path d="M16 16v-3a2 2 0 0 0-4 0" />
              </svg>
            </a>

            {/* X / Twitter Icon */}
            <a
              href="https://x.com"
              target="_blank"
              rel="noreferrer"
              className="mg-social-icon"
              aria-label="X / Twitter"
            >
              <svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
          </div>

          <a href="mailto:hello@sallyip.ai" className="mg-footer-email">
            hello@sallyip.ai
          </a>

          <address className="mg-footer-address">
            Harju maakond, Tallinn,<br />
            Kesklinna linnaosa,<br />
            Vesivärava tn 50-201, 10152
          </address>
        </div>

        {/* Center: Animated Constellation & Bracketed "Get a Demo [FREE]" pill */}
        <div className="mg-footer-center">
          <div className="mg-center-bracket-wrap">
            {/* Left Dot Constellation with twinkling animations and crosshairs */}
            <svg className="mg-dot-constellation" viewBox="0 0 100 90" fill="none">
              {[...Array(5)].map((_, r) =>
                [...Array(6)].map((_, c) => {
                  const idx = (r * 6 + c) % 4;
                  const isCross = (r + c) % 5 === 0;
                  const cx = 10 + c * 15;
                  const cy = 10 + r * 16;
                  if (isCross) {
                    return (
                      <g key={`l-${r}-${c}`} className={`mg-twinkle-${idx}`} transform={`translate(${cx}, ${cy})`}>
                        <line x1="-3" y1="0" x2="3" y2="0" stroke="#60a5fa" strokeWidth="0.8" />
                        <line x1="0" y1="-3" x2="0" y2="3" stroke="#60a5fa" strokeWidth="0.8" />
                      </g>
                    );
                  }
                  return (
                    <circle
                      key={`l-${r}-${c}`}
                      cx={cx}
                      cy={cy}
                      r={(r + c) % 3 === 0 ? 2.2 : 1.2}
                      className={`mg-twinkle-${idx}`}
                    />
                  );
                })
              )}
            </svg>

            {/* Left Animated Bracket Line */}
            <div className="mg-bracket-line left">
              <div className="mg-bracket-pulse" />
            </div>

            {/* Glowing Ambient Halo behind the button */}
            <div className="mg-btn-ambient-halo" />

            {/* Dark Demo Action Pill Button with Hover and Sheen Animation */}
            <button
              type="button"
              className="mg-demo-pill-btn"
              onClick={onDemoClick ? onDemoClick : () => handleLinkClick('chat')}
            >
              <span className="mg-demo-btn-text">Get a Demo</span>
              <span className="mg-free-tag">FREE</span>
              <div className="mg-demo-btn-sheen" />
            </button>

            {/* Right Animated Bracket Line */}
            <div className="mg-bracket-line right">
              <div className="mg-bracket-pulse" />
            </div>

            {/* Right Dot Constellation with twinkling animations and crosshairs */}
            <svg className="mg-dot-constellation" viewBox="0 0 100 90" fill="none">
              {[...Array(5)].map((_, r) =>
                [...Array(6)].map((_, c) => {
                  const idx = (r * 6 + c + 2) % 4;
                  const isCross = (r + c + 1) % 5 === 0;
                  const cx = 10 + c * 15;
                  const cy = 10 + r * 16;
                  if (isCross) {
                    return (
                      <g key={`r-${r}-${c}`} className={`mg-twinkle-${idx}`} transform={`translate(${cx}, ${cy})`}>
                        <line x1="-3" y1="0" x2="3" y2="0" stroke="#60a5fa" strokeWidth="0.8" />
                        <line x1="0" y1="-3" x2="0" y2="3" stroke="#60a5fa" strokeWidth="0.8" />
                      </g>
                    );
                  }
                  return (
                    <circle
                      key={`r-${r}-${c}`}
                      cx={cx}
                      cy={cy}
                      r={(r + c) % 2 === 0 ? 2.2 : 1.2}
                      className={`mg-twinkle-${idx}`}
                    />
                  );
                })
              )}
            </svg>
          </div>
        </div>

        {/* Right Column: Navigation Links */}
        <div className="mg-footer-right">
          <button type="button" className="mg-footer-nav-link" onClick={() => handleLinkClick('modules')}>
            Platform
          </button>
          <button type="button" className="mg-footer-nav-link" onClick={() => handleLinkClick('lifecycle')}>
            Use Cases
          </button>
          <button type="button" className="mg-footer-nav-link" onClick={() => handleLinkClick('benchmarks')}>
            Resources
          </button>
          <button type="button" className="mg-footer-nav-link" onClick={() => handleLinkClick('performance')}>
            Services
          </button>
          <button type="button" className="mg-footer-nav-link" onClick={() => handleLinkClick('home')}>
            About
          </button>
        </div>
      </div>

      {/* 3. Sub-footer Legal & Copyright Row */}
      <div className="mg-footer-bottom-row">
        <a href="#terms" className="mg-bottom-link">
          Terms and conditions
        </a>
        <span>© 2026 SallyIP. All Rights Reserved</span>
        <a href="#privacy" className="mg-bottom-link">
          Privacy Policy
        </a>
      </div>

      {/* 4. Giant Watermark Typography matching user screenshot */}
      <div className="mg-watermark-wrap">
        <span className="mg-watermark-text">sallyip</span>
      </div>
    </div>
  );
}
