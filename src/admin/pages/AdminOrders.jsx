import { useState } from 'react';
import { Search, Eye } from 'lucide-react';
import { motion } from 'framer-motion';

const AdminOrders = () => {
  // Mock data
  const [orders] = useState([
    { _id: 'ORD-4921', customer: 'Sarah Jenkins', date: '2026-10-04', total: 450, status: 'Pending', items: 2 },
    { _id: 'ORD-4920', customer: 'Michael Chen', date: '2026-10-03', total: 890, status: 'Delivered', items: 5 },
    { _id: 'ORD-4919', customer: 'Emma Watson', date: '2026-10-03', total: 210, status: 'Shipped', items: 1 },
    { _id: 'ORD-4918', customer: 'David Smith', date: '2026-10-02', total: 1150, status: 'Processing', items: 6 },
  ]);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Pending': return 'badge-warning';
      case 'Processing': return 'badge-info';
      case 'Shipped': return 'badge-info';
      case 'Delivered': return 'badge-success';
      case 'Cancelled': return 'badge-danger';
      default: return 'badge-warning';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="admin-section-header">
        <h1 className="admin-section-title">Orders</h1>
      </div>

      <div className="admin-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', background: '#f5f5f5', padding: '8px 16px', borderRadius: '8px', width: '300px' }}>
            <Search size={18} color="#888" style={{ marginRight: '8px' }} />
            <input 
              type="text" 
              placeholder="Search by Order ID or Customer..." 
              style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '0.9rem' }}
            />
          </div>
          <select style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #ddd', outline: 'none' }}>
            <option>All Statuses</option>
            <option>Pending</option>
            <option>Processing</option>
            <option>Shipped</option>
            <option>Delivered</option>
          </select>
        </div>

        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Date</th>
                <th>Customer</th>
                <th>Items</th>
                <th>Total Amount</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: '#888' }}>
                    No orders yet
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order._id}>
                    <td style={{ fontWeight: '600', color: 'var(--frutlle-red)' }}>{order._id}</td>
                    <td>{order.date}</td>
                    <td>{order.customer}</td>
                    <td>{order.items}</td>
                    <td style={{ fontWeight: '500' }}>₹{order.total}</td>
                    <td>
                      <span className={`admin-badge ${getStatusBadge(order.status)}`}>
                        {order.status}
                      </span>
                    </td>
                    <td>
                      <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--frutlle-dark-red)', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '500', fontSize: '0.85rem' }}>
                        <Eye size={16} /> View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
};

export default AdminOrders;
