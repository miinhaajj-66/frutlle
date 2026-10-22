import { Link } from 'react-router-dom';
import './Footer.css';

const Footer = () => {
  return (
    <footer className="footer-section">
      <div className="container">
        <div className="footer-grid">
          
          {/* Brand Section */}
          <div className="footer-brand">
            <Link to="/" className="footer-logo">
              <img src="/Frutlle%20Logo.png" alt="FRUTLLE" />
            </Link>
            <p className="footer-desc">
              Crafting premium artisanal jams with the finest organic ingredients since 1995. Taste the difference of small-batch perfection.
            </p>
          </div>

          {/* Quick Navigation */}
          <div className="footer-col">
            <h4 className="footer-heading">Explore</h4>
            <ul className="footer-links">
              <li><Link to="/">Home</Link></li>
              <li><Link to="/products">Shop / Products</Link></li>
              <li><Link to="/about">About Us</Link></li>
              <li><Link to="/reviews">Customer Reviews</Link></li>
              <li><Link to="/contact">Contact Us</Link></li>
            </ul>
          </div>

          {/* Support / Account */}
          <div className="footer-col">
            <h4 className="footer-heading">Account</h4>
            <ul className="footer-links">
              <li><Link to="/login">Sign In</Link></li>
              <li><Link to="/register">Create Account</Link></li>
              <li><Link to="/cart">Shopping Cart</Link></li>
            </ul>
          </div>

          {/* Contact Section */}
          <div className="footer-col">
            <h4 className="footer-heading">Get in Touch</h4>
            <ul className="footer-contact">
              <li><a href="mailto:hello@frutlle.com">hello@frutlle.com</a></li>
              <li><a href="tel:+15551234567">+1 (555) 123-4567</a></li>
              <li className="footer-contact-item" style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>
                123 Orchard Lane<br />
                Berryville, CA 90210
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} FRUTLLE Artisanal Preserves. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
