import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Login.css'; // Reusing the same styles for consistency

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  
  const { register, loading } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const calculatePasswordStrength = (pass) => {
    let strength = 0;
    if (pass.length > 7) strength += 25;
    if (pass.match(/[A-Z]/)) strength += 25;
    if (pass.match(/[0-9]/)) strength += 25;
    if (pass.match(/[^A-Za-z0-9]/)) strength += 25;
    return strength;
  };
  
  const strength = calculatePasswordStrength(formData.password);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    
    if (formData.password !== formData.confirmPassword) {
      setAuthError('Passwords do not match.');
      return;
    }

    if (strength < 50) {
      setAuthError('Please choose a stronger password.');
      return;
    }

    const result = await register(formData.name, formData.email, formData.password);

    if (result && !result.success) {
      setAuthError(result.error || 'Registration failed. Please try again.');
    } else {
      navigate('/');
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
          <img src="/Glossy%20Frutlle%20Origin%20Logo.png" alt="FRUTLLE" className="auth-logo" />
          <h1 className="auth-title">Create Account</h1>
          <p className="auth-subtitle">Join FRUTLLE and experience the origin.</p>
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
              <label htmlFor="name" className="auth-label">Full Name</label>
              <input 
                id="name"
                type="text" 
                className="auth-input" 
                placeholder="Enter your full name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="auth-input-group">
              <label htmlFor="email" className="auth-label">Email Address</label>
              <input 
                id="email"
                type="email" 
                className="auth-input" 
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="auth-input-group">
              <label htmlFor="password" className="auth-label">Password</label>
              <div className="auth-password-wrapper">
                <input 
                  id="password"
                  type={showPassword ? "text" : "password"}
                  className="auth-input" 
                  placeholder="Create a password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                />
                <button 
                  type="button" 
                  className="auth-password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              
              {formData.password && (
                <div style={{ marginTop: '8px' }}>
                  <div style={{ display: 'flex', height: '4px', gap: '4px', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ flex: 1, backgroundColor: strength >= 25 ? (strength > 50 ? 'var(--color-success)' : 'var(--color-error)') : '#eee' }}></div>
                    <div style={{ flex: 1, backgroundColor: strength >= 50 ? (strength > 75 ? 'var(--color-success)' : 'var(--color-gold)') : '#eee' }}></div>
                    <div style={{ flex: 1, backgroundColor: strength >= 75 ? 'var(--color-success)' : '#eee' }}></div>
                    <div style={{ flex: 1, backgroundColor: strength >= 100 ? 'var(--color-success)' : '#eee' }}></div>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '4px', textAlign: 'right' }}>
                    {strength < 50 ? 'Weak' : strength < 100 ? 'Good' : 'Strong'}
                  </div>
                </div>
              )}
            </div>

            <div className="auth-input-group" style={{ marginBottom: '24px' }}>
              <label htmlFor="confirmPassword" className="auth-label">Confirm Password</label>
              <div className="auth-password-wrapper">
                <input 
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  className="auth-input" 
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                />
                <button 
                  type="button" 
                  className="auth-password-toggle"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              className="auth-submit-btn"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="auth-spinner" size={20} />
                  Creating Account...
                </>
              ) : (
                'CREATE ACCOUNT'
              )}
            </button>
          </form>

          <div className="auth-footer">
            Already have an account? 
            <Link to="/login" className="auth-footer-link">LOG IN</Link>
          </div>
          
        </div>
      </motion.div>
    </motion.div>
  );
};

export default Register;
