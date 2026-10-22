import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Ticket, Percent, DollarSign, Calendar, Save, AlertCircle } from 'lucide-react';
import { formatCurrency } from '../../utils/currency';

const AdminAddCoupon = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    discount_type: 'percentage',
    discount_value: '',
    minimum_order_amount: '',
    maximum_discount_amount: '',
    starts_at: new Date().toISOString().slice(0, 16),
    expires_at: '',
    usage_limit: '',
    per_customer_limit: '1',
    status: 'active'
  });

  const handleChange = (e) => {
    let { name, value } = e.target;
    if (name === 'code') value = value.toUpperCase().replace(/\\s+/g, '');
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    // Basic validation
    if (!formData.code || !formData.discount_value) {
      return setError('Code and discount value are required');
    }
    
    if (formData.discount_type === 'percentage' && (formData.discount_value <= 0 || formData.discount_value > 100)) {
      return setError('Percentage discount must be between 1 and 100');
    }
    
    try {
      setLoading(true);
      const payload = { ...formData };
      
      // Clean up empty strings to nulls for numbers
      ['discount_value', 'minimum_order_amount', 'maximum_discount_amount', 'usage_limit', 'per_customer_limit'].forEach(key => {
        if (payload[key] === '') payload[key] = null;
        else if (payload[key] !== null) payload[key] = Number(payload[key]);
      });
      
      if (!payload.expires_at) payload.expires_at = null;
      if (!payload.starts_at) payload.starts_at = new Date().toISOString();

      await axios.post('/api/coupons', payload, { withCredentials: true });
      navigate('/admin/coupons');
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-page-header" style={{ marginBottom: '2rem' }}>
        <Link to="/admin/coupons" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: '#6b7280', textDecoration: 'none', fontSize: '0.875rem', marginBottom: '1rem' }}>
          <ArrowLeft size={16} /> Back to Coupons
        </Link>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#111827' }}>Create New Coupon</h1>
      </div>

      <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {/* Form Section */}
        <form onSubmit={handleSubmit} style={{ flex: '1 1 320px', minWidth: 0, width: '100%', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {error && (
            <div style={{ backgroundColor: '#fef2f2', border: '1px solid #f87171', color: '#b91c1c', padding: '1rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertCircle size={20} />
              <span>{error}</span>
            </div>
          )}

          {/* Basic Info */}
          <div className="admin-card" style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Ticket size={20} color="#6b7280" /> Basic Information
            </h2>
            
            <div style={{ display: 'grid', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.5rem' }}>Coupon Code *</label>
                <input 
                  type="text" name="code" value={formData.code} onChange={handleChange} required
                  placeholder="e.g. SUMMER25"
                  style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '1rem', textTransform: 'uppercase' }}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.5rem' }}>Internal Name (Optional)</label>
                <input 
                  type="text" name="name" value={formData.name} onChange={handleChange}
                  placeholder="e.g. Summer Sale 2026"
                  style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.875rem' }}
                />
              </div>
            </div>
          </div>

          {/* Discount Config */}
          <div className="admin-card" style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Percent size={20} color="#6b7280" /> Value
            </h2>
            
            <div className="admin-form-row-2">
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.5rem' }}>Discount Type</label>
                <select 
                  name="discount_type" value={formData.discount_type} onChange={handleChange}
                  style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.875rem', backgroundColor: '#fff' }}
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed Amount (₹)</option>
                </select>
              </div>
              
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.5rem' }}>Discount Value *</label>
                <input 
                  type="number" name="discount_value" value={formData.discount_value} onChange={handleChange} required min="0" step="0.01"
                  placeholder={formData.discount_type === 'percentage' ? "e.g. 20" : "e.g. 100.00"}
                  style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.875rem' }}
                />
              </div>
            </div>

            <div className="admin-form-row-2" style={{ marginTop: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.5rem' }}>Minimum Order Amount (₹)</label>
                <input 
                  type="number" name="minimum_order_amount" value={formData.minimum_order_amount} onChange={handleChange} min="0" step="0.01"
                  placeholder="Leave empty for no minimum"
                  style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.875rem' }}
                />
              </div>
              
              {formData.discount_type === 'percentage' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.5rem' }}>Maximum Discount Amount (₹)</label>
                  <input 
                    type="number" name="maximum_discount_amount" value={formData.maximum_discount_amount} onChange={handleChange} min="0" step="0.01"
                    placeholder="Leave empty for unlimited"
                    style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.875rem' }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Rules */}
          <div className="admin-card" style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Calendar size={20} color="#6b7280" /> Usage & Limits
            </h2>
            
            <div className="admin-form-row-2">
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.5rem' }}>Starts At</label>
                <input 
                  type="datetime-local" name="starts_at" value={formData.starts_at} onChange={handleChange}
                  style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.875rem' }}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.5rem' }}>Expires At</label>
                <input 
                  type="datetime-local" name="expires_at" value={formData.expires_at} onChange={handleChange}
                  style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.875rem' }}
                />
              </div>
            </div>

            <div className="admin-form-row-2" style={{ marginTop: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.5rem' }}>Total Usage Limit</label>
                <input 
                  type="number" name="usage_limit" value={formData.usage_limit} onChange={handleChange} min="1" step="1"
                  placeholder="Total times this can be used"
                  style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.875rem' }}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.5rem' }}>Limit Per Customer</label>
                <input 
                  type="number" name="per_customer_limit" value={formData.per_customer_limit} onChange={handleChange} min="1" step="1"
                  style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.875rem' }}
                />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem', marginBottom: '4rem', flexWrap: 'wrap' }}>
            <Link to="/admin/coupons" className="btn btn-secondary" style={{ padding: '0.75rem 1.5rem', borderRadius: '6px', border: '1px solid #d1d5db', backgroundColor: '#fff' }}>Cancel</Link>
            <button type="submit" disabled={loading} className="btn btn-primary" style={{ padding: '0.75rem 1.5rem', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: loading ? 0.7 : 1 }}>
              <Save size={18} />
              {loading ? 'Creating...' : 'Create Coupon'}
            </button>
          </div>
        </form>

        {/* Live Preview Panel */}
        <div style={{ flex: '1 1 300px', position: 'sticky', top: '100px' }}>
          <div style={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#374151', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Live Preview</h3>
            
            <div style={{ backgroundColor: '#fff', border: '2px dashed #d1d5db', borderRadius: '8px', padding: '2rem 1.5rem', textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#111827', letterSpacing: '0.1em', marginBottom: '0.5rem', wordBreak: 'break-all' }}>
                {formData.code || 'COUPONCODE'}
              </div>
              <div style={{ fontSize: '1.25rem', color: '#059669', fontWeight: 600, marginBottom: '1rem' }}>
                {formData.discount_type === 'percentage' 
                  ? `${formData.discount_value || '0'}% OFF` 
                  : `${formatCurrency(formData.discount_value || 0)} OFF`}
              </div>
              
              <ul style={{ textAlign: 'left', fontSize: '0.875rem', color: '#6b7280', display: 'flex', flexDirection: 'column', gap: '0.5rem', margin: 0, padding: 0, listStyle: 'none' }}>
                {formData.minimum_order_amount && <li>• Minimum order: {formatCurrency(formData.minimum_order_amount)}</li>}
                {formData.maximum_discount_amount && formData.discount_type === 'percentage' && <li>• Max discount: {formatCurrency(formData.maximum_discount_amount)}</li>}
                {formData.expires_at && <li>• Expires: {new Date(formData.expires_at).toLocaleDateString()}</li>}
                <li>• Limit {formData.per_customer_limit || 1} per customer</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminAddCoupon;
