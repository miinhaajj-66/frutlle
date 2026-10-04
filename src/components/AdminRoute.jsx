import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>Loading...</div>;
  }

  if (!user || user.role !== 'admin') {
    // If logged in as customer, redirect to home. If not logged in, to login.
    return <Navigate to={user ? "/" : "/login"} state={{ from: location }} replace />;
  }

  return children;
};

export default AdminRoute;
