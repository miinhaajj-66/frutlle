import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import './ProductCard.css';

const ProductCard = ({ product, index }) => {
  const { addToCart } = useCart();

  return (
    <motion.div 
      className="product-card"
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
    >
      <Link to={`/products/${product.id}`} className="product-image-container">
        <motion.img 
          src={product.image} 
          alt={product.name} 
          className="product-image"
          whileHover={{ scale: 1.05 }}
          transition={{ duration: 0.6 }}
        />
        <div className="product-overlay">
          <span>View Details</span>
        </div>
      </Link>
      
      <div className="product-info">
        <p className="product-category">{product.category}</p>
        <Link to={`/products/${product.id}`}>
          <h3 className="product-name">{product.name}</h3>
        </Link>
        <p className="product-price">${product.price.toFixed(2)}</p>
        
        <button 
          className="btn btn-primary add-to-cart-btn"
          onClick={() => addToCart(product)}
        >
          Add to Cart
        </button>
      </div>
    </motion.div>
  );
};

export default ProductCard;
