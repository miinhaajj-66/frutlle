import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { useCart } from '../context/CartContext';

const Cart = () => {
  const { cart, updateQuantity, removeFromCart, cartTotal } = useCart();
  const navigate = useNavigate();

  const deliveryCharge = cartTotal > 0 ? 5.00 : 0;
  const grandTotal = cartTotal + deliveryCharge;

  if (cart.length === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="container section text-center"
      >
        <h1 className="heading-lg" style={{ marginBottom: 'var(--space-md)' }}>Your Cart is Empty</h1>
        <p style={{ marginBottom: 'var(--space-xl)' }}>Looks like you haven't added any sweet treats yet.</p>
        <Link to="/products" className="btn btn-primary">Start Shopping</Link>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="container section"
    >
      <h1 className="heading-lg" style={{ marginBottom: 'var(--space-2xl)' }}>Shopping Cart</h1>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 'var(--space-2xl)' }}>
        <div style={{ '@media (min-width: 992px)': { gridColumn: 'span 2' } }}>
          {/* Cart Items */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
            {cart.map(item => (
              <motion.div 
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                key={item.id} 
                style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-lg)', padding: 'var(--space-md)', background: 'var(--color-white)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-sm)' }}
              >
                <img src={item.image} alt={item.name} style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: 'var(--radius-sm)' }} />
                
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>{item.name}</h3>
                  <p style={{ color: 'var(--color-primary)', fontWeight: '600' }}>${item.price.toFixed(2)}</p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-full)' }}>
                  <button onClick={() => updateQuantity(item.id, item.quantity - 1)} style={{ padding: '0.5rem' }}><Minus size={14}/></button>
                  <span style={{ width: '30px', textAlign: 'center', fontSize: '0.9rem' }}>{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.id, item.quantity + 1)} style={{ padding: '0.5rem' }}><Plus size={14}/></button>
                </div>

                <div style={{ fontWeight: '600', minWidth: '80px', textAlign: 'right' }}>
                  ${(item.price * item.quantity).toFixed(2)}
                </div>

                <button onClick={() => removeFromCart(item.id)} style={{ color: 'var(--color-error)', padding: '0.5rem' }}>
                  <Trash2 size={18} />
                </button>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Summary */}
        <div style={{ background: 'var(--color-white)', padding: 'var(--space-2xl)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-md)', height: 'fit-content' }}>
          <h2 className="heading-sm" style={{ marginBottom: 'var(--space-lg)', borderBottom: '1px solid var(--color-border)', paddingBottom: '1rem' }}>Order Summary</h2>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-sm)' }}>
            <span style={{ color: 'var(--color-text)' }}>Subtotal</span>
            <span>${cartTotal.toFixed(2)}</span>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-lg)' }}>
            <span style={{ color: 'var(--color-text)' }}>Delivery</span>
            <span>${deliveryCharge.toFixed(2)}</span>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-xl)', borderTop: '1px solid var(--color-border)', paddingTop: '1rem', fontSize: '1.25rem', fontWeight: '600' }}>
            <span>Total</span>
            <span style={{ color: 'var(--color-primary)' }}>${grandTotal.toFixed(2)}</span>
          </div>

          <button 
            className="btn btn-primary" 
            style={{ width: '100%', marginBottom: '1rem' }}
            onClick={() => navigate('/checkout')}
          >
            Proceed to Checkout
          </button>
          
          <Link to="/products" style={{ display: 'block', textAlign: 'center', color: 'var(--color-text)', fontSize: '0.9rem', textDecoration: 'underline' }}>
            Continue Shopping
          </Link>
        </div>
      </div>
    </motion.div>
  );
};

export default Cart;
