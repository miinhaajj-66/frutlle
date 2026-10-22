import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Minus, Plus, Trash2, ArrowLeft, ShoppingBag, 
  Check, X, Ticket, ShieldCheck, Truck, RotateCcw, 
  Loader2, ArrowRight
} from 'lucide-react';
import axios from 'axios';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { products as localProducts } from '../data/products';
import { formatCurrency } from '../utils/currency';
import './Cart.css';

const FREE_SHIPPING_THRESHOLD = 1000;

const Cart = () => {
  const { cart, cartLoading, updateQuantity, removeFromCart, addToCart, cartTotal, cartCount } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Coupon State
  const [couponInput, setCouponInput] = useState('');
  const [validCoupon, setValidCoupon] = useState(() => {
    try {
      const saved = sessionStorage.getItem('frutlle_coupon');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [couponError, setCouponError] = useState('');

  // Toast / Undo State
  const [toastMessage, setToastMessage] = useState('');
  const [lastRemovedItem, setLastRemovedItem] = useState(null);

  // Recommended Products for Empty State or Upsell
  const [recommendedProducts, setRecommendedProducts] = useState([]);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  // Fetch Recommended Products
  useEffect(() => {
    const fetchRecommended = async () => {
      try {
        const { data } = await axios.get('/api/products');
        const active = data.filter(p => p.isActive !== false);
        setRecommendedProducts(active.slice(0, 4));
      } catch {
        setRecommendedProducts(localProducts.slice(0, 4));
      }
    };
    fetchRecommended();
  }, []);

  // Sync coupon to sessionStorage
  useEffect(() => {
    if (validCoupon) {
      sessionStorage.setItem('frutlle_coupon', JSON.stringify(validCoupon));
    } else {
      sessionStorage.removeItem('frutlle_coupon');
    }
  }, [validCoupon]);

  // Calculations adhering directly to backend orderController rules
  const discountAmount = validCoupon ? Number(validCoupon.discount_applied || 0) : 0;
  const subtotalAfterDiscount = Math.max(0, cartTotal - discountAmount);
  const isFreeShipping = subtotalAfterDiscount >= FREE_SHIPPING_THRESHOLD || cartTotal === 0;
  const shippingCharge = isFreeShipping ? 0 : 100.00;
  const taxPrice = Number((subtotalAfterDiscount * 0.15).toFixed(2));
  const grandTotal = Number((subtotalAfterDiscount + taxPrice + shippingCharge).toFixed(2));

  const amountToFreeShipping = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotalAfterDiscount);
  const freeShippingProgress = Math.min(100, (subtotalAfterDiscount / FREE_SHIPPING_THRESHOLD) * 100);

  // Handlers
  const handleApplyCoupon = async (e) => {
    e?.preventDefault();
    const code = couponInput.trim().toUpperCase();
    if (!code) return;

    if (!user) {
      setCouponError('Please log in to apply discount coupons.');
      return;
    }

    setValidatingCoupon(true);
    setCouponError('');

    try {
      const { data } = await axios.post('/api/coupons/validate', {
        code,
        subtotal: cartTotal
      }, { withCredentials: true });

      setValidCoupon(data);
      setCouponInput('');
      showToast(`Coupon "${data.code}" applied successfully`);
    } catch (err) {
      setCouponError(err.response?.data?.message || 'Invalid or inactive coupon code.');
      setValidCoupon(null);
    } finally {
      setValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setValidCoupon(null);
    setCouponError('');
    showToast('Coupon removed');
  };

  const handleRemoveItem = (item) => {
    setLastRemovedItem(item);
    removeFromCart(item.id);
    showToast(`Removed "${item.name}" from your cart`);
  };

  const handleUndoRemove = () => {
    if (lastRemovedItem) {
      addToCart(lastRemovedItem, lastRemovedItem.quantity || 1);
      setLastRemovedItem(null);
      setToastMessage('');
    }
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? '' : prev));
    }, 4000);
  };

  const hasOutOfStockItems = cart.some(item => item.countInStock !== undefined && Number(item.countInStock) <= 0);

  const handleProceedToCheckout = () => {
    if (hasOutOfStockItems) {
      showToast('Please remove out-of-stock items before checkout.');
      return;
    }

    setIsCheckingOut(true);

    if (!user) {
      navigate('/login', {
        state: {
          from: { pathname: '/checkout' },
          message: 'Please log in to continue.',
          coupon: validCoupon
        }
      });
      return;
    }

    navigate('/checkout', { state: { coupon: validCoupon } });
  };

  // LOADING CART STATE
  if (cartLoading) {
    return (
      <div className="cart-page">
        <div className="cart-container" style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <Loader2 size={36} className="animate-spin" style={{ color: '#059669', marginBottom: '1rem' }} />
          <p style={{ color: '#767676', fontSize: '0.95rem', letterSpacing: '0.02em' }}>
            Preparing your artisanal basket...
          </p>
        </div>
      </div>
    );
  }

  // EMPTY CART STATE
  if (cart.length === 0) {
    return (
      <div className="cart-page">
        <div className="cart-container">
          
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="cart-breadcrumbs">
            <Link to="/" className="cart-breadcrumb-link">Home</Link>
            <span className="cart-breadcrumb-sep">/</span>
            <span className="cart-breadcrumb-current">Shopping Cart</span>
          </nav>

          <div className="cart-empty-wrapper">
            <div className="cart-empty-icon-box">
              <ShoppingBag size={32} strokeWidth={1.25} />
            </div>

            <h1 className="cart-empty-title">Your cart is empty</h1>
            <p className="cart-empty-desc">
              Looks like you haven't added anything yet. Explore our curated selection of artisanal fruit preserves, made with 100% organic ingredients.
            </p>

            <Link to="/products" className="cart-empty-btn">
              Explore Collection
            </Link>
          </div>

          {/* Curated Recommendations */}
          {recommendedProducts.length > 0 && (
            <section className="cart-recommended-section">
              <p className="cart-recommended-eyebrow">Artisanal Recommendations</p>
              <h2 className="cart-recommended-heading">Handcrafted Preserves You May Love</h2>

              <div className="cart-recommended-grid">
                {recommendedProducts.map((product) => (
                  <Link
                    key={product.id || product._id}
                    to={`/products/${product.id || product._id}`}
                    className="cart-recommended-card"
                  >
                    <div className="cart-rec-img-box">
                      <img
                        src={product.image}
                        alt={product.name}
                        className="cart-rec-img"
                        loading="lazy"
                      />
                    </div>
                    <span className="cart-rec-category">{product.category || 'Preserve'}</span>
                    <h3 className="cart-rec-name">{product.name}</h3>
                    <span className="cart-rec-price">
                      {formatCurrency(product.salePrice || product.price)}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}

        </div>

        {/* Undo Toast */}
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              className="cart-toast"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.2 }}
            >
              <Check size={16} strokeWidth={2.5} />
              <span>{toastMessage}</span>
              {lastRemovedItem && (
                <button type="button" onClick={handleUndoRemove} className="cart-toast-undo">
                  Undo
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // POPULATED CART STATE
  return (
    <div className="cart-page">
      <div className="cart-container">

        {/* Breadcrumbs */}
        <nav aria-label="Breadcrumb" className="cart-breadcrumbs">
          <Link to="/" className="cart-breadcrumb-link">Home</Link>
          <span className="cart-breadcrumb-sep">/</span>
          <span className="cart-breadcrumb-current">Shopping Cart</span>
        </nav>

        {/* Header Section */}
        <header className="cart-header">
          <div className="cart-header-left">
            <h1 className="cart-title">Your Cart</h1>
            <p className="cart-count-subtitle">
              {cartCount} {cartCount === 1 ? 'item' : 'items'} in your cart
            </p>
          </div>

          <Link to="/products" className="cart-continue-link">
            <ArrowLeft size={16} strokeWidth={1.5} />
            <span>Continue Shopping</span>
          </Link>
        </header>

        {/* Two-Column Layout */}
        <div className="cart-layout">

          {/* Left Column: Cart Items List */}
          <div className="cart-items-container">
            
            {/* Free Shipping Progress Meter */}
            <div className="cart-shipping-meter">
              <div className="cart-shipping-meter-text">
                {isFreeShipping ? (
                  <span>
                    <strong>Complimentary Delivery</strong> unlocked for this order!
                  </span>
                ) : (
                  <span>
                    Add <strong>{formatCurrency(amountToFreeShipping)}</strong> more for <strong>Complimentary Shipping</strong>
                  </span>
                )}
                <Truck size={18} strokeWidth={1.5} />
              </div>
              <div className="cart-shipping-meter-track">
                <div 
                  className={`cart-shipping-meter-fill ${isFreeShipping ? 'qualified' : ''}`}
                  style={{ width: `${freeShippingProgress}%` }}
                />
              </div>
            </div>

            {/* List of Cart Items */}
            <div className="cart-items-list" role="list">
              <AnimatePresence>
                {cart.map((item) => {
                  const unitPrice = item.salePrice || item.price;
                  const itemSubtotal = unitPrice * item.quantity;
                  const maxStock = item.countInStock || item.count_in_stock || 99;

                  return (
                    <motion.div
                      layout
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20, height: 0, paddingTop: 0, paddingBottom: 0 }}
                      transition={{ duration: 0.25 }}
                      key={item.id}
                      className="cart-item-row"
                      role="listitem"
                    >
                      {/* Product Thumbnail */}
                      <Link to={`/products/${item.id}`} className="cart-item-image-box">
                        <img 
                          src={item.image} 
                          alt={item.name} 
                          className="cart-item-image"
                        />
                      </Link>

                      {/* Product Information */}
                      <div className="cart-item-info">
                        {item.category && (
                          <span className="cart-item-category">{item.category}</span>
                        )}

                        <Link to={`/products/${item.id}`} className="cart-item-name">
                          {item.name}
                        </Link>

                        {item.weight && (
                          <span className="cart-item-variant">{item.weight} Standard Jar</span>
                        )}

                        <div className="cart-item-unit-price">
                          <span className="sale">{formatCurrency(unitPrice)}</span>
                          {item.salePrice && item.salePrice < item.price && (
                            <span className="original">{formatCurrency(item.price)}</span>
                          )}
                        </div>

                        <div className="cart-item-stock" style={item.countInStock !== undefined && Number(item.countInStock) <= 0 ? { color: '#DC2626' } : {}}>
                          <span className="cart-item-stock-dot" style={item.countInStock !== undefined && Number(item.countInStock) <= 0 ? { backgroundColor: '#DC2626' } : {}} />
                          <span>{item.countInStock !== undefined && Number(item.countInStock) <= 0 ? 'Out of Stock' : 'In Stock · Ready to dispatch'}</span>
                        </div>
                      </div>

                      {/* Controls Column (Subtotal + Quantity Stepper + Remove) */}
                      <div className="cart-item-actions-col">
                        <span className="cart-item-subtotal">
                          {formatCurrency(itemSubtotal)}
                        </span>

                        <div className="cart-item-controls-row">
                          {/* Stepper */}
                          <div className="cart-quantity-stepper">
                            <button
                              type="button"
                              className="cart-qty-btn"
                              aria-label="Decrease quantity"
                              disabled={item.quantity <= 1}
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            >
                              <Minus size={13} />
                            </button>
                            <span className="cart-qty-value">{item.quantity}</span>
                            <button
                              type="button"
                              className="cart-qty-btn"
                              aria-label="Increase quantity"
                              disabled={item.quantity >= maxStock}
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            >
                              <Plus size={13} />
                            </button>
                          </div>

                          {/* Remove Button */}
                          <button
                            type="button"
                            className="cart-item-remove-btn"
                            aria-label={`Remove ${item.name} from cart`}
                            title="Remove item"
                            onClick={() => handleRemoveItem(item)}
                          >
                            <Trash2 size={16} strokeWidth={1.5} />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

          </div>

          {/* Right Column: Order Summary */}
          <div className="cart-summary-wrapper">
            <div className="cart-summary-card">
              <h2 className="cart-summary-heading">Order Summary</h2>

              {/* Price Breakdown */}
              <div className="cart-summary-rows">
                <div className="cart-summary-row">
                  <span className="cart-summary-row-label">Subtotal</span>
                  <span className="cart-summary-row-value">{formatCurrency(cartTotal)}</span>
                </div>

                {validCoupon && (
                  <div className="cart-summary-row discount">
                    <span className="cart-summary-row-label">Discount ({validCoupon.code})</span>
                    <span className="cart-summary-row-value">-{formatCurrency(discountAmount)}</span>
                  </div>
                )}

                <div className={`cart-summary-row ${isFreeShipping ? 'free-shipping' : ''}`}>
                  <span className="cart-summary-row-label">Estimated Shipping</span>
                  <span className="cart-summary-row-value">
                    {isFreeShipping ? 'Complimentary' : formatCurrency(shippingCharge)}
                  </span>
                </div>

                <div className="cart-summary-row">
                  <span className="cart-summary-row-label">Estimated Tax (15%)</span>
                  <span className="cart-summary-row-value">{formatCurrency(taxPrice)}</span>
                </div>
              </div>

              {/* Coupon / Discount Code Field */}
              <div className="cart-coupon-section">
                {validCoupon ? (
                  <div className="cart-coupon-active">
                    <div className="cart-coupon-active-info">
                      <Ticket size={16} />
                      <span>{validCoupon.code} (-{formatCurrency(discountAmount)})</span>
                    </div>
                    <button
                      type="button"
                      className="cart-coupon-remove-btn"
                      onClick={handleRemoveCoupon}
                      title="Remove coupon"
                    >
                      <X size={15} />
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleApplyCoupon}>
                    <div className="cart-coupon-form">
                      <input
                        type="text"
                        placeholder="Discount code"
                        value={couponInput}
                        onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                        className="cart-coupon-input"
                      />
                      <button
                        type="submit"
                        disabled={!couponInput.trim() || validatingCoupon}
                        className="cart-coupon-apply-btn"
                      >
                        {validatingCoupon ? (
                          <Loader2 size={15} className="animate-spin" />
                        ) : (
                          'Apply'
                        )}
                      </button>
                    </div>
                    {couponError && (
                      <p className="cart-coupon-error">
                        <X size={13} /> {couponError}
                      </p>
                    )}
                  </form>
                )}
              </div>

              {/* Grand Total */}
              <div className="cart-summary-total-row">
                <span className="cart-summary-total-label">Total</span>
                <span className="cart-summary-total-value">{formatCurrency(grandTotal)}</span>
              </div>

              {/* Primary Action Button */}
              {hasOutOfStockItems && (
                <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', color: '#991B1B', padding: '0.75rem', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '1rem', textAlign: 'center' }}>
                  One or more items in your cart are currently <strong>Out of Stock</strong>. Please remove them to proceed.
                </div>
              )}

              <button
                type="button"
                className="cart-btn-checkout"
                disabled={cart.length === 0 || isCheckingOut || hasOutOfStockItems}
                style={hasOutOfStockItems ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                onClick={handleProceedToCheckout}
              >
                {isCheckingOut ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Proceeding...</span>
                  </>
                ) : (
                  <>
                    <span>Proceed to Checkout</span>
                    <ArrowRight size={16} strokeWidth={1.5} />
                  </>
                )}
              </button>

              <Link to="/products" className="cart-secondary-continue">
                Continue Shopping
              </Link>

              {/* Trust Indicators */}
              <div className="cart-trust-badges">
                <div className="cart-trust-item">
                  <ShieldCheck size={16} strokeWidth={1.5} />
                  <span>Secure 256-bit encrypted checkout</span>
                </div>
                <div className="cart-trust-item">
                  <Truck size={16} strokeWidth={1.5} />
                  <span>Complimentary delivery on orders over {formatCurrency(FREE_SHIPPING_THRESHOLD)}</span>
                </div>
                <div className="cart-trust-item">
                  <RotateCcw size={16} strokeWidth={1.5} />
                  <span>30-day effortless artisanal guarantee</span>
                </div>
              </div>

            </div>
          </div>

        </div>

      </div>

      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            className="cart-toast"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.2 }}
          >
            <Check size={16} strokeWidth={2.5} />
            <span>{toastMessage}</span>
            {lastRemovedItem && (
              <button type="button" onClick={handleUndoRemove} className="cart-toast-undo">
                Undo
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Cart;
