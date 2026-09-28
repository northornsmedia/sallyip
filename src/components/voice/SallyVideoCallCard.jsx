/**
 * SallyVideoCallCard.jsx
 *
 * Professional Under Construction Card for Video Call feature.
 * Strictly NO glassmorphism, NO backdrop-filter, NO star icons, NO pill shapes.
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  VideoOff,
  PhoneCall,
  ShieldCheck,
  X,
  Clock,
  Cpu
} from 'lucide-react';

export function SallyVideoCallCard({
  isOpen = false,
  onClose,
  onSwitchToVoice,
  matterId = null,
  conversationId = null,
}) {
  if (!isOpen) return null;

  const handleSwitchVoice = () => {
    onClose?.();
    if (typeof onSwitchToVoice === 'function') {
      onSwitchToVoice();
    }
  };

  return (
    <AnimatePresence>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          background: 'rgba(0, 0, 0, 0.78)',
          /* Zero blur / glassmorphism */
        }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.14 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: '520px',
            background: '#0f131a',
            border: '1px solid #232b3b',
            borderRadius: '6px',
            boxShadow: '0 16px 40px rgba(0, 0, 0, 0.65)',
            padding: '28px 24px 24px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            color: '#f8fafc',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            overflow: 'hidden',
          }}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '14px',
              right: '14px',
              width: '28px',
              height: '28px',
              borderRadius: '4px',
              border: '1px solid #2d3748',
              background: '#1a2230',
              color: '#8b99ad',
              display: 'grid',
              placeItems: 'center',
              cursor: 'pointer',
              transition: 'all 0.12s ease',
            }}
            title="Close"
          >
            <X style={{ width: '15px', height: '15px' }} />
          </button>

          {/* Clean Solid Icon Container */}
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '4px',
              background: '#141923',
              border: '1px solid #232b3b',
              color: '#94a3b8',
              display: 'grid',
              placeItems: 'center',
              marginBottom: '16px',
            }}
          >
            <VideoOff style={{ width: '22px', height: '22px' }} />
          </div>

          {/* Status Badge — Rectangular Tag, NO PILL */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '3px 8px',
              borderRadius: '3px',
              background: '#332208',
              border: '1px solid #d97706',
              color: '#fbbf24',
              fontSize: '10.5px',
              fontWeight: '700',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              marginBottom: '14px',
            }}
          >
            <Clock style={{ width: '12px', height: '12px' }} />
            <span>Under Construction • We'll Be Back</span>
          </div>

          {/* Title */}
          <h2
            style={{
              fontSize: '20px',
              fontWeight: '700',
              letterSpacing: '-0.01em',
              margin: '0 0 8px',
              color: '#ffffff',
            }}
          >
            Real-Time Video Call
          </h2>

          {/* Description */}
          <p
            style={{
              fontSize: '13px',
              lineHeight: '1.6',
              color: '#94a3b8',
              maxWidth: '420px',
              margin: '0 0 20px',
            }}
          >
            Our photorealistic digital human video engine is currently undergoing neural pipeline and latency optimization. We'll be back shortly with ultra-low latency interactive video.
          </p>

          {/* Feature Highlights */}
          <div
            style={{
              width: '100%',
              background: '#141923',
              border: '1px solid #232b3b',
              borderRadius: '4px',
              padding: '14px 16px',
              marginBottom: '22px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              textAlign: 'left',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#cbd5e1' }}>
              <ShieldCheck style={{ width: '15px', height: '15px', color: '#10b981', flexShrink: 0 }} />
              <span>Full-Duplex Conversational Voice Call is <strong>100% Active</strong></span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#cbd5e1' }}>
              <Cpu style={{ width: '15px', height: '15px', color: '#818cf8', flexShrink: 0 }} />
              <span>Primary reasoning layer powered by live NVIDIA NIM</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              width: '100%',
            }}
          >
            <button
              onClick={handleSwitchVoice}
              style={{
                flex: 1,
                padding: '10px 16px',
                borderRadius: '4px',
                border: '1px solid #059669',
                background: '#10b981',
                color: '#04120a',
                fontSize: '12.5px',
                fontWeight: '700',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '7px',
                cursor: 'pointer',
                transition: 'background 0.15s ease',
              }}
            >
              <PhoneCall style={{ width: '14px', height: '14px' }} />
              <span>Switch to Voice Call</span>
            </button>

            <button
              onClick={onClose}
              style={{
                padding: '10px 16px',
                borderRadius: '4px',
                border: '1px solid #2d3748',
                background: '#1a2230',
                color: '#cbd5e1',
                fontSize: '12.5px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'background 0.15s ease',
              }}
            >
              Return to Chat
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

export default SallyVideoCallCard;
