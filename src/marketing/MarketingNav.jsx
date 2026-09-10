import React, { useState } from 'react';
import { ArrowRight, Menu, X } from 'lucide-react';
import { NAV } from './site';
import { go } from './ui';

export default function MarketingNav({ active }) {
  const [openMenu, setOpenMenu] = useState(null);
  const [drawer, setDrawer] = useState(false);

  return (
    <header className="ent-nav" onMouseLeave={() => setOpenMenu(null)}>
      <div className="ent-nav-inner">
        <button className="ent-brand" onClick={() => go('/')} aria-label="SallyIP home">
          <img src="/sallyip-brand-mark.png" alt="SallyIP" />
          SallyIP <small>Enterprise</small>
        </button>
        <nav className="ent-links" aria-label="Primary">
          {NAV.map((n) => (
            <button
              key={n.label}
              className={`ent-link ${active === n.path ? 'active' : ''}`}
              onMouseEnter={() => setOpenMenu(n.menu ? n.label : null)}
              onClick={() => (n.menu ? setOpenMenu(openMenu === n.label ? null : n.label) : go(n.path))}
            >
              {n.label}
            </button>
          ))}
        </nav>
        <div className="ent-nav-cta">
          <button className="ent-signin" onClick={() => { window.location.hash = 'auth'; window.dispatchEvent(new HashChangeEvent('hashchange')); }}>Sign In</button>
          <button className="ent-btn ent-btn-ghost ent-btn-sm" onClick={() => go('/product')}>Explore SallyIP</button>
          <button className="ent-btn ent-btn-primary ent-btn-sm" onClick={() => go('/enterprise')}>Request a Demo <ArrowRight /></button>
          <button className="ent-signin ent-drawer" onClick={() => setDrawer(!drawer)} aria-label="Menu">{drawer ? <X /> : <Menu />}</button>
        </div>
      </div>
      {NAV.map((n) => n.menu && openMenu === n.label && (
        <div key={n.label} className="ent-mega open">
          <div className="ent-mega-inner">
            {n.menu.map((col) => (
              <div key={col.h}>
                <h4>{col.h}</h4>
                {col.links.map((l) => (
                  <a key={l.t} href={l.to} onClick={(e) => { e.preventDefault(); setOpenMenu(null); go(l.to); }}>
                    <b>{l.t}</b><span>{l.d}</span>
                  </a>
                ))}
              </div>
            ))}
          </div>
        </div>
      ))}
      {drawer && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,.08)', padding: '12px 28px 20px', display: 'grid', gap: 4, background: '#0e1016' }}>
          {[{ label: 'Home', path: '/' }, ...NAV.flatMap((n) => [{ label: n.label, path: n.path }, ...(n.menu ? n.menu.flatMap((c) => c.links.map((l) => ({ label: `— ${l.t}`, path: l.to }))) : [])])].map((l, i) => (
            <button key={i} className="ent-link" style={{ textAlign: 'left' }} onClick={() => { setDrawer(false); go(l.path); }}>{l.label}</button>
          ))}
        </div>
      )}
    </header>
  );
}
