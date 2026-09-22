import React, { useState } from 'react';
import { ArrowRight, Menu, X } from 'lucide-react';

export default function SallyTopNav({
  activePage = 'home',
  onNavigate,
  onOpenChat,
  onOpenAuth,
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'lifecycle', label: 'Lifecycle' },
    { id: 'modules', label: 'Modules' },
    { id: 'performance', label: 'Performance' },
    { id: 'security', label: 'Security' },
    { id: 'pricing', label: 'Pricing' },
    { id: 'benchmarks', label: 'Benchmarks' },
  ];

  const handleNav = (id) => {
    setMobileMenuOpen(false);
    if (onNavigate) {
      onNavigate(id);
    } else {
      window.location.hash = id;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <header className="sh-topnav">
      <div className="sh-topnav-inner">
        {/* Brand with Logo */}
        <button
          className="sh-brand"
          onClick={() => handleNav('home')}
          title="SallyIP Home"
        >
          <div className="sh-brand-icon">
            <img
              src="/sallyip-brand-mark.png"
              alt="SallyIP"
              className="sh-brand-logo-img"
            />
          </div>
          <span className="sh-brand-name">SallyIP</span>
          <span className="sh-brand-tag">PRO</span>
        </button>

        {/* Desktop Navigation Links */}
        <nav className="sh-nav-links">
          {navItems.map((item) => {
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                className={`sh-nav-item ${isActive ? 'active' : ''}`}
                onClick={() => handleNav(item.id)}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Action Buttons */}
        <div className="sh-nav-actions">
          <button
            className="sh-btn-minimal"
            onClick={onOpenAuth || (() => handleNav('auth'))}
          >
            Sign in
          </button>
          <button
            className="sh-btn-apple"
            onClick={onOpenChat || (() => handleNav('chat'))}
          >
            <span>Launch Studio</span>
            <ArrowRight size={14} />
          </button>
          {/* Mobile hamburger toggle */}
          <button
            className="sh-mobile-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer (Solid dark, zero frosted blur) */}
      {mobileMenuOpen && (
        <div className="sh-mobile-drawer">
          <div className="sh-mobile-drawer-inner">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNav(item.id)}
                className={`sh-mobile-nav-link ${activePage === item.id ? 'active' : ''}`}
              >
                {item.label}
              </button>
            ))}
            <div className="sh-mobile-actions">
              <button
                className="sh-btn-minimal"
                onClick={onOpenAuth || (() => handleNav('auth'))}
              >
                Sign in
              </button>
              <button
                className="sh-btn-apple"
                onClick={onOpenChat || (() => handleNav('chat'))}
              >
                <span>Launch Studio</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
