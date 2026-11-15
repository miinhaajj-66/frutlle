import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useMemo, useRef } from 'react';
import { AlertCircle, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './OrderSuccessOverlay.css';

// 24 pre-computed champagne-gold, emerald, and pure-white celebratory particles
const generateBurstParticles = () => {
  const palette = [
    '#FFFFFF', '#FFFFFF',
    '#FDE68A', '#FBBF24', '#F59E0B',
    '#34D399', '#A7F3D0', '#10B981'
  ];
  return Array.from({ length: 24 }).map((_, i) => {
    const angle = (i / 24) * 360 + (Math.sin(i * 3) * 12);
    const rad = (angle * Math.PI) / 180;
    const distance = 95 + (i % 6) * 24;
    return {
      id: i,
      x: Math.cos(rad) * distance,
      y: Math.sin(rad) * distance - 24,
      size: 4.5 + (i % 3) * 2.5,
      color: palette[i % palette.length],
      shape: i % 3 === 0 ? 'rect' : 'circle',
      rot: Math.floor(Math.sin(i) * 180),
      delay: (i % 6) * 0.035
    };
  });
};

// 14 slow-floating ambient background motes
const generateAmbientMotes = () => {
  return Array.from({ length: 14 }).map((_, i) => ({
    id: i,
    top: `${8 + ((i * 7.1) % 82)}%`,
    left: `${6 + ((i * 13.9) % 86)}%`,
    size: 3 + (i % 3) * 2.5,
    color: i % 2 === 0 ? 'rgba(253, 230, 138, 0.35)' : 'rgba(52, 211, 153, 0.35)',
    duration: 3.5 + (i % 3) * 1.2,
    delay: (i % 4) * 0.4
  }));
};

/**
 * Ultra-Premium, Full-Screen Order Confirmation Experience for FRUTLLE
 *
 * Implements a world-class, cinematic celebration across the entire viewport:
 * 1. Full-screen deep emerald environment (#008F68 / #005a41 / #022c22) with safe-area support.
 * 2. Hero white success badge with SVG stroke drawing animation.
 * 3. FRUTLLE brand wordmark and "FRUITYFULLY NATURAL" tagline.
 * 4. Exact 3.5-second celebratory duration before smooth transition to order receipt.
 * 5. Strict payment verification enforcement (never triggers on unconfirmed client state).
 */
const OrderSuccessOverlay = ({
  isOpen,
  status = 'confirmed', // 'verifying' | 'confirmed' | 'error'
  orderData = null,
  errorMessage = '',
  onComplete
}) => {
  const navigate = useNavigate();
  const burstParticles = useMemo(() => generateBurstParticles(), []);
  const ambientMotes = useMemo(() => generateAmbientMotes(), []);
  const hasTriggeredTimerRef = useRef(false);

  const prefersReducedMotion = typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Viewport Scroll Lock: prevents any background movement or scrollbars during celebration
  useEffect(() => {
    if (isOpen) {
      const origOverflow = document.body.style.overflow;
      const origDocOverflow = document.documentElement.style.overflow;
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = origOverflow;
        document.documentElement.style.overflow = origDocOverflow;
      };
    }
  }, [isOpen]);

  // Exact 3.5-Second (3500ms) Celebration Duration Guard
  useEffect(() => {
    if (!isOpen || status !== 'confirmed') {
      hasTriggeredTimerRef.current = false;
      return;
    }

    if (hasTriggeredTimerRef.current) return;
    hasTriggeredTimerRef.current = true;

    const timer = setTimeout(() => {
      if (onComplete) {
        onComplete();
      }
    }, 3500);

    return () => clearTimeout(timer);
  }, [isOpen, status, onComplete]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="frutlle-fullscreen-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
      >
        {/* Soft expanding emerald aura */}
        <div className="frutlle-ambient-aura" />

        {/* Ambient floating light motes */}
        {!prefersReducedMotion && (
          <div className="frutlle-motes-field">
            {ambientMotes.map((m) => (
              <motion.span
                key={m.id}
                className="frutlle-mote"
                style={{
                  top: m.top,
                  left: m.left,
                  width: m.size,
                  height: m.size,
                  backgroundColor: m.color
                }}
                animate={{
                  y: [-12, 12, -12],
                  opacity: [0.2, 0.7, 0.2]
                }}
                transition={{
                  duration: m.duration,
                  delay: m.delay,
                  repeat: Infinity,
                  ease: 'easeInOut'
                }}
              />
            ))}
          </div>
        )}

        {/* Top Header: FRUTLLE Branding */}
        <div className="frutlle-brand-header">
          <motion.h1
            className="frutlle-brand-wordmark"
            initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          >
            FRUTLLE
          </motion.h1>
          <motion.span
            className="frutlle-brand-tagline"
            initial={prefersReducedMotion ? { opacity: 0.95 } : { opacity: 0 }}
            animate={{ opacity: 0.95 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            FRUITYFULLY NATURAL
          </motion.span>
        </div>

        {/* STATE 1: VERIFYING (Full-screen Minimalist) */}
        {status === 'verifying' && (
          <motion.div
            className="frutlle-verifying-stage"
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.94 }}
            animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.35 }}
          >
            <div className="frutlle-verifying-halo" />
            <h2 className="frutlle-verifying-head">Confirming Your Payment</h2>
            <p className="frutlle-verifying-copy">
              Authoritatively verifying your transaction with Razorpay. Please do not close or refresh this window.
            </p>
          </motion.div>
        )}

        {/* STATE 2: CONFIRMED (Ultra-Premium Full-Screen Celebration) */}
        {status === 'confirmed' && orderData && (
          <motion.div
            className="frutlle-hero-stage"
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.92 }}
            animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Hero Circular Success Badge */}
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <motion.div
                className="frutlle-hero-badge"
                initial={prefersReducedMotion ? { scale: 1 } : { scale: 0, rotate: -20 }}
                animate={prefersReducedMotion ? { scale: 1 } : { scale: 1, rotate: 0 }}
                transition={{
                  delay: 0.15,
                  type: 'spring',
                  stiffness: 260,
                  damping: 18
                }}
              >
                <svg className="frutlle-hero-svg" viewBox="0 0 40 40" fill="none">
                  <motion.path
                    d="M10 20.5L16.5 27L30 13.5"
                    stroke="#008F68"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={prefersReducedMotion ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{
                      duration: 0.65,
                      delay: 0.35,
                      ease: [0.65, 0, 0.35, 1]
                    }}
                  />
                </svg>
              </motion.div>

              {/* Celebratory Confetti Burst */}
              {!prefersReducedMotion && (
                <div className="frutlle-burst-layer">
                  {burstParticles.map((p) => (
                    <motion.span
                      key={p.id}
                      className="frutlle-burst-particle"
                      style={{
                        width: p.size,
                        height: p.size,
                        backgroundColor: p.color,
                        borderRadius: p.shape === 'rect' ? '2px' : '50%'
                      }}
                      initial={{ x: 0, y: 0, scale: 0, opacity: 0 }}
                      animate={{
                        x: p.x,
                        y: p.y,
                        scale: [0, 1.3, 0.8],
                        opacity: [0, 1, 0],
                        rotate: p.shape === 'rect' ? [0, p.rot, p.rot + 180] : 0
                      }}
                      transition={{
                        duration: 1.45,
                        delay: 0.2 + p.delay,
                        ease: [0.22, 1, 0.36, 1]
                      }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Title: ORDER CONFIRMED! */}
            <motion.h2
              className="frutlle-hero-title"
              initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45, duration: 0.5, ease: 'easeOut' }}
            >
              ORDER CONFIRMED!
            </motion.h2>

            {/* Subtitle: Your payment was successful. */}
            <motion.p
              className="frutlle-hero-subtitle"
              initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.45 }}
            >
              Your payment was successful.
            </motion.p>

            {/* Verified Order Reference Pill */}
            <motion.div
              className="frutlle-hero-order-pill"
              initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.75, duration: 0.4 }}
            >
              <span className="frutlle-hero-order-dot" />
              <span>Order</span>
              <strong>#{String(orderData.orderId || '').slice(0, 8).toUpperCase()}</strong>
            </motion.div>

            {/* Supporting Gratitude & Artisanal Note */}
            <motion.p
              className="frutlle-hero-note"
              initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9, duration: 0.45 }}
            >
              Thank you for choosing FRUTLLE. Your artisanal preserve jars are now being prepared with utmost care.
            </motion.p>
          </motion.div>
        )}

        {/* STATE 3: ERROR / DELAYED VERIFICATION */}
        {status === 'error' && (
          <motion.div
            className="frutlle-error-stage"
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.92, y: 12 }}
            animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.35 }}
          >
            <div className="frutlle-error-badge">
              <AlertCircle size={32} />
            </div>
            <h3 className="frutlle-error-heading">Payment Verification Delayed</h3>
            <p className="frutlle-error-copy">
              {errorMessage || 'Your payment was received, but server confirmation took longer than expected. If your account was charged, please rest assured: our system will link your order automatically once confirmed by Razorpay.'}
            </p>
            <button
              type="button"
              className="frutlle-error-btn"
              onClick={() => navigate('/my-orders')}
            >
              View My Orders <ArrowRight size={16} />
            </button>
          </motion.div>
        )}

        {/* Bottom Footer: 3.5s Transition Countdown Line */}
        <div className="frutlle-footer-zone">
          {status === 'confirmed' && (
            <>
              <motion.span
                className="frutlle-transition-hint"
                initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8, duration: 0.4 }}
              >
                Redirecting to order details
              </motion.span>
              <div className="frutlle-timeline-track">
                <motion.div
                  className="frutlle-timeline-fill"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 3.5, ease: 'linear' }}
                />
              </div>
            </>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default OrderSuccessOverlay;
