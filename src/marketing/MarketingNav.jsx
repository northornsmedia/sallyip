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
        <button type="button" className="ent-brand" onClick={() => go('/')} aria-label="SallyIP home">
          <img src="/sallyip-brand-mark.png" alt="SallyIP" width={26} height={26} loading="eager" decoding="async" fetchPriority="high" />
          SallyIP <small>Enterprise</small>
        </button>
        <nav className="ent-links" aria-label="Primary">
          {NAV.map((n) => (
            <button
              key={n.label}
              type="button"
              className={`ent-link ${active === n.path ? 'active' : ''}`}
              aria-expanded={n.menu ? openMenu === n.label : undefined}
              aria-haspopup={n.menu ? 'true' : undefined}
              aria-controls={n.menu ? `mega-${n.label}` : undefined}
              onMouseEnter={() => setOpenMenu(n.menu ? n.label : null)}
              onFocus={() => setOpenMenu(n.menu ? n.label : null)}
              onClick={() => (n.menu ? setOpenMenu(openMenu === n.label ? null : n.label) : go(n.path))}
            >
              {n.label}
            </button>
          ))}
        </nav>
        <div className="ent-nav-cta">
          <button type="button" className="ent-signin" onClick={() => { window.location.hash = 'auth'; window.dispatchEvent(new HashChangeEvent('hashchange')); }}>Sign In</button>
          <button type="button" className="ent-btn ent-btn-ghost ent-btn-sm" onClick={() => go('/product')}>Explore SallyIP</button>
          <button type="button" className="ent-btn ent-btn-primary ent-btn-sm" onClick={() => go('/enterprise')}>Request a Demo <ArrowRight aria-hidden="true" focusable="false" /></button>
          <button type="button" className="ent-signin ent-drawer" onClick={() => setDrawer(!drawer)} aria-expanded={drawer} aria-controls="mkt-drawer" aria-label={drawer ? 'Close menu' : 'Open menu'}>{drawer ? <X aria-hidden="true" focusable="false" /> : <Menu aria-hidden="true" focusable="false" />}</button>
        </div>
      </div>
      {NAV.map((n) => n.menu && openMenu === n.label && (
        <div key={n.label} id={`mega-${n.label}`} role="region" aria-label={`${n.label} submenu`} className="ent-mega open" onKeyDown={(e) => { if (e.key === 'Escape') setOpenMenu(null); }}>
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
        <div id="mkt-drawer" role="dialog" aria-label="Site menu" style={{ borderTop: '1px solid rgba(255,255,255,.08)', padding: '12px 28px 20px', display: 'grid', gap: 4, background: '#0e1016', maxHeight: 'calc(100dvh - 64px)', overflow: 'auto' }}>
          {[{ label: 'Home', path: '/' }, ...NAV.flatMap((n) => [{ label: n.label, path: n.path }, ...(n.menu ? n.menu.flatMap((c) => c.links.map((l) => ({ label: `— ${l.t}`, path: l.to }))) : [])])].map((l, i) => (
            <button key={i} type="button" className="ent-link" style={{ textAlign: 'left', minHeight: 44 }} onClick={() => { setDrawer(false); go(l.path); }}>{l.label}</button>
          ))}
        </div>
      )}
    </header>
  );
}
