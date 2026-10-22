import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import axios, { getApiUrl } from '../../utils/api';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  Tags, 
  Package, 
  Users, 
  MessageSquare, 
  Mail,
  CreditCard,
  Ticket,
  Settings,
  LogOut,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const Sidebar = ({ isOpen, toggleSidebar }) => {
  const { logout, requestLogout, isLoggingOut } = useAuth();
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);

  const fetchUnreadCount = async () => {
    try {
      const { data } = await axios.get(getApiUrl('/api/messages/unread-count'), { withCredentials: true });
      if (typeof data?.unreadCount === 'number') {
        setUnreadMessagesCount(data.unreadCount);
      }
    } catch {
      // Non-blocking
    }
  };

  useEffect(() => {
    fetchUnreadCount();
    const handleUpdate = () => fetchUnreadCount();
    window.addEventListener('messages-updated', handleUpdate);
    return () => window.removeEventListener('messages-updated', handleUpdate);
  }, []);

  const navItems = [
    { name: 'Dashboard', path: '/admin', icon: LayoutDashboard },
    { name: 'Orders', path: '/admin/orders', icon: ShoppingBag },
    { name: 'Products', path: '/admin/products', icon: Package },
    { name: 'Customers', path: '/admin/customers', icon: Users },
    { name: 'Messages', path: '/admin/messages', icon: Mail, badgeKey: 'messages' },
    { name: 'Reviews', path: '/admin/reviews', icon: MessageSquare },
    { name: 'Payments', path: '/admin/payments', icon: CreditCard },
    { name: 'Coupons', path: '/admin/coupons', icon: Ticket },
    { name: 'Settings', path: '/admin/settings', icon: Settings },
  ];

  return (
    <aside className={`admin-sidebar ${isOpen ? 'open' : ''}`}>
      <div className="admin-sidebar-header">
        <img src="/Frutlle%20Logo.png" alt="FRUTLLE" className="admin-sidebar-logo" />
        <button className="admin-menu-btn" onClick={toggleSidebar}>
          <X size={24} />
        </button>
      </div>

      <nav className="admin-nav">
        {navItems.map((item) => (
          <NavLink 
            key={item.name} 
            to={item.path} 
            end={item.path === '/admin'}
            className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}
            onClick={() => {
              if (window.innerWidth <= 992) toggleSidebar();
            }}
          >
            <item.icon className="admin-nav-icon" />
            <span style={{ flex: 1 }}>{item.name}</span>
            {item.badgeKey === 'messages' && unreadMessagesCount > 0 && (
              <span style={{
                backgroundColor: 'var(--frutlle-red)',
                color: '#fff',
                fontSize: '0.72rem',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '9999px',
                lineHeight: '1.2'
              }}>
                {unreadMessagesCount}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="admin-sidebar-footer" style={{ borderTop: '1px solid #eee', paddingTop: '15px' }}>
        <div style={{ padding: '0 1.5rem', marginBottom: '8px', fontSize: '0.75rem', fontWeight: 'bold', color: '#999', textTransform: 'uppercase' }}>Storefront</div>
        
        <NavLink to="/" className="admin-nav-item">
          <LayoutDashboard className="admin-nav-icon" />
          Store Home
        </NavLink>
        
        <NavLink to="/products" className="admin-nav-item">
          <ShoppingBag className="admin-nav-icon" />
          Store Products
        </NavLink>

        <button 
          type="button"
          onClick={(e) => {
            e.preventDefault();
            if (isLoggingOut) return;
            if (window.innerWidth <= 992 && toggleSidebar) toggleSidebar();
            if (typeof requestLogout === 'function') {
              requestLogout();
            } else {
              logout();
            }
          }} 
          disabled={isLoggingOut}
          className="admin-nav-item" 
          style={{ 
            width: '100%', 
            background: 'none', 
            border: 'none', 
            cursor: isLoggingOut ? 'not-allowed' : 'pointer', 
            marginTop: '15px', 
            color: 'var(--frutlle-red)',
            opacity: isLoggingOut ? 0.6 : 1
          }}
        >
          <LogOut className="admin-nav-icon" />
          Logout
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
