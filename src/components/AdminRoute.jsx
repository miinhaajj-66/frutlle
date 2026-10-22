import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  // If still checking auth with the server, show branded loading screen
  if (loading) {
    return (
      <div 
        style={{ 
          display: 'flex', 
          flexDirection: 'column',
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '100vh',
          backgroundColor: 'var(--frutlle-cream)',
          color: 'var(--frutlle-dark-red)',
          gap: '12px',
          fontFamily: 'var(--font-sans)'
        }}
      >
        <Loader2 
          className="spin" 
          size={36} 
          style={{ color: 'var(--frutlle-red)' }} 
        />
        <span style={{ fontSize: '0.95rem', fontWeight: 500, letterSpacing: '0.05em' }}>
          Loading FRUTLLE Admin...
        </span>
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    // If logged in as customer, redirect to home. If not logged in, to login.
    return <Navigate to={user ? "/" : "/login"} state={{ from: location }} replace />;
  }

  return children;
};

export default AdminRoute;

