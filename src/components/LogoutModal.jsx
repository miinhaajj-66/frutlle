import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import './LogoutModal.css';

/**
 * Minimalist Luxury Logout Confirmation Modal for FRUTLLE
 * Clean, compact, refined typography, and intentional spacing.
 */
const LogoutModal = ({
  isOpen,
  onClose,
  onConfirm,
  isProcessing = false
}) => {
  const shouldReduceMotion = useReducedMotion();
  const dialogRef = useRef(null);
  const cancelBtnRef = useRef(null);
  const previousActiveElementRef = useRef(null);

  // Focus management, scroll lock, and keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    // Preserve focus to restore when dialog closes
    previousActiveElementRef.current = document.activeElement;

    // Prevent body background scroll while open
    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    // Set initial focus to safe secondary action (Cancel)
    const timer = setTimeout(() => {
      cancelBtnRef.current?.focus();
    }, 40);

    const handleKeyDown = (e) => {
      // Escape key closes modal (if not currently processing)
      if (e.key === 'Escape' && !isProcessing) {
        e.preventDefault();
        onClose();
        return;
      }

      // Accessible focus trap inside modal dialog
      if (e.key === 'Tab' && dialogRef.current) {
        const focusableElements = dialogRef.current.querySelectorAll(
          'button:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;

      if (previousActiveElementRef.current && typeof previousActiveElementRef.current.focus === 'function') {
        previousActiveElementRef.current.focus();
      }
    };
  }, [isOpen, isProcessing, onClose]);

  // Click outside backdrop to close
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && !isProcessing) {
      onClose();
    }
  };

  // Subtle motion animation respecting reduced motion
  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.18, ease: 'easeOut' } },
    exit: { opacity: 0, transition: { duration: 0.15, ease: 'easeIn' } }
  };

  const dialogVariants = shouldReduceMotion
    ? {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { duration: 0.15 } },
        exit: { opacity: 0, transition: { duration: 0.12 } }
      }
    : {
        hidden: { opacity: 0, scale: 0.98, y: 8 },
        visible: {
          opacity: 1,
          scale: 1,
          y: 0,
          transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] }
        },
        exit: {
          opacity: 0,
          scale: 0.98,
          y: 4,
          transition: { duration: 0.15, ease: 'easeIn' }
        }
      };

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="minimal-logout-backdrop"
          onClick={handleBackdropClick}
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          <motion.div
            ref={dialogRef}
            className="minimal-logout-dialog"
            variants={dialogVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-dialog-title"
            aria-describedby="logout-dialog-desc"
          >
            {/* Heading */}
            <h2 id="logout-dialog-title" className="minimal-logout-heading">
              Are you sure you want to log out?
            </h2>

            {/* Description */}
            <p id="logout-dialog-desc" className="minimal-logout-description">
              You’ll need to sign in again to access your account.
            </p>

            {/* Action Buttons */}
            <div className="minimal-logout-actions">
              <button
                ref={cancelBtnRef}
                type="button"
                className="minimal-logout-btn minimal-logout-btn-secondary"
                onClick={onClose}
                disabled={isProcessing}
              >
                Cancel
              </button>

              <button
                type="button"
                className="minimal-logout-btn minimal-logout-btn-primary"
                onClick={onConfirm}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <span className="minimal-logout-spinner" aria-hidden="true" />
                    <span>Logging Out...</span>
                  </>
                ) : (
                  <span>Log Out</span>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  // Render into body portal
  if (typeof document === 'undefined') return null;
  return createPortal(modalContent, document.body);
};

export default LogoutModal;
