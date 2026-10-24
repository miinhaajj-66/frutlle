import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { ShoppingBag, RefreshCw, X, AlertCircle } from 'lucide-react';
import { formatCurrency } from '../utils/currency';
import './ReorderModal.css';

/**
 * Reorder Confirmation Modal for FRUTLLE
 * Prompts user to Merge or Replace cart when cart already contains items.
 * Displays available reorder items and any skipped out-of-stock / discontinued items.
 */
const ReorderModal = ({
  isOpen,
  onClose,
  onMerge,
  onReplace,
  availableItems = [],
  skippedItems = [],
  cartItemCount = 0,
  isProcessing = false
}) => {
  const shouldReduceMotion = useReducedMotion();
  const dialogRef = useRef(null);
  const mergeBtnRef = useRef(null);
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
      mergeBtnRef.current?.focus();
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

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="reorder-modal-backdrop"
          onClick={handleBackdropClick}
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          <motion.div
            ref={dialogRef}
            className="reorder-modal-dialog"
            variants={dialogVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reorder-dialog-title"
            aria-describedby="reorder-dialog-desc"
          >
            <button
              type="button"
              className="reorder-modal-close"
              onClick={handleClose}
              disabled={isProcessing}
              aria-label="Close dialog"
            >
              <X size={20} />
            </button>

            <div className="reorder-modal-icon-wrapper">
              <ShoppingBag size={28} className="reorder-modal-icon" />
            </div>

            <h2 id="reorder-dialog-title" className="reorder-modal-heading">
              Update Your Cart
            </h2>

            <p id="reorder-dialog-desc" className="reorder-modal-description">
              You already have <strong>{cartItemCount} item{cartItemCount === 1 ? '' : 's'}</strong> in your cart. How would you like to proceed with reordering?
            </p>

            {/* Skipped Items Notice if any products are out of stock or discontinued */}
            {skippedItems.length > 0 && (
              <div className="reorder-modal-skipped-alert" role="status">
                <AlertCircle size={18} className="reorder-modal-skipped-icon" />
                <div className="reorder-modal-skipped-text">
                  <strong>Some items are unavailable:</strong>
                  <ul>
                    {skippedItems.map((skip, idx) => (
                      <li key={idx}>
                        <span>{skip.name}</span> — <em>{skip.reason}</em>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Available Items Preview */}
            {availableItems.length > 0 && (
              <div className="reorder-modal-items-preview">
                <div className="reorder-modal-preview-title">
                  Items to add ({availableItems.length}):
                </div>
                <div className="reorder-modal-preview-list">
                  {availableItems.map((item, idx) => (
                    <div key={idx} className="reorder-modal-preview-item">
                      <span className="reorder-modal-item-qty">{item.quantity}×</span>
                      <span className="reorder-modal-item-name">{item.name}</span>
                      <span className="reorder-modal-item-price">
                        {formatCurrency(item.currentUnitPrice * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="reorder-modal-actions">
              <button
                ref={mergeBtnRef}
                type="button"
                className="reorder-modal-btn reorder-modal-btn-primary"
                onClick={onMerge}
                disabled={isProcessing || availableItems.length === 0}
              >
                <RefreshCw size={16} />
                <span>Merge with Existing Cart</span>
              </button>

              <button
                type="button"
                className="reorder-modal-btn reorder-modal-btn-warning"
                onClick={onReplace}
                disabled={isProcessing || availableItems.length === 0}
              >
                <span>Replace Existing Cart</span>
              </button>

              <button
                type="button"
                className="reorder-modal-btn reorder-modal-btn-secondary"
                onClick={handleClose}
                disabled={isProcessing}
              >
                Cancel
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

export default ReorderModal;
