import { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // In a real application, this would validate a token with the backend
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const storedUser = localStorage.getItem('frutlle_user');
        if (storedUser) {
          // Simulate backend validation
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
        }
      } catch (error) {
        console.error("Auth check failed:", error);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const loginCustomer = async (email, password) => {
    setLoading(true);
    try {
      // Simulate API Call: fetch('/api/auth/login', { ... })
      await new Promise(resolve => setTimeout(resolve, 800));
      
      if (email === 'admin@frutllejam@gmail.com' && password === 'Aneesmon123') {
        const adminData = { id: 'a1', email, name: 'Admin', role: 'admin' };
        setUser(adminData);
        localStorage.setItem('frutlle_user', JSON.stringify(adminData));
        return { success: true };
      }
      
      if (email && password) {
        const userData = { id: 'c1', email, name: 'Customer', role: 'customer' };
        setUser(userData);
        localStorage.setItem('frutlle_user', JSON.stringify(userData));
        return { success: true };
      }
      return { success: false, error: 'Invalid credentials' };
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const loginAdmin = async (email, password) => {
    setLoading(true);
    try {
      // Simulate API Call: fetch('/api/admin/login', { ... })
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Strict admin check simulation
      if (email === 'admin@frutllejam@gmail.com' && password === 'Aneesmon123') { // Replace with actual backend logic
        const adminData = { id: 'a1', email, name: 'Admin', role: 'admin' };
        setUser(adminData);
        localStorage.setItem('frutlle_user', JSON.stringify(adminData));
        return { success: true };
      }
      return { success: false, error: 'Invalid admin credentials' };
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const socialLogin = async (provider) => {
    setLoading(true);
    try {
      // Simulate OAuth redirect and callback
      await new Promise(resolve => setTimeout(resolve, 1000));
      const userData = { id: 'c2', email: `user@${provider}.com`, name: 'Social User', role: 'customer' };
      setUser(userData);
      localStorage.setItem('frutlle_user', JSON.stringify(userData));
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const register = async (name, email, password) => {
    setLoading(true);
    try {
      // Simulate API Call: fetch('/api/auth/register', { ... })
      await new Promise(resolve => setTimeout(resolve, 1000));
      const userData = { id: 'c3', email, name, role: 'customer' };
      setUser(userData);
      localStorage.setItem('frutlle_user', JSON.stringify(userData));
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const forgotPassword = async (email) => {
    setLoading(true);
    try {
      // Simulate API Call: fetch('/api/auth/forgot-password', { ... })
      await new Promise(resolve => setTimeout(resolve, 800));
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('frutlle_user');
    navigate('/login');
  };

  const value = {
    user,
    loading,
    loginCustomer,
    loginAdmin,
    socialLogin,
    register,
    forgotPassword,
    logout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
