import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Minus, Plus, Heart, Check, Star, 
  Truck, Leaf, ShieldCheck,
  Loader2, ShoppingBag
} from 'lucide-react';
import axios from 'axios';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { products as localProducts } from '../data/products';
import { formatCurrency } from '../utils/currency';
import ReviewsSection from '../components/Reviews/ReviewsSection';
import './ProductDetails.css';

const ProductDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { addToCart } = useCart();
  const { user } = useAuth();

  // Core Product State
  const [product, setProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Gallery State
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  // Purchase State
  const [quantity, setQuantity] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState('340g Classic');
  const [isAdding, setIsAdding] = useState(false);
  const [addSuccess, setAddSuccess] = useState(false);

  // Wishlist State
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Accordion Section State
  const [openAccordions, setOpenAccordions] = useState({
    overview: true,
    ingredients: false,
    pairings: false,
    shipping: false
  });

  // Sticky Mobile Bar trigger ref
  const actionsRef = useRef(null);
  const [showStickyBar, setShowStickyBar] = useState(false);

  // Fetch Product & Related
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    setSelectedImageIndex(0);
    setQuantity(1);
    setAddSuccess(false);

    const fetchProductData = async () => {
      try {
        setLoading(true);
        setError(null);

        let currentProduct = null;
        try {
          const { data } = await axios.get(`/api/products/${id}`);
          currentProduct = data;
        } catch (apiErr) {
          // Fallback to local products if API returns error (e.g. for mock/legacy ID)
          const fallback = localProducts.find(p => p.id === id || p._id === id);
          if (fallback) {
            currentProduct = fallback;
          } else {
            throw apiErr;
          }
        }

        setProduct(currentProduct);

        // Set default variant if available
        if (currentProduct.weight) {
          setSelectedVariant(`${currentProduct.weight} Classic`);
        } else {
          setSelectedVariant('340g Classic');
        }

        // Fetch Related Products
        try {
          const { data: allProducts } = await axios.get('/api/products');
          const others = allProducts.filter(
            p => (p.id !== currentProduct.id && p._id !== currentProduct._id) && p.isActive !== false
          );
          setRelatedProducts(others.slice(0, 4));
        } catch {
          const fallbackOthers = localProducts.filter(p => p.id !== currentProduct.id);
          setRelatedProducts(fallbackOthers.slice(0, 4));
        }

      } catch (err) {
        console.error('Error fetching product details:', err);
        setError('Unable to find this product.');
      } finally {
        setLoading(false);
      }
    };

    fetchProductData();
  }, [id]);

  // Synchronize Wishlist state with authenticated user identity
  useEffect(() => {
    if (!product) return;
    const prodId = product.id || product._id;
    const wishlistKey = user ? `frutlle_wishlist_${user.id || user._id}` : 'frutlle_wishlist_guest';
    try {
      const savedWishlist = JSON.parse(localStorage.getItem(wishlistKey) || '[]');
      setIsWishlisted(savedWishlist.includes(prodId));
    } catch {
      setIsWishlisted(false);
    }
  }, [user, product]);

  // Observer for Mobile Sticky Add to Cart Bar
  useEffect(() => {
    const handleScroll = () => {
      if (actionsRef.current) {
        const rect = actionsRef.current.getBoundingClientRect();
        // If the bottom of actions button has scrolled above the viewport
        setShowStickyBar(rect.bottom < 0);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);


  // Add to Cart handler
  const handleAddToCart = () => {
    if (!product || isOutOfStock) return;

    if (!user) {
      navigate('/login', {
        state: {
          from: location,
          message: 'Please log in to continue.',
          action: 'addToCart',
          product,
          quantity
        }
      });
      return;
    }

    setIsAdding(true);
    setTimeout(() => {
      addToCart(product, quantity);
      setIsAdding(false);
      setAddSuccess(true);
      showToast('Added to your bag');
      setTimeout(() => setAddSuccess(false), 3000);
    }, 400);
  };

  // Buy Now handler
  const handleBuyNow = () => {
    if (!product || isOutOfStock) return;

    if (!user) {
      navigate('/login', {
        state: {
          from: { pathname: '/checkout' },
          message: 'Please log in to continue.',
          action: 'buyNow',
          product,
          quantity
        }
      });
      return;
    }

    addToCart(product, quantity);
    navigate('/checkout');
  };

  // Wishlist Toggle
  const toggleWishlist = () => {
    if (!product) return;
    const prodId = product.id || product._id;
    const wishlistKey = user ? `frutlle_wishlist_${user.id || user._id}` : 'frutlle_wishlist_guest';
    const savedWishlist = JSON.parse(localStorage.getItem(wishlistKey) || '[]');
    let updated;

    if (savedWishlist.includes(prodId)) {
      updated = savedWishlist.filter(item => item !== prodId);
      setIsWishlisted(false);
      showToast('Removed from wishlist');
    } else {
      updated = [...savedWishlist, prodId];
      setIsWishlisted(true);
      showToast('Saved to wishlist');
    }
    localStorage.setItem(wishlistKey, JSON.stringify(updated));
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const toggleAccordion = (key) => {
    setOpenAccordions(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Loading Skeleton State
  if (loading) {
    return (
      <div className="pdp-page">
        <div className="pdp-skeleton-container">
          <div style={{ height: '20px', width: '240px', marginBottom: '2rem' }} className="pdp-skeleton-box" />
          <div className="pdp-skeleton-grid">
            <div style={{ aspectRatio: '1/1', borderRadius: '12px' }} className="pdp-skeleton-box" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ height: '16px', width: '120px' }} className="pdp-skeleton-box" />
              <div style={{ height: '48px', width: '80%' }} className="pdp-skeleton-box" />
              <div style={{ height: '24px', width: '140px' }} className="pdp-skeleton-box" />
              <div style={{ height: '80px', width: '100%' }} className="pdp-skeleton-box" />
              <div style={{ height: '52px', width: '100%', marginTop: '1rem' }} className="pdp-skeleton-box" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error State
  if (error || !product) {
    return (
      <div className="pdp-page">
        <div className="pdp-container pdp-empty-state">
          <h2>Product Not Found</h2>
          <p>The artisanal preserve you are searching for is currently unavailable or has been archived.</p>
          <Link to="/products" className="pdp-btn-add-to-cart" style={{ textDecoration: 'none', display: 'inline-flex', padding: '0 2rem' }}>
            Explore All Preserves
          </Link>
        </div>
      </div>
    );
  }

  // Image Gallery Preparation
  const galleryImages = [
    { url: product.image, label: 'Hero View' },
    { url: product.image, label: 'Detail View' },
    { url: product.image, label: 'Origin & Batch' }
  ];

  // Pricing calculations
  const hasDiscount = product.salePrice && product.salePrice < product.price;
  const currentPrice = hasDiscount ? product.salePrice : product.price;
  const originalPrice = product.price;
  const discountPercent = hasDiscount ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100) : 0;
  const savings = hasDiscount ? (originalPrice - currentPrice).toFixed(2) : 0;

  // Stock logic
  const inStockCount = product.countInStock !== undefined ? product.countInStock : 99;
  const isOutOfStock = inStockCount <= 0;

  // Variant choices
  const variantOptions = [
    { id: 'v1', label: '220g Tasting Jar', priceMod: -2.50 },
    { id: 'v2', label: product.weight ? `${product.weight} Standard` : '340g Classic', priceMod: 0 },
    { id: 'v3', label: '500g Reserve Jar', priceMod: 4.00 }
  ];

  // Ingredients and benefits fallbacks
  const ingredientsList = product.ingredients && product.ingredients.length > 0
    ? product.ingredients
    : ['Hand-harvested organic fruit', 'Pure organic cane sugar', 'Natural citrus pectin', 'Freshly squeezed lemon juice'];

  const benefitsList = product.benefits && product.benefits.length > 0
    ? product.benefits
    : ['100% Certified Organic', 'No Artificial Preservatives', 'Cooked in Traditional Copper Pans', 'Vegan & Gluten-Free'];

  return (
    <div className="pdp-page">
      <div className="pdp-container">
        
        {/* Breadcrumb Navigation */}
        <nav aria-label="Breadcrumb" className="pdp-breadcrumbs">
          <Link to="/" className="pdp-breadcrumb-link">Home</Link>
          <span className="pdp-breadcrumb-sep">/</span>
          <Link to="/products" className="pdp-breadcrumb-link">Preserves</Link>
          {product.category && (
            <>
              <span className="pdp-breadcrumb-sep">/</span>
              <span className="pdp-breadcrumb-link">{product.category}</span>
            </>
          )}
          <span className="pdp-breadcrumb-sep">/</span>
          <span className="pdp-breadcrumb-current">{product.name}</span>
        </nav>

        {/* Main 2-Column Product Grid */}
        <div className="pdp-main-grid">

          {/* Left Column: Product Gallery */}
          <div className="pdp-gallery">
            <div className="pdp-main-image-wrapper">
              <div className="pdp-gallery-badge-container">
                {hasDiscount && (
                  <span className="pdp-badge-minimal pdp-badge-sale">
                    -{discountPercent}% Special
                  </span>
                )}
                {product.category && (
                  <span className="pdp-badge-minimal pdp-badge-artisanal">
                    {product.category}
                  </span>
                )}
              </div>

              <img 
                src={galleryImages[selectedImageIndex]?.url || product.image} 
                alt={product.name} 
                className="pdp-main-image"
                loading="eager"
              />
            </div>

            {/* Gallery Thumbnails */}
            <div className="pdp-thumbnails-strip" role="tablist" aria-label="Product image thumbnails">
              {galleryImages.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  role="tab"
                  aria-selected={selectedImageIndex === idx}
                  className={`pdp-thumbnail-item ${selectedImageIndex === idx ? 'active' : ''}`}
                  onClick={() => setSelectedImageIndex(idx)}
                >
                  <img src={img.url} alt={`${product.name} thumbnail ${idx + 1}`} className="pdp-thumbnail-img" />
                </button>
              ))}
            </div>
          </div>

          {/* Right Column: Product Information */}
          <div className="pdp-info">
            
            {/* Category Subtitle */}
            <p className="pdp-category-tag">{product.category || 'Artisanal Preserve'}</p>

            {/* Product Title */}
            <h1 className="pdp-title">{product.name}</h1>

            {/* Rating & Review Counter */}
            <div className="pdp-rating-summary">
              <div className="pdp-stars" aria-label={`Rated ${product.rating || 5} out of 5 stars`}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star 
                    key={star} 
                    size={14} 
                    strokeWidth={1.5} 
                    className={star <= Math.round(product.rating || 5) ? 'star-filled' : 'star-empty'}
                    fill={star <= Math.round(product.rating || 5) ? 'currentColor' : 'none'}
                  />
                ))}
              </div>
              <button 
                type="button"
                className="pdp-review-count"
                onClick={() => {
                  const elem = document.getElementById('pdp-reviews-section');
                  if (elem) elem.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                {product.numReviews || product.reviews || 0} reviews
              </button>
            </div>

            {/* Price Display */}
            <div className="pdp-price-wrap">
              <span className="pdp-current-price">
                {formatCurrency(currentPrice)}
              </span>

              {hasDiscount && (
                <>
                  <span className="pdp-original-price">
                    {formatCurrency(originalPrice)}
                  </span>
                  <span className="pdp-discount-pill">
                    Save {formatCurrency(savings)}
                  </span>
                </>
              )}

              <span className="pdp-weight-tag">
                {product.weight || '340g / 12 oz'}
              </span>
            </div>

            {/* Stock Availability Indicator */}
            <div className={`pdp-stock-status ${isOutOfStock ? 'out-of-stock' : 'in-stock'}`}>
              <span className={`pdp-stock-dot ${isOutOfStock ? 'out-of-stock' : 'in-stock'}`} />
              <span>
                {isOutOfStock ? 'Out of Stock' : 'In Stock'}
              </span>
            </div>

            {/* Short Editorial Description */}
            <p className="pdp-short-desc">
              {product.shortDescription || product.description || 'Handcrafted in small batches using sun-ripened organic fruit and gentle artisanal simmering.'}
            </p>

            {/* Variant / Size Selector */}
            <div className="pdp-variant-section">
              <div className="pdp-variant-label">
                <span>Select Format</span>
                <span className="pdp-variant-selected-value">{selectedVariant}</span>
              </div>
              <div className="pdp-variant-options">
                {variantOptions.map((variant) => (
                  <button
                    key={variant.id}
                    type="button"
                    disabled={isOutOfStock}
                    className={`pdp-variant-btn ${selectedVariant === variant.label ? 'selected' : ''}`}
                    onClick={() => setSelectedVariant(variant.label)}
                  >
                    {variant.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Primary Purchase Controls (Quantity + Add to Cart + Wishlist) */}
            <div className="pdp-actions-row" ref={actionsRef}>
              
              {/* Quantity Stepper */}
              <div className="pdp-quantity-stepper">
                <button
                  type="button"
                  className="pdp-qty-btn"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1 || isOutOfStock}
                  aria-label="Decrease quantity"
                >
                  <Minus size={14} />
                </button>
                <span className="pdp-qty-value">{quantity}</span>
                <button
                  type="button"
                  className="pdp-qty-btn"
                  onClick={() => setQuantity(quantity + 1)}
                  disabled={isOutOfStock}
                  aria-label="Increase quantity"
                >
                  <Plus size={14} />
                </button>
              </div>

              {/* Add to Cart Button */}
              <button
                type="button"
                className={`pdp-btn-add-to-cart ${addSuccess ? 'success' : ''}`}
                onClick={handleAddToCart}
                disabled={isOutOfStock || isAdding}
              >
                {isAdding ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Adding...</span>
                  </>
                ) : addSuccess ? (
                  <>
                    <Check size={16} strokeWidth={2.5} />
                    <span>Added to Bag</span>
                  </>
                ) : isOutOfStock ? (
                  'Out of Stock'
                ) : (
                  <>
                    <ShoppingBag size={16} strokeWidth={1.5} />
                    <span>Add to Cart</span>
                  </>
                )}
              </button>

              {/* Wishlist Button */}
              <button
                type="button"
                className={`pdp-btn-wishlist ${isWishlisted ? 'active' : ''}`}
                onClick={toggleWishlist}
                title={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
                aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
              >
                <Heart size={18} fill={isWishlisted ? 'currentColor' : 'none'} strokeWidth={1.5} />
              </button>
            </div>

            {/* Secondary Buy Now Button */}
            {!isOutOfStock && (
              <button
                type="button"
                className="pdp-btn-buy-now"
                onClick={handleBuyNow}
              >
                Instant Checkout
              </button>
            )}

            {/* Minimalist Trust & Service Indicators */}
            <div className="pdp-trust-grid">
              <div className="pdp-trust-item">
                <Truck size={18} strokeWidth={1.5} className="pdp-trust-icon" />
                <div>
                  <h4 className="pdp-trust-title">Complimentary Shipping</h4>
                  <p className="pdp-trust-desc">Carefully packaged and dispatched within 24 hours.</p>
                </div>
              </div>
              <div className="pdp-trust-item">
                <Leaf size={18} strokeWidth={1.5} className="pdp-trust-icon" />
                <div>
                  <h4 className="pdp-trust-title">Pure Organic Harvest</h4>
                  <p className="pdp-trust-desc">Zero artificial preservatives, colorants, or synthetic pectin.</p>
                </div>
              </div>
              <div className="pdp-trust-item">
                <ShieldCheck size={18} strokeWidth={1.5} className="pdp-trust-icon" />
                <div>
                  <h4 className="pdp-trust-title">Artisanal Guarantee</h4>
                  <p className="pdp-trust-desc">100% satisfaction guarantee with 30-day effortless returns.</p>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Below the Fold: Product Specifications & Details */}
        <section className="pdp-details-section">
          <p className="pdp-section-eyebrow">Product Specifications</p>
          <h2 className="pdp-section-heading">The Craft & Heritage</h2>

          <div className="pdp-accordion-wrapper">
            
            {/* 1. Overview */}
            <div className={`pdp-accordion-item ${openAccordions.overview ? 'is-open' : ''}`}>
              <button 
                type="button" 
                className="pdp-accordion-header"
                onClick={() => toggleAccordion('overview')}
                aria-expanded={openAccordions.overview}
              >
                <span className="pdp-accordion-title">Overview & Flavor Profile</span>
                <Plus size={18} strokeWidth={1.5} className="pdp-accordion-icon" />
              </button>
              {openAccordions.overview && (
                <div className="pdp-accordion-content">
                  <p>
                    {product.description || 'Handcrafted in limited seasonal batches, this artisanal preserve is gently cooked in traditional open copper kettles to preserve the natural pectin and delicate aromatic top notes of the fruit.'}
                  </p>
                  <p>
                    Our process respects time-honored European confectionery traditions, resulting in an exceptionally glossy texture, vibrant natural coloration, and an authentic balance of fruit sweetness and crisp acidity.
                  </p>
                  <div className="pdp-tags-list">
                    {benefitsList.map((benefit, i) => (
                      <span key={i} className="pdp-tag-pill">{benefit}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 2. Ingredients */}
            <div className={`pdp-accordion-item ${openAccordions.ingredients ? 'is-open' : ''}`}>
              <button 
                type="button" 
                className="pdp-accordion-header"
                onClick={() => toggleAccordion('ingredients')}
                aria-expanded={openAccordions.ingredients}
              >
                <span className="pdp-accordion-title">Ingredients & Nutrition</span>
                <Plus size={18} strokeWidth={1.5} className="pdp-accordion-icon" />
              </button>
              {openAccordions.ingredients && (
                <div className="pdp-accordion-content">
                  <p><strong>Ingredients:</strong> {ingredientsList.join(', ')}.</p>
                  <p>
                    <strong>Dietary Information:</strong> Naturally gluten-free, vegan certified, and crafted in an allergen-controlled artisanal facility. Contains no artificial colors, preservatives, high-fructose corn syrup, or GMO ingredients.
                  </p>
                </div>
              )}
            </div>

            {/* 3. Pairing Suggestions */}
            <div className={`pdp-accordion-item ${openAccordions.pairings ? 'is-open' : ''}`}>
              <button 
                type="button" 
                className="pdp-accordion-header"
                onClick={() => toggleAccordion('pairings')}
                aria-expanded={openAccordions.pairings}
              >
                <span className="pdp-accordion-title">Tasting & Serving Suggestions</span>
                <Plus size={18} strokeWidth={1.5} className="pdp-accordion-icon" />
              </button>
              {openAccordions.pairings && (
                <div className="pdp-accordion-content">
                  <p>
                    Exquisite paired with freshly baked sourdough brioche, aged English cheddar, double-cream brie, or swirled into sheep's milk Greek yogurt. For culinary enthusiasts, it serves as a glaze for roast duck or an accompaniment on artisanal charcuterie boards.
                  </p>
                </div>
              )}
            </div>

            {/* 4. Storage & Shipping */}
            <div className={`pdp-accordion-item ${openAccordions.shipping ? 'is-open' : ''}`}>
              <button 
                type="button" 
                className="pdp-accordion-header"
                onClick={() => toggleAccordion('shipping')}
                aria-expanded={openAccordions.shipping}
              >
                <span className="pdp-accordion-title">Care, Storage & Delivery</span>
                <Plus size={18} strokeWidth={1.5} className="pdp-accordion-icon" />
              </button>
              {openAccordions.shipping && (
                <div className="pdp-accordion-content">
                  <p>
                    <strong>Storage:</strong> Store in a cool, dark larder. Once unsealed, refrigerate between 2°C and 6°C and savor within 4 to 6 weeks for optimal botanical freshness.
                  </p>
                  <p>
                    <strong>Delivery:</strong> Each jar is insulated with recyclable natural fiber cushioning. Orders placed before 1:00 PM EST ship same day via climate-conscious ground transport.
                  </p>
                </div>
              )}
            </div>

          </div>
        </section>

        {/* Customer Reviews Section */}
        <div id="pdp-reviews-section">
          <ReviewsSection product={product} />
        </div>

        {/* Related Products Grid */}
        {relatedProducts.length > 0 && (
          <section className="pdp-related-section">
            <p className="pdp-section-eyebrow">Curated Complements</p>
            <h2 className="pdp-section-heading">You May Also Savor</h2>

            <div className="pdp-related-grid">
              {relatedProducts.map((relProduct) => (
                <Link 
                  key={relProduct.id || relProduct._id} 
                  to={`/products/${relProduct.id || relProduct._id}`}
                  className="pdp-related-card"
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                >
                  <div className="pdp-related-img-box">
                    <img 
                      src={relProduct.image} 
                      alt={relProduct.name} 
                      className="pdp-related-img"
                      loading="lazy" 
                    />
                  </div>
                  <span className="pdp-related-category">{relProduct.category || 'Preserve'}</span>
                  <h3 className="pdp-related-name">{relProduct.name}</h3>
                  <span className="pdp-related-price">
                    {formatCurrency(relProduct.salePrice || relProduct.price)}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

      </div>


      {/* Mobile Sticky Add to Cart Bar */}
      <AnimatePresence>
        {showStickyBar && (
          <motion.div 
            className="pdp-mobile-sticky-bar"
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <div className="pdp-sticky-inner">
              <div className="pdp-sticky-product">
                <img 
                  src={product.image} 
                  alt={product.name} 
                  className="pdp-sticky-thumb" 
                />
                <div className="pdp-sticky-info">
                  <span className="pdp-sticky-title">{product.name}</span>
                  <span className="pdp-sticky-price">{formatCurrency(currentPrice)}</span>
                </div>
              </div>
              <button 
                type="button" 
                className="pdp-sticky-btn"
                onClick={handleAddToCart}
                disabled={isOutOfStock || isAdding}
              >
                {isAdding ? 'Adding...' : isOutOfStock ? 'Out of Stock' : 'Add to Bag'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div 
            className="pdp-toast"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.2 }}
          >
            <Check size={16} strokeWidth={2} />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default ProductDetails;
