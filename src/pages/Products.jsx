import { motion } from 'framer-motion';
import { useState } from 'react';
import ProductCard from '../components/ProductCard';
import { products } from '../data/products';

const Products = () => {
  const [filter, setFilter] = useState('All');
  
  const categories = ['All', ...new Set(products.map(p => p.category))];
  
  const filteredProducts = filter === 'All' 
    ? products 
    : products.filter(p => p.category === filter);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="container section"
    >
      <div className="text-center" style={{ marginBottom: 'var(--space-4xl)' }}>
        <h1 className="heading-lg">Our Collection</h1>
        <p style={{ maxWidth: '600px', margin: '0 auto' }}>
          Explore our range of artisanal preserves. Each jar is a testament to our commitment to quality, flavor, and tradition.
        </p>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-3xl)', flexWrap: 'wrap' }}>
        {categories.map(cat => (
          <button 
            key={cat}
            onClick={() => setFilter(cat)}
            style={{
              padding: '0.5rem 1.5rem',
              borderRadius: 'var(--radius-full)',
              border: `1px solid ${filter === cat ? 'var(--color-primary)' : 'var(--color-border)'}`,
              background: filter === cat ? 'var(--color-primary)' : 'transparent',
              color: filter === cat ? 'var(--color-white)' : 'var(--color-text)',
              transition: 'all var(--transition-fast)'
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--space-2xl)' }}>
        {filteredProducts.map((product, index) => (
          <ProductCard key={product.id} product={product} index={index} />
        ))}
      </div>
    </motion.div>
  );
};

export default Products;
