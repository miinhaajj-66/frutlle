import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Clock, CheckCircle2, RefreshCw, XCircle, 
  MapPin, CreditCard, HelpCircle, AlertCircle, 
  ExternalLink, Check
} from 'lucide-react';
import axios, { getApiUrl, getAssetUrl, getFallbackImage } from '../utils/api';
import { formatCurrency } from '../utils/currency';
import { useCart } from '../context/CartContext';
import CancelOrderModal from '../components/CancelOrderModal';
import ReorderModal from '../components/ReorderModal';
import './OrderDetails.css';

/**
 * Format date like "24 Oct 2026, 02:30 PM"
 */
const formatDateTime = (dateString) => {
  if (!dateString) return null;
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return null;
  }
};

/**
 * Format date like "24 Oct 2026"
 */
const formatDateOnly = (dateString) => {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return '—';
  }
};

const OrderDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { cart, mergeCartItems, replaceCartItems, addToCart } = useCart();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Cancellation State
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);

  // Reorder State
  const [reorderModalOpen, setReorderModalOpen] = useState(false);
  const [reorderLoading, setReorderLoading] = useState(false);
  const [reorderAvailableItems, setReorderAvailableItems] = useState([]);
  const [reorderSkippedItems, setReorderSkippedItems] = useState([]);

  // Fetch Order
  const fetchOrderDetails = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);

    try {
      const res = await axios.get(getApiUrl(`/api/orders/${id}`), {
        withCredentials: true
      });
      setOrder(res.data);
    } catch (err) {
      console.error('Failed to fetch order details:', err);
      const status = err.response?.status;
      if (status === 403) {
        setError('You are not authorized to view this order.');
      } else if (status === 404) {
        setError('Order not found. Please verify the order ID in the URL.');
      } else {
        setError(err.response?.data?.message || 'Failed to load order details. Please check your network.');
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchOrderDetails();
  }, [fetchOrderDetails]);

  // Evaluate Cancellation Eligibility
  const cancellationStatus = useMemo(() => {
    if (!order) return { isEligible: false, reason: 'Order loading' };

    const status = order.status;
    if (status === 'Cancelled') {
      return { isEligible: false, isCancelled: true, reason: 'Already Cancelled' };
    }
    if (status === 'Delivered') {
      return { isEligible: false, isDelivered: true, reason: 'Order has already been delivered' };
    }
    if (status === 'Shipped') {
      return { isEligible: false, isShipped: true, reason: 'Order is currently in transit' };
    }

    // 48-Hour cutoff calculation
    const createdAtMs = new Date(order.created_at).getTime();
    const nowMs = Date.now();
    const diffHours = (nowMs - createdAtMs) / (1000 * 60 * 60);

    if (diffHours > 48) {
      return { isEligible: false, isExpired: true, reason: 'Cancellation period has expired' };
    }

    // Pending or Processing within 48h
    if (status === 'Pending' || status === 'Processing') {
      return { isEligible: true, remainingHours: Math.max(0, Math.ceil(48 - diffHours)) };
    }

    return { isEligible: false, reason: `Status "${status}" does not permit cancellation` };
  }, [order]);

  // Handle Cancellation Action
  const handleConfirmCancel = async () => {
    if (!order) return;
    setIsCancelling(true);
    setActionMessage(null);

    try {
      const orderId = order.id || order._id;
      const res = await axios.post(
        getApiUrl(`/api/orders/${orderId}/cancel`),
        {},
        { withCredentials: true }
      );

      if (res.data?.order) {
        setOrder(res.data.order);
      } else {
        // Re-fetch to ensure verified authoritative state from backend
        await fetchOrderDetails();
      }

      setCancelModalOpen(false);
      setActionMessage({
        type: 'success',
        text: 'Order successfully cancelled. You will receive an email confirmation.'
      });
    } catch (err) {
      console.error('Cancellation failed:', err);
      setActionMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to cancel order. Please try again or contact support.'
      });
      setCancelModalOpen(false);
    } finally {
      setIsCancelling(false);
    }
  };

  // Handle Buy Again
  const handleBuyAgain = async () => {
    if (!order) return;
    const orderId = order.id || order._id;
    setReorderLoading(true);
    setActionMessage(null);

    try {
      const { data } = await axios.get(getApiUrl(`/api/orders/${orderId}/reorder-check`), {
        withCredentials: true
      });

      if (!data.canReorder || !data.availableItems || data.availableItems.length === 0) {
        setActionMessage({
          type: 'error',
          text: 'All items in this order are currently out of stock or unavailable.'
        });
        return;
      }

      setReorderAvailableItems(data.availableItems);
      setReorderSkippedItems(data.skippedItems || []);

      if (cart && cart.length > 0) {
        setReorderModalOpen(true);
      } else {
        for (const item of data.availableItems) {
          addToCart(item, item.quantity);
        }

        if (data.skippedItems?.length > 0) {
          sessionStorage.setItem('frutlle_reorder_skipped', JSON.stringify(data.skippedItems));
        }

        navigate('/checkout');
      }
    } catch (err) {
      console.error('Reorder check failed:', err);
      setActionMessage({
        type: 'error',
        text: err.response?.data?.message || 'Could not verify reorder stock. Please try again.'
      });
    } finally {
      setReorderLoading(false);
    }
  };

  const handleConfirmMerge = () => {
    mergeCartItems(reorderAvailableItems);
    setReorderModalOpen(false);
    if (reorderSkippedItems.length > 0) {
      sessionStorage.setItem('frutlle_reorder_skipped', JSON.stringify(reorderSkippedItems));
    }
    navigate('/checkout');
  };

  const handleConfirmReplace = () => {
    replaceCartItems(reorderAvailableItems);
    setReorderModalOpen(false);
    if (reorderSkippedItems.length > 0) {
      sessionStorage.setItem('frutlle_reorder_skipped', JSON.stringify(reorderSkippedItems));
    }
    navigate('/checkout');
  };

  if (loading) {
    return (
      <div className="order-details-page">
        <div className="container">
          <div className="details-skeleton" aria-busy="true" aria-label="Loading order details">
            <div className="skeleton-line skeleton-short" />
            <div className="skeleton-card" />
            <div className="skeleton-card" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="order-details-page">
        <div className="container">
          <div className="order-details-error-card">
            <AlertCircle size={40} className="error-icon" />
            <h2>Order Retrieval Failed</h2>
            <p>{error || 'Unable to display order details.'}</p>
            <div className="error-actions">
              <button type="button" className="btn btn-primary" onClick={fetchOrderDetails}>
                <RefreshCw size={16} />
                <span>Retry</span>
              </button>
              <Link to="/orders" className="btn btn-secondary">
                Back to My Orders
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const orderId = order.id || order._id;
  const items = order.order_items || [];
  const shipping = order.shipping_address || {};
  const isPaid = Boolean(order.is_paid);
  const isCod = order.payment_method === 'cod';
  const isOnline = order.payment_method === 'online';
  const isCancelled = order.status === 'Cancelled';

  // Refund Evaluation
  let refundMessaging = null;
  if (isCancelled) {
    if (isOnline) {
      if (isPaid) {
        const verifiedRefund = order.payment_result?.refund_status;
        refundMessaging = {
          badge: 'Refund Pending',
          text: verifiedRefund || 'Refund pending admin review',
          note: 'Online payments are processed by our support team within 3-5 business days after cancellation.'
        };
      } else {
        refundMessaging = {
          badge: 'No Charge',
          text: 'Payment was not captured — no refund required.',
          note: null
        };
      }
    } else if (isCod) {
      refundMessaging = {
        badge: 'No Refund Applicable',
        text: 'No refund applicable',
        note: 'Payment was not collected for this Cash on Delivery order.'
      };
    }
  }

  // Safe Razorpay Reference (masked if payment ID is long)
  const safePaymentRef = order.payment_result?.razorpay_payment_id || order.payment_result?.razorpay_order_id;

  // Visual Timeline Stage Calculations
  // Verified backend statuses: Pending, Processing, Shipped, Delivered, Cancelled
  const getTimelineSteps = () => {
    if (isCancelled) {
      return [
        {
          key: 'placed',
          label: 'Order Placed',
          status: 'completed',
          date: formatDateTime(order.created_at)
        },
        {
          key: 'cancelled',
          label: 'Order Cancelled',
          status: 'cancelled',
          date: formatDateTime(order.updated_at)
        }
      ];
    }

    const currentStatus = order.status;
    const stages = [
      {
        key: 'placed',
        label: 'Order Placed',
        status: 'completed',
        date: formatDateTime(order.created_at)
      },
      {
        key: 'processing',
        label: 'Processing',
        status: (currentStatus === 'Processing' || currentStatus === 'Shipped' || currentStatus === 'Delivered') ? 'completed' : 'pending',
        date: (isPaid && (order.paid_at || order.payment_result?.verified_at)) 
          ? formatDateTime(order.paid_at || order.payment_result?.verified_at)
          : (currentStatus === 'Processing' || currentStatus === 'Shipped' || currentStatus === 'Delivered') ? formatDateTime(order.updated_at) : null
      },
      {
        key: 'shipped',
        label: 'Shipped',
        status: (currentStatus === 'Shipped' || currentStatus === 'Delivered') ? 'completed' : 'pending',
        date: (currentStatus === 'Shipped' || currentStatus === 'Delivered') ? formatDateTime(order.updated_at) : null
      },
      {
        key: 'delivered',
        label: 'Delivered',
        status: currentStatus === 'Delivered' ? 'completed' : 'pending',
        date: currentStatus === 'Delivered' ? formatDateTime(order.delivered_at || order.updated_at) : null
      }
    ];

    return stages;
  };

  const timelineSteps = getTimelineSteps();

  return (
    <div className="order-details-page">
      <div className="container">
        {/* Navigation Breadcrumb */}
        <div className="order-details-nav-bar">
          <Link to="/orders" className="back-link">
            <ArrowLeft size={18} />
            <span>Back to My Orders</span>
          </Link>
        </div>

        {/* Action / Success Banner */}
        {actionMessage && (
          <div 
            className={`details-action-banner ${actionMessage.type === 'error' ? 'banner-error' : 'banner-success'}`}
            role="alert"
          >
            {actionMessage.type === 'error' ? <AlertCircle size={20} /> : <Check size={20} />}
            <span>{actionMessage.text}</span>
            <button 
              type="button" 
              onClick={() => setActionMessage(null)}
              className="banner-close"
              aria-label="Dismiss banner"
            >
              ✕
            </button>
          </div>
        )}

        {/* Order Header Summary */}
        <header className="order-details-header">
          <div className="header-meta">
            <div className="header-title-row">
              <h1 className="order-details-title">Order Details</h1>
              <span className={`status-pill status-${order.status.toLowerCase()}`}>
                {order.status}
              </span>
            </div>

            <div className="header-info-subtext">
              <span className="order-id-code">#{orderId}</span>
              <span className="bullet-sep">•</span>
              <span>Placed on {formatDateOnly(order.created_at)}</span>
              <span className="bullet-sep">•</span>
              <span>{items.length} item{items.length === 1 ? '' : 's'}</span>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="header-actions">
            <button
              type="button"
              className="btn-details-action btn-reorder"
              onClick={handleBuyAgain}
              disabled={reorderLoading}
              title="Reorder items with live stock and prices"
            >
              <RefreshCw size={16} />
              <span>Buy Again</span>
            </button>

            {/* Cancel Action Logic */}
            {cancellationStatus.isEligible && (
              <button
                type="button"
                className="btn-details-action btn-cancel-order"
                onClick={() => setCancelModalOpen(true)}
                disabled={isCancelling}
              >
                <XCircle size={16} />
                <span>Cancel Order</span>
              </button>
            )}

            {/* Exact Required Message after 48h expiration */}
            {cancellationStatus.isExpired && (
              <div className="cancellation-expired-tag" role="status">
                <Clock size={14} />
                <span>Cancellation period has expired</span>
              </div>
            )}
          </div>
        </header>

        {/* Main Content Layout Grid */}
        <div className="order-details-grid">
          {/* Left Column: Visual Timeline, Itemized List */}
          <div className="order-details-main">
            {/* Visual Timeline Card */}
            <section className="details-card timeline-card" aria-label="Order progress timeline">
              <h2 className="card-heading">Order Progress</h2>
              
              <div className="visual-timeline-container">
                <div className={`timeline-track ${isCancelled ? 'track-cancelled' : ''}`}>
                  {timelineSteps.map((step, idx) => {
                    const isStepComplete = step.status === 'completed';
                    const isStepCancelled = step.status === 'cancelled';

                    return (
                      <div 
                        key={step.key} 
                        className={`timeline-step ${isStepComplete ? 'step-completed' : ''} ${isStepCancelled ? 'step-cancelled' : ''}`}
                      >
                        <div className="step-marker-wrapper">
                          <div className="step-marker">
                            {isStepCancelled ? (
                              <XCircle size={16} />
                            ) : isStepComplete ? (
                              <CheckCircle2 size={16} />
                            ) : (
                              <span className="step-pending-dot" />
                            )}
                          </div>
                          {idx < timelineSteps.length - 1 && <div className="step-connector" />}
                        </div>

                        <div className="step-content">
                          <span className="step-label">{step.label}</span>
                          {step.date ? (
                            <time className="step-date">{step.date}</time>
                          ) : (
                            <span className="step-placeholder-date">Pending</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* Itemized Order Items List */}
            <section className="details-card items-card" aria-label="Purchased items">
              <h2 className="card-heading">Items in this Order ({items.length})</h2>

              <div className="itemized-products-list">
                {items.map((item) => {
                  const itemUnitPrice = Number(item.price || 0);
                  const itemQty = Number(item.qty || 1);
                  const itemSubtotal = itemUnitPrice * itemQty;

                  return (
                    <div key={item.id || item.product_id} className="itemized-product-row">
                      <div className="item-thumb-wrapper">
                        <img
                          src={getAssetUrl(item.image)}
                          alt={item.name}
                          className="item-thumb-img"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = getFallbackImage(item);
                          }}
                          loading="lazy"
                        />
                      </div>

                      <div className="item-details-col">
                        <h3 className="item-title">{item.name}</h3>
                        <div className="item-meta">
                          <span className="item-unit-price">{formatCurrency(itemUnitPrice)} each</span>
                          <span className="item-qty-badge">Qty: {itemQty}</span>
                        </div>
                      </div>

                      <div className="item-total-col">
                        <span className="item-total-price">{formatCurrency(itemSubtotal)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>

          {/* Right Column: Order Breakdown, Delivery Address, Payment Details */}
          <aside className="order-details-sidebar">
            {/* Price Breakdown */}
            <section className="details-card summary-breakdown-card" aria-label="Payment summary">
              <h2 className="card-heading">Order Summary</h2>

              <div className="summary-breakdown-rows">
                <div className="summary-row">
                  <span className="summary-row-label">Items Subtotal</span>
                  <span className="summary-row-value">{formatCurrency(order.items_price)}</span>
                </div>

                <div className="summary-row">
                  <span className="summary-row-label">Delivery Fee</span>
                  <span className="summary-row-value">
                    {Number(order.shipping_price) === 0 ? 'FREE' : formatCurrency(order.shipping_price)}
                  </span>
                </div>

                <div className="summary-row">
                  <span className="summary-row-label">Taxes (GST)</span>
                  <span className="summary-row-value">{formatCurrency(order.tax_price)}</span>
                </div>

                <div className="summary-divider" />

                <div className="summary-row total-row">
                  <span className="summary-row-label">Total Amount</span>
                  <span className="summary-row-value total-highlight">
                    {formatCurrency(order.total_price)}
                  </span>
                </div>
              </div>
            </section>

            {/* Delivery Address Snapshot */}
            <section className="details-card address-card" aria-label="Delivery address">
              <div className="card-header-icon-title">
                <MapPin size={20} className="card-icon" />
                <h2 className="card-heading">Delivery Address</h2>
              </div>

              <div className="saved-address-content">
                <p className="address-line address-street">{shipping.address || '—'}</p>
                <p className="address-line address-city">
                  {[shipping.city, shipping.postalCode].filter(Boolean).join(', ')}
                </p>
                <p className="address-line address-country">{shipping.country || 'India'}</p>
              </div>
            </section>

            {/* Payment Snapshot & Refund Details */}
            <section className="details-card payment-card" aria-label="Payment details">
              <div className="card-header-icon-title">
                <CreditCard size={20} className="card-icon" />
                <h2 className="card-heading">Payment Information</h2>
              </div>

              <div className="payment-details-content">
                <div className="payment-line">
                  <span className="payment-label">Method:</span>
                  <span className="payment-value">
                    {isCod ? 'Cash on Delivery (COD)' : 'Online Payment (Razorpay)'}
                  </span>
                </div>

                <div className="payment-line">
                  <span className="payment-label">Payment Status:</span>
                  <span className={`payment-status-tag ${isPaid ? 'tag-paid' : 'tag-unpaid'}`}>
                    {isPaid ? 'Paid' : 'Payment Pending'}
                  </span>
                </div>

                {safePaymentRef && (
                  <div className="payment-line">
                    <span className="payment-label">Reference ID:</span>
                    <span className="payment-ref-code" title={safePaymentRef}>
                      {safePaymentRef.length > 20 
                        ? `${safePaymentRef.slice(0, 10)}...${safePaymentRef.slice(-6)}` 
                        : safePaymentRef}
                    </span>
                  </div>
                )}

                {/* Refund Status Section if Order is Cancelled */}
                {refundMessaging && (
                  <div className="refund-messaging-box">
                    <div className="refund-badge-line">
                      <span className="refund-badge-pill">{refundMessaging.badge}</span>
                      <strong className="refund-status-text">{refundMessaging.text}</strong>
                    </div>
                    {refundMessaging.note && (
                      <p className="refund-note-text">{refundMessaging.note}</p>
                    )}
                  </div>
                )}
              </div>
            </section>

            {/* Support Link */}
            <section className="details-card support-card">
              <div className="support-card-content">
                <HelpCircle size={24} className="support-icon" />
                <div className="support-text">
                  <h3>Need assistance with this order?</h3>
                  <p>Our concierge support team is here to assist with any questions or special delivery notes.</p>
                </div>
              </div>
              <Link to="/contact" className="support-link-btn">
                <span>Contact Support</span>
                <ExternalLink size={15} />
              </Link>
            </section>
          </aside>
        </div>
      </div>

      {/* Cancel Order Confirmation Modal */}
      <CancelOrderModal
        isOpen={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        onConfirm={handleConfirmCancel}
        isProcessing={isCancelling}
        orderId={orderId}
      />

      {/* Buy Again Cart Resolution Modal */}
      <ReorderModal
        isOpen={reorderModalOpen}
        onClose={() => setReorderModalOpen(false)}
        onMerge={handleConfirmMerge}
        onReplace={handleConfirmReplace}
        availableItems={reorderAvailableItems}
        skippedItems={reorderSkippedItems}
        cartItemCount={cart?.length || 0}
        isProcessing={false}
      />
    </div>
  );
};

export default OrderDetails;
