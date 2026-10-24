import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';
import './CancelOrderModal.css';

/**
 * Accessible Cancellation Confirmation Modal for FRUTLLE
 * Strictly requires explicit user confirmation: "Confirm Cancellation" vs "Keep Order"
 */
const CancelOrderModal = ({
  isOpen,
  onClose,
  onConfirm,
  isProcessing = false,
  orderId = ''
}) => {
  const shouldReduceMotion = useReducedMotion();
  const dialogRef = useRef(null);
  const keepOrderBtnRef = useRef(null);
  const previousActiveElementRef = useRef(null);

  // Focus management, scroll lock, and keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    previousActiveElementRef.current = document.activeElement;

    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    const timer = setTimeout(() => {
      keepOrderBtnRef.current?.focus();
    }, 40);

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isProcessing) {
        e.preventDefault();
        onClose();
        return;
      }

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

  const handleClose = () => {
    if (isProcessing) return;
    onClose();
  };

  const handleConfirm = () => {
    if (isProcessing) return;
    onConfirm();
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && !isProcessing) {
      handleClose();
    }
  };

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

  const shortOrderId = orderId ? `${orderId.slice(0, 8)}...` : '';

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="cancel-modal-backdrop"
          onClick={handleBackdropClick}
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          <motion.div
            ref={dialogRef}
            className="cancel-modal-dialog"
            variants={dialogVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cancel-dialog-title"
            aria-describedby="cancel-dialog-desc"
          >
            <button
              type="button"
              className="cancel-modal-close"
              onClick={handleClose}
              disabled={isProcessing}
              aria-label="Close dialog"
            >
              <X size={20} />
            </button>

            <div className="cancel-modal-icon-wrapper">
              <AlertTriangle size={28} className="cancel-modal-icon" />
            </div>

            <h2 id="cancel-dialog-title" className="cancel-modal-heading">
              Cancel Order {shortOrderId && <span className="cancel-modal-order-tag">{shortOrderId}</span>}?
            </h2>

            <p id="cancel-dialog-desc" className="cancel-modal-description">
              Are you sure you want to cancel this order? Once cancelled, this action cannot be undone. Any online payment will be reviewed by admin for refund processing.
            </p>

            <div className="cancel-modal-actions">
              <button
                ref={keepOrderBtnRef}
                type="button"
                className="cancel-modal-btn cancel-modal-btn-secondary"
                onClick={handleClose}
                disabled={isProcessing}
              >
                Keep Order
              </button>

              <button
                type="button"
                className="cancel-modal-btn cancel-modal-btn-danger"
                onClick={handleConfirm}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <span className="cancel-modal-spinner" aria-hidden="true" />
                    <span>Cancelling...</span>
                  </>
                ) : (
                  <span>Confirm Cancellation</span>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(modalContent, document.body);
};

export default CancelOrderModal;
