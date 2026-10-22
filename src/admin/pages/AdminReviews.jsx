import { useState, useEffect } from 'react';
import axios, { getApiUrl } from '../../utils/api';
import { Trash2, Eye, EyeOff, CheckCircle, Package, Briefcase } from 'lucide-react';
import './AdminReviews.css';

const AdminReviews = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [filterType, setFilterType] = useState('All');

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(getApiUrl('/api/reviews/admin'), { withCredentials: true });
      setReviews(data);
      setError(null);
    } catch (err) {
      setError('Unable to load reviews.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const handleStatusChange = async (id, status) => {
    try {
      await axios.put(getApiUrl(`/api/reviews/admin/${id}`), { status }, { withCredentials: true });
      fetchReviews();
    } catch (err) {
      alert("Failed to update status");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to permanently delete this review?")) {
      try {
        await axios.delete(getApiUrl(`/api/reviews/admin/${id}`), { withCredentials: true });
        fetchReviews();
      } catch (err) {
        alert("Failed to delete review");
      }
    }
  };

  const filteredReviews = reviews.filter(r => {
    if (filterType === 'Product') return r.type === 'product';
    if (filterType === 'Service') return r.type === 'service';
    return true;
  });

  return (
    <div className="admin-reviews-page">
      <div className="admin-reviews-header">
        <div>
          <h1>Reviews & Ratings</h1>
          <p>Moderate product and service reviews from your customers.</p>
        </div>
        
        <select 
          className="admin-reviews-filter" 
          value={filterType} 
          onChange={(e) => setFilterType(e.target.value)}
        >
          <option value="All">All Reviews</option>
          <option value="Product">Product Reviews Only</option>
          <option value="Service">Service Reviews Only</option>
        </select>
      </div>

      {loading ? (
        <div className="reviews-loader">Loading reviews...</div>
      ) : error ? (
        <div className="reviews-error">
          <p>{error}</p>
          <button onClick={fetchReviews} className="retry-btn">Try Again</button>
        </div>
      ) : filteredReviews.length === 0 ? (
        <div className="reviews-empty">
          <p>No reviews found matching this filter.</p>
        </div>
      ) : (
        <div className="reviews-table-wrapper">
          <table className="reviews-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Type / Product</th>
                <th>Rating</th>
                <th>Review Details</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredReviews.map(review => (
                <tr key={review._id}>
                  <td>
                    <strong>{review.customerName}</strong>
                    <div className="review-meta">{review.customerEmail}</div>
                    <div className="review-meta">{new Date(review.created_at).toLocaleDateString()}</div>
                  </td>
                  <td>
                    {review.type === 'product' ? (
                      <div className="type-badge product-badge">
                        <Package size={14} /> Product
                        <br/>
                        <span className="product-name">{review.productName}</span>
                      </div>
                    ) : (
                      <div className="type-badge service-badge">
                        <Briefcase size={14} /> Service
                      </div>
                    )}
                  </td>
                  <td className="star-cell">
                    {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
                    {review.is_verified && <div className="admin-verified">Verified</div>}
                  </td>
                  <td className="comment-cell">
                    <strong>{review.title}</strong>
                    <p>{review.comment}</p>
                  </td>
                  <td>
                    <span className={`status-badge ${review.status.toLowerCase()}`}>
                      {review.status}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      {review.status !== 'Approved' && (
                        <button className="action-btn approve" onClick={() => handleStatusChange(review._id, 'Approved')} title="Approve">
                          <CheckCircle size={18} />
                        </button>
                      )}
                      {review.status !== 'Rejected' && (
                        <button className="action-btn hide" onClick={() => handleStatusChange(review._id, 'Rejected')} title="Reject">
                          <EyeOff size={18} />
                        </button>
                      )}
                      <button className="action-btn delete" onClick={() => handleDelete(review._id)} title="Delete">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminReviews;
