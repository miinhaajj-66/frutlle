import { motion } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { 
  X, 
  Check, 
  Loader2, 
  ShieldCheck, 
  Lock, 
  ChevronDown, 
  ChevronUp, 
  ShoppingBag, 
  Info,
  CheckCircle2
} from 'lucide-react';
import axios, { getApiUrl, getAssetUrl, getFallbackImage } from '../utils/api';
import { formatCurrency } from '../utils/currency';
import { loadRazorpayScript } from '../utils/razorpay';
import OrderSuccessOverlay from '../components/OrderSuccessOverlay';
import './Checkout.css';

const FREE_SHIPPING_THRESHOLD = 1000;
const STANDARD_SHIPPING_FEE = 100.00;

const getInitialFormData = (userData) => {
  const shipping = userData?.shippingAddress || {};
  const parts = (userData?.name || '').trim().split(/\s+/);
  const first = parts[0] || '';
  const last = parts.slice(1).join(' ') || '';

  return {
    firstName: first,
    lastName: last,
    email: userData?.email || '',
    phone: userData?.phone || shipping.phone || '',
    address: shipping.streetAddress || shipping.address || '',
    apartment: shipping.apartment || '',
    city: shipping.city || '',
    state: shipping.state || '',
    pincode: shipping.postalCode || '',
    country: shipping.country || 'India',
    paymentMethod: 'online'
  };
};

const Checkout = () => {
  const { cart, cartLoading, cartTotal, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const autofillAppliedRef = useRef(Boolean(user));
  // Form State with first/last name and delivery breakdown
  const [formData, setFormData] = useState(() => getInitialFormData(user));

  const [processingOrder, setProcessingOrder] = useState(false);
  const [mobileSummaryOpen, setMobileSummaryOpen] = useState(false);

  // Coupon State
  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [validCoupon, setValidCoupon] = useState(() => {
    if (location.state?.coupon) return location.state.coupon;
    try {
      const saved = sessionStorage.getItem('frutlle_coupon');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [couponError, setCouponError] = useState('');
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [checkingPendingOrder, setCheckingPendingOrder] = useState(false);

  // Full-Screen Animated Success Overlay State
  const [overlayState, setOverlayState] = useState({
    isOpen: false,
    status: 'verifying', // 'verifying' | 'confirmed' | 'error'
    orderData: null,
    errorMessage: ''
  });

  // Autofill form with authenticated customer profile data
  useEffect(() => {
    if (user && !autofillAppliedRef.current) {
      autofillAppliedRef.current = true;
      const initial = getInitialFormData(user);
      setFormData((prev) => ({
        ...prev,
        firstName: prev.firstName || initial.firstName,
        lastName: prev.lastName || initial.lastName,
        email: prev.email || initial.email,
        phone: prev.phone || initial.phone,
        address: prev.address || initial.address,
        apartment: prev.apartment || initial.apartment,
        city: prev.city || initial.city,
        state: prev.state || initial.state,
        pincode: prev.pincode || initial.pincode,
        country: prev.country || initial.country
      }));
    }
  }, [user]);

  // Check if returning from external 3DS / bank redirect with a pending order
  useEffect(() => {
    const pendingRaw = sessionStorage.getItem('frutlle_pending_order');
    if (!pendingRaw) return;

    let pending;
    try {
      pending = JSON.parse(pendingRaw);
    } catch {
      sessionStorage.removeItem('frutlle_pending_order');
      return;
    }

    if (!pending?.orderId) return;

    const searchParams = new URLSearchParams(window.location.search);
    const razorpayPaymentId = searchParams.get('razorpay_payment_id');
    const razorpayOrderId = searchParams.get('razorpay_order_id') || pending.razorpayOrderId;
    const razorpaySignature = searchParams.get('razorpay_signature');

    setCheckingPendingOrder(true);
    setOverlayState({ isOpen: true, status: 'verifying', orderData: null, errorMessage: '' });

    const checkPendingStatus = async () => {
      try {
        if (razorpayPaymentId) {
          try {
            await axios.post(
              getApiUrl(`/api/orders/${pending.orderId}/verify-payment`),
              {
                razorpay_order_id: razorpayOrderId,
                razorpay_payment_id: razorpayPaymentId,
                razorpay_signature: razorpaySignature || ''
              },
              { withCredentials: true }
            );
          } catch (verifyErr) {
            console.warn('URL redirect verification attempt failed, verifying via status check:', verifyErr);
          }
        }

        const { data: orderData } = await axios.get(
          getApiUrl(`/api/orders/${pending.orderId}`),
          { withCredentials: true }
        );

        if (orderData?.is_paid) {
          sessionStorage.removeItem('frutlle_pending_order');
          sessionStorage.removeItem('frutlle_coupon');
          clearCart();
          setCheckingPendingOrder(false);
          setOverlayState({
            isOpen: true,
            status: 'confirmed',
            orderData: {
              orderId: orderData.id || orderData._id || pending.orderId,
              fullName: orderData.shipping_address?.fullName || orderData.user?.name || pending.fullName || '',
              email: orderData.user?.email || pending.email || '',
              phone: orderData.shipping_address?.phone || pending.phone || '',
              address: orderData.shipping_address?.address || pending.address || '',
              city: orderData.shipping_address?.city || pending.city || '',
              state: orderData.shipping_address?.country || pending.state || '',
              pincode: orderData.shipping_address?.postalCode || pending.pincode || '',
              paymentMethod: 'online',
              isPaid: true
            },
            errorMessage: ''
          });
          return;
        } else {
          setOverlayState({ isOpen: false, status: 'verifying', orderData: null, errorMessage: '' });
        }
      } catch (err) {
        console.warn('Pending order verification check failed:', err);
        if (err.response?.status === 401 || err.response?.status === 403 || err.response?.status === 404) {
          sessionStorage.removeItem('frutlle_pending_order');
        }
        setOverlayState({ isOpen: false, status: 'verifying', orderData: null, errorMessage: '' });
      } finally {
        setCheckingPendingOrder(false);
      }
    };

    checkPendingStatus();
  }, [clearCart]);

  // Pricing calculations
  const subtotalAfterDiscount = cartTotal - (validCoupon ? validCoupon.discount_applied : 0);
  const deliveryCharge = subtotalAfterDiscount >= FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING_FEE;
  const taxPrice = Number((subtotalAfterDiscount * 0.15).toFixed(2));
  const grandTotal = Number((subtotalAfterDiscount + taxPrice + deliveryCharge).toFixed(2));
  const totalItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleApplyCoupon = async () => {
    if (!couponCodeInput.trim()) return;
    setValidatingCoupon(true);
    setCouponError('');

    try {
      const { data } = await axios.post(
        getApiUrl('/api/coupons/validate'),
        {
          code: couponCodeInput.trim().toUpperCase(),
          subtotal: cartTotal
        },
        { withCredentials: true }
      );

      setValidCoupon(data);
      sessionStorage.setItem('frutlle_coupon', JSON.stringify(data));
      setCouponCodeInput('');
    } catch (error) {
      setCouponError(error.response?.data?.message || 'Invalid coupon code');
      setValidCoupon(null);
    } finally {
      setValidatingCoupon(false);
    }
  };

  const removeCoupon = () => {
    setValidCoupon(null);
    setCouponError('');
    sessionStorage.removeItem('frutlle_coupon');
  };

  const hasOutOfStock = cart.some(
    (item) => item.countInStock !== undefined && Number(item.countInStock) <= 0
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (hasOutOfStock) {
      alert('One or more items in your cart are currently Out of Stock. Please remove them before placing an order.');
      navigate('/cart');
      return;
    }
    if (processingOrder) return;

    setProcessingOrder(true);

    try {
      const fullName = `${formData.firstName.trim()} ${formData.lastName.trim()}`.trim();
      const fullAddress = formData.apartment.trim()
        ? `${formData.address.trim()}, ${formData.apartment.trim()}`
        : formData.address.trim();

      const orderItems = cart.map((item) => ({
        product: item.id,
        name: item.name,
        qty: item.quantity,
        image: item.image || '/Frutlle%20Logo.png',
        price: item.price
      }));

      const orderData = {
        orderItems,
        shippingAddress: {
          address: fullAddress,
          streetAddress: formData.address.trim(),
          apartment: formData.apartment.trim(),
          city: formData.city.trim(),
          postalCode: formData.pincode.trim(),
          country: formData.state.trim() || formData.country.trim() || 'India',
          state: formData.state.trim(),
          phone: formData.phone.trim(),
          fullName: fullName,
          email: formData.email.trim()
        },
        paymentMethod: 'online',
        itemsPrice: cartTotal,
        taxPrice: taxPrice,
        shippingPrice: deliveryCharge,
        totalPrice: grandTotal,
        ...(validCoupon && { couponCode: validCoupon.code })
      };

      const { data } = await axios.post(getApiUrl('/api/orders'), orderData, { withCredentials: true });

      if (!data.razorpayOrder) {
        throw new Error('Online payment order details were not returned from the server.');
      }

      const isScriptLoaded = await loadRazorpayScript();
      if (!isScriptLoaded || !window.Razorpay) {
        setProcessingOrder(false);
        alert('Could not load the payment gateway SDK. Please check your internet connection and try again.');
        return;
      }

      // Save pending order to sessionStorage before initiating payment
      try {
        sessionStorage.setItem(
          'frutlle_pending_order',
          JSON.stringify({
            orderId: data._id,
            razorpayOrderId: data.razorpayOrder.id,
            fullName: fullName,
            firstName: formData.firstName,
            lastName: formData.lastName,
            email: formData.email,
            phone: formData.phone,
            address: formData.address,
            apartment: formData.apartment,
            city: formData.city,
            state: formData.state,
            pincode: formData.pincode,
            country: formData.country,
            paymentMethod: 'online'
          })
        );
      } catch (storageErr) {
        console.warn('Could not save pending order to sessionStorage:', storageErr);
      }

      const options = {
        key: data.razorpayOrder.keyId,
        amount: data.razorpayOrder.amount,
        currency: data.razorpayOrder.currency || 'INR',
        name: 'FRUTLLE',
        description: `Order #${String(data._id).slice(0, 8)}`,
        image: '/Frutlle%20Logo.png',
        order_id: data.razorpayOrder.id,
        prefill: {
          name: fullName,
          email: formData.email.trim(),
          contact: formData.phone.trim()
        },
        notes: {
          orderId: data._id
        },
        theme: {
          color: '#881337'
        },
        handler: async function (response) {
          try {
            setOverlayState({ isOpen: true, status: 'verifying', orderData: null, errorMessage: '' });

            const payload = {
              razorpay_order_id: response.razorpay_order_id || data.razorpayOrder?.id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature || ''
            };

            let verified = false;

            // Step 1: Call verify-payment endpoint
            try {
              const verifyRes = await axios.post(
                getApiUrl(`/api/orders/${data._id}/verify-payment`),
                payload,
                { withCredentials: true }
              );
              if (verifyRes.data?.success) {
                verified = true;
              }
            } catch (verifyErr) {
              console.warn('Direct verify-payment failed, checking order status / webhook...', verifyErr);
            }

            // Step 2: Poll order status up to 4 times
            if (!verified) {
              for (let attempt = 1; attempt <= 4; attempt++) {
                await new Promise((resolve) => setTimeout(resolve, 1500));
                try {
                  const statusRes = await axios.get(
                    getApiUrl(`/api/orders/${data._id}`),
                    { withCredentials: true }
                  );
                  if (statusRes.data?.is_paid) {
                    verified = true;
                    break;
                  }
                } catch (pollErr) {
                  console.warn(`Order poll attempt ${attempt} failed:`, pollErr);
                }
              }
            }

            if (verified) {
              sessionStorage.removeItem('frutlle_pending_order');
              sessionStorage.removeItem('frutlle_coupon');
              clearCart();
              setOverlayState({
                isOpen: true,
                status: 'confirmed',
                orderData: {
                  orderId: data._id,
                  fullName: fullName,
                  email: formData.email,
                  phone: formData.phone,
                  address: fullAddress,
                  city: formData.city,
                  state: formData.state,
                  pincode: formData.pincode,
                  paymentMethod: 'online',
                  isPaid: true
                },
                errorMessage: ''
              });
            } else {
              setOverlayState({
                isOpen: true,
                status: 'error',
                orderData: null,
                errorMessage: 'Payment was received, but server confirmation took longer than expected. If your account was charged, our system will link your order automatically once confirmed by Razorpay.'
              });
            }
          } catch (err) {
            console.error('Payment handler error:', err);
            setOverlayState({
              isOpen: true,
              status: 'error',
              orderData: null,
              errorMessage: err.response?.data?.message || 'Payment verification failed. If your account was charged, please contact support.'
            });
          } finally {
            setProcessingOrder(false);
          }
        },
        modal: {
          ondismiss: async function () {
            try {
              const statusRes = await axios.get(
                getApiUrl(`/api/orders/${data._id}`),
                { withCredentials: true }
              );
              if (statusRes.data?.is_paid) {
                sessionStorage.removeItem('frutlle_pending_order');
                sessionStorage.removeItem('frutlle_coupon');
                clearCart();
                setOverlayState({
                  isOpen: true,
                  status: 'confirmed',
                  orderData: {
                    orderId: data._id,
                    fullName: fullName,
                    email: formData.email,
                    phone: formData.phone,
                    address: fullAddress,
                    city: formData.city,
                    state: formData.state,
                    pincode: formData.pincode,
                    paymentMethod: 'online',
                    isPaid: true
                  },
                  errorMessage: ''
                });
                return;
              }
            } catch (dismissErr) {
              console.warn('Ondismiss status check failed:', dismissErr);
            }
            sessionStorage.removeItem('frutlle_pending_order');
            setProcessingOrder(false);
            setOverlayState({ isOpen: false, status: 'verifying', orderData: null, errorMessage: '' });
            alert('Payment was cancelled. You can retry payment anytime.');
          }
        }
      };

      const razorpayInstance = new window.Razorpay(options);
      razorpayInstance.on('payment.failed', function (failureResponse) {
        console.error('Razorpay payment failed:', failureResponse.error);
        alert(failureResponse.error?.description || 'Payment was unsuccessful. Please try again.');
        setProcessingOrder(false);
      });
      razorpayInstance.open();
    } catch (error) {
      console.error('Order creation failed:', error);
      if (error.response?.status === 401) {
        alert('Your session has expired or is unauthorized. Please sign in again to complete your order.');
        navigate('/login', { state: { from: '/checkout' } });
      } else {
        alert(error.response?.data?.message || error.message || 'Order failed to process. Please try again.');
      }
      setProcessingOrder(false);
    }
  };

  // Loading state guard
  if ((cartLoading || checkingPendingOrder) && !overlayState.isOpen) {
    return (
      <div className="checkout-wrapper">
        <div className="checkout-container text-center" style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <Loader2 size={36} className="spin" style={{ color: 'var(--frutlle-red, #A91B24)', marginBottom: '1rem' }} />
          <p style={{ color: 'var(--frutlle-dark-red, #94181F)', fontWeight: 500 }}>Securing your order details...</p>
        </div>
      </div>
    );
  }

  // Empty cart guard
  if (cart.length === 0 && !processingOrder && !checkingPendingOrder && !overlayState.isOpen && !sessionStorage.getItem('frutlle_pending_order')) {
    navigate('/cart');
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="checkout-wrapper"
    >
      <div className="checkout-container">
        
        {/* Page Header */}
        <header className="checkout-page-header">
          <h1 className="checkout-main-title">Checkout</h1>
          <div className="checkout-secure-badge-top">
            <ShieldCheck size={16} />
            <span>256-bit SSL Secure Checkout</span>
          </div>
        </header>

        {/* Mobile Collapsible Order Summary Bar */}
        <button
          type="button"
          className="checkout-mobile-summary-bar"
          onClick={() => setMobileSummaryOpen(!mobileSummaryOpen)}
          aria-expanded={mobileSummaryOpen}
        >
          <div className="checkout-mobile-summary-left">
            <ShoppingBag size={18} />
            <span>{mobileSummaryOpen ? 'Hide order summary' : `Show order summary (${totalItemCount} items)`}</span>
            {mobileSummaryOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
          <div className="checkout-mobile-summary-right">
            <span>{formatCurrency(grandTotal)}</span>
          </div>
        </button>

        {/* Two-Column Layout Grid */}
        <div className="checkout-grid-container">

          {/* LEFT COLUMN: Numbered Checkout Form (65%) */}
          <form id="checkout-main-form" onSubmit={handleSubmit} className="checkout-left-column">
            
            {/* Authenticated Customer Banner */}
            {user && (
              <div className="checkout-autofill-badge">
                <CheckCircle2 size={16} />
                <span>Logged in as <strong>{user.name || user.email}</strong>. Details auto-populated from your saved profile.</span>
              </div>
            )}

            {/* SECTION 1: Contact Information */}
            <section className="checkout-section-card">
              <div className="checkout-section-header">
                <div className="checkout-step-number">1</div>
                <h2 className="checkout-step-title">Contact Information</h2>
              </div>

              <div className="checkout-fields-stack">
                <div className="checkout-row-split-2">
                  <div className="checkout-field-group">
                    <label className="checkout-field-label" htmlFor="firstName">
                      First Name <span className="required-star">*</span>
                    </label>
                    <input
                      id="firstName"
                      required
                      type="text"
                      name="firstName"
                      className="checkout-input-control"
                      placeholder="e.g. Rahul"
                      value={formData.firstName}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="checkout-field-group">
                    <label className="checkout-field-label" htmlFor="lastName">
                      Last Name <span className="required-star">*</span>
                    </label>
                    <input
                      id="lastName"
                      required
                      type="text"
                      name="lastName"
                      className="checkout-input-control"
                      placeholder="e.g. Sharma"
                      value={formData.lastName}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="checkout-row-split-2">
                  <div className="checkout-field-group">
                    <label className="checkout-field-label" htmlFor="phone">
                      Phone Number <span className="required-star">*</span>
                    </label>
                    <input
                      id="phone"
                      required
                      type="tel"
                      name="phone"
                      className="checkout-input-control"
                      placeholder="e.g. +91 98765 43210"
                      value={formData.phone}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="checkout-field-group">
                    <label className="checkout-field-label" htmlFor="email">
                      Email Address <span className="required-star">*</span>
                    </label>
                    <input
                      id="email"
                      required
                      type="email"
                      name="email"
                      className="checkout-input-control"
                      placeholder="e.g. rahul.sharma@example.com"
                      value={formData.email}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* SECTION 2: Delivery Information */}
            <section className="checkout-section-card">
              <div className="checkout-section-header">
                <div className="checkout-step-number">2</div>
                <h2 className="checkout-step-title">Delivery Information</h2>
              </div>

              <div className="checkout-fields-stack">
                <div className="checkout-field-group">
                  <label className="checkout-field-label" htmlFor="address">
                    Street Address / Flat / Building <span className="required-star">*</span>
                  </label>
                  <input
                    id="address"
                    required
                    type="text"
                    name="address"
                    className="checkout-input-control"
                    placeholder="e.g. Flat 402, Sunshine Apartments, 12th Main Road"
                    value={formData.address}
                    onChange={handleChange}
                  />
                </div>

                <div className="checkout-field-group">
                  <label className="checkout-field-label" htmlFor="apartment">
                    Apartment / Suite / Landmark <span className="optional-tag">(Optional)</span>
                  </label>
                  <input
                    id="apartment"
                    type="text"
                    name="apartment"
                    className="checkout-input-control"
                    placeholder="e.g. Near City Park or Landmark"
                    value={formData.apartment}
                    onChange={handleChange}
                  />
                </div>

                <div className="checkout-row-split-2">
                  <div className="checkout-field-group">
                    <label className="checkout-field-label" htmlFor="city">
                      City <span className="required-star">*</span>
                    </label>
                    <input
                      id="city"
                      required
                      type="text"
                      name="city"
                      className="checkout-input-control"
                      placeholder="e.g. Mumbai"
                      value={formData.city}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="checkout-field-group">
                    <label className="checkout-field-label" htmlFor="state">
                      State <span className="required-star">*</span>
                    </label>
                    <input
                      id="state"
                      required
                      type="text"
                      name="state"
                      className="checkout-input-control"
                      placeholder="e.g. Maharashtra"
                      value={formData.state}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="checkout-row-split-2">
                  <div className="checkout-field-group">
                    <label className="checkout-field-label" htmlFor="pincode">
                      PIN Code <span className="required-star">*</span>
                    </label>
                    <input
                      id="pincode"
                      required
                      type="text"
                      name="pincode"
                      className="checkout-input-control"
                      placeholder="e.g. 400001"
                      value={formData.pincode}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="checkout-field-group">
                    <label className="checkout-field-label" htmlFor="country">
                      Country <span className="required-star">*</span>
                    </label>
                    <input
                      id="country"
                      required
                      type="text"
                      name="country"
                      className="checkout-input-control"
                      value={formData.country}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* SECTION 3: Payment Method */}
            <section className="checkout-section-card">
              <div className="checkout-section-header">
                <div className="checkout-step-number">3</div>
                <h2 className="checkout-step-title">Payment Method</h2>
              </div>

              {/* Single clean Razorpay online payment option */}
              <div className="checkout-payment-card">
                <div className="checkout-payment-header">
                  <label className="checkout-payment-radio-label">
                    <div className="checkout-radio-indicator">
                      <div className="checkout-radio-indicator-dot" />
                    </div>
                    <span>Online Payment (Razorpay)</span>
                  </label>
                  <span className="checkout-security-tag">
                    <Lock size={12} style={{ display: 'inline', marginRight: '3px' }} />
                    100% Encrypted
                  </span>
                </div>

                <div className="checkout-methods-supported">
                  <span className="checkout-method-pill">UPI / QR (GPay, PhonePe, Paytm)</span>
                  <span className="checkout-method-pill">Cards (Visa, MasterCard, RuPay)</span>
                  <span className="checkout-method-pill">Netbanking (All Banks)</span>
                  <span className="checkout-method-pill">Wallets</span>
                </div>
              </div>

              {/* Explicit notice that Cash on Delivery is disabled */}
              <div className="checkout-cod-note">
                <Info size={16} style={{ flexShrink: 0 }} />
                <span>Cash on Delivery (COD) is disabled to ensure contactless and guaranteed fruit delivery.</span>
              </div>

              {/* Submit & Payment Action Button */}
              <div className="checkout-submit-area">
                <button
                  type="submit"
                  disabled={hasOutOfStock || processingOrder}
                  className="checkout-submit-button"
                >
                  {hasOutOfStock ? (
                    'Cannot Place Order (Items Out of Stock)'
                  ) : processingOrder ? (
                    <>
                      <Loader2 size={18} className="spin" />
                      <span>Processing Secure Payment...</span>
                    </>
                  ) : (
                    <>
                      <Lock size={18} />
                      <span>Place Order & Pay · {formatCurrency(grandTotal)}</span>
                    </>
                  )}
                </button>

                <div className="checkout-guarantee-text">
                  <ShieldCheck size={14} style={{ color: '#059669' }} />
                  <span>Guaranteed safe & secure checkout powered by Razorpay</span>
                </div>
              </div>
            </section>

          </form>

          {/* RIGHT COLUMN: Compact Vertical Order Summary Card (35%) */}
          <aside className={`checkout-right-column ${!mobileSummaryOpen ? 'mobile-hidden' : ''}`}>
            <div className="checkout-summary-card">
              
              <div className="checkout-summary-header">
                <h2 className="checkout-summary-title">Order Summary</h2>
                <span className="checkout-summary-count-badge">
                  {totalItemCount} {totalItemCount === 1 ? 'item' : 'items'}
                </span>
              </div>

              {/* Product items thumbnail list */}
              <div className="checkout-items-list">
                {cart.map((item) => (
                  <div key={item.id} className="checkout-item-row">
                    <div className="checkout-item-left">
                      <div className="checkout-item-thumb-wrapper">
                        <img
                          src={getAssetUrl(item.image)}
                          alt={item.name}
                          className="checkout-item-img"
                          onError={(e) => {
                            const fallback = getFallbackImage(item);
                            if (e.target.src !== fallback) {
                              e.target.src = fallback;
                            }
                          }}
                        />
                        <span className="checkout-item-qty-badge">{item.quantity}</span>
                      </div>
                      <div className="checkout-item-meta">
                        <h4 className="checkout-item-name" title={item.name}>{item.name}</h4>
                        <span className="checkout-item-unit-price">{formatCurrency(item.price)} each</span>
                      </div>
                    </div>
                    <div className="checkout-item-price-total">
                      {formatCurrency(item.price * item.quantity)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Coupon Code Section */}
              <div className="checkout-coupon-box">
                {validCoupon ? (
                  <div className="checkout-coupon-active">
                    <div className="checkout-coupon-active-left">
                      <Check size={15} />
                      <strong>{validCoupon.code}</strong>
                      <span>(-{formatCurrency(validCoupon.discount_applied)})</span>
                    </div>
                    <button
                      type="button"
                      onClick={removeCoupon}
                      className="checkout-coupon-remove-btn"
                      title="Remove coupon"
                      aria-label="Remove coupon"
                    >
                      <X size={15} />
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="checkout-coupon-input-group">
                      <input
                        type="text"
                        placeholder="Coupon code"
                        value={couponCodeInput}
                        onChange={(e) => setCouponCodeInput(e.target.value.toUpperCase())}
                        className="checkout-coupon-input"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleApplyCoupon();
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={handleApplyCoupon}
                        disabled={!couponCodeInput.trim() || validatingCoupon}
                        className="checkout-coupon-apply-btn"
                      >
                        {validatingCoupon ? <Loader2 size={15} className="spin" /> : 'Apply'}
                      </button>
                    </div>
                    {couponError && (
                      <p className="checkout-coupon-error-msg">
                        <X size={13} />
                        <span>{couponError}</span>
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Price Breakdown */}
              <div className="checkout-breakdown-list">
                <div className="checkout-breakdown-row">
                  <span>Subtotal</span>
                  <span>{formatCurrency(cartTotal)}</span>
                </div>

                {validCoupon && (
                  <div className="checkout-breakdown-row discount-row">
                    <span>Discount ({validCoupon.code})</span>
                    <span>-{formatCurrency(validCoupon.discount_applied)}</span>
                  </div>
                )}

                <div className="checkout-breakdown-row">
                  <span>Tax (15% GST)</span>
                  <span>{formatCurrency(taxPrice)}</span>
                </div>

                <div className="checkout-breakdown-row">
                  <span>Delivery</span>
                  <span>
                    {deliveryCharge === 0 ? (
                      <span style={{ color: '#059669', fontWeight: 600 }}>Complimentary</span>
                    ) : (
                      formatCurrency(deliveryCharge)
                    )}
                  </span>
                </div>

                <div className="checkout-breakdown-divider" />

                <div className="checkout-total-row">
                  <span className="checkout-total-label">Total</span>
                  <span className="checkout-total-value">{formatCurrency(grandTotal)}</span>
                </div>
                <div className="checkout-tax-inclusive-note">
                  Includes all applicable taxes & shipping
                </div>
              </div>

            </div>
          </aside>

        </div>

        {/* Full-Screen Premium Animated Order Confirmation Experience */}
        <OrderSuccessOverlay
          isOpen={overlayState.isOpen}
          status={overlayState.status}
          orderData={overlayState.orderData}
          errorMessage={overlayState.errorMessage}
          onComplete={() => {
            const finalOrder = overlayState.orderData;
            setOverlayState({ isOpen: false, status: 'confirmed', orderData: null, errorMessage: '' });
            navigate('/order-confirmation', {
              state: { ...finalOrder, paymentMethod: 'online', isPaid: true },
              replace: true
            });
          }}
        />

      </div>
    </motion.div>
  );
};

export default Checkout;
