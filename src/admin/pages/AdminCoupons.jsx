import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { formatCurrency } from '../../utils/currency';
import { Plus, Search, MoreVertical, Edit, Trash2, Ticket, CheckCircle, Clock } from 'lucide-react';

const AdminCoupons = () => {
  const [coupons, setCoupons] = useState([]);
  const [stats, setStats] = useState({ totalCoupons: 0, activeCoupons: 0, successfulRedemptions: 0, totalDiscountGiven: 0 });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const fetchCouponsAndStats = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get('/api/coupons', { withCredentials: true });
      setCoupons(data);
      
      const { data: statsData } = await axios.get('/api/coupons/stats', { withCredentials: true });
      if (statsData) {
        setStats(statsData);
      }
    } catch (error) {
      console.error('Failed to fetch coupons', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCouponsAndStats();
  }, []);

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this coupon? This action cannot be undone.')) {
      try {
        await axios.delete(`/api/coupons/${id}`, { withCredentials: true });
        fetchCouponsAndStats();
      } catch (err) {
        console.error('Failed to delete coupon', err);
      }
    }
  };

  const handleToggleStatus = async (coupon) => {
    try {
      const newStatus = coupon.status === 'active' ? 'inactive' : 'active';
      await axios.put(`/api/coupons/${coupon.id}`, { status: newStatus }, { withCredentials: true });
      fetchCouponsAndStats();
    } catch (err) {
      console.error('Failed to toggle coupon status', err);
    }
  };

  const filteredCoupons = coupons.filter(c => c.code.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="admin-page">
      <div className="admin-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#111827', marginBottom: '0.25rem' }}>Coupon Management</h1>
          <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>Create and manage discount codes for your customers.</p>
        </div>
        <Link to="/admin/coupons/add" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.2rem', borderRadius: '6px' }}>
          <Plus size={18} />
          Create Coupon
        </Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <p style={{ color: '#6b7280', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>Total Coupons</p>
          <p style={{ fontSize: '1.875rem', fontWeight: 700, color: '#111827' }}>{stats.totalCoupons}</p>
        </div>
        <div style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <p style={{ color: '#6b7280', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>Active Coupons</p>
          <p style={{ fontSize: '1.875rem', fontWeight: 700, color: '#10b981' }}>{stats.activeCoupons}</p>
        </div>
        <div style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <p style={{ color: '#6b7280', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>Total Redemptions</p>
          <p style={{ fontSize: '1.875rem', fontWeight: 700, color: '#3b82f6' }}>{stats.successfulRedemptions}</p>
        </div>
        <div style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <p style={{ color: '#6b7280', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>Total Discount Given</p>
          <p style={{ fontSize: '1.875rem', fontWeight: 700, color: '#f59e0b' }}>{formatCurrency(stats.totalDiscountGiven || 0)}</p>
        </div>
      </div>

      <div className="admin-card" style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600 }}>All Coupons</h2>
          <div style={{ position: 'relative', maxWidth: '280px', width: '100%' }}>
            <Search size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
            <input 
              type="text" 
              placeholder="Search coupons..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ padding: '0.5rem 1rem 0.5rem 2.5rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.875rem', width: '100%', boxSizing: 'border-box' }}
            />
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', whiteSpace: 'nowrap' }}>
            <thead style={{ backgroundColor: '#f9fafb', color: '#6b7280', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <tr>
                <th style={{ padding: '1rem 1.5rem', fontWeight: 500 }}>Code</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: 500 }}>Discount</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: 500 }}>Usage</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: 500 }}>Expires</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: 500 }}>Status</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: 500, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody style={{ fontSize: '0.875rem', color: '#374151' }}>
              {loading ? (
                <tr>
                  <td colSpan="6" style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>Loading coupons...</td>
                </tr>
              ) : filteredCoupons.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ padding: '3rem', textAlign: 'center' }}>
                    <Ticket size={48} style={{ color: '#d1d5db', margin: '0 auto 1rem' }} />
                    <p style={{ color: '#6b7280', marginBottom: '1rem' }}>No coupons found.</p>
                    <Link to="/admin/coupons/add" className="btn btn-secondary" style={{ padding: '0.5rem 1rem', borderRadius: '6px' }}>Create your first coupon</Link>
                  </td>
                </tr>
              ) : (
                filteredCoupons.map((coupon) => (
                  <tr key={coupon.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>
                      <span style={{ backgroundColor: '#f3f4f6', padding: '0.25rem 0.5rem', borderRadius: '4px', letterSpacing: '0.05em' }}>
                        {coupon.code}
                      </span>
                    </td>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      {coupon.discount_type === 'percentage' ? `${coupon.discount_value}%` : formatCurrency(coupon.discount_value)}
                    </td>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      {coupon.usage_count} {coupon.usage_limit ? `/ ${coupon.usage_limit}` : 'redemptions'}
                    </td>
                    <td style={{ padding: '1rem 1.5rem', color: '#6b7280' }}>
                      {coupon.expires_at ? new Date(coupon.expires_at).toLocaleDateString() : 'Never'}
                    </td>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <span onClick={() => handleToggleStatus(coupon)} style={{ 
                        cursor: 'pointer',
                        display: 'inline-flex', alignItems: 'center', gap: '0.375rem', 
                        padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 500,
                        backgroundColor: coupon.status === 'active' ? '#d1fae5' : '#f3f4f6',
                        color: coupon.status === 'active' ? '#065f46' : '#4b5563'
                      }}>
                        {coupon.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                        <button onClick={() => handleDelete(coupon.id)} style={{ color: '#ef4444', background: 'none', border: 'none', padding: '0.25rem', cursor: 'pointer' }}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminCoupons;
