import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Login.css';

const Login = () => {
  const [loginType, setLoginType] = useState('customer'); // 'customer' or 'admin'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  
  const { loginCustomer, loginAdmin, socialLogin, loading, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // If already logged in, redirect
  useEffect(() => {
    if (user) {
      const from = location.state?.from?.pathname || (user.role === 'admin' ? '/admin' : '/');
      navigate(from, { replace: true });
    }
  }, [user, navigate, location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    
    if (!email || !password) {
      setAuthError('Please enter both email and password.');
      return;
    }

    let result;
    if (loginType === 'customer') {
      result = await loginCustomer(email, password);
    } else {
      result = await loginAdmin(email, password);
    }

    if (result && !result.success) {
      setAuthError(result.error || 'Authentication failed. Please try again.');
    }
  };

  const handleSocialLogin = async (provider) => {
    setAuthError('');
    const result = await socialLogin(provider);
    if (result && !result.success) {
      setAuthError(result.error || `Failed to login with ${provider}.`);
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

  // Apple Icon component
  const AppleIcon = () => (
    <svg className="auth-social-icon" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.09 2.31-.86 3.59-.8 1.51.05 2.78.65 3.53 1.76-3.03 1.76-2.53 5.44.47 6.64-1.2 2.9-2.73 4.57-4.67 4.57h.03zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.02 4.41-3.74 4.25z" />
    </svg>
  );

  // Facebook Icon component
  const FacebookIcon = () => (
    <svg className="auth-social-icon" viewBox="0 0 24 24" fill="#1877F2">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
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
          <img src="/Glossy%20Frutlle%20Origin%20Logo.png" alt="FRUTLLE" className="auth-logo" />
          
          <AnimatePresence mode="wait">
            <motion.div
              key={loginType}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {loginType === 'customer' ? (
                <>
                  <h1 className="auth-title">Welcome back</h1>
                  <p className="auth-subtitle">Sign in to continue shopping with FRUTLLE.</p>
                </>
              ) : (
                <>
                  <h1 className="auth-title">Admin Portal</h1>
                  <p className="auth-subtitle">Sign in to manage your FRUTLLE store.</p>
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="auth-type-selector">
          <button 
            type="button"
            className={`auth-type-btn ${loginType === 'customer' ? 'active' : ''}`}
            onClick={() => { setLoginType('customer'); setAuthError(''); }}
          >
            Customer Login
          </button>
          <button 
            type="button"
            className={`auth-type-btn ${loginType === 'admin' ? 'active' : ''}`}
            onClick={() => { setLoginType('admin'); setAuthError(''); }}
          >
            Admin Login
          </button>
        </div>

        <div className="auth-form-container">
          <form className="auth-form" onSubmit={handleSubmit}>
            
            <AnimatePresence>
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
                {loginType === 'admin' ? 'Email / Username' : 'Email Address'}
              </label>
              <input 
                id="email"
                type="text" 
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
                <input type="checkbox" className="auth-checkbox" />
                <span>Remember me</span>
              </label>
              <Link to="/forgot-password" className="auth-forgot-link">
                Forgot password?
              </Link>
            </div>

            <button 
              type="submit" 
              className="auth-submit-btn"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="auth-spinner" size={20} />
                  Authenticating...
                </>
              ) : (
                loginType === 'admin' ? 'ADMIN LOGIN' : 'LOG IN'
              )}
            </button>
          </form>

          <AnimatePresence>
            {loginType === 'customer' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="auth-divider">OR</div>
                
                <div className="auth-social-buttons">
                  <button type="button" className="auth-social-btn" onClick={() => handleSocialLogin('Google')}>
                    <GoogleIcon />
                    Continue with Google
                  </button>
                  <button type="button" className="auth-social-btn" onClick={() => handleSocialLogin('Apple')}>
                    <AppleIcon />
                    Continue with Apple
                  </button>
                  <button type="button" className="auth-social-btn" onClick={() => handleSocialLogin('Facebook')}>
                    <FacebookIcon />
                    Continue with Facebook
                  </button>
                </div>

                <div className="auth-footer">
                  Don't have an account? 
                  <Link to="/register" className="auth-footer-link">CREATE ACCOUNT</Link>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
        </div>
      </motion.div>
    </motion.div>
  );
};

export default Login;
