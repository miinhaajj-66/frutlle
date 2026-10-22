import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../utils/supabase';
import './Login.css';

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [hasValidSession, setHasValidSession] = useState(false);
  const [linkError, setLinkError] = useState('');
  
  const [status, setStatus] = useState({ type: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const { updatePassword } = useAuth();
  const navigate = useNavigate();

  // Calculate password strength indicator
  const calculatePasswordStrength = (pass) => {
    let score = 0;
    if (pass.length >= 8) score += 25;
    if (pass.match(/[A-Z]/)) score += 25;
    if (pass.match(/[0-9]/)) score += 25;
    if (pass.match(/[^A-Za-z0-9]/)) score += 25;
    return score;
  };

  const strength = calculatePasswordStrength(password);

  const getStrengthLabel = (score) => {
    if (score === 0) return '';
    if (score <= 25) return 'Weak';
    if (score <= 50) return 'Fair';
    if (score <= 75) return 'Good';
    return 'Strong';
  };

  const getStrengthColor = (score) => {
    if (score <= 25) return '#e53e3e';
    if (score <= 50) return '#dd6b20';
    if (score <= 75) return '#d69e2e';
    return '#38a169';
  };

  // Inspect recovery token and session on component mount
  useEffect(() => {
    let isMounted = true;

    const inspectRecoveryLink = async () => {
      // 1. Check URL parameters for explicit errors (e.g., otp_expired, access_denied)
      const searchParams = new URLSearchParams(window.location.search);
      const hashStr = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : '';
      const hashParams = new URLSearchParams(hashStr);

      const errorParam = searchParams.get('error') || hashParams.get('error');
      const errorCode = searchParams.get('error_code') || hashParams.get('error_code');
      const errorDesc = searchParams.get('error_description') || hashParams.get('error_description');

      if (errorParam || errorCode === 'otp_expired') {
        const readableError = errorDesc
          ? decodeURIComponent(errorDesc).replace(/\+/g, ' ')
          : 'This password reset link is invalid or has expired.';
        if (isMounted) {
          setLinkError(readableError);
          setIsCheckingSession(false);
        }
        return;
      }

      // 2. Check for active Supabase session (established via recovery token redirect)
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          if (isMounted) {
            setLinkError(sessionError.message || 'Unable to verify password reset link.');
            setIsCheckingSession(false);
          }
          return;
        }

        if (session) {
          if (isMounted) {
            setHasValidSession(true);
            setIsCheckingSession(false);
          }
          return;
        }

        // 3. If no active session yet, give onAuthStateChange a grace period to process the hash token
        const timer = setTimeout(() => {
          if (isMounted && !hasValidSession) {
            setLinkError('No active password reset session was found. Please request a new link.');
            setIsCheckingSession(false);
          }
        }, 1200);

        return () => clearTimeout(timer);
      } catch (err) {
        if (isMounted) {
          setLinkError(err.message || 'Error verifying recovery session.');
          setIsCheckingSession(false);
        }
      }
    };

    // Listen for PASSWORD_RECOVERY auth event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
        if (isMounted) {
          setHasValidSession(true);
          setLinkError('');
          setIsCheckingSession(false);
        }
      }
    });

    inspectRecoveryLink();

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, [hasValidSession]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setStatus({ type: '', message: '' });

    if (!password || !confirmPassword) {
      setStatus({ type: 'error', message: 'Please enter and confirm your new password.' });
      return;
    }

    if (password.length < 6) {
      setStatus({ type: 'error', message: 'Password must be at least 6 characters long.' });
      return;
    }

    if (password !== confirmPassword) {
      setStatus({ type: 'error', message: 'Passwords do not match.' });
      return;
    }

    if (strength < 50) {
      setStatus({ type: 'error', message: 'Please choose a stronger password (include uppercase, numbers, or symbols).' });
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await updatePassword(password);

      if (result && !result.success) {
        setStatus({ type: 'error', message: result.error || 'Failed to update password. Please try again.' });
      } else {
        setIsSuccess(true);
        setStatus({ type: 'success', message: 'Your password has been successfully updated!' });
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
          <h1 className="auth-title">
            {isSuccess ? 'Password Reset!' : 'Set New Password'}
          </h1>
          <p className="auth-subtitle">
            {isSuccess 
              ? 'Your account security has been updated.' 
              : 'Choose a strong new password to protect your account.'}
          </p>
        </div>

        <div className="auth-form-container">
          {/* 1. Loading / Verification State */}
          {isCheckingSession && (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <Loader2 className="auth-spinner" size={32} color="var(--frutlle-red)" style={{ margin: '0 auto 16px' }} />
              <p style={{ color: '#666', fontSize: '0.95rem' }}>Verifying recovery link...</p>
            </div>
          )}

          {/* 2. Expired / Invalid Token State */}
          {!isCheckingSession && (!hasValidSession || linkError) && !isSuccess && (
            <div>
              <div 
                className="auth-error-message" 
                style={{ 
                  flexDirection: 'column', 
                  alignItems: 'flex-start',
                  gap: '8px', 
                  padding: '16px',
                  marginBottom: '24px' 
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
                  <AlertCircle size={20} />
                  <span>Invalid or Expired Reset Link</span>
                </div>
                <p style={{ margin: 0, fontSize: '0.88rem', opacity: 0.9 }}>
                  {linkError || 'This password reset link has either expired or was already used. For your security, recovery links are only valid for a single use.'}
                </p>
              </div>

              <Link 
                to="/forgot-password" 
                className="auth-submit-btn" 
                style={{ textDecoration: 'none', marginBottom: '16px' }}
              >
                REQUEST A NEW RESET LINK
              </Link>

              <div className="auth-footer" style={{ marginTop: '16px' }}>
                Remember your password? 
                <Link to="/login" className="auth-footer-link">LOG IN</Link>
              </div>
            </div>
          )}

          {/* 3. Success State */}
          {isSuccess && (
            <div>
              <div 
                className="auth-error-message"
                style={{ 
                  backgroundColor: 'rgba(207, 168, 125, 0.2)',
                  color: 'var(--frutlle-dark-red)',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  padding: '24px 16px',
                  marginBottom: '24px'
                }}
              >
                <CheckCircle2 size={36} color="var(--frutlle-gold)" style={{ marginBottom: '12px' }} />
                <span style={{ fontWeight: 600, fontSize: '1.05rem', marginBottom: '6px' }}>
                  Password Updated Successfully!
                </span>
                <span style={{ fontSize: '0.9rem', color: '#555' }}>
                  You can now log in to FRUTLLE using your new password.
                </span>
              </div>

              <button 
                type="button" 
                onClick={() => navigate('/login', { replace: true })}
                className="auth-submit-btn"
              >
                CONTINUE TO LOGIN
              </button>
            </div>
          )}

          {/* 4. Active Recovery Session Form */}
          {!isCheckingSession && hasValidSession && !isSuccess && (
            <form className="auth-form" onSubmit={handleSubmit}>
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

              {/* New Password */}
              <div className="auth-input-group">
                <label htmlFor="new-password" className="auth-label">New Password</label>
                <div className="auth-password-wrapper">
                  <input 
                    id="new-password"
                    type={showPassword ? 'text' : 'password'} 
                    className="auth-input" 
                    placeholder="Create a new password (min. 6 characters)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isSubmitting}
                    required
                  />
                  <button 
                    type="button" 
                    className="auth-password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                {/* Password Strength Meter */}
                {password && (
                  <div style={{ marginTop: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '4px' }}>
                      <span style={{ color: '#666' }}>Strength:</span>
                      <span style={{ fontWeight: 600, color: getStrengthColor(strength) }}>
                        {getStrengthLabel(strength)}
                      </span>
                    </div>
                    <div style={{ width: '100%', height: '4px', backgroundColor: '#eee', borderRadius: '2px', overflow: 'hidden' }}>
                      <div 
                        style={{ 
                          width: `${strength}%`, 
                          height: '100%', 
                          backgroundColor: getStrengthColor(strength),
                          transition: 'width 0.3s ease, background-color 0.3s ease'
                        }} 
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm New Password */}
              <div className="auth-input-group" style={{ marginBottom: '24px' }}>
                <label htmlFor="confirm-password" className="auth-label">Confirm New Password</label>
                <div className="auth-password-wrapper">
                  <input 
                    id="confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'} 
                    className="auth-input" 
                    placeholder="Repeat your new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isSubmitting}
                    required
                  />
                  <button 
                    type="button" 
                    className="auth-password-toggle"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button 
                type="submit" 
                className="auth-submit-btn"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="auth-spinner" size={20} />
                    Updating Password...
                  </>
                ) : (
                  'UPDATE PASSWORD'
                )}
              </button>

              <div className="auth-footer" style={{ marginTop: '24px' }}>
                Remember your existing password? 
                <Link to="/login" className="auth-footer-link">LOG IN</Link>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ResetPassword;
