import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Login.css'; 

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState({ type: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { forgotPassword } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setStatus({ type: '', message: '' });
    
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setStatus({ type: 'error', message: 'Please enter your email address.' });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setStatus({ type: 'error', message: 'Please enter a valid email address.' });
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await forgotPassword(trimmedEmail);

      if (result && !result.success) {
        setStatus({ type: 'error', message: result.error || 'Failed to send reset link. Please try again.' });
      } else {
        setStatus({ 
          type: 'success', 
          message: 'If an account exists for this email, a password reset link has been sent. Please check your inbox and spam folder.' 
        });
      }
    } catch (err) {
      setStatus({ type: 'error', message: err.message || 'An unexpected error occurred. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div 
      className="auth-page-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div 
        className="auth-card"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.4 }}
      >
        <div className="auth-header">
          <img src="/Frutlle%20Logo.png" alt="FRUTLLE" className="auth-logo" />
          <h1 className="auth-title">Reset Password</h1>
          <p className="auth-subtitle">Enter your email and we'll send you a link to reset your password.</p>
        </div>

        <div className="auth-form-container">
          <AnimatePresence>
            {status.message && (
              <motion.div 
                className="auth-error-message"
                style={{ 
                  backgroundColor: status.type === 'success' ? 'rgba(207, 168, 125, 0.2)' : '',
                  color: status.type === 'success' ? 'var(--frutlle-dark-red)' : ''
                }}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                {status.type === 'success' ? <CheckCircle2 size={18} color="var(--frutlle-gold)" /> : <AlertCircle size={18} />}
                <span>{status.message}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {status.type !== 'success' ? (
            <form className="auth-form" onSubmit={handleSubmit}>
              <div className="auth-input-group" style={{ marginBottom: '24px' }}>
                <label htmlFor="email" className="auth-label">Email Address</label>
                <input 
                  id="email"
                  type="email" 
                  className="auth-input" 
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isSubmitting}
                  required
                />
              </div>

              <button 
                type="submit" 
                className="auth-submit-btn"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="auth-spinner" size={20} />
                    Sending Link...
                  </>
                ) : (
                  'SEND RESET LINK'
                )}
              </button>
            </form>
          ) : (
             <Link to="/login" className="auth-submit-btn" style={{ textDecoration: 'none' }}>
                RETURN TO LOGIN
             </Link>
          )}

          <div className="auth-footer" style={{ marginTop: '24px' }}>
            Remembered your password? 
            <Link to="/login" className="auth-footer-link">LOG IN</Link>
          </div>
          
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ForgotPassword;
