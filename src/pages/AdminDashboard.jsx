import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/currency';

const AdminDashboard = () => {
  const { user, logout } = useAuth();

  return (
    <motion.div 
      className="container section"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div style={{ padding: '2rem', backgroundColor: 'var(--color-white)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-md)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h1 className="heading-md" style={{ margin: 0 }}>Admin Dashboard</h1>
          <button onClick={logout} className="btn btn-secondary">Logout</button>
        </div>
        
        <p>Welcome to the secure FRUTLLE admin portal, {user?.name}.</p>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1.5rem', marginTop: '2rem' }}>
          {/* Dashboard Cards placeholders */}
          <div style={{ padding: '1.5rem', backgroundColor: 'var(--frutlle-cream)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Total Orders</h3>
            <p style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--frutlle-red)', margin: 0 }}>124</p>
          </div>
          <div style={{ padding: '1.5rem', backgroundColor: 'var(--frutlle-cream)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Revenue</h3>
            <p style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--frutlle-red)', margin: 0 }}>{formatCurrency(4250)}</p>
          </div>
          <div style={{ padding: '1.5rem', backgroundColor: 'var(--frutlle-cream)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Active Products</h3>
            <p style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--frutlle-red)', margin: 0 }}>18</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default AdminDashboard;
