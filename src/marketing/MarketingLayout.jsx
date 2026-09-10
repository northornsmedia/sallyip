import React from 'react';
import MarketingNav from './MarketingNav';
import MarketingFooter from './MarketingFooter';
import { useReveal, usePageMeta } from './ui';

export default function MarketingLayout({ route, active, children }) {
  const ref = useReveal();
  usePageMeta(route);
  return (
    <div className="ent-root" ref={ref}>
      <MarketingNav active={active || (route ? route.path : '/')} />
      <main>{children}</main>
      <MarketingFooter />
    </div>
  );
}
