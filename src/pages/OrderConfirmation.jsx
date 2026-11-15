import { motion } from 'framer-motion';
import { Link, useLocation, Navigate } from 'react-router-dom';
import { Check, Package, ArrowRight } from 'lucide-react';

const OrderConfirmation = () => {
  const location = useLocation();
  const orderDetails = location.state;

  if (!orderDetails) {
    return <Navigate to="/" />;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      className="container section text-center"
      style={{ minHeight: '65vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
    >
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, type: 'spring', stiffness: 240, damping: 18 }}
        style={{
          width: '84px',
          height: '84px',
          borderRadius: '50%',
          background: 'linear-gradient(145deg, #009E74 0%, #008F68 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1.5rem auto',
          boxShadow: '0 14px 30px rgba(0, 143, 104, 0.35)'
        }}
      >
        <Check size={44} color="#ffffff" strokeWidth={3.5} />
      </motion.div>
      
      <h1 className="heading-lg" style={{ marginBottom: 'var(--space-sm)', color: 'var(--color-heading)' }}>
        Order Confirmed!
      </h1>
      <p style={{ fontSize: '1.15rem', color: 'var(--color-text)', marginBottom: 'var(--space-sm)' }}>
        Thank you for your purchase{orderDetails.fullName ? `, ${orderDetails.fullName}` : ''}.
      </p>
      
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.5rem',
        background: 'rgba(0, 143, 104, 0.08)',
        border: '1px solid rgba(0, 143, 104, 0.25)',
        borderRadius: '20px',
        padding: '0.4rem 1rem',
        marginBottom: 'var(--space-xl)',
        fontSize: '0.875rem',
        color: '#007A58',
        fontWeight: 600
      }}>
        <span>Order #{String(orderDetails.orderId || '').slice(0, 8).toUpperCase()}</span>
        <span>•</span>
        <span>100% Paid & Verified</span>
      </div>
      
      <div style={{
        background: 'var(--color-white)',
        padding: 'clamp(1.25rem, 4vw, var(--space-xl))',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-sm)',
        textAlign: 'left',
        maxWidth: '520px',
        width: '100%',
        marginBottom: 'var(--space-2xl)',
        boxSizing: 'border-box',
        border: '1px solid var(--color-border)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
          <Package size={18} color="var(--color-primary)" />
          <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>Delivery & Payment Summary</h3>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.95rem' }}>
          <p style={{ margin: 0 }}><strong>Recipient:</strong> {orderDetails.fullName || 'Valued Customer'}</p>
          <p style={{ margin: 0 }}><strong>Address:</strong> {orderDetails.address}</p>
          <p style={{ margin: 0 }}><strong>City / Region:</strong> {orderDetails.city}, {orderDetails.state} {orderDetails.pincode}</p>
          <p style={{ margin: 0 }}>
            <strong>Payment Method:</strong> Online Payment (Razorpay)
          </p>
        </div>

        <div style={{
          marginTop: '1.25rem',
          paddingTop: '1rem',
          borderTop: '1px solid var(--color-border)',
          color: 'var(--color-text)',
          fontSize: '0.85rem',
          lineHeight: 1.45,
          opacity: 0.9
        }}>
          * Your artisanal preserve jars are being safely packed. A confirmation with tracking details will be sent once dispatched.
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        <Link to="/my-orders" className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.8rem 1.5rem' }}>
          View My Orders
        </Link>
        <Link to="/" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.8rem 1.75rem' }}>
          Continue Shopping <ArrowRight size={16} />
        </Link>
      </div>
    </motion.div>
  );
};

export default OrderConfirmation;
