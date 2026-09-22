import React, { useEffect, useRef } from 'react';

// Art direction registry — one entry per screenshot.
// purpose: why this shot exists · focal: what the crop emphasizes
// caption: visible honest caption · alt: screen-reader text · pages: placement
export const SHOTS = {
  'chat-home': {
    webp: '/shots/sallyip-chat-home.webp', png: '/shots/sallyip-chat-home.png',
    w: 1424, h: 749,
    purpose: 'Hero proof: the actual SallyIP chat workspace — matter tabs, model picker, workspace shortcuts, quick actions.',
    focal: 'Full chat home: General Matter tab, SallyIP 4.2 Pro picker, Prior-art / FTO / Draft / Clear actions.',
    caption: 'SallyIP chat workspace — matter-scoped, quick actions for prior art, FTO, drafting, clearance.',
    alt: 'SallyIP chat workspace showing a new conversation, model picker, and quick-action buttons for prior-art search, FTO analysis, draft US patent, and clear a trademark.',
    pages: '/, /product',
  },
  'workspaces': {
    webp: '/shots/sallyip-workspaces.webp', png: '/shots/sallyip-workspaces.png',
    w: 1424, h: 749,
    purpose: 'Moduleproof: the Specialist Legal Workspaces modal — the 8 shipped workspaces named exactly as in product.',
    focal: 'Modal grid: US Patent Drafter, Contract Review, Playbooks Desk, FTO, Claim Chart Builder, Prior Art & Novelty, Trademark Intelligence, Knowledge Graph.',
    caption: 'Specialist workspaces — drafting, review, playbooks, FTO, claim charts, prior art, trademarks, knowledge graph.',
    alt: 'Specialist Legal Workspaces modal listing eight modules: US Patent Drafter, Contract Review, Playbooks Desk, Freedom to Operate, Claim Chart Builder, Prior Art and Novelty, Trademark Intelligence, Knowledge Graph and Citations.',
    pages: '/product, /modules',
  },
  'patent-drafting': {
    webp: '/shots/sallyip-patent-drafting.webp', png: '/shots/sallyip-patent-drafting.png',
    w: 1424, h: 749,
    purpose: 'Drafting proof: US Patent Drafting Workspace shell — §111 filing categories and grounded-disclosure field.',
    focal: 'Full modal: Provisional §111(b) / Nonprovisional §111(a) cards and invention-disclosure notes.',
    caption: 'US patent drafting workspace — §111 filing choice grounded in the inventor’s own disclosure.',
    alt: 'US Patent Drafting Workspace showing provisional and nonprovisional filing category cards and an invention disclosure text field.',
    pages: '/product, /office-action-defense',
  },
  'patent-drafting-focus': {
    webp: '/shots/sallyip-patent-drafting-focus.webp', png: '/shots/sallyip-patent-drafting-focus.png',
    w: 1139, h: 412,
    purpose: 'Legibility crop: filing-category decision at readable size on mobile.',
    focal: 'Tight crop on Provisional / Nonprovisional cards; unauthenticated demo banner excluded by crop.',
    caption: 'Filing choice — provisional §111(b) or nonprovisional §111(a) — before any text is generated.',
    alt: 'Close crop of provisional and nonprovisional filing category cards in the patent drafting workspace.',
    pages: '/, /patents',
  },
  'chat-actions-focus': {
    webp: '/shots/sallyip-chat-actions-focus.webp', png: '/shots/sallyip-chat-actions-focus.png',
    w: 1111, h: 330,
    purpose: 'Legibility crop: quick-action row at readable size.',
    focal: 'Prompt field plus Prior-art search, FTO analysis, Draft US patent, Clear a trademark buttons.',
    caption: 'Start from the work — prior art, FTO, drafting, or clearance — not a blank prompt.',
    alt: 'Close crop of the chat prompt field and four quick-action buttons: prior-art search, FTO analysis, draft US patent, clear a trademark.',
    pages: '/trademarks, /novelty-search',
  },
};

// No screenshot exists in-repo for: verification desk detail, claim-chart detail,
// office-action thread, trademark clearance grid, benchmark runs table.
// Those stay as workspace-pattern compositions (VerifiedPanel below) labelled
// DEMO DATA — never as faked product captures. See report §10 visual debt.
function useTilt() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const io = new IntersectionObserver((es) => {
      es.forEach((e) => { if (e.isIntersecting) { el.classList.add('in'); io.disconnect(); } });
    }, { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return ref;
}

export function ProductShot({ id, eager = false, className = '' }) {
  const s = SHOTS[id];
  if (!s) return null;
  const ref = useTilt();
  return (
    <figure className={`ent-pshot ${className}`} ref={ref}>
      <div className="ent-pshot-frame" style={{ aspectRatio: `${s.w} / ${s.h}` }}>
        <picture>
          <source srcSet={s.webp} type="image/webp" />
          <img src={s.png} alt={s.alt} width={s.w} height={s.h}
            loading={eager ? 'eager' : 'lazy'} decoding="async"
            fetchPriority={eager ? 'high' : 'auto'} />
        </picture>
      </div>
      <figcaption>{s.caption}</figcaption>
    </figure>
  );
}

// Workspace-pattern composition for views with no captured screenshot.
// Mirrors real workspace field names (matter, proposition, quote state) —
// synthetic content, always labelled DEMO DATA. Not a screenshot.
export function VerifiedPanel({ eyebrow, rows, note = 'DEMO DATA — workspace pattern, synthetic content for illustration.' }) {
  return (
    <section className="ent-shot" aria-label={eyebrow}>
      <div className="ent-shot-head"><span>{eyebrow}</span><span className="ent-live"><i aria-hidden="true" />DEMO DATA</span></div>
      <div className="ent-shot-body">
        {rows.map((r, i) => (
          <div key={i} className="ent-vrow">
            <div className="ent-vrow-top"><code>{r[0]}</code><b className={`ent-verdict ${/VERIFIED/.test(r[2]) ? 'ok' : /QUALIFIED/.test(r[2]) ? 'warn' : 'muted'}`}>{r[2]}</b></div>
            <p>{r[1]}</p>
          </div>
        ))}
        <div className="ent-demo-note" style={{ padding: '10px 0 0' }}>{note}</div>
      </div>
    </section>
  );
}
