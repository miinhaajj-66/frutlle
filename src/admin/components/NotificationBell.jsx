import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios, { getApiUrl } from '../../utils/api';
import { formatCurrency } from '../../utils/currency';
import { 
  Bell, Check, X, AlertTriangle, Eye, CheckCircle2, 
  ExternalLink, BellRing, RefreshCw 
} from 'lucide-react';
import './NotificationBell.css';

/**
 * Format relative or calendar date for admin notification timestamp
 */
const formatNotificationTime = (isoString) => {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
    
    const now = Date.now();
    const diffSec = Math.floor((now - d.getTime()) / 1000);

    if (diffSec < 45) return 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    
    return d.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return '';
  }
};

const NotificationBell = () => {
  const navigate = useNavigate();
  const dropdownRef = useRef(null);
  const bellBtnRef = useRef(null);

  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'unread'
  const [markingAll, setMarkingAll] = useState(false);

  // Floating in-dashboard real-time toasts
  const [toasts, setToasts] = useState([]);

  // Desktop notification permission tracking
  const [permissionStatus, setPermissionStatus] = useState(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
    return Notification.permission;
  });

  // Track already-displayed notification IDs to prevent duplicate toasts or desktop alerts
  const processedAlertIdsRef = useRef(new Set());

  // Fetch notifications list
  const fetchNotifications = useCallback(async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
      const { data } = await axios.get(getApiUrl('/api/admin/notifications?limit=50'), {
        withCredentials: true
      });

      if (data && Array.isArray(data.notifications)) {
        setNotifications(data.notifications);
        setUnreadCount(typeof data.unreadCount === 'number' ? data.unreadCount : 0);

        // Pre-seed known IDs so past history does not trigger toasts on load
        if (isInitial) {
          data.notifications.forEach(n => {
            if (n.id) processedAlertIdsRef.current.add(n.id);
            if (n.order_id) processedAlertIdsRef.current.add(`order-${n.order_id}`);
          });
        }
      }
    } catch (err) {
      console.warn('[NOTIFICATIONS] Fetch warning:', err.message);
    } finally {
      if (isInitial) setLoading(false);
    }
  }, []);

  // Fetch fast unread count
  const fetchUnreadCount = useCallback(async () => {
    try {
      const { data } = await axios.get(getApiUrl('/api/admin/notifications/unread-count'), {
        withCredentials: true
      });
      if (data && typeof data.unreadCount === 'number') {
        setUnreadCount(data.unreadCount);
      }
    } catch {
      // Non-blocking
    }
  }, []);

  // Handle incoming real-time cancellation alert
  const handleIncomingAlert = useCallback((item) => {
    if (!item) return;
    const alertKey = item.id || `order-${item.order_id}`;

    // Deduplication check
    if (processedAlertIdsRef.current.has(alertKey)) {
      return;
    }
    processedAlertIdsRef.current.add(alertKey);

    // 1. Update state list (unshift new item at top)
    setNotifications((prev) => {
      const exists = prev.some(n => n.id === item.id || (n.order_id && n.order_id === item.order_id));
      if (exists) return prev;
      return [item, ...prev];
    });

    // 2. Increment unread count
    setUnreadCount((c) => c + 1);

    // 3. Dispatch global event so sidebar and orders table update
    try {
      window.dispatchEvent(new CustomEvent('admin-cancellation-received', { detail: item }));
    } catch {
      // ignore
    }

    // 4. Trigger floating in-dashboard toast
    const toastId = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newToast = {
      id: toastId,
      orderId: item.order_id,
      customerName: item.metadata?.customerName || item.customer?.name || 'Customer',
      total: item.metadata?.orderTotal || item.order?.total_price || 0,
      timestamp: item.created_at || new Date().toISOString()
    };

    setToasts((prev) => [newToast, ...prev.slice(0, 2)]);

    // Auto-dismiss toast after 7 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter(t => t.id !== toastId));
    }, 7000);

    // 5. Trigger browser desktop notification if permission granted
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        const shortId = String(item.order_id).substring(0, 8);
        const formattedAmount = formatCurrency(newToast.total);
        const desktopNotif = new Notification('FRUTLLE — Order Cancelled', {
          body: `Order #${shortId} was cancelled by ${newToast.customerName}. Total: ${formattedAmount}`,
          icon: '/Frutlle%20Logo.png',
          tag: `frutlle-cancel-${item.order_id}`
        });

        desktopNotif.onclick = () => {
          window.focus();
          navigate(`/admin/orders?orderId=${item.order_id}`);
          desktopNotif.close();
        };
      } catch (err) {
        console.warn('[DESKTOP NOTIFICATION] Failed to display:', err.message);
      }
    }
  }, [navigate]);

  // Initial load & real-time connection setup
  useEffect(() => {
    fetchNotifications(true);

    // Set up Server-Sent Events (SSE) stream
    let eventSource = null;
    let reconnectTimeout = null;

    const connectSSE = () => {
      try {
        const streamUrl = getApiUrl('/api/admin/notifications/stream');
        eventSource = new EventSource(streamUrl, { withCredentials: true });

        eventSource.addEventListener('notification', (e) => {
          try {
            const parsed = JSON.parse(e.data);
            handleIncomingAlert(parsed);
          } catch (err) {
            console.error('[SSE ERROR] Malformed notification event:', err);
          }
        });

        eventSource.onerror = () => {
          if (eventSource) {
            eventSource.close();
            eventSource = null;
          }
          // Bounded reconnect attempt with backoff
          reconnectTimeout = setTimeout(connectSSE, 10000);
        };
      } catch {
        // SSE unsupported or blocked, fallback to polling
      }
    };

    connectSSE();

    // Bounded polling fallback (every 20s) and tab focus reconciliation
    const pollInterval = setInterval(() => {
      fetchUnreadCount();
    }, 20000);

    const handleWindowFocus = () => {
      fetchNotifications(false);
    };

    window.addEventListener('focus', handleWindowFocus);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        fetchNotifications(false);
      }
    });

    return () => {
      if (eventSource) eventSource.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      clearInterval(pollInterval);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [fetchNotifications, fetchUnreadCount, handleIncomingAlert]);

  // Click outside and Escape key to close dropdown
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (e) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(e.target) &&
        bellBtnRef.current &&
        !bellBtnRef.current.contains(e.target)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        bellBtnRef.current?.focus();
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Request browser desktop notification permission explicitly on button click
  const requestDesktopPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setPermissionStatus('unsupported');
      alert('Desktop notifications are not supported in this browser.');
      return;
    }

    try {
      const result = await Notification.requestPermission();
      setPermissionStatus(result);
      if (result === 'granted') {
        new Notification('FRUTLLE Admin Alerts', {
          body: 'Desktop notifications for order cancellations are now active.',
          icon: '/Frutlle%20Logo.png'
        });
      }
    } catch (err) {
      console.warn('Error requesting notification permission:', err);
    }
  };

  // Mark single notification as read
  const handleMarkAsRead = async (notificationId, e) => {
    if (e) e.stopPropagation();
    try {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));

      await axios.put(
        getApiUrl(`/api/admin/notifications/${notificationId}/read`),
        {},
        { withCredentials: true }
      );
    } catch (err) {
      console.warn('Failed to mark notification as read:', err.message);
    }
  };

  // Mark all notifications as read
  const handleMarkAllRead = async () => {
    try {
      setMarkingAll(true);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);

      await axios.put(
        getApiUrl('/api/admin/notifications/mark-all-read'),
        {},
        { withCredentials: true }
      );
    } catch (err) {
      console.warn('Failed to mark all as read:', err.message);
    } finally {
      setMarkingAll(false);
    }
  };

  // Navigate to order details view
  const handleViewOrder = (orderId, notificationId) => {
    if (notificationId) {
      handleMarkAsRead(notificationId);
    }
    setIsOpen(false);
    navigate(`/admin/orders?orderId=${orderId}`);
  };

  const filteredNotifications = notifications.filter((n) => {
    if (activeFilter === 'unread') return !n.is_read;
    return true;
  });

  return (
    <>
      <div className="notification-bell-container">
        <button
          ref={bellBtnRef}
          type="button"
          className={`notification-bell-btn ${isOpen ? 'active' : ''}`}
          onClick={() => setIsOpen(!isOpen)}
          aria-label={`Admin notifications, ${unreadCount} unread`}
          aria-expanded={isOpen}
          title="Cancellation Alerts"
        >
          <Bell size={21} />
          {unreadCount > 0 && (
            <span className="notification-badge" aria-hidden="true">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        {/* Dropdown Panel */}
        {isOpen && (
          <div ref={dropdownRef} className="notification-dropdown" role="dialog" aria-label="Notifications panel">
            {/* Header */}
            <div className="notification-dropdown-header">
              <div className="notification-header-title">
                <span>Alerts</span>
                {unreadCount > 0 && (
                  <span className="notification-unread-pill">{unreadCount} new</span>
                )}
              </div>
              <div className="notification-header-actions">
                <button
                  type="button"
                  className="notification-text-btn"
                  onClick={handleMarkAllRead}
                  disabled={markingAll || unreadCount === 0}
                  title="Mark all notifications as read"
                >
                  Mark all read
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: '2px' }}
                  aria-label="Close notifications"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Browser Desktop Notification Status Banner */}
            {permissionStatus === 'default' && (
              <div className="notification-desktop-banner">
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <BellRing size={15} />
                  <span>Get alerted on desktop when orders are cancelled</span>
                </div>
                <button
                  type="button"
                  className="notification-enable-btn"
                  onClick={requestDesktopPermission}
                >
                  Enable
                </button>
              </div>
            )}
            {permissionStatus === 'granted' && (
              <div className="notification-desktop-banner notification-desktop-banner-granted">
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle2 size={14} />
                  <span>Desktop alerts enabled</span>
                </div>
              </div>
            )}

            {/* Filter Tabs */}
            <div className="notification-filter-tabs">
              <button
                type="button"
                className={`notification-tab-btn ${activeFilter === 'all' ? 'active' : ''}`}
                onClick={() => setActiveFilter('all')}
              >
                All ({notifications.length})
              </button>
              <button
                type="button"
                className={`notification-tab-btn ${activeFilter === 'unread' ? 'active' : ''}`}
                onClick={() => setActiveFilter('unread')}
              >
                Unread ({unreadCount})
              </button>
            </div>

            {/* Notifications List */}
            <div className="notification-list">
              {loading ? (
                <div className="notification-loading-state">
                  <RefreshCw size={24} className="animate-spin" />
                  <span>Loading alerts...</span>
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="notification-empty-state">
                  <CheckCircle2 size={32} className="notification-empty-icon" />
                  <span style={{ fontWeight: 600, color: '#374151' }}>No cancellation alerts</span>
                  <span style={{ fontSize: '0.8rem' }}>
                    {activeFilter === 'unread' 
                      ? 'All caught up! You have no unread cancellation alerts.' 
                      : 'Customer cancellations will appear here in real-time.'}
                  </span>
                </div>
              ) : (
                filteredNotifications.map((notif) => {
                  const meta = notif.metadata || {};
                  const orderId = notif.order_id || meta.orderId;
                  const shortId = String(orderId || '').substring(0, 8);
                  const customerName = meta.customerName || notif.customer?.name || 'Customer';
                  const orderTotal = meta.orderTotal ?? notif.order?.total_price ?? 0;
                  const paymentMethod = (meta.paymentMethod || notif.order?.payment_method || 'online').toUpperCase();
                  const paymentStatus = meta.paymentStatus || (notif.order?.is_paid ? 'Paid' : 'Unpaid');
                  const cancellationStatus = meta.cancellationStatus || notif.order?.status || 'Cancelled';
                  const timeFormatted = formatNotificationTime(meta.cancelledAt || notif.created_at);

                  return (
                    <div
                      key={notif.id}
                      className={`notification-item ${notif.is_read ? 'read' : 'unread'}`}
                    >
                      <div className="notification-item-top">
                        <div className="notification-badge-row">
                          {!notif.is_read && <span className="notification-unread-dot" />}
                          <span className="notification-type-tag">
                            <AlertTriangle size={12} />
                            Cancellation
                          </span>
                        </div>
                        <span className="notification-time">{timeFormatted}</span>
                      </div>

                      <h4 className="notification-headline">
                        Order #{shortId} cancelled by {customerName}
                      </h4>

                      {/* Verified Order & Payment Details */}
                      <div className="notification-details-grid">
                        <div className="notification-detail-item">
                          <span className="notification-detail-label">Total Amount</span>
                          <span className="notification-detail-val">{formatCurrency(orderTotal)}</span>
                        </div>
                        <div className="notification-detail-item">
                          <span className="notification-detail-label">Status</span>
                          <span className="notification-detail-val" style={{ color: '#dc2626' }}>{cancellationStatus}</span>
                        </div>
                        <div className="notification-detail-item">
                          <span className="notification-detail-label">Payment Method</span>
                          <span className="notification-detail-val">{paymentMethod}</span>
                        </div>
                        <div className="notification-detail-item">
                          <span className="notification-detail-label">Payment Status</span>
                          <span className="notification-detail-val">{paymentStatus}</span>
                        </div>
                      </div>

                      <div className="notification-item-actions">
                        <span className="notification-order-ref" title={orderId}>
                          ID: {shortId}...
                        </span>

                        <div className="notification-actions-right">
                          {!notif.is_read && (
                            <button
                              type="button"
                              className="notification-read-toggle-btn"
                              onClick={(e) => handleMarkAsRead(notif.id, e)}
                              title="Mark this alert as read"
                            >
                              Mark read
                            </button>
                          )}
                          <button
                            type="button"
                            className="notification-view-btn"
                            onClick={() => handleViewOrder(orderId, notif.id)}
                            title="Open order in admin view"
                          >
                            <Eye size={13} />
                            View Order
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* Floating In-Dashboard Live Real-Time Toast Alerts */}
      {toasts.length > 0 && (
        <div className="notification-toast-anchor" role="region" aria-live="polite">
          {toasts.map((toast) => (
            <div key={toast.id} className="notification-toast-item">
              <div className="notification-toast-header">
                <h5 className="notification-toast-title">
                  <AlertTriangle size={16} />
                  Customer Order Cancelled
                </h5>
                <button
                  type="button"
                  className="notification-toast-close"
                  onClick={() => setToasts((prev) => prev.filter(t => t.id !== toast.id))}
                  aria-label="Dismiss alert"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="notification-toast-body">
                Order <strong>#{String(toast.orderId).substring(0, 8)}</strong> ({formatCurrency(toast.total)}) was cancelled by <strong>{toast.customerName}</strong>.
              </div>
              <div className="notification-toast-actions">
                <button
                  type="button"
                  className="notification-view-btn"
                  onClick={() => {
                    setToasts((prev) => prev.filter(t => t.id !== toast.id));
                    navigate(`/admin/orders?orderId=${toast.orderId}`);
                  }}
                >
                  <ExternalLink size={13} />
                  View Order
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
};

export default NotificationBell;
