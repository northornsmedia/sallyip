import React from 'react';
import { FOOTER } from './site';
import { go } from './ui';

export default function MarketingFooter() {
  return (
    <footer className="ent-footer">
      <div className="ent-wrap">
        <div className="ent-footer-grid">
          <div className="ent-footer-brand">
            <button className="ent-brand" onClick={() => go('/')} style={{ marginBottom: 14 }}>
              <img src="/sallyip-brand-mark.png" alt="SallyIP" /> SallyIP
            </button>
            <p>Verification-first AI for intellectual property work. Research tools, not legal advice. Practitioner review required.</p>
            <p style={{ marginTop: 12, fontSize: 12, color: '#5d6372' }}>No evidence, no assertion.</p>
          </div>
          {FOOTER.map((col) => (
            <div key={col.h}>
              <h5>{col.h}</h5>
              {col.links.map((l) => (
                <a key={l.to + l.t} href={l.to} onClick={(e) => { e.preventDefault(); go(l.to); }}>{l.t}</a>
              ))}
            </div>
          ))}
        </div>
        <div className="ent-legal">
          <span>© 2026 SallyIP. Research tools, not legal advice.</span>
          <span style={{ display: 'flex', gap: 16 }}>
            <a href="/security" onClick={(e) => { e.preventDefault(); go('/security'); }}>Security</a>
            <a href="/trust" onClick={(e) => { e.preventDefault(); go('/trust'); }}>Trust center</a>
            <a href="/benchmarks" onClick={(e) => { e.preventDefault(); go('/benchmarks'); }}>Benchmarks</a>
          </span>
        </div>
      </div>
    </footer>
  );
}
