import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import axios, { getApiUrl, getAssetUrl, getFallbackImage } from '../utils/api';
import { 
  Search, X, ArrowUpDown, 
  Check, RefreshCw, AlertCircle, Plus, Minus, ArrowRight, Eye, ShieldCheck
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { products as fallbackProducts } from '../data/products';
import { formatCurrency } from '../utils/currency';
import jamFallback from '../assets/images/jam_hero.jpg';
import './Products.css';

// Helper to format product names in elegant title-case
const formatTitle = (name) => {
  if (!name) return 'Artisanal Preserve';
  return name
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

// Helper to provide authentic editorial descriptions when database strings are test values
const formatDescription = (shortDesc, desc) => {
  const text = shortDesc || desc || '';
  if (!text || text.trim().length <= 6 || /^(wo+w+|nice+.*|test.*)$/i.test(text.trim())) {
    return 'Slow-simmered in copper kettles using whole, sun-ripened orchard harvest and unrefined cane sugar.';
  }
  return text;
};

const Products = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { addToCart } = useCart();
  const { user } = useAuth();

  // State
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState('featured');
  const [addedItemIds, setAddedItemIds] = useState({});
  const [toastMessage, setToastMessage] = useState('');
  const [quickViewProduct, setQuickViewProduct] = useState(null);
  const [quickViewQty, setQuickViewQty] = useState(1);

  // Fetch products from backend / Supabase with graceful fallback
  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data } = await axios.get(getApiUrl('/api/products'));
      if (Array.isArray(data) && data.length > 0) {
        setProducts(data.filter((p) => p.isActive !== false));
      } else {
        setProducts(fallbackProducts);
      }
    } catch (err) {
      console.warn('Backend unavailable, using local product catalog:', err?.message || err);
      setProducts(fallbackProducts);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Handle ESC key to close Quick View Modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && quickViewProduct) {
        setQuickViewProduct(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [quickViewProduct]);

  // Compute Categories from real product data
  const categories = useMemo(() => {
    const list = products
      .map((p) => p.category?.trim())
      .filter((cat) => Boolean(cat) && typeof cat === 'string');
    return ['All', ...new Set(list)];
  }, [products]);

  // Compute Category Counts
  const categoryCounts = useMemo(() => {
    const counts = { All: products.length };
    products.forEach((p) => {
      const cat = p.category?.trim();
      if (cat) {
        counts[cat] = (counts[cat] || 0) + 1;
      }
    });
    return counts;
  }, [products]);

  // Filter & Sort Logic
  const filteredProducts = useMemo(() => {
    return products
      .filter((product) => {
        const matchesCategory =
          selectedCategory === 'All' || product.category === selectedCategory;

        if (!matchesCategory) return false;

        if (!searchTerm.trim()) return true;

        const term = searchTerm.toLowerCase();
        const nameMatch = product.name?.toLowerCase().includes(term);
        const descMatch =
          product.shortDescription?.toLowerCase().includes(term) ||
          product.description?.toLowerCase().includes(term);
        const catMatch = product.category?.toLowerCase().includes(term);

        return Boolean(nameMatch || descMatch || catMatch);
      })
      .sort((a, b) => {
        if (sortBy === 'price-asc') {
          const priceA = a.salePrice || a.price || 0;
          const priceB = b.salePrice || b.price || 0;
          return priceA - priceB;
        }
        if (sortBy === 'price-desc') {
          const priceA = a.salePrice || a.price || 0;
          const priceB = b.salePrice || b.price || 0;
          return priceB - priceA;
        }
        if (sortBy === 'name-asc') {
          return (a.name || '').localeCompare(b.name || '');
        }
        if (sortBy === 'in-stock') {
          const stockA = a.countInStock !== undefined ? a.countInStock : 99;
          const stockB = b.countInStock !== undefined ? b.countInStock : 99;
          return stockB - stockA;
        }
        // Default: 'featured'
        if (a.isFeatured && !b.isFeatured) return -1;
        if (!a.isFeatured && b.isFeatured) return 1;
        return 0;
      });
  }, [products, selectedCategory, searchTerm, sortBy]);

  // Handle Add to Cart with auth flow
  const handleAddToCart = useCallback((product, e, quantity = 1) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    const productId = product._id || product.id;
    const isOutOfStock =
      product.countInStock !== undefined && product.countInStock <= 0;
    if (isOutOfStock) return;

    if (!user) {
      navigate('/login', {
        state: {
          from: location,
          message: 'Please log in to continue.',
          action: 'addToCart',
          product,
        },
      });
      return;
    }

    addToCart({ ...product, id: productId }, quantity);

    // Visual button feedback
    setAddedItemIds((prev) => ({ ...prev, [productId]: true }));
    setToastMessage(`Added ${quantity > 1 ? `${quantity} jars of ` : ''}"${formatTitle(product.name)}" to your bag`);

    setTimeout(() => {
      setAddedItemIds((prev) => ({ ...prev, [productId]: false }));
    }, 2200);

    setTimeout(() => {
      setToastMessage('');
    }, 3400);
  }, [addToCart, user, navigate, location]);

  // Quick View triggers
  const openQuickView = (product, e) => {
    e.preventDefault();
    e.stopPropagation();
    setQuickViewProduct(product);
    setQuickViewQty(1);
  };

  const closeQuickView = () => {
    setQuickViewProduct(null);
  };

  // Reset all active filters
  const handleClearFilters = () => {
    setSelectedCategory('All');
    setSearchTerm('');
    setSortBy('featured');
  };

  return (
    <div className="frutlle-products-page">
      <div className="frutlle-products-container">

        {/* ==================================================================
            1. REFINED EDITORIAL HERO (COMPACT, SOPHISTICATED, RESTRAINED)
            ================================================================== */}
        <header className="frutlle-products-hero">
          <div className="frutlle-hero-topline">
            <nav aria-label="Breadcrumb" className="frutlle-breadcrumbs">
              <Link to="/" className="frutlle-breadcrumb-link">Home</Link>
              <span className="frutlle-breadcrumb-sep">/</span>
              <span className="frutlle-breadcrumb-current">The Collection</span>
            </nav>
            <span className="frutlle-edition-tag">EST. 2024 • HARVEST COLLECTION NO. 01</span>
          </div>

          <div className="frutlle-hero-main">
            <div className="frutlle-hero-copy">
              <span className="frutlle-hero-eyebrow">The FRUTLLE Preserves</span>
              <h1 className="frutlle-hero-title">
                A little fruit. <em>A lot of goodness.</em>
              </h1>
              <p className="frutlle-hero-subtitle">
                Slow-simmered in small batches with peak-season orchard harvest and unrefined cane sugar. 
                Pure, authentic fruit flavor crafted for thoughtful mornings.
              </p>
            </div>

            <div className="frutlle-hero-badge-stamp" aria-hidden="true">
              <span className="frutlle-stamp-title">100% WHOLE FRUIT</span>
              <span className="frutlle-stamp-sub">Slow-Cooked Kettle Method</span>
              <span className="frutlle-stamp-rule"></span>
              <span className="frutlle-stamp-origin">Feel the Origin</span>
            </div>
          </div>
        </header>

        {/* ==================================================================
            2. PRODUCT DISCOVERY & CONTROLS SECTION
            ================================================================== */}
        <section className="frutlle-discovery-strip" aria-label="Product discovery, filters, and sorting">
          {/* Header Bar: Category pills + Item Count */}
          <div className="frutlle-discovery-header">
            <div className="frutlle-filter-tabs" role="tablist" aria-label="Filter products by category">
              {categories.map((cat) => {
                const count = categoryCounts[cat] || 0;
                const isActive = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    role="tab"
                    aria-selected={isActive}
                    className={`frutlle-tab-btn ${isActive ? 'is-active' : ''}`}
                    onClick={() => setSelectedCategory(cat)}
                  >
                    <span>{cat === 'All' ? 'All Preserves' : cat}</span>
                    <span className="frutlle-tab-count">{count}</span>
                  </button>
                );
              })}
            </div>

            <div className="frutlle-discovery-count">
              <span>Showing</span>{' '}
              <strong>{filteredProducts.length}</strong>{' '}
              <span>{filteredProducts.length === 1 ? 'handcrafted jar' : 'handcrafted jars'}</span>
            </div>
          </div>

          {/* Sub-bar: Search Input & Sort Select */}
          <div className="frutlle-controls-bar">
            <div className="frutlle-search-box">
              <Search size={15} className="frutlle-search-icon" aria-hidden="true" />
              <input
                type="text"
                placeholder="Search flavors, fruit varieties, ingredients..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="frutlle-search-input"
                aria-label="Search preserves"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="frutlle-search-clear"
                  aria-label="Clear search query"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="frutlle-sort-box">
              <label htmlFor="frutlle-sort-select" className="frutlle-sort-label">
                Sort by
              </label>
              <div className="frutlle-sort-wrapper">
                <select
                  id="frutlle-sort-select"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="frutlle-sort-select"
                >
                  <option value="featured">Featured Selection</option>
                  <option value="price-asc">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                  <option value="name-asc">Alphabetical (A – Z)</option>
                  <option value="in-stock">In Stock First</option>
                </select>
                <ArrowUpDown size={13} className="frutlle-sort-icon" aria-hidden="true" />
              </div>
            </div>
          </div>

          {/* Active Filter Chips */}
          {(selectedCategory !== 'All' || searchTerm.trim()) && (
            <div className="frutlle-active-chips-row">
              <span className="frutlle-active-legend">Active Filters:</span>
              {selectedCategory !== 'All' && (
                <span className="frutlle-chip">
                  Category: <strong>{selectedCategory}</strong>
                  <button
                    type="button"
                    onClick={() => setSelectedCategory('All')}
                    aria-label={`Remove category filter: ${selectedCategory}`}
                  >
                    <X size={12} />
                  </button>
                </span>
              )}
              {searchTerm.trim() && (
                <span className="frutlle-chip">
                  Query: <strong>"{searchTerm}"</strong>
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    aria-label="Clear search query"
                  >
                    <X size={12} />
                  </button>
                </span>
              )}
              <button
                type="button"
                onClick={handleClearFilters}
                className="frutlle-chip-clear-all"
              >
                Clear all filters
              </button>
            </div>
          )}
        </section>

        {/* ==================================================================
            3. PRODUCT GRID & CARDS (THE MAIN DESIGN FOCUS)
            ================================================================== */}
        {loading ? (
          <div className="frutlle-grid" aria-label="Loading products">
            {[1, 2, 3].map((i) => (
              <div key={i} className="frutlle-skeleton-card">
                <div className="frutlle-skeleton-media" />
                <div className="frutlle-skeleton-body">
                  <div className="frutlle-skeleton-line" style={{ width: '35%' }} />
                  <div className="frutlle-skeleton-line" style={{ width: '70%', height: '22px' }} />
                  <div className="frutlle-skeleton-line" style={{ width: '90%' }} />
                  <div className="frutlle-skeleton-line" style={{ width: '45%', marginTop: 'auto' }} />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="frutlle-status-card">
            <div className="frutlle-status-icon">
              <AlertCircle size={28} />
            </div>
            <h2 className="frutlle-status-title">Unable to Load Preserves</h2>
            <p className="frutlle-status-desc">
              We encountered a temporary connection issue. Please try refreshing to view our current batches.
            </p>
            <button
              type="button"
              onClick={fetchProducts}
              className="frutlle-btn-pill-primary"
            >
              <RefreshCw size={14} />
              <span>Retry Loading</span>
            </button>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="frutlle-status-card">
            <div className="frutlle-status-icon">
              <Search size={26} />
            </div>
            <h2 className="frutlle-status-title">No Preserves Found</h2>
            <p className="frutlle-status-desc">
              We couldn't find any jars matching your current filters. Clear your search or explore the full harvest.
            </p>
            <button
              type="button"
              onClick={handleClearFilters}
              className="frutlle-btn-pill-primary"
            >
              <span>View All Preserves</span>
            </button>
          </div>
        ) : (
          <div className="frutlle-grid">
            {filteredProducts.map((product, index) => {
              const productId = product._id || product.id;
              const hasSale =
                Boolean(product.salePrice) && product.salePrice < product.price;
              const currentPrice = hasSale ? product.salePrice : product.price;
              const isOutOfStock =
                product.countInStock !== undefined && product.countInStock <= 0;
              const isLowStock =
                !isOutOfStock &&
                product.countInStock > 0 &&
                product.countInStock <= (product.lowStockThreshold || 5);
              const isAdded = Boolean(addedItemIds[productId]);

              const savingsAmount = hasSale ? Math.round(product.price - product.salePrice) : 0;

              return (
                <article key={productId} className="frutlle-card">
                  {/* Media Presentation Stage */}
                  <div className="frutlle-card-media-stage">
                    <Link
                      to={`/products/${productId}`}
                      className="frutlle-card-image-link"
                      aria-label={`View ${formatTitle(product.name)}`}
                    >
                      <img
                        src={getAssetUrl(product.image)}
                        alt={formatTitle(product.name)}
                        className="frutlle-card-image"
                        loading={index < 3 ? 'eager' : 'lazy'}
                        onError={(e) => {
                          const fallback = getFallbackImage(product);
                          if (e.currentTarget.src !== fallback) {
                            e.currentTarget.src = fallback;
                          }
                        }}
                      />
                    </Link>

                    {/* Restrained Luxury Badges */}
                    <div className="frutlle-card-badges">
                      {hasSale && (
                        <span className="frutlle-badge frutlle-badge-sale">
                          Special Harvest • Save {formatCurrency(savingsAmount)}
                        </span>
                      )}
                      {product.isFeatured && (
                        <span className="frutlle-badge frutlle-badge-craft">
                          Signature Batch
                        </span>
                      )}
                      {isOutOfStock && (
                        <span className="frutlle-badge frutlle-badge-out">
                          Out of Stock
                        </span>
                      )}
                    </div>

                    {/* Subtle Quick Actions Toolbar */}
                    <div className="frutlle-card-hover-actions">
                      <button
                        type="button"
                        onClick={(e) => openQuickView(product, e)}
                        className="frutlle-quickview-btn"
                        aria-label={`Quick view details for ${formatTitle(product.name)}`}
                      >
                        <Eye size={13} />
                        <span>Quick View</span>
                      </button>
                    </div>

                    {/* Subtle Botanical / Batch Detail Stamp */}
                    <span className="frutlle-card-stamp" aria-hidden="true">
                      FRUTLLE • NO. {String(index + 1).padStart(2, '0')}
                    </span>
                  </div>

                  {/* Product Information Body */}
                  <div className="frutlle-card-info">
                    <div className="frutlle-card-meta">
                      <span className="frutlle-card-category">
                        {product.category || 'Artisanal Preserve'}
                      </span>
                      {product.weight ? (
                        <span className="frutlle-card-weight">{product.weight}</span>
                      ) : (
                        <span className="frutlle-card-weight">Single Batch</span>
                      )}
                    </div>

                    <Link to={`/products/${productId}`} className="frutlle-card-title-link">
                      <h2 className="frutlle-card-title">{formatTitle(product.name)}</h2>
                    </Link>

                    <p className="frutlle-card-desc">
                      {formatDescription(product.shortDescription, product.description)}
                    </p>

                    {/* Footer Row: Price & Bespoke Action */}
                    <div className="frutlle-card-footer">
                      <div className="frutlle-price-block">
                        <span className="frutlle-price-now">
                          {formatCurrency(currentPrice)}
                        </span>
                        {hasSale && (
                          <span className="frutlle-price-was">
                            {formatCurrency(product.price)}
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={(e) => handleAddToCart(product, e)}
                        disabled={isOutOfStock}
                        className={`frutlle-btn-cart ${isAdded ? 'is-success' : ''}`}
                        aria-label={isOutOfStock ? `${formatTitle(product.name)} is Out of Stock` : `Add ${formatTitle(product.name)} to bag`}
                      >
                        {isAdded ? (
                          <>
                            <Check size={13} strokeWidth={2.5} />
                            <span>Added</span>
                          </>
                        ) : isOutOfStock ? (
                          <span>Out of Stock</span>
                        ) : (
                          <>
                            <Plus size={13} strokeWidth={2} />
                            <span>Add to Bag</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* ==================================================================
          4. REFINED LUXURY QUICK-VIEW MODAL
          ================================================================== */}
      <AnimatePresence>
        {quickViewProduct && (
          <div className="frutlle-modal-overlay" onClick={closeQuickView} role="dialog" aria-modal="true" aria-labelledby="qv-title">
            <motion.div
              className="frutlle-modal-window"
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.96, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 15 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            >
              <button
                type="button"
                onClick={closeQuickView}
                className="frutlle-modal-close"
                aria-label="Close quick view window"
              >
                <X size={18} />
              </button>

              <div className="frutlle-qv-grid">
                {/* Modal Visual Stage */}
                <div className="frutlle-qv-stage">
                  <img
                    src={getAssetUrl(quickViewProduct.image)}
                    alt={formatTitle(quickViewProduct.name)}
                    className="frutlle-qv-img"
                    onError={(e) => {
                      const fallback = getFallbackImage(quickViewProduct);
                      if (e.currentTarget.src !== fallback) {
                        e.currentTarget.src = fallback;
                      }
                    }}
                  />
                  <div className="frutlle-qv-stage-stamp">
                    <ShieldCheck size={13} />
                    <span>Authentic Origin Guarantee</span>
                  </div>
                </div>

                {/* Modal Details Panel */}
                <div className="frutlle-qv-details">
                  <div className="frutlle-qv-meta">
                    <span className="frutlle-qv-category">
                      {quickViewProduct.category || 'Artisanal Preserve'}
                    </span>
                    {quickViewProduct.countInStock > 0 ? (
                      <span className="frutlle-stock-pill in-stock">
                        In Stock
                      </span>
                    ) : (
                      <span className="frutlle-stock-pill out-of-stock">
                        Out of Stock
                      </span>
                    )}
                  </div>

                  <h3 id="qv-title" className="frutlle-qv-title">
                    {formatTitle(quickViewProduct.name)}
                  </h3>

                  <div className="frutlle-qv-price-row">
                    <span className="frutlle-qv-price">
                      {formatCurrency(quickViewProduct.salePrice || quickViewProduct.price)}
                    </span>
                    {quickViewProduct.salePrice && quickViewProduct.salePrice < quickViewProduct.price && (
                      <span className="frutlle-qv-price-orig">
                        {formatCurrency(quickViewProduct.price)}
                      </span>
                    )}
                  </div>

                  <p className="frutlle-qv-desc">
                    {formatDescription(quickViewProduct.shortDescription, quickViewProduct.description)}
                  </p>

                  {/* Quantity and Add to Cart Section */}
                  <div className="frutlle-qv-actions">
                    <div className="frutlle-qty-picker" aria-label="Select quantity">
                      <button
                        type="button"
                        onClick={() => setQuickViewQty((q) => Math.max(1, q - 1))}
                        disabled={quickViewQty <= 1 || quickViewProduct.countInStock <= 0}
                        aria-label="Decrease quantity"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="frutlle-qty-val">{quickViewProduct.countInStock <= 0 ? 0 : quickViewQty}</span>
                      <button
                        type="button"
                        onClick={() => setQuickViewQty((q) => q + 1)}
                        disabled={quickViewProduct.countInStock <= 0}
                        aria-label="Increase quantity"
                      >
                        <Plus size={14} />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        handleAddToCart(quickViewProduct, null, quickViewQty);
                        closeQuickView();
                      }}
                      disabled={quickViewProduct.countInStock !== undefined && quickViewProduct.countInStock <= 0}
                      className="frutlle-qv-add-btn"
                    >
                      {quickViewProduct.countInStock <= 0 ? (
                        <span>Out of Stock</span>
                      ) : (
                        <>
                          <Plus size={14} strokeWidth={2} />
                          <span>Add {quickViewQty > 1 ? `${quickViewQty} Jars` : 'to Bag'}</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Link to Full Product Details */}
                  <div className="frutlle-qv-link-wrap">
                    <Link
                      to={`/products/${quickViewProduct._id || quickViewProduct.id}`}
                      className="frutlle-qv-full-link"
                      onClick={closeQuickView}
                    >
                      <span>View Full Product Details & Ingredients</span>
                      <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==================================================================
          5. TOAST NOTIFICATION
          ================================================================== */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            className="frutlle-toast"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            transition={{ duration: 0.2 }}
            role="status"
            aria-live="polite"
          >
            <Check size={16} strokeWidth={2.5} />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Products;
