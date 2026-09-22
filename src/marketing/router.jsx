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
    <Suspense fallback={<LoadingState label="Loading…" />}>
      <CoreSwitch route={route} />
    </Suspense>
  );
}
class RouteErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; this.headingRef = React.createRef(); }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidUpdate(prevProps, prevState) {
    if (this.state.error && !prevState.error && this.headingRef.current) this.headingRef.current.focus();
  }
  render() {
    if (this.state.error) {
      return <div className="ent-root"><div className="ent-wrap" style={{ padding: '120px 28px' }}><h1 ref={this.headingRef} tabIndex={-1}>Something went wrong.</h1><p>Please refresh or return home.</p><button type="button" className="ent-btn ent-btn-primary" onClick={() => { this.setState({ error: null }); window.location.href = '/'; }}>Go home</button></div></div>;
    }
    return this.props.children;
  }
}
function useLazyModule(loader) {
  const [m, setM] = useState(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let alive = true;
    loader().then((mod) => { if (alive) setM(mod); }).catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, []);
  return { m, failed, retry: () => { setFailed(false); setM(null); loader().then(setM).catch(() => setFailed(true)); } };
}
function LoadFailed({ onRetry }) {
  return <div className="ent-root"><div className="ent-wrap" style={{ padding: '120px 28px' }}><h1>Page failed to load.</h1><p>Check your connection and try again.</p><button type="button" className="ent-btn ent-btn-primary" onClick={onRetry}>Retry</button></div></div>;
}
function LoadingState({ label = 'Loading SallyIP…' }) {
  return <div className="ent-root"><div className="ent-wrap" style={{ padding: '120px 28px' }}><div role="status" aria-live="polite">{label}</div></div></div>;
}
function CoreSwitch({ route }) {
  const { m, failed, retry } = useLazyModule(() => import('./pages/pages-core'));
  if (failed) return <LoadFailed onRetry={retry} />;
  if (!m) return <LoadingState label="Loading…" />;
  const map = { product: m.ProductPage, solutions: m.SolutionsPage, enterprise: m.EnterprisePage, security: m.SecurityPage, benchmarks: m.BenchmarksPage, pricing: m.PricingPage };
  const C = map[route.kind] || m.ProductPage;
  return <C route={route} />;
}

function IpRouter({ route }) {
  const { m, failed, retry } = useLazyModule(() => import('./pages/pages-ip'));
  if (failed) return <LoadFailed onRetry={retry} />;
  if (!m) return <LoadingState label="Loading…" />;
  const map = { 'ip-hub': m.IpHubPage, patents: m.PatentsPage, trademarks: m.TrademarksPage, copyright: m.CopyrightPage, 'design-rights': m.DesignRightsPage, 'trade-secrets': m.TradeSecretsPage, 'detail-novelty': m.NoveltyPage, 'detail-claims': m.ClaimChartsPage, 'detail-oa': m.OfficeActionPage };
  const C = map[route.kind] || m.IpHubPage;
  return <C route={route} />;
}

function CompanyRouter({ route }) {
  const { m, failed, retry } = useLazyModule(() => import('./pages/pages-company'));
  if (failed) return <LoadFailed onRetry={retry} />;
  if (!m) return <LoadingState label="Loading…" />;
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

function NotFound({ path }) {
  return <div className="ent-root"><div className="ent-wrap" style={{ padding: '120px 28px' }}><p className="ent-eyebrow">404</p><h1>Page not found.</h1><p>No page at {path}. Return to safety.</p><button className="ent-btn ent-btn-primary" onClick={() => { window.history.pushState({}, '', '/'); window.dispatchEvent(new PopStateEvent('popstate')); window.scrollTo(0, 0); }}>Go home</button></div></div>;
}
export default function EnterpriseApp({ path: propPath }) {
  const hookPath = useMarketingPath();
  const path = propPath || hookPath;
  const route = resolve(path);
  if (!route) return <NotFound path={path} />;
  return (
    <RouteErrorBoundary>
      <Suspense fallback={<LoadingState />}>
        <PageFor route={route} />
      </Suspense>
    </RouteErrorBoundary>
  );
}

export { isMarketingPath, resolve };
