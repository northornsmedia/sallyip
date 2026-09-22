import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, Menu, X } from 'lucide-react';
import { NAV, SITE_URL } from './site';

export function useReveal() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.classList.add('in');
      return;
    }
    if (typeof IntersectionObserver === 'undefined') {
      el.classList.add('in');
      return;
    }
    const io = new IntersectionObserver((es) => {
      es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    el.querySelectorAll('.ent-reveal').forEach((n) => io.observe(n));
    if (el.classList.contains('ent-reveal')) io.observe(el);
    return () => io.disconnect();
  }, []);
  return ref;
}

export function go(path) {
  try {
    if (window.location.pathname === path) { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
    window.scrollTo({ top: 0 });
  } catch { window.location.href = path; }
}

export function Reveal({ children, className = '', as: Tag = 'div' }) {
  return <Tag className={`ent-reveal ${className}`}>{children}</Tag>;
}

export function Eyebrow({ children }) {
  return <div className="ent-eyebrow">{children}</div>;
}

export function Hero({ eyebrow, title, lede, primary, secondary, meta }) {
  return (
    <section className="ent-hero">
      <div className="ent-wrap">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h1 className="ent-h1">{title}</h1>
        <p className="ent-lede">{lede}</p>
        <div className="ent-hero-ctas">
          {primary}
          {secondary}
        </div>
        {meta && <div className="ent-hero-meta">{meta}</div>}
      </div>
    </section>
  );
}

export function Section({ id, children, light = false, tight = false }) {
  return (
    <section id={id} className={`${light ? 'ent-band-light ' : ''}${tight ? 'ent-section-tight ent-section' : 'ent-section'}`}>
      <div className="ent-wrap">{children}</div>
    </section>
  );
}

export function Split({ kicker, title, body, bullets = [], cta, visual, flip = false }) {
  return (
    <div className={`ent-split ${flip ? 'flip' : ''}`}>
      <Reveal>
        <div className="ent-kicker">{kicker}</div>
        <h3>{title}</h3>
        <p>{body}</p>
        {bullets.length > 0 && (
          <ul className="ent-bullets">
            {bullets.map((b, i) => <li key={i}><Check aria-hidden="true" focusable="false" />{b}</li>)}
          </ul>
        )}
        {cta}
      </Reveal>
      <Reveal>{visual}</Reveal>
    </div>
  );
}

export function Shot({ label, live = 'LIVE DEMO DATA', children }) {
  return (
    <div className="ent-shot">
      <div className="ent-shot-head"><span>{label}</span><span className="ent-live"><i aria-hidden="true" />{live}</span></div>
      <div className="ent-shot-body">{children}</div>
    </div>
  );
}

export function CTASection({ title, body }) {
  return (
    <section className="ent-cta">
      <div className="ent-wrap">
        <Reveal>
          <h2>{title}</h2>
          <p>{body}</p>
          <div className="ent-hero-ctas">
            <button type="button" className="ent-btn ent-btn-primary" onClick={() => go('/enterprise')}>Request a Demo <ArrowRight aria-hidden="true" focusable="false" /></button>
            <button type="button" className="ent-btn ent-btn-ghost" onClick={() => go('/product')}>Explore SallyIP</button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export function Breadcrumbs({ trail }) {
  return (
    <nav className="ent-crumbs" aria-label="Breadcrumb">
      <a href="/" onClick={(e) => { e.preventDefault(); go('/'); }}>Home</a>
      {trail.map((t, i) => (
        <span key={i}> / {t.to ? <a href={t.to} onClick={(e) => { e.preventDefault(); go(t.to); }}>{t.label}</a> : t.label}</span>
      ))}
    </nav>
  );
}

// Sets title/meta/canonical/OG per route — SPA side. Static prerender covers initial HTML.
export function usePageMeta(route) {
  useEffect(() => {
    if (!route) return;
    document.title = route.title;
    const set = (sel, attr, val) => {
      let el = document.head.querySelector(sel);
      if (!el) { el = document.createElement('meta'); document.head.appendChild(el); }
      el.setAttribute(attr, val);
    };
    let m = document.head.querySelector('meta[name="description"]');
    if (!m) { m = document.createElement('meta'); m.setAttribute('name', 'description'); document.head.appendChild(m); }
    m.setAttribute('content', route.description);
    let c = document.head.querySelector('link[rel="canonical"]');
    if (!c) { c = document.createElement('link'); c.setAttribute('rel', 'canonical'); document.head.appendChild(c); }
    c.setAttribute('href', `${SITE_URL}${route.path === '/' ? '/' : route.path}`);
    set('meta[property="og:title"]', 'property', 'og:title'); document.head.querySelector('meta[property="og:title"]').setAttribute('content', route.title);
    set('meta[property="og:description"]', 'property', 'og:description'); document.head.querySelector('meta[property="og:description"]').setAttribute('content', route.description);
  }, [route]);
}
