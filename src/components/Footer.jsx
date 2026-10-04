import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer style={{ backgroundColor: 'var(--frutlle-cream)', color: 'var(--frutlle-dark-red)', borderTop: '1px solid var(--color-border)', padding: 'var(--space-4xl) 0 var(--space-xl)' }}>
      <div className="container">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 'var(--space-2xl)', marginBottom: 'var(--space-4xl)' }}>
          <div>
            <Link to="/" style={{ display: 'inline-block', marginBottom: 'var(--space-lg)' }}>
              <img src="/Glossy%20Frutlle%20Origin%20Logo.png" alt="FRUTLLE" style={{ height: '56px', width: 'auto' }} />
            </Link>
            <p style={{ color: 'var(--color-text)' }}>Crafting premium artisanal jams with the finest organic ingredients since 1995. Taste the difference of small-batch perfection.</p>
          </div>
          <div>
            <h4 style={{ color: 'var(--frutlle-dark-red)', marginBottom: 'var(--space-md)' }}>Explore</h4>
            <ul style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
              <li><Link to="/products" style={{ color: 'var(--color-text)' }}>Shop All</Link></li>
              <li><Link to="/about" style={{ color: 'var(--color-text)' }}>Our Story</Link></li>
              <li><Link to="/recipes" style={{ color: 'var(--color-text)' }}>Recipes</Link></li>
              <li><Link to="/journal" style={{ color: 'var(--color-text)' }}>Journal</Link></li>
            </ul>
          </div>
          <div>
            <h4 style={{ color: 'var(--frutlle-dark-red)', marginBottom: 'var(--space-md)' }}>Support</h4>
            <ul style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
              <li><a href="#" style={{ color: 'var(--color-text)' }}>FAQ</a></li>
              <li><a href="#" style={{ color: 'var(--color-text)' }}>Shipping & Returns</a></li>
              <li><Link to="/contact" style={{ color: 'var(--color-text)' }}>Contact Us</Link></li>
              <li><a href="#" style={{ color: 'var(--color-text)' }}>Wholesale</a></li>
            </ul>
          </div>
          <div>
            <h4 style={{ color: 'var(--frutlle-dark-red)', marginBottom: 'var(--space-md)' }}>Newsletter</h4>
            <p style={{ color: 'var(--color-text)', marginBottom: 'var(--space-md)' }}>Subscribe to receive updates, access to exclusive deals, and more.</p>
            <form style={{ display: 'flex' }} onSubmit={(e) => e.preventDefault()}>
              <input type="email" placeholder="Enter your email" style={{ padding: '0.75rem', flex: 1, border: 'none', borderRadius: 'var(--radius-sm) 0 0 var(--radius-sm)' }} />
              <button type="submit" style={{ padding: '0.75rem 1.5rem', backgroundColor: 'var(--color-primary)', color: 'var(--color-white)', borderRadius: '0 var(--radius-sm) var(--radius-sm) 0' }}>SUBSCRIBE</button>
            </form>
          </div>
        </div>
        <div style={{ textAlign: 'center', color: 'var(--color-text)', borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-xl)', fontSize: '0.9rem' }}>
          &copy; {new Date().getFullYear()} FRUTLLE Artisanal Preserves. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
