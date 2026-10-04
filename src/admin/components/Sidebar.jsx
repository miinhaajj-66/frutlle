import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  Tags, 
  Package, 
  Users, 
  MessageSquare, 
  CreditCard,
  Ticket,
  Settings,
  LogOut,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const Sidebar = ({ isOpen, toggleSidebar }) => {
  const { logout } = useAuth();

  const navItems = [
    { name: 'Dashboard', path: '/admin', icon: LayoutDashboard },
    { name: 'Orders', path: '/admin/orders', icon: ShoppingBag },
    { name: 'Products', path: '/admin/products', icon: Package },
    { name: 'Categories', path: '/admin/categories', icon: Tags },
    { name: 'Customers', path: '/admin/customers', icon: Users },
    { name: 'Reviews', path: '/admin/reviews', icon: MessageSquare },
    { name: 'Payments', path: '/admin/payments', icon: CreditCard },
    { name: 'Coupons', path: '/admin/coupons', icon: Ticket },
    { name: 'Settings', path: '/admin/settings', icon: Settings },
  ];

  return (
    <aside className={`admin-sidebar ${isOpen ? 'open' : ''}`}>
      <div className="admin-sidebar-header">
        <img src="/Glossy%20Frutlle%20Origin%20Logo.png" alt="FRUTLLE" className="admin-sidebar-logo" />
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
            {item.name}
          </NavLink>
        ))}
      </nav>

      <div className="admin-sidebar-footer">
        <button onClick={logout} className="admin-nav-item" style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer' }}>
          <LogOut className="admin-nav-icon" />
          Logout
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
