import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, Menu, X, User } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { cartCount } = useCart();
  const { user, logout } = useAuth();
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'About', path: '/about' },
    { name: 'Products', path: '/products' },
    { name: 'Contact', path: '/contact' },
  ];

  return (
    <motion.header 
      className={`navbar ${scrolled ? 'glass-header' : ''}`}
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="container nav-container">
        <Link to="/" className="brand-logo">
          <img src="/Frutlle%20Logo.png" alt="FRUTLLE" className="nav-logo" />
        </Link>

        <nav className="desktop-nav">
          {navLinks.map((link) => (
            <Link 
              key={link.name} 
              to={link.path} 
              className={`nav-link ${location.pathname === link.path ? 'active' : ''}`}
            >
              {link.name}
            </Link>
          ))}
        </nav>

        <div className="nav-actions">
          {user ? (
            <div className="nav-auth-group" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {user.role === 'admin' && (
                <Link to="/admin" className="cart-icon-wrapper auth-nav-icon nav-desktop-auth" style={{ textDecoration: 'none' }} title="Admin Dashboard">
                  <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--frutlle-red)' }}>Admin</span>
                </Link>
              )}
              <button onClick={logout} className="cart-icon-wrapper auth-nav-icon nav-desktop-auth" style={{ background: 'none', border: 'none', cursor: 'pointer' }} title="Logout">
                <span style={{ fontSize: '0.8rem', fontWeight: 'bold', marginRight: '4px' }}>Logout</span>
              </button>
            </div>
          ) : (
            <Link to="/login" className="cart-icon-wrapper auth-nav-icon nav-desktop-auth" title="Account">
              <User size={24} strokeWidth={1.5} />
            </Link>
          )}
          
          <Link to="/cart" className="cart-icon-wrapper" aria-label="Shopping Cart">
            <ShoppingBag size={24} strokeWidth={1.5} />
            {cartCount > 0 && (
              <motion.span 
                className="cart-badge"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                key={cartCount}
              >
                {cartCount}
              </motion.span>
            )}
          </Link>
          
          <button className="mobile-toggle" onClick={() => setIsOpen(!isOpen)} aria-label={isOpen ? "Close menu" : "Open menu"}>
            {isOpen ? <X size={28} strokeWidth={1.5} /> : <Menu size={28} strokeWidth={1.5} />}
          </button>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isOpen && (
            <motion.nav 
              className="mobile-nav"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              {navLinks.map((link) => (
                <Link key={link.name} to={link.path} className="mobile-nav-link">
                  {link.name}
                </Link>
              ))}
              {user && user.role === 'admin' && (
                <Link to="/admin" className="mobile-nav-link" style={{ color: 'var(--frutlle-red)', fontWeight: 600 }}>
                  Admin Dashboard
                </Link>
              )}
              {user ? (
                <button 
                  onClick={() => {
                    setIsOpen(false);
                    logout();
                  }} 
                  className="mobile-nav-link" 
                  style={{ background: 'none', border: 'none', textAlign: 'left', width: '100%', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit' }}
                >
                  Logout
                </button>
              ) : (
                <Link to="/login" className="mobile-nav-link">
                  Login / Register
                </Link>
              )}
            </motion.nav>
          )}
        </AnimatePresence>
      </div>
    </motion.header>
  );
};

export default Navbar;
