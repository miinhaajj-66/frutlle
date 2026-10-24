import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Package, Search, Calendar, ChevronRight, AlertCircle, RefreshCw, 
  ShoppingBag, ArrowRight, CheckCircle2, Clock, Truck, XCircle, RotateCcw
} from 'lucide-react';
import axios, { getApiUrl, getAssetUrl, getFallbackImage } from '../utils/api';
import { formatCurrency } from '../utils/currency';
import { useCart } from '../context/CartContext';
import ReorderModal from '../components/ReorderModal';
import './MyOrders.css';

/**
 * Format a database timestamptz into customer-friendly format (e.g., "24 Oct 2026")
 */
const formatOrderDate = (dateString) => {
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

/**
 * Map verified backend statuses to UI badge classes and friendly labels
 */
const getStatusInfo = (status) => {
  switch (status) {
    case 'Pending':
      return { label: 'Pending', className: 'status-badge-pending', icon: Clock };
    case 'Processing':
      return { label: 'Processing', className: 'status-badge-processing', icon: RefreshCw };
    case 'Shipped':
      return { label: 'Shipped', className: 'status-badge-shipped', icon: Truck };
    case 'Delivered':
      return { label: 'Delivered', className: 'status-badge-delivered', icon: CheckCircle2 };
    case 'Cancelled':
      return { label: 'Cancelled', className: 'status-badge-cancelled', icon: XCircle };
    default:
      return { label: status || 'Pending', className: 'status-badge-pending', icon: Clock };
  }
};

const MyOrders = () => {
  const navigate = useNavigate();
  const { cart, mergeCartItems, replaceCartItems, addToCart } = useCart();

  // Orders State
  const [orders, setOrders] = useState([]);
  const [counts, setCounts] = useState({
    total: 0,
    pending: 0,
    processing: 0,
    shipped: 0,
    delivered: 0,
    cancelled: 0
  });
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);

  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('all');

  // Reorder State
  const [reorderModalOpen, setReorderModalOpen] = useState(false);
  const [reorderCheckLoading, setReorderCheckLoading] = useState(false);
  const [reorderAvailableItems, setReorderAvailableItems] = useState([]);
  const [reorderSkippedItems, setReorderSkippedItems] = useState([]);
  const [reorderFeedback, setReorderFeedback] = useState(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Request sequence ref to prevent in-flight race conditions
  const activeRequestSeq = useRef(0);

  // Fetch orders from server
  const fetchOrders = useCallback(async (targetPage = 1, append = false) => {
    const currentSeq = ++activeRequestSeq.current;
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const params = new URLSearchParams({
        page: String(targetPage),
        limit: '10',
        paginated: 'true'
      });

      if (statusFilter && statusFilter !== 'All') {
        params.append('status', statusFilter);
      }
      if (debouncedSearch) {
        params.append('search', debouncedSearch);
      }
      if (dateFilter && dateFilter !== 'all') {
        params.append('dateRange', dateFilter);
      }

      const res = await axios.get(getApiUrl(`/api/orders/myorders?${params.toString()}`), {
        withCredentials: true
      });

      if (activeRequestSeq.current !== currentSeq) return;

      const responseData = res.data;
      const fetchedOrders = Array.isArray(responseData)
        ? responseData
        : Array.isArray(responseData?.orders)
          ? responseData.orders
          : [];

      if (append) {
        // Prevent duplicate order insertion
        setOrders((prev) => {
          const existingIds = new Set(prev.map((o) => String(o.id || o._id)));
          const uniqueNew = fetchedOrders.filter((o) => !existingIds.has(String(o.id || o._id)));
          return [...prev, ...uniqueNew];
        });
      } else {
        setOrders(fetchedOrders);
      }

      if (responseData?.counts) {
        setCounts(responseData.counts);
      }

      setHasMore(Boolean(responseData?.hasMore));
      setPage(targetPage);
    } catch (err) {
      if (activeRequestSeq.current !== currentSeq) return;
      console.error('Failed to fetch orders:', err);
      setError(err.response?.data?.message || 'Could not retrieve your orders. Please check your connection.');
    } finally {
      if (activeRequestSeq.current === currentSeq) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, [statusFilter, debouncedSearch, dateFilter]);

  // Refetch when filters or search term changes (resets to page 1)
  useEffect(() => {
    fetchOrders(1, false);
  }, [fetchOrders]);

  // Handle Load More
  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      fetchOrders(page + 1, true);
    }
  };

  // Trigger Reorder Check
  const handleBuyAgain = async (order, e) => {
    e?.stopPropagation();
    const orderId = order.id || order._id;
    if (!orderId) return;

    setReorderCheckLoading(true);
    setReorderFeedback(null);

    try {
      const { data } = await axios.get(getApiUrl(`/api/orders/${orderId}/reorder-check`), {
        withCredentials: true
      });

      if (!data.canReorder || !data.availableItems || data.availableItems.length === 0) {
        setReorderFeedback({
          type: 'error',
          message: 'All products in this order are currently out of stock or unavailable.'
        });
        return;
      }

      setReorderAvailableItems(data.availableItems);
      setReorderSkippedItems(data.skippedItems || []);

      // If user already has items in their cart, present explicit confirmation choice
      if (cart && cart.length > 0) {
        setReorderModalOpen(true);
      } else {
        // Direct addition when cart is empty
        for (const item of data.availableItems) {
          addToCart(item, item.quantity);
        }

        if (data.skippedItems?.length > 0) {
          sessionStorage.setItem('frutlle_reorder_skipped', JSON.stringify(data.skippedItems));
        }

        navigate('/checkout');
      }
    } catch (err) {
      console.error('Reorder availability check failed:', err);
      setReorderFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to verify reorder availability. Please try again.'
      });
    } finally {
      setReorderCheckLoading(false);
    }
  };

  // Modal Action: Merge Cart
  const handleConfirmMerge = () => {
    mergeCartItems(reorderAvailableItems);
    setReorderModalOpen(false);

    if (reorderSkippedItems.length > 0) {
      sessionStorage.setItem('frutlle_reorder_skipped', JSON.stringify(reorderSkippedItems));
    }

    navigate('/checkout');
  };

  // Modal Action: Replace Cart
  const handleConfirmReplace = () => {
    replaceCartItems(reorderAvailableItems);
    setReorderModalOpen(false);

    if (reorderSkippedItems.length > 0) {
      sessionStorage.setItem('frutlle_reorder_skipped', JSON.stringify(reorderSkippedItems));
    }

    navigate('/checkout');
  };

  const hasActiveFilters = statusFilter !== 'All' || debouncedSearch !== '' || dateFilter !== 'all';

  const resetFilters = () => {
    setStatusFilter('All');
    setSearchTerm('');
    setDebouncedSearch('');
    setDateFilter('all');
  };

  return (
    <div className="my-orders-page">
      <div className="container">
        {/* Header */}
        <header className="my-orders-header">
          <div className="my-orders-title-group">
            <h1 className="my-orders-title">My Orders</h1>
            <p className="my-orders-subtitle">
              Review, track, and reorder from your past artisanal fruit preserve purchases.
            </p>
          </div>

          <Link to="/products" className="my-orders-shop-btn">
            <ShoppingBag size={18} />
            <span>Explore Catalog</span>
          </Link>
        </header>

        {/* Global Reorder Feedback Banner */}
        {reorderFeedback && (
          <div 
            className={`my-orders-feedback-banner ${reorderFeedback.type === 'error' ? 'feedback-error' : 'feedback-success'}`}
            role="alert"
          >
            <AlertCircle size={18} />
            <span>{reorderFeedback.message}</span>
            <button 
              type="button" 
              onClick={() => setReorderFeedback(null)} 
              className="feedback-dismiss"
              aria-label="Dismiss message"
            >
              ✕
            </button>
          </div>
        )}

        {/* Summary Metric Cards */}
        <section className="my-orders-summary-grid" aria-label="Order summary statistics">
          <div className="summary-card">
            <div className="summary-card-icon-wrapper icon-total">
              <Package size={22} />
            </div>
            <div className="summary-card-content">
              <span className="summary-card-label">Total Orders</span>
              <span className="summary-card-value">{loading && counts.total === 0 ? '—' : counts.total}</span>
            </div>
          </div>

          <div className="summary-card">
            <div className="summary-card-icon-wrapper icon-processing">
              <RefreshCw size={22} />
            </div>
            <div className="summary-card-content">
              <span className="summary-card-label">Processing</span>
              <span className="summary-card-value">{loading && counts.total === 0 ? '—' : counts.processing}</span>
            </div>
          </div>

          <div className="summary-card">
            <div className="summary-card-icon-wrapper icon-delivered">
              <CheckCircle2 size={22} />
            </div>
            <div className="summary-card-content">
              <span className="summary-card-label">Delivered</span>
              <span className="summary-card-value">{loading && counts.total === 0 ? '—' : counts.delivered}</span>
            </div>
          </div>

          <div className="summary-card">
            <div className="summary-card-icon-wrapper icon-cancelled">
              <XCircle size={22} />
            </div>
            <div className="summary-card-content">
              <span className="summary-card-label">Cancelled</span>
              <span className="summary-card-value">{loading && counts.total === 0 ? '—' : counts.cancelled}</span>
            </div>
          </div>
        </section>

        {/* Search, Filter, and Controls Bar */}
        <section className="my-orders-controls-bar" aria-label="Order filters">
          {/* Search by Order ID */}
          <div className="orders-search-wrapper">
            <Search size={18} className="orders-search-icon" aria-hidden="true" />
            <input
              type="text"
              className="orders-search-input"
              placeholder="Search by Order ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="Search orders by Order ID"
            />
            {searchTerm && (
              <button 
                type="button" 
                onClick={() => setSearchTerm('')} 
                className="orders-search-clear"
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          <div className="orders-filters-group">
            {/* Status Filter */}
            <div className="orders-select-wrapper">
              <select
                className="orders-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                aria-label="Filter orders by status"
              >
                <option value="All">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="Processing">Processing</option>
                <option value="Shipped">Shipped</option>
                <option value="Delivered">Delivered</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>

            {/* Date Range Filter */}
            <div className="orders-select-wrapper">
              <Calendar size={16} className="orders-select-icon" aria-hidden="true" />
              <select
                className="orders-select select-with-icon"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                aria-label="Filter orders by date range"
              >
                <option value="all">All Time</option>
                <option value="30days">Last 30 Days</option>
                <option value="3months">Last 3 Months</option>
                <option value="year">This Year</option>
              </select>
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                className="orders-reset-filters-btn"
                onClick={resetFilters}
                title="Reset all active filters"
              >
                <RotateCcw size={14} />
                <span>Reset</span>
              </button>
            )}
          </div>
        </section>

        {/* Content Area */}
        <main className="my-orders-content-area">
          {/* Loading Skeleton */}
          {loading ? (
            <div className="orders-skeleton-list" aria-busy="true" aria-label="Loading orders">
              {[1, 2, 3].map((n) => (
                <div key={n} className="order-card-skeleton">
                  <div className="skeleton-header">
                    <div className="skeleton-line skeleton-short" />
                    <div className="skeleton-badge" />
                  </div>
                  <div className="skeleton-body">
                    <div className="skeleton-thumb" />
                    <div className="skeleton-text-group">
                      <div className="skeleton-line skeleton-medium" />
                      <div className="skeleton-line skeleton-short" />
                    </div>
                  </div>
                  <div className="skeleton-footer">
                    <div className="skeleton-line skeleton-short" />
                    <div className="skeleton-btn" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            /* Error State */
            <div className="orders-error-card" role="alert">
              <div className="error-icon-wrapper">
                <AlertCircle size={36} />
              </div>
              <h2 className="error-heading">Failed to Load Orders</h2>
              <p className="error-description">{error}</p>
              <button 
                type="button" 
                className="btn btn-primary orders-retry-btn"
                onClick={() => fetchOrders(page, false)}
              >
                <RefreshCw size={16} />
                <span>Retry</span>
              </button>
            </div>
          ) : orders.length === 0 ? (
            /* Empty State */
            hasActiveFilters ? (
              <div className="orders-empty-state">
                <div className="empty-icon-wrapper">
                  <Search size={36} />
                </div>
                <h2 className="empty-heading">No Matching Orders</h2>
                <p className="empty-description">
                  We couldn’t find any orders matching your selected filters. Try broadening your criteria or reset filters.
                </p>
                <button type="button" className="btn btn-primary" onClick={resetFilters}>
                  Clear Filters
                </button>
              </div>
            ) : (
              <div className="orders-empty-state">
                <div className="empty-icon-wrapper">
                  <ShoppingBag size={40} />
                </div>
                <h2 className="empty-heading">You haven't placed any orders yet</h2>
                <p className="empty-description">
                  Discover our selection of small-batch artisanal preserves and jams crafted from heirloom fruit varieties.
                </p>
                <Link to="/products" className="btn btn-primary empty-cta-btn">
                  <span>Start Shopping</span>
                  <ArrowRight size={18} />
                </Link>
              </div>
            )
          ) : (
            /* Orders List */
            <div className="orders-cards-list">
              {orders.map((order) => {
                const orderId = order.id || order._id;
                const statusInfo = getStatusInfo(order.status);
                const StatusIcon = statusInfo.icon;
                const items = order.order_items || [];
                const primaryItem = items[0] || {};
                const remainingItemsCount = Math.max(0, items.length - 1);
                const isPaid = Boolean(order.is_paid);
                const paymentMethodLabel = order.payment_method === 'online' ? 'Online Payment' : 'Cash on Delivery';

                // Address snapshot formatting
                const addr = order.shipping_address || {};
                const addressSnippet = [addr.address, addr.city, addr.postalCode].filter(Boolean).join(', ');

                return (
                  <motion.article 
                    key={orderId} 
                    className="order-card"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    {/* Top Bar: Order ID, Date, and Status Badge */}
                    <div className="order-card-header">
                      <div className="order-meta-info">
                        <span className="order-id-label">Order</span>
                        <span className="order-id-value" title={orderId}>
                          #{orderId.slice(0, 8)}...
                        </span>
                        <span className="order-meta-separator">•</span>
                        <time className="order-date" dateTime={order.created_at}>
                          {formatOrderDate(order.created_at)}
                        </time>
                      </div>

                      <div className={`order-status-badge ${statusInfo.className}`}>
                        <StatusIcon size={14} className="status-badge-icon" />
                        <span>{statusInfo.label}</span>
                      </div>
                    </div>

                    {/* Middle Section: Thumbnails and Product Overview */}
                    <div className="order-card-body">
                      {/* Product Thumbnail Gallery */}
                      <div className="order-thumbs-container">
                        <div className="order-main-thumb-wrapper">
                          <img
                            src={getAssetUrl(primaryItem.image)}
                            alt={primaryItem.name || 'Artisanal Jam'}
                            className="order-main-thumb"
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = getFallbackImage(primaryItem);
                            }}
                            loading="lazy"
                          />
                        </div>

                        {remainingItemsCount > 0 && (
                          <div className="order-more-thumbs-badge" title={`${remainingItemsCount} more item(s)`}>
                            +{remainingItemsCount}
                          </div>
                        )}
                      </div>

                      {/* Items and Destination Summary */}
                      <div className="order-overview-details">
                        <h2 className="order-product-headline">
                          {primaryItem.name || 'Artisanal Preserve'}
                          {remainingItemsCount > 0 && (
                            <span className="order-item-count-pill">
                              +{remainingItemsCount} more
                            </span>
                          )}
                        </h2>

                        <div className="order-sub-details">
                          <div className="order-detail-line">
                            <span className="detail-label">Payment:</span>
                            <span className="detail-value">
                              {paymentMethodLabel} ({isPaid ? 'Paid' : 'Unpaid'})
                            </span>
                          </div>

                          {addressSnippet && (
                            <div className="order-detail-line order-address-line">
                              <span className="detail-label">Ship to:</span>
                              <span className="detail-value address-truncate" title={addressSnippet}>
                                {addressSnippet}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Total Amount Block */}
                      <div className="order-price-block">
                        <span className="order-price-label">Total Amount</span>
                        <span className="order-price-value">
                          {formatCurrency(order.total_price)}
                        </span>
                      </div>
                    </div>

                    {/* Bottom Action Footer */}
                    <div className="order-card-footer">
                      <div className="order-footer-left">
                        {order.status === 'Cancelled' ? (
                          <span className="order-footer-status-hint hint-cancelled">
                            Cancelled • {order.payment_method === 'online' && isPaid ? 'Refund under review' : 'No charge'}
                          </span>
                        ) : order.status === 'Delivered' ? (
                          <span className="order-footer-status-hint hint-delivered">
                            Delivered on {formatOrderDate(order.delivered_at || order.updated_at)}
                          </span>
                        ) : (
                          <span className="order-footer-status-hint">
                            Expected Delivery in 3-5 business days
                          </span>
                        )}
                      </div>

                      <div className="order-footer-actions">
                        {/* Buy Again Action */}
                        <button
                          type="button"
                          className="btn-order-action btn-buy-again"
                          onClick={(e) => handleBuyAgain(order, e)}
                          disabled={reorderCheckLoading}
                          title="Reorder items from this order with current stock and prices"
                        >
                          <RefreshCw size={15} />
                          <span>Buy Again</span>
                        </button>

                        {/* View Order Details Navigation */}
                        <Link 
                          to={`/orders/${orderId}`} 
                          className="btn-order-action btn-view-details"
                          aria-label={`View details for order ${orderId.slice(0, 8)}`}
                        >
                          <span>View Details</span>
                          <ChevronRight size={16} />
                        </Link>
                      </div>
                    </div>
                  </motion.article>
                );
              })}

              {/* Load More Control */}
              {hasMore && (
                <div className="orders-load-more-container">
                  <button
                    type="button"
                    className="btn btn-secondary orders-load-more-btn"
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                  >
                    {loadingMore ? (
                      <>
                        <span className="load-more-spinner" aria-hidden="true" />
                        <span>Loading more orders...</span>
                      </>
                    ) : (
                      <span>Load More Orders</span>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

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

export default MyOrders;
