import { Menu, Bell, Search, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const TopNav = ({ toggleSidebar }) => {
  const { user } = useAuth();

  return (
    <header className="admin-topnav">
      <div className="admin-topnav-left">
        <button className="admin-menu-btn" onClick={toggleSidebar}>
          <Menu size={24} />
        </button>
        <div className="admin-topnav-search">
          <Search size={18} color="#888" style={{ marginRight: '8px', flexShrink: 0 }} />
          <input 
            type="text" 
            placeholder="Search..." 
            style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', minWidth: 0, fontSize: '0.9rem' }}
          />
        </div>
      </div>

      <div className="admin-topnav-right">
        <button style={{ background: 'none', border: 'none', cursor: 'pointer', position: 'relative', color: 'var(--frutlle-dark-red)' }}>
          <Bell size={22} />
          <span style={{ position: 'absolute', top: '-4px', right: '-4px', background: 'var(--frutlle-red)', color: 'white', width: '16px', height: '16px', borderRadius: '50%', fontSize: '0.65rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
            3
          </span>
        </button>
        
        <button className="admin-profile-btn">
          <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'var(--frutlle-gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
            <User size={20} />
          </div>
          <span>{user?.name || 'Admin'}</span>
        </button>
      </div>
    </header>
  );
};

export default TopNav;
