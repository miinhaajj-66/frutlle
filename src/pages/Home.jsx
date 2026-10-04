import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import { products } from '../data/products';
import heroImg from '../assets/images/jam_hero.jpg';
import './Home.css';

const Home = () => {
  const featuredProducts = products.slice(0, 3);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-bg">
          <img src={heroImg} alt="Premium Strawberry Jam" className="hero-img" />
        </div>
        <div className="container hero-content">
          <motion.div 
            className="hero-text-box"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <h1 className="heading-xl hero-title">Spread<br/>Happiness.</h1>
            <p className="hero-subtitle">
              Handcrafted artisanal jams made with organic, sun-ripened fruits. 
              Taste the pure essence of nature in every spoonful.
            </p>
            <div className="hero-actions">
              <Link to="/products" className="btn btn-primary">Shop Now</Link>
              <Link to="/about" className="btn btn-secondary">Our Story</Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="section bg-light">
        <div className="container">
          <div className="section-header text-center">
            <motion.h2 
              className="heading-lg"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              Featured Preserves
            </motion.h2>
            <motion.p 
              className="section-desc"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              Discover our most loved flavors, crafted in small batches.
            </motion.p>
          </div>
          
          <div className="product-grid">
            {featuredProducts.map((product, index) => (
              <ProductCard key={product.id} product={product} index={index} />
            ))}
          </div>
          
          <div className="text-center" style={{ marginTop: 'var(--space-3xl)' }}>
            <Link to="/products" className="btn btn-secondary">View All Products</Link>
          </div>
        </div>
      </section>

      {/* Brand Values */}
      <section className="section values-section">
        <div className="container">
          <div className="values-grid">
            {[
              { title: '100% Organic', desc: 'Sourced from local organic farms with zero pesticides.' },
              { title: 'Small Batch', desc: 'Cooked slowly in copper pans to preserve natural flavor.' },
              { title: 'No Artificials', desc: 'Pure fruit, cane sugar, and natural pectin. Nothing else.' }
            ].map((value, idx) => (
              <motion.div 
                className="value-card" 
                key={idx}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: idx * 0.2 }}
              >
                <div className="value-icon"></div>
                <h3>{value.title}</h3>
                <p>{value.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </motion.div>
  );
};

export default Home;
