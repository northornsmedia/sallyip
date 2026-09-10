import React, { useState } from 'react';
import { ArrowRight, Menu, Sparkles, X } from 'lucide-react';

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
        </button>

        {/* Desktop Navigation Links */}
        <nav className="sh-nav-links">
          {navItems.map((item) => {
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                className={isActive ? 'sh-nav-link-active' : ''}
                style={{
                  color: isActive ? '#ffffff' : '#94a3b8',
                  fontWeight: isActive ? 600 : 500,
                  position: 'relative',
                  padding: '6px 2px',
                }}
                onClick={() => handleNav(item.id)}
              >
                {item.label}
                {isActive && (
                  <span
                    style={{
                      position: 'absolute',
                      bottom: -4,
                      left: 0,
                      right: 0,
                      height: 2,
                      background: 'linear-gradient(90deg, #6366f1, #a855f7)',
                      borderRadius: 2,
                    }}
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Action Buttons */}
        <div className="sh-nav-actions">
          <button
            className="sh-btn-text"
            onClick={onOpenAuth || (() => handleNav('auth'))}
          >
            Sign in
          </button>
          <button
            className="sh-btn-white"
            onClick={onOpenChat || (() => handleNav('chat'))}
          >
            Launch Studio <ArrowRight size={15} />
          </button>
          {/* Mobile hamburger toggle */}
          <button
            className="sh-mobile-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{
              display: 'none',
              background: 'transparent',
              border: 'none',
              color: '#fff',
              cursor: 'pointer',
              padding: 6,
            }}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            background: 'rgba(9, 9, 11, 0.98)',
            backdropFilter: 'blur(20px)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            padding: '20px 28px',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            zIndex: 100,
          }}
        >
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNav(item.id)}
              style={{
                background: 'transparent',
                border: 'none',
                color: activePage === item.id ? '#ffffff' : '#94a3b8',
                fontSize: 16,
                fontWeight: activePage === item.id ? 600 : 500,
                textAlign: 'left',
                cursor: 'pointer',
                padding: '8px 0',
              }}
            >
              {item.label}
            </button>
          ))}
          <div style={{ paddingTop: 12, borderTop: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', gap: 12 }}>
            <button
              className="sh-btn-text"
              style={{ flex: 1 }}
              onClick={onOpenAuth || (() => handleNav('auth'))}
            >
              Sign in
            </button>
            <button
              className="sh-btn-white"
              style={{ flex: 1 }}
              onClick={onOpenChat || (() => handleNav('chat'))}
            >
              Launch Studio <ArrowRight size={15} />
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
