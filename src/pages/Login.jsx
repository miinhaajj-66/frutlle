import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, AlertCircle, Info, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import './Login.css';

const Login = () => {
  const [rememberMe, setRememberMe] = useState(() => {
    return Boolean(localStorage.getItem('frutlle_remember_email'));
  });
  const [email, setEmail] = useState(() => {
    return localStorage.getItem('frutlle_remember_email') || '';
  });
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isProcessingOAuth, setIsProcessingOAuth] = useState(false);
  
  const { login, socialLogin, processOAuthCallback, loading, user } = useAuth();
  const { addToCart } = useCart();
  const navigate = useNavigate();
  const location = useLocation();

  // Helper to ensure safe internal redirect destinations only
  const getSafeInternalRedirect = (url, fallback = '/') => {
    if (!url || typeof url !== 'string') return fallback;
    const trimmed = url.trim();
    if (!trimmed.startsWith('/') || trimmed.startsWith('//') || trimmed.startsWith('/\\') || trimmed.includes(':')) {
      return fallback;
    }
    return trimmed;
  };

  // Listen for incoming OAuth redirects (authorization code, token, or error params)
  useEffect(() => {
    const checkOAuthCallback = async () => {
      const searchParams = new URLSearchParams(window.location.search);
      const hashStr = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : '';
      const hashParams = new URLSearchParams(hashStr);

      const errorParam = searchParams.get('error') || hashParams.get('error');
      const errorDescription = searchParams.get('error_description') || hashParams.get('error_description');

      if (errorParam) {
        const cleanError = errorDescription
          ? decodeURIComponent(errorDescription).replace(/\+/g, ' ')
          : errorParam === 'access_denied'
            ? 'Google Sign-In was cancelled.'
            : 'Google Sign-In failed. Please try again.';

        setAuthError(cleanError);
        window.history.replaceState({}, document.title, window.location.pathname);
        sessionStorage.removeItem('frutlle_oauth_redirect');
        sessionStorage.removeItem('frutlle_oauth_pending_action');
        return;
      }

      const code = searchParams.get('code');
      const hasHashToken = hashParams.has('access_token');

      if (code || hasHashToken) {
        setIsProcessingOAuth(true);
        setAuthError('');
        try {
          const result = await processOAuthCallback(code);
          if (result && !result.success) {
            setAuthError(result.error || 'Failed to complete Google Sign-In.');
          }
        } catch (err) {
          setAuthError(err.message || 'Failed to complete Google Sign-In.');
        } finally {
          setIsProcessingOAuth(false);
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }
    };

    checkOAuthCallback();
  }, [processOAuthCallback]);

  // If already logged in, redirect based on trusted database role and process pending actions
  useEffect(() => {
    if (user) {
      let savedAction = null;
      try {
        const rawAction = sessionStorage.getItem('frutlle_oauth_pending_action');
        if (rawAction) {
          savedAction = JSON.parse(rawAction);
          sessionStorage.removeItem('frutlle_oauth_pending_action');
        }
      } catch {
        // ignore JSON parse error
      }

      const actionState = savedAction || location.state;

      if (actionState?.action === 'addToCart' && actionState?.product) {
        addToCart(actionState.product, actionState.quantity || 1);
      } else if (actionState?.action === 'buyNow' && actionState?.product) {
        addToCart(actionState.product, actionState.quantity || 1);
        navigate('/checkout', { replace: true });
        return;
      }

      let savedRedirect = null;
      try {
        savedRedirect = sessionStorage.getItem('frutlle_oauth_redirect');
        if (savedRedirect) {
          sessionStorage.removeItem('frutlle_oauth_redirect');
        }
      } catch {
        // ignore storage access error
      }

      const rawFrom = savedRedirect || location.state?.from?.pathname || location.state?.from;

      let targetFrom;
      if (user.role === 'admin') {
        // Authorized admin: redirect directly to Admin Dashboard (or requested admin subpage)
        if (rawFrom && typeof rawFrom === 'string' && rawFrom.startsWith('/admin') && !rawFrom.startsWith('/admin/login')) {
          targetFrom = getSafeInternalRedirect(rawFrom, '/admin');
        } else {
          targetFrom = '/admin';
        }
      } else {
        // Normal customer: redirect to customer-facing page (home or intended customer route)
        // Strictly deny admin access if customer attempted to access an admin URL
        if (rawFrom && typeof rawFrom === 'string' && !rawFrom.startsWith('/admin')) {
          targetFrom = getSafeInternalRedirect(rawFrom, '/');
        } else {
          targetFrom = '/';
        }
      }

      navigate(targetFrom, { replace: true });
    }
  }, [user, navigate, location, addToCart]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    
    if (!email || !password) {
      setAuthError('Please enter both email and password.');
      return;
    }

    if (rememberMe) {
      localStorage.setItem('frutlle_remember_email', email.trim());
    } else {
      localStorage.removeItem('frutlle_remember_email');
    }

    const result = await login(email.trim(), password);

    if (result && !result.success) {
      setAuthError(result.error || 'Authentication failed. Please check your credentials.');
    }
  };

  const handleSocialLogin = async (provider) => {
    setAuthError('');
    setIsGoogleLoading(true);

    // Cache intended destination before leaving for the external OAuth provider
    try {
      const destination = location.state?.from?.pathname 
        ? `${location.state.from.pathname}${location.state.from.search || ''}` 
        : (typeof location.state?.from === 'string' ? location.state.from : null);

      if (destination) {
        sessionStorage.setItem('frutlle_oauth_redirect', getSafeInternalRedirect(destination));
      }

      if (location.state?.action && location.state?.product) {
        sessionStorage.setItem('frutlle_oauth_pending_action', JSON.stringify({
          action: location.state.action,
          product: location.state.product,
          quantity: location.state.quantity || 1
        }));
      }
    } catch (e) {
      console.warn('Could not cache OAuth destination in sessionStorage:', e);
    }

    const result = await socialLogin(provider);
    if (result && !result.success) {
      setAuthError(result.error || `Failed to login with ${provider}.`);
      setIsGoogleLoading(false);
    }
  };

  // Google Icon component
  const GoogleIcon = () => (
    <svg className="auth-social-icon" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );

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
          <h1 className="auth-title">Welcome back</h1>
          <p className="auth-subtitle">Sign in to your FRUTLLE account to continue.</p>
        </div>

        <div className="auth-form-container">
          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            
            <AnimatePresence>
              {location.state?.message && !authError && (
                <motion.div 
                  className="auth-info-banner"
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    padding: '0.75rem 1rem',
                    backgroundColor: 'rgba(217, 119, 6, 0.12)',
                    color: '#b45309',
                    border: '1px solid rgba(217, 119, 6, 0.3)',
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    marginBottom: '1rem',
                    fontWeight: '500'
                  }}
                >
                  <Info size={18} />
                  <span>{location.state.message}</span>
                </motion.div>
              )}
              {authError && (
                <motion.div 
                  className="auth-error-message"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <AlertCircle size={18} />
                  <span>{authError}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="auth-input-group">
              <label htmlFor="email" className="auth-label">
                Email Address
              </label>
              <input 
                id="email"
                type="text" 
                inputMode="email"
                className="auth-input" 
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="auth-input-group">
              <label htmlFor="password" className="auth-label">Password</label>
              <div className="auth-password-wrapper">
                <input 
                  id="password"
                  type={showPassword ? "text" : "password"}
                  className="auth-input" 
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button 
                  type="button" 
                  className="auth-password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="auth-options">
              <label className="auth-remember">
                <input 
                  type="checkbox" 
                  className="auth-checkbox" 
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span>Remember me</span>
              </label>
              <Link to="/forgot-password" className="auth-forgot-link">
                Forgot password?
              </Link>
            </div>

            <button 
              type="submit" 
              className="auth-submit-btn"
              disabled={loading || isGoogleLoading || isProcessingOAuth}
            >
              {loading ? (
                <>
                  <Loader2 className="auth-spinner" size={20} />
                  Authenticating...
                </>
              ) : (
                'LOG IN'
              )}
            </button>
          </form>

          <div className="auth-divider">OR</div>
          
          <div className="auth-social-buttons">
            <button 
              type="button" 
              className="auth-social-btn" 
              onClick={() => handleSocialLogin('Google')}
              disabled={loading || isGoogleLoading || isProcessingOAuth}
            >
              {isGoogleLoading || isProcessingOAuth ? (
                <>
                  <Loader2 className="auth-spinner" size={18} />
                  {isProcessingOAuth ? 'Completing Google Sign-in...' : 'Connecting to Google...'}
                </>
              ) : (
                <>
                  <GoogleIcon />
                  Continue with Google
                </>
              )}
            </button>
          </div>

          <div className="auth-footer">
            Don't have an account? 
            <Link to="/register" state={location.state} className="auth-footer-link">CREATE ACCOUNT</Link>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default Login;
