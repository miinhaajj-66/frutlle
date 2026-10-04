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
          <img src="/Glossy%20Frutlle%20Origin%20Logo.png" alt="FRUTLLE" className="nav-logo" />
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
            <button onClick={logout} className="cart-icon-wrapper auth-nav-icon" style={{ background: 'none', border: 'none', cursor: 'pointer' }} title="Logout">
              <span style={{ fontSize: '0.8rem', fontWeight: 'bold', marginRight: '4px' }}>Logout</span>
            </button>
          ) : (
            <Link to="/login" className="cart-icon-wrapper auth-nav-icon">
              <User size={24} strokeWidth={1.5} />
            </Link>
          )}
          
          <Link to="/cart" className="cart-icon-wrapper">
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
          
          <button className="mobile-toggle" onClick={() => setIsOpen(!isOpen)}>
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
              {user ? (
                <button onClick={logout} className="mobile-nav-link" style={{ background: 'none', border: 'none', textAlign: 'left', width: '100%', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit' }}>
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
