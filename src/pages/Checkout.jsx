import { motion } from 'framer-motion';
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { Ticket, X, Check, Loader2 } from 'lucide-react';
import axios, { getApiUrl } from '../utils/api';
import { formatCurrency } from '../utils/currency';
import { loadRazorpayScript } from '../utils/razorpay';

const FREE_SHIPPING_THRESHOLD = 1000;
const STANDARD_SHIPPING_FEE = 100.00;

const Checkout = () => {
  const { cart, cartLoading, cartTotal, clearCart } = useCart();
  const navigate = useNavigate();
  const location = useLocation();

  const [formData, setFormData] = useState({
    fullName: '', email: '', phone: '', address: '', city: '', state: '', pincode: '', paymentMethod: 'cod'
  });
  const [processingOrder, setProcessingOrder] = useState(false);

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

  const subtotalAfterDiscount = cartTotal - (validCoupon ? validCoupon.discount_applied : 0);
  const deliveryCharge = subtotalAfterDiscount >= FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING_FEE;
  const taxPrice = Number((subtotalAfterDiscount * 0.15).toFixed(2));
  const grandTotal = Number((subtotalAfterDiscount + taxPrice + deliveryCharge).toFixed(2));

  const handleChange = (e) => {
    setFormData({...formData, [e.target.name]: e.target.value});
  };

  const handleApplyCoupon = async () => {
    if (!couponCodeInput.trim()) return;
    setValidatingCoupon(true);
    setCouponError('');
    
    try {
      const { data } = await axios.post(getApiUrl('/api/coupons/validate'), {
        code: couponCodeInput,
        subtotal: cartTotal
      }, { withCredentials: true });
      
      setValidCoupon(data);
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
  };

  const hasOutOfStock = cart.some(item => item.countInStock !== undefined && Number(item.countInStock) <= 0);

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
      const orderItems = cart.map(item => ({
        product: item.id,
        name: item.name,
        qty: item.quantity,
        image: item.image || '/Frutlle%20Logo.png',
        price: item.price
      }));

      const orderData = {
        orderItems,
        shippingAddress: {
          address: formData.address,
          city: formData.city,
          postalCode: formData.pincode,
          country: formData.state
        },
        paymentMethod: formData.paymentMethod,
        itemsPrice: cartTotal,
        taxPrice: taxPrice,
        shippingPrice: deliveryCharge,
        totalPrice: grandTotal,
        ...(validCoupon && { couponCode: validCoupon.code })
      };

      const { data } = await axios.post(getApiUrl('/api/orders'), orderData, { withCredentials: true });

      // Handle Cash on Delivery (COD) flow
      if (formData.paymentMethod === 'cod') {
        clearCart();
        sessionStorage.removeItem('frutlle_coupon');
        setProcessingOrder(false);
        navigate('/order-confirmation', { state: { orderId: data._id, ...formData, isPaid: false } });
        return;
      }

      // Handle Online Payment (Razorpay) flow
      if (formData.paymentMethod === 'online') {
        if (!data.razorpayOrder) {
          throw new Error('Online payment order details were not returned from the server.');
        }

        const isScriptLoaded = await loadRazorpayScript();
        if (!isScriptLoaded || !window.Razorpay) {
          setProcessingOrder(false);
          alert('Could not load the payment gateway SDK. Please check your internet connection or choose Cash on Delivery.');
          return;
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
            name: formData.fullName,
            email: formData.email,
            contact: formData.phone
          },
          notes: {
            orderId: data._id
          },
          theme: {
            color: '#881337'
          },
          handler: async function (response) {
            try {
              const verifyRes = await axios.post(
                getApiUrl(`/api/orders/${data._id}/verify-payment`),
                {
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature
                },
                { withCredentials: true }
              );

              if (verifyRes.data?.success) {
                clearCart();
                sessionStorage.removeItem('frutlle_coupon');
                navigate('/order-confirmation', {
                  state: { orderId: data._id, ...formData, isPaid: true }
                });
              } else {
                alert(verifyRes.data?.message || 'Payment verification failed. Please contact support.');
              }
            } catch (verifyErr) {
              console.error('Payment verification error:', verifyErr);
              alert(verifyErr.response?.data?.message || 'Payment verification failed. If your account was charged, please contact support.');
            } finally {
              setProcessingOrder(false);
            }
          },
          modal: {
            ondismiss: function () {
              setProcessingOrder(false);
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
      }
    } catch (error) {
      console.error('Order creation failed:', error);
      alert(error.response?.data?.message || error.message || 'Order failed to process. Please try again.');
      setProcessingOrder(false);
    }
  };

  if (cartLoading) {
    return (
      <div className="container section text-center" style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 size={36} className="spin" style={{ color: 'var(--color-primary)', marginBottom: '1rem' }} />
        <p style={{ color: 'var(--color-text)' }}>Securing your cart details...</p>
      </div>
    );
  }

  if (cart.length === 0) {
    navigate('/cart');
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="container section"
    >
      <h1 className="heading-lg" style={{ marginBottom: 'var(--space-2xl)' }}>Checkout</h1>
      
      <div className="checkout-grid">
        
        {/* Checkout Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          <h2 className="heading-sm" style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>Shipping Details</h2>
          
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input required type="text" name="fullName" className="form-input" onChange={handleChange} />
          </div>
          
          <div className="checkout-row-2">
            <div className="form-group">
              <label className="form-label">Email</label>
              <input required type="email" name="email" className="form-input" onChange={handleChange} />
            </div>
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input required type="tel" name="phone" className="form-input" onChange={handleChange} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Address</label>
            <input required type="text" name="address" className="form-input" onChange={handleChange} />
          </div>

          <div className="checkout-row-3">
            <div className="form-group">
              <label className="form-label">City</label>
              <input required type="text" name="city" className="form-input" onChange={handleChange} />
            </div>
            <div className="form-group">
              <label className="form-label">State</label>
              <input required type="text" name="state" className="form-input" onChange={handleChange} />
            </div>
            <div className="form-group">
              <label className="form-label">Pincode</label>
              <input required type="text" name="pincode" className="form-input" onChange={handleChange} />
            </div>
          </div>

          <h2 className="heading-sm" style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem', marginTop: 'var(--space-lg)' }}>Payment Method</h2>
          
          <div className="checkout-payment-methods">
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input type="radio" name="paymentMethod" value="cod" checked={formData.paymentMethod === 'cod'} onChange={handleChange} />
              Cash on Delivery
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input type="radio" name="paymentMethod" value="online" checked={formData.paymentMethod === 'online'} onChange={handleChange} />
              Online Payment (Credit/Debit)
            </label>
          </div>

          <button 
            type="submit" 
            disabled={hasOutOfStock || processingOrder}
            className="btn btn-primary" 
            style={{ width: '100%', fontSize: '1.05rem', padding: '1rem', ...(hasOutOfStock || processingOrder ? { opacity: 0.5, cursor: 'not-allowed' } : {}) }}
          >
            {hasOutOfStock 
              ? 'Cannot Place Order (Items Out of Stock)' 
              : processingOrder 
                ? 'Processing Order...' 
                : `Place Order (${formatCurrency(grandTotal)})`}
          </button>
        </form>

        {/* Order Summary */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Discount Code Section */}
          <div style={{ background: 'var(--color-white)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--color-border)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Ticket size={18} /> Apply Discount Code
            </h3>
            
            {validCoupon ? (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', padding: '0.75rem 1rem', borderRadius: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#065f46' }}>
                  <Check size={16} />
                  <span style={{ fontWeight: 600 }}>{validCoupon.code}</span>
                  <span style={{ fontSize: '0.875rem', opacity: 0.8 }}>(-{formatCurrency(validCoupon.discount_applied)})</span>
                </div>
                <button onClick={removeCoupon} style={{ background: 'none', border: 'none', color: '#059669', cursor: 'pointer', padding: '0.25rem' }}>
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <input 
                    type="text" 
                    placeholder="Enter coupon code" 
                    value={couponCodeInput}
                    onChange={(e) => setCouponCodeInput(e.target.value.toUpperCase())}
                    style={{ flex: '1 1 180px', minWidth: '0', padding: '0.75rem 1rem', border: '1px solid var(--color-border)', borderRadius: '0.5rem', fontSize: '0.95rem' }}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleApplyCoupon())}
                  />
                  <button 
                    onClick={handleApplyCoupon}
                    disabled={!couponCodeInput.trim() || validatingCoupon}
                    className="btn btn-secondary"
                    style={{ padding: '0.75rem 1.5rem', borderRadius: '0.5rem', minWidth: '90px' }}
                  >
                    {validatingCoupon ? <Loader2 size={18} className="spin" /> : 'Apply'}
                  </button>
                </div>
                {couponError && <p style={{ color: 'var(--frutlle-red)', fontSize: '0.875rem', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><X size={14} /> {couponError}</p>}
              </div>
            )}
          </div>

          <div className="checkout-summary-box">
            <h2 className="heading-sm" style={{ marginBottom: 'var(--space-lg)', borderBottom: '1px solid var(--color-border)', paddingBottom: '1rem' }}>Order Summary</h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', marginBottom: 'var(--space-lg)' }}>
              {cart.map(item => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                  <span style={{ color: 'var(--color-text)' }}>{item.name} x {item.quantity}</span>
                  <span style={{ fontWeight: '500' }}>{formatCurrency(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>
            
            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--color-text)' }}>Subtotal</span>
                <span>{formatCurrency(cartTotal)}</span>
              </div>
              
              {validCoupon && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: '#059669', fontWeight: 500 }}>
                  <span>Discount ({validCoupon.code})</span>
                  <span>-{formatCurrency(validCoupon.discount_applied)}</span>
                </div>
              )}
              
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--color-text)' }}>Tax (15%)</span>
                <span>{formatCurrency(taxPrice)}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-sm)' }}>
                <span style={{ color: 'var(--color-text)' }}>Delivery</span>
                <span>{deliveryCharge === 0 ? 'Complimentary' : formatCurrency(deliveryCharge)}</span>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--color-border)', fontSize: '1.25rem', fontWeight: '600' }}>
                <span>Total</span>
                <span style={{ color: 'var(--color-primary)' }}>{formatCurrency(grandTotal)}</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </motion.div>
  );
};

export default Checkout;
