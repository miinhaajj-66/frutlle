import { motion } from 'framer-motion';
import { Link, useLocation, Navigate } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';

const OrderConfirmation = () => {
  const location = useLocation();
  const orderDetails = location.state;

  if (!orderDetails) {
    return <Navigate to="/" />;
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      className="container section text-center"
      style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
      >
        <CheckCircle size={80} color="var(--color-success)" style={{ marginBottom: 'var(--space-lg)' }} />
      </motion.div>
      
      <h1 className="heading-lg" style={{ marginBottom: 'var(--space-md)' }}>Order Confirmed!</h1>
      <p style={{ fontSize: '1.2rem', marginBottom: 'var(--space-sm)' }}>
        Thank you for your purchase, {orderDetails.fullName}.
      </p>
      <p style={{ color: 'var(--color-text)', marginBottom: 'var(--space-xl)' }}>
        Your order number is <strong style={{ color: 'var(--color-black)' }}>{orderDetails.orderId}</strong>
      </p>
      
      <div style={{ background: 'var(--color-white)', padding: 'var(--space-xl)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)', textAlign: 'left', maxWidth: '500px', width: '100%', marginBottom: 'var(--space-2xl)' }}>
        <h3 style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>Delivery Details</h3>
        <p><strong>Address:</strong> {orderDetails.address}</p>
        <p><strong>City:</strong> {orderDetails.city}, {orderDetails.state} {orderDetails.pincode}</p>
        <p><strong>Payment:</strong> {orderDetails.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online Payment'}</p>
        <p style={{ marginTop: '1rem', color: 'var(--color-text)', fontSize: '0.9rem' }}>
          * We will send a confirmation email with tracking details once your order is shipped.
        </p>
      </div>

      <Link to="/" className="btn btn-primary">Return to Home</Link>
    </motion.div>
  );
};

export default OrderConfirmation;
