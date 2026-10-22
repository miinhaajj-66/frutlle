import { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, Eye, X, Check, Clock, Package, MapPin, User, DollarSign } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatCurrency } from '../../utils/currency';

const AdminOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Statuses');
  
  // View / Update Order Modal State
  const [viewingOrder, setViewingOrder] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get('/api/orders', { withCredentials: true });
      setOrders(data);
    } catch (error) {
      console.error("Failed to fetch orders", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const showFeedback = (msg) => {
    setFeedbackMessage(msg);
    setTimeout(() => setFeedbackMessage(''), 3000);
  };

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

  const openOrderModal = (order) => {
    setViewingOrder(order);
    setSelectedStatus(order.status || 'Pending');
  };

  const closeOrderModal = () => {
    setViewingOrder(null);
  };

  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    if (!viewingOrder || !selectedStatus) return;
    setUpdatingStatus(true);

    try {
      const { data: updated } = await axios.put(
        `/api/orders/${viewingOrder._id || viewingOrder.id}/status`,
        { status: selectedStatus },
        { withCredentials: true }
      );

      setOrders(prev => prev.map(o => (o._id === updated._id || o.id === updated.id) ? updated : o));
      setViewingOrder(updated);
      showFeedback(`Order status updated to "${selectedStatus}"`);
    } catch (err) {
      console.error('Failed to update order status', err);
      alert(err.response?.data?.message || 'Failed to update order status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const filteredOrders = orders.filter((order) => {
    const orderIdMatch = String(order._id || order.id || '').toLowerCase().includes(searchTerm.toLowerCase());
    const customerMatch = (order.user?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.user?.email || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSearch = orderIdMatch || customerMatch;
    const matchesStatus = statusFilter === 'All Statuses' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="admin-section-header">
        <h1 className="admin-section-title">Orders</h1>
      </div>

      {feedbackMessage && (
        <div style={{ padding: '12px 16px', background: '#d1fae5', color: '#065f46', borderRadius: '8px', marginBottom: '16px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Check size={16} />
          {feedbackMessage}
        </div>
      )}

      <div className="admin-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', gap: '15px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', background: '#f5f5f5', padding: '8px 16px', borderRadius: '8px', maxWidth: '320px', width: '100%', minWidth: 0, flex: 1 }}>
            <Search size={18} color="#888" style={{ marginRight: '8px', flexShrink: 0 }} />
            <input 
              type="text" 
              placeholder="Search by Order ID or Customer..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', minWidth: 0, fontSize: '0.9rem' }}
            />
          </div>
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #ddd', outline: 'none', background: '#fff' }}
          >
            <option value="All Statuses">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Processing">Processing</option>
            <option value="Shipped">Shipped</option>
            <option value="Delivered">Delivered</option>
            <option value="Cancelled">Cancelled</option>
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
              {loading ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: '#888' }}>
                    Loading orders...
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: '#888' }}>
                    No orders found
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const itemCount = order.order_items?.length || 0;
                  return (
                    <tr key={order._id || order.id}>
                      <td style={{ fontWeight: '600', color: 'var(--frutlle-red)' }}>
                        {String(order._id || order.id).substring(0, 8)}...
                      </td>
                      <td>{new Date(order.created_at || order.createdAt).toLocaleDateString()}</td>
                      <td>
                        <div>{order.user?.name || 'Customer'}</div>
                        <div style={{ fontSize: '0.8rem', color: '#666' }}>{order.user?.email || 'N/A'}</div>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.85rem', color: '#4b5563', fontWeight: 500 }}>
                          {itemCount} {itemCount === 1 ? 'item' : 'items'}
                        </span>
                      </td>
                      <td style={{ fontWeight: '600' }}>
                        {formatCurrency(order.total_price || order.totalPrice || 0)}
                      </td>
                      <td>
                        <span className={`admin-badge ${getStatusBadge(order.status)}`}>
                          {order.status}
                        </span>
                      </td>
                      <td>
                        <button 
                          type="button"
                          onClick={() => openOrderModal(order)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--frutlle-dark-red)', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '500', fontSize: '0.85rem' }}
                        >
                          <Eye size={16} /> View
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* View & Update Order Details Modal */}
      <AnimatePresence>
        {viewingOrder && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '12px' }}>
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              style={{ background: '#fff', borderRadius: '12px', width: '100%', maxWidth: '650px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #f0f0f0' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>
                    Order #{String(viewingOrder._id || viewingOrder.id).substring(0, 8)}
                  </h3>
                  <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                    Placed on {new Date(viewingOrder.created_at || viewingOrder.createdAt).toLocaleString()}
                  </span>
                </div>
                <button type="button" onClick={closeOrderModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888' }}>
                  <X size={20} />
                </button>
              </div>

              <div style={{ padding: '20px' }}>
                {/* Status Update Control */}
                <div style={{ background: '#f9fafb', padding: '16px', borderRadius: '8px', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '15px', flexWrap: 'wrap' }}>
                  <div>
                    <span style={{ fontSize: '0.85rem', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Order Status</span>
                    <span className={`admin-badge ${getStatusBadge(viewingOrder.status)}`}>
                      {viewingOrder.status}
                    </span>
                  </div>
                  <form onSubmit={handleUpdateStatus} style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <select 
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value)}
                      style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.875rem', background: '#fff' }}
                    >
                      <option value="Pending">Pending</option>
                      <option value="Processing">Processing</option>
                      <option value="Shipped">Shipped</option>
                      <option value="Delivered">Delivered</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                    <button 
                      type="submit" 
                      disabled={updatingStatus || selectedStatus === viewingOrder.status}
                      className="btn btn-primary"
                      style={{ padding: '8px 16px', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
                    >
                      {updatingStatus ? 'Updating...' : 'Update Status'}
                    </button>
                  </form>
                </div>

                {/* Customer & Shipping Details */}
                <div className="admin-form-row-2" style={{ marginBottom: '20px' }}>
                  <div style={{ border: '1px solid #f0f0f0', borderRadius: '8px', padding: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                      <User size={15} /> Customer
                    </div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>{viewingOrder.user?.name || 'Customer'}</div>
                    <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>{viewingOrder.user?.email || 'N/A'}</div>
                    <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '4px' }}>Payment: {String(viewingOrder.payment_method || 'cod').toUpperCase()}</div>
                  </div>

                  <div style={{ border: '1px solid #f0f0f0', borderRadius: '8px', padding: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                      <MapPin size={15} /> Shipping Address
                    </div>
                    {viewingOrder.shipping_address ? (
                      <div style={{ fontSize: '0.85rem', color: '#4b5563', lineHeight: '1.4' }}>
                        <div>{viewingOrder.shipping_address.address}</div>
                        <div>{viewingOrder.shipping_address.city}, {viewingOrder.shipping_address.postalCode}</div>
                        <div>{viewingOrder.shipping_address.country}</div>
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.85rem', color: '#9ca3af' }}>No shipping address provided</div>
                    )}
                  </div>
                </div>

                {/* Ordered Items */}
                <div style={{ marginBottom: '20px' }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '10px', color: '#111827' }}>Line Items</h4>
                  {(!viewingOrder.order_items || viewingOrder.order_items.length === 0) ? (
                    <div style={{ padding: '14px', background: '#f9fafb', borderRadius: '8px', color: '#6b7280', fontSize: '0.85rem', textAlign: 'center' }}>
                      No item details recorded for this order.
                    </div>
                  ) : (
                    <div style={{ border: '1px solid #f0f0f0', borderRadius: '8px', overflow: 'hidden' }}>
                      {viewingOrder.order_items.map((item, idx) => (
                        <div key={item.id || idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: idx < viewingOrder.order_items.length - 1 ? '1px solid #f0f0f0' : 'none' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {item.image && (
                              <img src={item.image} alt={item.name} style={{ width: '36px', height: '36px', borderRadius: '4px', objectFit: 'cover' }} />
                            )}
                            <div>
                              <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>{item.name}</div>
                              <div style={{ fontSize: '0.775rem', color: '#6b7280' }}>Qty: {item.qty} × {formatCurrency(item.price)}</div>
                            </div>
                          </div>
                          <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                            {formatCurrency(item.price * item.qty)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Price Summary Breakdown */}
                <div style={{ background: '#f9fafb', borderRadius: '8px', padding: '14px', fontSize: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', color: '#4b5563' }}>
                    <span>Items Subtotal:</span>
                    <span>{formatCurrency(viewingOrder.items_price || 0)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', color: '#4b5563' }}>
                    <span>Estimated Tax:</span>
                    <span>{formatCurrency(viewingOrder.tax_price || 0)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', color: '#4b5563' }}>
                    <span>Delivery Fee:</span>
                    <span>{Number(viewingOrder.shipping_price || 0) === 0 ? 'Complimentary' : formatCurrency(viewingOrder.shipping_price || 0)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid #e5e7eb', fontWeight: 700, fontSize: '0.95rem', color: '#111827' }}>
                    <span>Total Paid/Due:</span>
                    <span style={{ color: 'var(--frutlle-red)' }}>{formatCurrency(viewingOrder.total_price || 0)}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default AdminOrders;
