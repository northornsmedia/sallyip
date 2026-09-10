import React, { Suspense, lazy, useEffect, useState } from 'react';
import { ROUTES, isMarketingPath } from './site';
import '../marketing/enterprise.css';

// Code-split: each group is its own chunk; authenticated app never loads on marketing paths.
const HomePage = lazy(() => import('./pages/pages-home'));
const Core = lazy(() => import('./pages/pages-core'));
const Ip = lazy(() => import('./pages/pages-ip'));
const Company = lazy(() => import('./pages/pages-company'));

function resolve(path) {
  const r = ROUTES.find((x) => x.path === path);
  if (!r) return null;
  return r;
}

function PageFor({ route }) {
  if (route.kind === 'home') return <HomePage route={route} />;
  if (['product', 'solutions', 'enterprise', 'security', 'benchmarks', 'pricing'].includes(route.kind))
    return <CoreRouter route={route} />;
  if (route.kind.startsWith('detail') || ['patents', 'trademarks', 'copyright', 'design-rights', 'trade-secrets', 'ip-hub'].includes(route.kind))
    return <IpRouter route={route} />;
  return <CompanyRouter route={route} />;
}

function CoreRouter({ route }) {
  return (
    <Suspense fallback={<div className="ent-root"><div className="ent-wrap" style={{ padding: '120px 28px' }}>Loading…</div></div>}>
      <CoreSwitch route={route} />
    </Suspense>
  );
}
function CoreSwitch({ route }) {
  const [m, setM] = useState(null);
  useEffect(() => { import('./pages/pages-core').then((mod) => setM(mod)); }, []);
  if (!m) return <div className="ent-root"><div className="ent-wrap" style={{ padding: '120px 28px' }}>Loading…</div></div>;
  const map = { product: m.ProductPage, solutions: m.SolutionsPage, enterprise: m.EnterprisePage, security: m.SecurityPage, benchmarks: m.BenchmarksPage, pricing: m.PricingPage };
  const C = map[route.kind] || m.ProductPage;
  return <C route={route} />;
}

function IpRouter({ route }) {
  const [m, setM] = useState(null);
  useEffect(() => { import('./pages/pages-ip').then((mod) => setM(mod)); }, []);
  if (!m) return <div className="ent-root"><div className="ent-wrap" style={{ padding: '120px 28px' }}>Loading…</div></div>;
  const map = { 'ip-hub': m.IpHubPage, patents: m.PatentsPage, trademarks: m.TrademarksPage, copyright: m.CopyrightPage, 'design-rights': m.DesignRightsPage, 'trade-secrets': m.TradeSecretsPage, 'detail-novelty': m.NoveltyPage, 'detail-claims': m.ClaimChartsPage, 'detail-oa': m.OfficeActionPage };
  const C = map[route.kind] || m.IpHubPage;
  return <C route={route} />;
}

function CompanyRouter({ route }) {
  const [m, setM] = useState(null);
  useEffect(() => { import('./pages/pages-company').then((mod) => setM(mod)); }, []);
  if (!m) return <div className="ent-root"><div className="ent-wrap" style={{ padding: '120px 28px' }}>Loading…</div></div>;
  return <m.GenericPage route={route} />;
}

export function useMarketingPath() {
  const [path, setPath] = useState(() => window.location.pathname.replace(/\/$/, '') || '/');
  useEffect(() => {
    const onPop = () => setPath(window.location.pathname.replace(/\/$/, '') || '/');
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  return path === '' ? '/' : path;
}

export default function EnterpriseApp({ path: propPath }) {
  const hookPath = useMarketingPath();
  const path = propPath || hookPath;
  const route = resolve(path);
  if (!route) return null;
  return (
    <Suspense fallback={<div className="ent-root"><div className="ent-wrap" style={{ padding: '120px 28px' }}>Loading SallyIP…</div></div>}>
      <PageFor route={route} />
    </Suspense>
  );
}

export { isMarketingPath, resolve };
