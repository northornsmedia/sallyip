import React from 'react';
import MarketingNav from './MarketingNav';
import MarketingFooter from './MarketingFooter';
import { useReveal, usePageMeta } from './ui';

export default function MarketingLayout({ route, active, children }) {
  const ref = useReveal();
  usePageMeta(route);
  return (
    <div className="ent-root" ref={ref}>
      <a href="#main-content" className="ent-skip">Skip to main content</a>
      <MarketingNav active={active || (route ? route.path : '/')} />
      <main id="main-content" tabIndex={-1}>{children}</main>
      <MarketingFooter />
    </div>
  );
}
