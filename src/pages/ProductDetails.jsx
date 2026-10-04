import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Minus, Plus, ArrowLeft } from 'lucide-react';
import { products } from '../data/products';
import { useCart } from '../context/CartContext';

const ProductDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const [quantity, setQuantity] = useState(1);

  const product = products.find(p => p.id === id);

  if (!product) {
    return (
      <div className="container section text-center">
        <h2>Product not found</h2>
        <Link to="/products" className="btn btn-primary" style={{ marginTop: '1rem' }}>Back to Products</Link>
      </div>
    );
  }

  const handleAddToCart = () => {
    addToCart(product, quantity);
  };

  const handleBuyNow = () => {
    addToCart(product, quantity);
    navigate('/checkout');
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="container section"
    >
      <Link to="/products" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: 'var(--space-xl)', color: 'var(--color-text)' }}>
        <ArrowLeft size={16} /> Back to Collection
      </Link>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--space-3xl)' }}>
        {/* Image Column */}
        <motion.div 
          initial={{ x: -50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.6 }}
          style={{ background: 'var(--color-secondary)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-2xl)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <img src={product.image} alt={product.name} style={{ width: '100%', maxWidth: '400px', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)' }} />
        </motion.div>

        {/* Details Column */}
        <motion.div
          initial={{ x: 50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <p style={{ textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-text)', marginBottom: 'var(--space-sm)' }}>{product.category}</p>
          <h1 className="heading-lg" style={{ marginBottom: 'var(--space-md)' }}>{product.name}</h1>
          <p style={{ fontSize: '1.5rem', color: 'var(--color-primary)', fontFamily: 'var(--font-serif)', marginBottom: 'var(--space-lg)' }}>
            ${product.price.toFixed(2)} <span style={{ fontSize: '1rem', color: 'var(--color-text)', fontFamily: 'var(--font-sans)' }}>/ {product.weight}</span>
          </p>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: 'var(--space-xl)', color: 'var(--color-accent)' }}>
            {'★'.repeat(Math.floor(product.rating))}
            <span style={{ color: 'var(--color-text)', fontSize: '0.9rem', marginLeft: '0.5rem' }}>({product.reviews} reviews)</span>
          </div>

          <p style={{ fontSize: '1.1rem', marginBottom: 'var(--space-xl)' }}>{product.description}</p>

          <div style={{ marginBottom: 'var(--space-xl)' }}>
            <h4 style={{ marginBottom: 'var(--space-sm)' }}>Ingredients</h4>
            <p style={{ color: 'var(--color-text)' }}>{product.ingredients.join(', ')}</p>
          </div>

          <div style={{ marginBottom: 'var(--space-xl)' }}>
            <h4 style={{ marginBottom: 'var(--space-sm)' }}>Benefits</h4>
            <ul style={{ listStyle: 'disc', paddingLeft: '1.5rem', color: 'var(--color-text)' }}>
              {product.benefits.map((b, i) => <li key={i}>{b}</li>)}
            </ul>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-lg)', marginBottom: 'var(--space-xl)' }}>
            <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-full)' }}>
              <button onClick={() => setQuantity(Math.max(1, quantity - 1))} style={{ padding: '0.75rem 1rem' }}><Minus size={16}/></button>
              <span style={{ width: '40px', textAlign: 'center', fontWeight: '500' }}>{quantity}</span>
              <button onClick={() => setQuantity(quantity + 1)} style={{ padding: '0.75rem 1rem' }}><Plus size={16}/></button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
            <button className="btn btn-secondary" onClick={handleAddToCart} style={{ flex: 1, minWidth: '200px' }}>Add to Cart</button>
            <button className="btn btn-primary" onClick={handleBuyNow} style={{ flex: 1, minWidth: '200px' }}>Buy Now</button>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default ProductDetails;
