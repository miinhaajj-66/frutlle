import { motion } from 'framer-motion';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/currency';
import { getAssetUrl, getFallbackImage } from '../utils/api';
import './ProductCard.css';

const ProductCard = ({ product, index }) => {
  const { addToCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavigate = (e) => {
    e.preventDefault();
    navigate(`/products/${product._id || product.id}`);
  };

  const isOutOfStock = product.countInStock !== undefined && product.countInStock <= 0;

  const handleAddToCart = (e) => {
    e.stopPropagation();
    if (isOutOfStock) return;
    if (!user) {
      navigate('/login', {
        state: {
          from: location,
          message: 'Please log in to continue.',
          action: 'addToCart',
          product
        }
      });
      return;
    }
    addToCart(product);
  };

  return (
    <motion.div 
      className="product-card"
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
    >
      <div 
        className="product-image-container" 
        onClick={handleNavigate}
        style={{ cursor: 'pointer' }}
      >
        <img 
          src={getAssetUrl(product.image)} 
          alt={product.name} 
          className="product-image"
          onError={(e) => {
            const fallback = getFallbackImage(product);
            if (e.currentTarget.src !== fallback) {
              e.currentTarget.src = fallback;
            }
          }}
        />
        <div className="product-overlay">
          <span onClick={handleNavigate}>View Details</span>
        </div>
      </div>
      
      <div className="product-info">
        <p className="product-category">{product.category}</p>
        <Link to={`/products/${product._id || product.id}`}>
          <h3 className="product-name">{product.name}</h3>
        </Link>
        <p className="product-price">
          {product.salePrice ? (
            <>
              <span style={{ textDecoration: 'line-through', color: '#999', marginRight: '8px', fontSize: '0.9em' }}>
                {formatCurrency(product.price)}
              </span>
              <span>{formatCurrency(product.salePrice)}</span>
            </>
          ) : (
            formatCurrency(product.price)
          )}
        </p>
        
        <button 
          className="btn btn-primary add-to-cart-btn"
          onClick={handleAddToCart}
          disabled={isOutOfStock}
          style={isOutOfStock ? { backgroundColor: '#E2DFD9', color: '#8C857B', cursor: 'not-allowed' } : {}}
        >
          {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
        </button>
      </div>
    </motion.div>
  );
};

export default ProductCard;
