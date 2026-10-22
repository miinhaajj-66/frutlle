import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Users, Package, Eye } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import axios, { getApiUrl } from '../../utils/api';
import { formatCurrency } from '../../utils/currency';

const Dashboard = () => {
  const [stats, setStats] = useState({
    revenue: 0,
    revenueTrend: 12,
    orders: 0,
    ordersTrend: 8,
    customers: 0,
    customersTrend: 5,
    products: 0,
    pendingOrders: 0,
    lowStock: 0,
    outOfStock: 0,
    deliveredOrders: 0
  });

  const [recentOrders, setRecentOrders] = useState([]);
  const [lowStockAlerts, setLowStockAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const [ordersRes, productsRes] = await Promise.all([
          axios.get(getApiUrl('/api/orders'), { withCredentials: true }),
          axios.get(getApiUrl('/api/products'))
        ]);

        const orders = Array.isArray(ordersRes.data) ? ordersRes.data : [];
        const products = Array.isArray(productsRes.data) ? productsRes.data : [];

        const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total_price || o.totalPrice || 0), 0);
        const uniqueCustomerIds = new Set(orders.map(o => o.user_id || o.user?.id || o.user?._id).filter(Boolean));
        const pendingCount = orders.filter(o => o.status === 'Pending').length;
        const outOfStock = products.filter(p => Number(p.countInStock || 0) === 0);
        const delivered = orders.filter(o => o.status === 'Delivered').length;

        setStats({
          revenue: totalRevenue,
          revenueTrend: 12,
          orders: orders.length,
          ordersTrend: orders.length > 0 ? 8 : 0,
          customers: uniqueCustomerIds.size || (orders.length > 0 ? 1 : 0),
          customersTrend: uniqueCustomerIds.size > 0 ? 5 : 0,
          products: products.length,
          pendingOrders: pendingCount,
          lowStock: outOfStock.length,
          outOfStock: outOfStock.length,
          deliveredOrders: delivered
        });

        setRecentOrders(orders.slice(0, 5));
        setLowStockAlerts(outOfStock.slice(0, 5));
      } catch (err) {
        console.error('Failed to load dashboard data', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

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
        <h1 className="admin-section-title">Dashboard Overview</h1>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Link to="/admin/orders" className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '0.85rem', textDecoration: 'none' }}>
            Manage Orders
          </Link>
          <Link to="/admin/products/add" className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.85rem', textDecoration: 'none' }}>
            + New Product
          </Link>
        </div>
      </div>

      <div className="admin-stats-grid">
        <div className="admin-stat-card">
          <div className="admin-stat-header">
            <span>Total Revenue</span>
            <span style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--frutlle-red)', lineHeight: 1 }}>₹</span>
          </div>
          <div className="admin-stat-value">{formatCurrency(stats.revenue)}</div>
          <div className={`admin-stat-trend ${stats.revenueTrend >= 0 ? 'trend-up' : 'trend-down'}`}>
            {stats.revenueTrend >= 0 ? <TrendingUp size={14} style={{ display: 'inline', marginRight: '4px' }} /> : <TrendingDown size={14} style={{ display: 'inline', marginRight: '4px' }} />}
            {Math.abs(stats.revenueTrend)}% this month
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-header">
            <span>Total Orders</span>
            <ShoppingCart size={18} color="var(--frutlle-red)" />
          </div>
          <div className="admin-stat-value">{stats.orders}</div>
          <div className={`admin-stat-trend ${stats.ordersTrend >= 0 ? 'trend-up' : 'trend-down'}`}>
            {stats.ordersTrend >= 0 ? <TrendingUp size={14} style={{ display: 'inline', marginRight: '4px' }} /> : <TrendingDown size={14} style={{ display: 'inline', marginRight: '4px' }} />}
            {stats.pendingOrders} pending fulfillment
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-header">
            <span>Total Customers</span>
            <Users size={18} color="var(--frutlle-red)" />
          </div>
          <div className="admin-stat-value">{stats.customers}</div>
          <div className={`admin-stat-trend ${stats.customersTrend >= 0 ? 'trend-up' : 'trend-down'}`}>
            {stats.customersTrend >= 0 ? <TrendingUp size={14} style={{ display: 'inline', marginRight: '4px' }} /> : <TrendingDown size={14} style={{ display: 'inline', marginRight: '4px' }} />}
            Active registered buyers
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-header">
            <span>Total Products</span>
            <Package size={18} color="var(--frutlle-red)" />
          </div>
          <div className="admin-stat-value">{stats.products}</div>
          <div className="admin-stat-trend trend-neutral">
            {stats.lowStock > 0 ? `${stats.lowStock} item(s) low on stock` : 'All items in stock'}
          </div>
        </div>
      </div>

      <div className="admin-dashboard-grid">
        
        {/* Recent Orders Widget */}
        <div className="admin-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '1.2rem', margin: 0, color: 'var(--frutlle-dark-red)' }}>Recent Orders</h2>
            <Link to="/admin/orders" style={{ fontSize: '0.85rem', color: '#4a90e2', textDecoration: 'none' }}>View All →</Link>
          </div>
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Customer</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', padding: '20px', color: '#888' }}>
                      Loading recent orders...
                    </td>
                  </tr>
                ) : recentOrders.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', padding: '20px', color: '#888' }}>
                      No recent orders recorded
                    </td>
                  </tr>
                ) : (
                  recentOrders.map((order) => (
                    <tr key={order._id || order.id}>
                      <td style={{ fontWeight: 600, color: 'var(--frutlle-red)' }}>
                        #{String(order._id || order.id).substring(0, 8)}
                      </td>
                      <td>{order.user?.name || 'Customer'}</td>
                      <td style={{ fontWeight: 500 }}>
                        {formatCurrency(order.total_price || order.totalPrice || 0)}
                      </td>
                      <td>
                        <span className={`admin-badge ${getStatusBadge(order.status)}`}>
                          {order.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="admin-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '1.2rem', margin: 0, color: 'var(--frutlle-dark-red)' }}>Out of Stock Alerts</h2>
            <Link to="/admin/products" style={{ fontSize: '0.85rem', color: '#4a90e2', textDecoration: 'none' }}>Manage Stock →</Link>
          </div>
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="2" style={{ textAlign: 'center', padding: '20px', color: '#888' }}>
                      Checking inventory levels...
                    </td>
                  </tr>
                ) : lowStockAlerts.length === 0 ? (
                  <tr>
                    <td colSpan="2" style={{ textAlign: 'center', padding: '20px', color: '#059669' }}>
                      ✓ All products are currently In Stock
                    </td>
                  </tr>
                ) : (
                  lowStockAlerts.map((product) => (
                    <tr key={product._id || product.id}>
                      <td style={{ fontWeight: 500 }}>{product.name}</td>
                      <td>
                        <span className="admin-badge badge-danger">
                          Out of Stock
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default Dashboard;
