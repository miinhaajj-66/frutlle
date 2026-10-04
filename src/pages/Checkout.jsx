import { motion } from 'framer-motion';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';

const Checkout = () => {
  const { cart, cartTotal, clearCart } = useCart();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    fullName: '', email: '', phone: '', address: '', city: '', state: '', pincode: '', paymentMethod: 'cod'
  });

  const deliveryCharge = cartTotal > 0 ? 5.00 : 0;
  const grandTotal = cartTotal + deliveryCharge;

  const handleChange = (e) => {
    setFormData({...formData, [e.target.name]: e.target.value});
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Simulate order placement
    clearCart();
    navigate('/order-confirmation', { state: { orderId: `FRUTLLE-${Math.floor(Math.random() * 100000)}`, ...formData }});
  };

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
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--space-3xl)' }}>
        
        {/* Checkout Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          <h2 className="heading-sm" style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>Shipping Details</h2>
          
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input required type="text" name="fullName" className="form-input" onChange={handleChange} />
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-md)' }}>
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
          
          <div style={{ display: 'flex', gap: 'var(--space-lg)', marginBottom: 'var(--space-xl)' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input type="radio" name="paymentMethod" value="cod" checked={formData.paymentMethod === 'cod'} onChange={handleChange} />
              Cash on Delivery
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input type="radio" name="paymentMethod" value="online" checked={formData.paymentMethod === 'online'} onChange={handleChange} />
              Online Payment (Credit/Debit)
            </label>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', fontSize: '1.1rem' }}>
            Place Order (${grandTotal.toFixed(2)})
          </button>
        </form>

        {/* Order Summary */}
        <div style={{ background: 'var(--color-white)', padding: 'var(--space-2xl)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-md)', height: 'fit-content' }}>
          <h2 className="heading-sm" style={{ marginBottom: 'var(--space-lg)', borderBottom: '1px solid var(--color-border)', paddingBottom: '1rem' }}>Order Summary</h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', marginBottom: 'var(--space-lg)' }}>
            {cart.map(item => (
              <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                <span style={{ color: 'var(--color-text)' }}>{item.name} x {item.quantity}</span>
                <span style={{ fontWeight: '500' }}>${(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>
          
          <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-sm)' }}>
              <span style={{ color: 'var(--color-text)' }}>Subtotal</span>
              <span>${cartTotal.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-sm)' }}>
              <span style={{ color: 'var(--color-text)' }}>Delivery</span>
              <span>${deliveryCharge.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--color-border)', fontSize: '1.25rem', fontWeight: '600' }}>
              <span>Total</span>
              <span style={{ color: 'var(--color-primary)' }}>${grandTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>

      </div>
    </motion.div>
  );
};

export default Checkout;
