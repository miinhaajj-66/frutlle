import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Users, Package } from 'lucide-react';
import { motion } from 'framer-motion';

const Dashboard = () => {
  // In a real app, these would come from the backend /api/admin/analytics
  const [stats, setStats] = useState({
    revenue: 45800,
    revenueTrend: 12.4,
    orders: 124,
    ordersTrend: 5.2,
    customers: 86,
    customersTrend: 2.1,
    products: 18,
    pendingOrders: 12,
    lowStock: 3,
    outOfStock: 1,
    deliveredOrders: 98
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="admin-section-header">
        <h1 className="admin-section-title">Dashboard Overview</h1>
        {/* Date Filter could go here */}
        <select style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #ddd', outline: 'none' }}>
          <option>This Month</option>
          <option>Last Month</option>
          <option>This Year</option>
          <option>All Time</option>
        </select>
      </div>

      <div className="admin-stats-grid">
        <div className="admin-stat-card">
          <div className="admin-stat-header">
            <span>Total Revenue</span>
            <DollarSign size={18} color="var(--frutlle-red)" />
          </div>
          <div className="admin-stat-value">₹{stats.revenue.toLocaleString()}</div>
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
            {Math.abs(stats.ordersTrend)}% this month
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
            {Math.abs(stats.customersTrend)}% this month
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-header">
            <span>Total Products</span>
            <Package size={18} color="var(--frutlle-red)" />
          </div>
          <div className="admin-stat-value">{stats.products}</div>
          <div className="admin-stat-trend trend-neutral">
            Active items in catalog
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '30px' }}>
        
        {/* Recent Orders Widget */}
        <div className="admin-card">
          <h2 style={{ fontSize: '1.2rem', marginBottom: '20px', color: 'var(--frutlle-dark-red)' }}>Recent Orders</h2>
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
                <tr>
                  <td>#ORD-4921</td>
                  <td>Sarah Jenkins</td>
                  <td>₹450</td>
                  <td><span className="admin-badge badge-warning">Pending</span></td>
                </tr>
                <tr>
                  <td>#ORD-4920</td>
                  <td>Michael Chen</td>
                  <td>₹890</td>
                  <td><span className="admin-badge badge-success">Delivered</span></td>
                </tr>
                <tr>
                  <td>#ORD-4919</td>
                  <td>Emma Watson</td>
                  <td>₹210</td>
                  <td><span className="admin-badge badge-info">Shipped</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="admin-card">
          <h2 style={{ fontSize: '1.2rem', marginBottom: '20px', color: 'var(--frutlle-dark-red)' }}>Low Stock Alerts</h2>
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Stock</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Strawberry Jam (250g)</td>
                  <td style={{ fontWeight: 'bold', color: 'var(--frutlle-red)' }}>4</td>
                  <td><span className="admin-badge badge-warning">Low Stock</span></td>
                </tr>
                <tr>
                  <td>Mixed Fruit Jam (500g)</td>
                  <td style={{ fontWeight: 'bold', color: 'var(--frutlle-red)' }}>0</td>
                  <td><span className="admin-badge badge-danger">Out of Stock</span></td>
                </tr>
                <tr>
                  <td>Mango Jam (250g)</td>
                  <td style={{ fontWeight: 'bold', color: 'var(--frutlle-gold)' }}>8</td>
                  <td><span className="admin-badge badge-info">Restock Soon</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default Dashboard;
