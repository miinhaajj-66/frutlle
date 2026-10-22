import { useState, useEffect, useRef } from 'react';
import axios, { getApiUrl } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { products as localProducts } from '../../data/products';
import { Star, CheckCircle, Edit2, Trash2, X, Quote } from 'lucide-react';
import './ReviewsSection.css';

// --- SUB-COMPONENTS --- //

const StarRating = ({ rating, size = 16, interactive = false, hoverRating = 0, onHover, onClick }) => {
  return (
    <div className={`star-rating ${interactive ? 'interactive' : ''}`}>
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          className="star-btn"
          disabled={!interactive}
          onMouseEnter={() => interactive && onHover(star)}
          onMouseLeave={() => interactive && onHover(0)}
          onClick={() => interactive && onClick(star)}
        >
          <Star 
            size={size} 
            strokeWidth={1.5}
            className={star <= (interactive ? (hoverRating || rating) : rating) ? 'star-icon filled' : 'star-icon'} 
          />
        </button>
      ))}
    </div>
  );
};

const ReviewActions = ({ onEdit, onDelete }) => (
  <div className="card-actions">
    <button onClick={onEdit} className="action-btn edit-btn" title="Edit Review">
      <Edit2 size={14} /> Edit
    </button>
    <button onClick={onDelete} className="action-btn delete-btn" title="Delete Review">
      <Trash2 size={14} /> Delete
    </button>
  </div>
);

const ReviewCard = ({ review, user, onEdit, onDelete }) => {
  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const getProductName = (pid) => {
    const p = localProducts.find(x => x.id === pid);
    return p ? p.name : null;
  };

  const productName = !review.productId && review.type === 'service' 
    ? 'Fruitlee Experience' 
    : getProductName(review.productId);

  return (
    <article className="premium-review-card">
      <div className="card-avatar-wrapper">
        <div className="card-avatar">
          {review.avatar ? <img src={review.avatar} alt={review.name} /> : getInitials(review.name)}
        </div>
      </div>
      
      <div className="card-quote-mark">
        <Quote size={24} strokeWidth={1} />
      </div>
      
      {review.title && <h5 className="card-review-title">"{review.title}"</h5>}
      <p className="card-comment">{review.comment}</p>
      
      <div className="card-customer-info">
        <h4 className="card-reviewer-name">{review.name}</h4>
        {review.isVerified && (
          <span className="card-verified-badge">
            <CheckCircle size={12} strokeWidth={2}/> Verified Customer
          </span>
        )}
      </div>
      
      <div className="card-rating">
        <StarRating rating={review.rating} size={14} />
      </div>

      <div className="card-footer-meta">
        {productName && <span className="meta-product">{productName}</span>}
        <span className="meta-date">
          {new Date(review.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
        </span>
      </div>

      {user && user._id === review.user && (
        <ReviewActions onEdit={() => onEdit(review)} onDelete={() => onDelete(review._id)} />
      )}
    </article>
  );
};

const ReviewFormModal = ({ 
  isOpen, 
  onClose, 
  product, 
  user, 
  editingReview, 
  onSubmitSuccess 
}) => {
  const [formData, setFormData] = useState({
    name: user?.name || '',
    rating: 0,
    title: '',
    comment: '',
    selectedProductId: product ? product.id : ''
  });
  const [hoverRating, setHoverRating] = useState(0);
  const [submitState, setSubmitState] = useState('idle');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (editingReview) {
        setFormData({
          name: editingReview.name,
          rating: editingReview.rating,
          title: editingReview.title,
          comment: editingReview.comment,
          selectedProductId: editingReview.productId || ''
        });
      } else {
        setFormData({
          name: user?.name || '',
          rating: 0,
          title: '',
          comment: '',
          selectedProductId: product ? product.id : ''
        });
      }
      setSubmitState('idle');
      setErrorMsg('');
    }
  }, [isOpen, editingReview, user, product]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.rating === 0) {
      setErrorMsg('Please select a star rating.');
      setSubmitState('error');
      return;
    }
    if (!formData.title.trim() || !formData.comment.trim() || (!editingReview && !formData.name.trim())) {
      setErrorMsg('Please fill out all required fields.');
      setSubmitState('error');
      return;
    }

    setSubmitState('loading');
    try {
      if (editingReview) {
        await axios.put(getApiUrl(`/api/reviews/${editingReview._id}`), {
          rating: formData.rating,
          title: formData.title,
          comment: formData.comment,
        }, { withCredentials: true });
      } else {
        const isProductReview = !!formData.selectedProductId;
        await axios.post(getApiUrl('/api/reviews'), {
          type: isProductReview ? 'product' : 'service',
          productId: isProductReview ? formData.selectedProductId : null,
          rating: formData.rating,
          title: formData.title,
          comment: formData.comment,
          name: formData.name,
          images: []
        }, { withCredentials: true });
      }
      
      setSubmitState('success');
      setTimeout(() => {
        onSubmitSuccess();
        onClose();
      }, 1500);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Error submitting your review.');
      setSubmitState('error');
    }
  };

  return (
    <div className="premium-form-overlay">
      <div className="premium-form-container">
        <button className="btn-close-modal" onClick={onClose}><X size={24} strokeWidth={1} /></button>
        
        {submitState === 'success' ? (
          <div className="premium-form-success">
            <CheckCircle size={48} strokeWidth={1} />
            <h3>Thank You</h3>
            <p>Your experience has been shared successfully.</p>
          </div>
        ) : (
          <>
            <div className="premium-form-header">
              <h3>{editingReview ? 'Edit Experience' : 'Share Experience'}</h3>
              <p>We value your feedback and beautiful words.</p>
            </div>
            
            <form onSubmit={handleSubmit} className="premium-review-form">
              {!product && !editingReview && (
                <div className="form-group">
                  <label>Which product did you experience?</label>
                  <select 
                    value={formData.selectedProductId} 
                    onChange={(e) => setFormData({...formData, selectedProductId: e.target.value})}
                    required
                    className="form-input"
                  >
                    <option value="" disabled>Select a product</option>
                    {localProducts.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="form-group rating-group">
                <label>Overall Rating</label>
                <StarRating 
                  interactive={true} 
                  rating={formData.rating} 
                  hoverRating={hoverRating}
                  size={32}
                  onHover={setHoverRating}
                  onClick={(r) => setFormData({...formData, rating: r})}
                />
              </div>

              {!editingReview && (
                <div className="form-group">
                  <label>Display Name</label>
                  <input 
                    type="text" 
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="form-input"
                    placeholder="Jane Doe"
                    required
                  />
                </div>
              )}

              <div className="form-group">
                <label>Summary</label>
                <input 
                  type="text" 
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  className="form-input"
                  placeholder="E.g., Absolute perfection"
                  required
                />
              </div>

              <div className="form-group">
                <label>Your Review</label>
                <textarea 
                  value={formData.comment}
                  onChange={(e) => setFormData({...formData, comment: e.target.value})}
                  className="form-input form-textarea"
                  placeholder="Share the details of your experience..."
                  required
                />
              </div>

              {submitState === 'error' && <div className="form-error-msg">{errorMsg}</div>}

              <button type="submit" className="btn-submit-premium" disabled={submitState === 'loading'}>
                {submitState === 'loading' ? 'Saving...' : 'Submit Review'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};


// --- MAIN SECTION COMPONENT --- //

const ReviewsSection = ({ product }) => {
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReview, setEditingReview] = useState(null);

  const fetchReviews = async (currentPage = 1) => {
    try {
      setLoading(true);
      const url = product?.id 
        ? `/api/reviews?productId=${product.id}&page=${currentPage}&limit=6` 
        : `/api/reviews?page=${currentPage}&limit=6`;
      const { data } = await axios.get(getApiUrl(url));
      setReviews(data.reviews || []);
      setTotalPages(data.pages || 1);
      setPage(data.page || 1);
      setError(null);
    } catch (err) {
      setError('Unable to load reviews.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews(1);
  }, [product?.id]);

  const openNewReview = () => {
    if (!user) {
      alert('Please sign in to share your experience.');
      return;
    }
    setEditingReview(null);
    setIsModalOpen(true);
  };

  const openEditReview = (review) => {
    setEditingReview(review);
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to remove your review?")) {
      try {
        await axios.delete(getApiUrl(`/api/reviews/${id}`), { withCredentials: true });
        fetchReviews(page);
      } catch (err) {
        alert(err.response?.data?.message || 'Error deleting review.');
      }
    }
  };

  return (
    <section className="premium-reviews-section">
      <div className="premium-reviews-container">
        
        <header className="premium-reviews-header">
          <h2>WHAT OUR CUSTOMERS SAY</h2>
          <p>Real experiences from our customers</p>
          <button className="btn-write-review" onClick={openNewReview}>
            Share Your Experience
          </button>
        </header>

        {loading ? (
          <div className="premium-empty-state">Loading beautiful experiences...</div>
        ) : error ? (
          <div className="premium-empty-state">{error}</div>
        ) : reviews.length === 0 ? (
          <div className="premium-empty-state">
            <h4>No reviews yet</h4>
            <p>Be the first to share your experience with us.</p>
          </div>
        ) : (
          <>
            <div className="premium-reviews-grid">
              {reviews.map(review => (
                <ReviewCard 
                  key={review._id} 
                  review={review} 
                  user={user} 
                  onEdit={openEditReview} 
                  onDelete={handleDelete} 
                />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="premium-pagination">
                <button disabled={page === 1} onClick={() => fetchReviews(page - 1)}>← Previous</button>
                <span>{page} / {totalPages}</span>
                <button disabled={page === totalPages} onClick={() => fetchReviews(page + 1)}>Next →</button>
              </div>
            )}
          </>
        )}
      </div>

      <ReviewFormModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        product={product}
        user={user}
        editingReview={editingReview}
        onSubmitSuccess={() => fetchReviews(1)}
      />
    </section>
  );
};

export default ReviewsSection;
