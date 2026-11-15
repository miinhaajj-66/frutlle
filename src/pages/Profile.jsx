import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Package, 
  ShoppingBag, 
  LogOut, 
  Edit3, 
  Check, 
  X, 
  ShieldCheck, 
  Calendar, 
  ArrowRight, 
  Loader2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Profile.css';

/**
 * Format date string into a luxury readable date (e.g., "October 2026")
 */
const formatMemberSince = (dateString) => {
  if (!dateString) return 'Member';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return 'Member';
    return d.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric'
    });
  } catch {
    return 'Member';
  }
};

/**
 * Extract 1-2 uppercase initials from customer name or email
 */
const getInitials = (name, email) => {
  if (name && typeof name === 'string' && name.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  }
  if (email && typeof email === 'string') {
    return email.slice(0, 2).toUpperCase();
  }
  return 'FL';
};

const Profile = () => {
  const { user, requestLogout, logout, updateProfile, refreshProfile } = useAuth();

  const [isLoading, setIsLoading] = useState(!user);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState({ type: null, text: '' });

  // Sync helper
  const extractFormData = useCallback((userData) => {
    if (!userData) {
      return {
        name: '',
        phone: '',
        address: '',
        city: '',
        state: '',
        postalCode: '',
        country: 'India'
      };
    }
    const shipping = userData.shippingAddress || {};
    return {
      name: userData.name || '',
      phone: userData.phone || shipping.phone || '',
      address: shipping.address || '',
      city: shipping.city || '',
      state: shipping.state || '',
      postalCode: shipping.postalCode || '',
      country: shipping.country || 'India'
    };
  }, []);

  // Profile Form State initialized from user
  const [formData, setFormData] = useState(() => extractFormData(user));

  // Initial fetch on mount
  useEffect(() => {
    let isMounted = true;
    const fetchLatestProfile = async () => {
      try {
        if (refreshProfile) {
          const freshData = await refreshProfile();
          if (isMounted && freshData) {
            setFormData(extractFormData(freshData));
          }
        }
      } catch (err) {
        console.warn('Profile fetch error:', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchLatestProfile();

    return () => {
      isMounted = false;
    };
  }, [refreshProfile, extractFormData]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleStartEditing = () => {
    setFormData(extractFormData(user));
    setFeedback({ type: null, text: '' });
    setIsEditing(true);
  };

  const handleCancelEditing = () => {
    setFormData(extractFormData(user));
    setFeedback({ type: null, text: '' });
    setIsEditing(false);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFeedback({ type: 'error', text: 'Full name cannot be empty.' });
      return;
    }

    setIsSaving(true);
    setFeedback({ type: null, text: '' });

    try {
      const payload = {
        name: formData.name.trim(),
        phone: formData.phone.trim() || null,
        shippingAddress: {
          address: formData.address.trim() || '',
          city: formData.city.trim() || '',
          state: formData.state.trim() || '',
          postalCode: formData.postalCode.trim() || '',
          country: formData.country.trim() || 'India'
        }
      };

      if (updateProfile) {
        await updateProfile(payload);
      }

      setFeedback({ type: 'success', text: 'Your account profile has been updated successfully.' });
      setIsEditing(false);

      // Auto-clear success notification after 5 seconds
      setTimeout(() => {
        setFeedback((prev) => (prev.type === 'success' ? { type: null, text: '' } : prev));
      }, 5000);
    } catch (err) {
      console.error('Update profile failed:', err);
      const errMsg = err.response?.data?.message || 'Failed to update profile. Please try again.';
      setFeedback({ type: 'error', text: errMsg });
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogoutClick = () => {
    if (requestLogout) {
      requestLogout();
    } else if (logout) {
      logout();
    }
  };

  if (isLoading) {
    return (
      <div className="profile-page-wrapper">
        <div className="profile-container">
          <div className="profile-hero profile-skeleton" style={{ height: '180px' }} />
          <div className="profile-grid">
            <div className="profile-card profile-skeleton" style={{ height: '320px' }} />
            <div className="profile-card profile-skeleton" style={{ height: '320px' }} />
          </div>
        </div>
      </div>
    );
  }

  const currentUser = user || {};
  const initials = getInitials(currentUser.name, currentUser.email);
  const memberSince = formatMemberSince(currentUser.createdAt || currentUser.created_at);
  const shipping = currentUser.shippingAddress || {};
  const formattedAddress = [
    shipping.address,
    shipping.city,
    shipping.state,
    shipping.postalCode,
    shipping.country
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <motion.div 
      className="profile-page-wrapper"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
    >
      <div className="profile-container">
        
        {/* Feedback Banners */}
        {feedback.text && feedback.type === 'success' && (
          <div className="profile-alert-success" role="alert">
            <CheckCircle2 size={18} />
            <span>{feedback.text}</span>
          </div>
        )}

        {feedback.text && feedback.type === 'error' && (
          <div className="profile-alert-error" role="alert">
            <AlertCircle size={18} />
            <span>{feedback.text}</span>
          </div>
        )}

        {/* Hero Customer Banner */}
        <div className="profile-hero">
          <div className="profile-hero-pattern" aria-hidden="true" />
          
          <div className="profile-hero-left">
            <div className="profile-avatar-circle" aria-label="Customer Avatar">
              {initials}
            </div>
            <div className="profile-hero-info">
              <h1 className="profile-hero-name">{currentUser.name || 'FRUTLLE Customer'}</h1>
              <div className="profile-hero-email">
                <Mail size={15} style={{ opacity: 0.8 }} />
                <span>{currentUser.email || 'customer@frutlle.com'}</span>
              </div>
              <div className="profile-hero-badges">
                <span className="profile-badge-pill profile-badge-role">
                  {currentUser.role === 'admin' ? 'Administrator' : 'Customer Account'}
                </span>
                <span className="profile-badge-pill profile-badge-date">
                  <Calendar size={13} />
                  <span>Member since {memberSince}</span>
                </span>
              </div>
            </div>
          </div>

          <div className="profile-hero-actions">
            {!isEditing ? (
              <button 
                type="button" 
                className="btn btn-outline"
                style={{ 
                  borderColor: 'rgba(253, 230, 138, 0.4)', 
                  color: '#FDE68A',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
                onClick={handleStartEditing}
              >
                <Edit3 size={15} />
                <span>Edit Details</span>
              </button>
            ) : (
              <button 
                type="button" 
                className="btn btn-outline"
                style={{ 
                  borderColor: 'rgba(255, 255, 255, 0.35)', 
                  color: '#ffffff',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
                onClick={handleCancelEditing}
              >
                <X size={15} />
                <span>Cancel</span>
              </button>
            )}
            <button 
              type="button" 
              className="btn btn-outline"
              style={{ 
                borderColor: 'rgba(255, 255, 255, 0.25)', 
                color: '#ffffff',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
              onClick={handleLogoutClick}
            >
              <LogOut size={15} />
              <span>Logout</span>
            </button>
          </div>
        </div>

        {/* Quick Navigation Cards */}
        <div className="profile-quicknav">
          <Link to="/my-orders" className="profile-quicknav-card">
            <div className="profile-quicknav-content">
              <div className="profile-quicknav-icon">
                <Package size={22} />
              </div>
              <div>
                <p className="profile-quicknav-label">My Orders</p>
                <p className="profile-quicknav-sub">Track shipments & history</p>
              </div>
            </div>
            <ArrowRight size={18} style={{ color: 'var(--color-primary, #881337)' }} />
          </Link>

          <Link to="/cart" className="profile-quicknav-card">
            <div className="profile-quicknav-content">
              <div className="profile-quicknav-icon">
                <ShoppingBag size={22} />
              </div>
              <div>
                <p className="profile-quicknav-label">Shopping Bag</p>
                <p className="profile-quicknav-sub">Review items & checkout</p>
              </div>
            </div>
            <ArrowRight size={18} style={{ color: 'var(--color-primary, #881337)' }} />
          </Link>

          {currentUser.role === 'admin' && (
            <Link to="/admin" className="profile-quicknav-card" style={{ borderLeft: '3px solid var(--frutlle-red, #C53030)' }}>
              <div className="profile-quicknav-content">
                <div className="profile-quicknav-icon" style={{ background: 'rgba(197, 48, 48, 0.1)', color: '#C53030' }}>
                  <ShieldCheck size={22} />
                </div>
                <div>
                  <p className="profile-quicknav-label">Admin Dashboard</p>
                  <p className="profile-quicknav-sub">Manage store & inventory</p>
                </div>
              </div>
              <ArrowRight size={18} style={{ color: '#C53030' }} />
            </Link>
          )}
        </div>

        {/* Main Content Grid: Account Details & Shipping Address */}
        <div className="profile-grid">
          
          {/* Card 1: Personal Details */}
          <div className="profile-card">
            <div className="profile-card-header">
              <h2 className="profile-card-title">
                <User size={20} />
                <span>Personal Information</span>
              </h2>
              {!isEditing && (
                <button 
                  type="button" 
                  className="profile-edit-btn" 
                  onClick={handleStartEditing}
                  title="Edit Information"
                >
                  <Edit3 size={14} />
                  <span>Edit</span>
                </button>
              )}
            </div>

            {!isEditing ? (
              <div className="profile-fields-list">
                <div className="profile-field-item">
                  <span className="profile-field-label">Full Name</span>
                  <span className="profile-field-value">{currentUser.name || <span className="profile-field-empty">Not provided</span>}</span>
                </div>

                <div className="profile-field-item">
                  <span className="profile-field-label">Email Address</span>
                  <span className="profile-field-value">{currentUser.email || '—'}</span>
                </div>

                <div className="profile-field-item">
                  <span className="profile-field-label">Phone Number</span>
                  <span className="profile-field-value">
                    {currentUser.phone || shipping.phone ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Phone size={14} style={{ color: 'var(--color-primary, #881337)' }} />
                        {currentUser.phone || shipping.phone}
                      </span>
                    ) : (
                      <span className="profile-field-empty">No phone number saved</span>
                    )}
                  </span>
                </div>

                <div className="profile-field-item">
                  <span className="profile-field-label">Account Role</span>
                  <span className="profile-field-value" style={{ textTransform: 'capitalize' }}>
                    {currentUser.role || 'Customer'}
                  </span>
                </div>
              </div>
            ) : (
              <form id="profile-edit-form" onSubmit={handleSaveProfile} className="profile-form">
                <div className="profile-form-group">
                  <label className="profile-form-label" htmlFor="profile-name">
                    Full Name <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    id="profile-name"
                    name="name"
                    type="text"
                    required
                    className="profile-input"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="e.g. John Doe"
                  />
                </div>

                <div className="profile-form-group">
                  <label className="profile-form-label" htmlFor="profile-email">
                    Email Address
                  </label>
                  <input
                    id="profile-email"
                    type="email"
                    disabled
                    className="profile-input"
                    value={currentUser.email || ''}
                    title="Email address is linked to your account authentication and cannot be changed here."
                  />
                  <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                    Linked to your secure login account.
                  </span>
                </div>

                <div className="profile-form-group">
                  <label className="profile-form-label" htmlFor="profile-phone">
                    Phone Number
                  </label>
                  <input
                    id="profile-phone"
                    name="phone"
                    type="tel"
                    className="profile-input"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="e.g. +91 98765 43210"
                  />
                </div>
              </form>
            )}
          </div>

          {/* Card 2: Saved Shipping Address */}
          <div className="profile-card">
            <div className="profile-card-header">
              <h2 className="profile-card-title">
                <MapPin size={20} />
                <span>Shipping Address</span>
              </h2>
              {!isEditing && (
                <button 
                  type="button" 
                  className="profile-edit-btn" 
                  onClick={handleStartEditing}
                  title="Edit Address"
                >
                  <Edit3 size={14} />
                  <span>Edit</span>
                </button>
              )}
            </div>

            {!isEditing ? (
              <div className="profile-fields-list">
                <div className="profile-field-item">
                  <span className="profile-field-label">Delivery Street Address</span>
                  <span className="profile-field-value">
                    {shipping.address || <span className="profile-field-empty">No street address saved</span>}
                  </span>
                </div>

                <div className="profile-field-item">
                  <span className="profile-field-label">City</span>
                  <span className="profile-field-value">
                    {shipping.city || <span className="profile-field-empty">Not set</span>}
                  </span>
                </div>

                <div className="profile-field-item">
                  <span className="profile-field-label">State / Province</span>
                  <span className="profile-field-value">
                    {shipping.state || <span className="profile-field-empty">Not set</span>}
                  </span>
                </div>

                <div className="profile-field-item">
                  <span className="profile-field-label">Postal / PIN Code</span>
                  <span className="profile-field-value">
                    {shipping.postalCode || <span className="profile-field-empty">Not set</span>}
                  </span>
                </div>

                <div className="profile-field-item">
                  <span className="profile-field-label">Country</span>
                  <span className="profile-field-value">
                    {shipping.country || 'India'}
                  </span>
                </div>

                {formattedAddress && (
                  <div style={{ marginTop: '0.5rem', padding: '0.75rem', background: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                    <span className="profile-field-label" style={{ display: 'block', marginBottom: '0.25rem' }}>Full Formatted Address</span>
                    <span style={{ fontSize: '0.9rem', color: '#374151' }}>{formattedAddress}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="profile-form">
                <div className="profile-form-group">
                  <label className="profile-form-label" htmlFor="profile-address">
                    Street Address / Flat / Building
                  </label>
                  <input
                    id="profile-address"
                    name="address"
                    type="text"
                    className="profile-input"
                    value={formData.address}
                    onChange={handleInputChange}
                    placeholder="e.g. 42 Palm Avenue, Apt 3B"
                    form="profile-edit-form"
                  />
                </div>

                <div className="profile-form-row-2">
                  <div className="profile-form-group">
                    <label className="profile-form-label" htmlFor="profile-city">
                      City
                    </label>
                    <input
                      id="profile-city"
                      name="city"
                      type="text"
                      className="profile-input"
                      value={formData.city}
                      onChange={handleInputChange}
                      placeholder="e.g. Mumbai"
                      form="profile-edit-form"
                    />
                  </div>
                  <div className="profile-form-group">
                    <label className="profile-form-label" htmlFor="profile-state">
                      State
                    </label>
                    <input
                      id="profile-state"
                      name="state"
                      type="text"
                      className="profile-input"
                      value={formData.state}
                      onChange={handleInputChange}
                      placeholder="e.g. Maharashtra"
                      form="profile-edit-form"
                    />
                  </div>
                </div>

                <div className="profile-form-row-2">
                  <div className="profile-form-group">
                    <label className="profile-form-label" htmlFor="profile-postalCode">
                      PIN / Postal Code
                    </label>
                    <input
                      id="profile-postalCode"
                      name="postalCode"
                      type="text"
                      className="profile-input"
                      value={formData.postalCode}
                      onChange={handleInputChange}
                      placeholder="e.g. 400001"
                      form="profile-edit-form"
                    />
                  </div>
                  <div className="profile-form-group">
                    <label className="profile-form-label" htmlFor="profile-country">
                      Country
                    </label>
                    <input
                      id="profile-country"
                      name="country"
                      type="text"
                      className="profile-input"
                      value={formData.country}
                      onChange={handleInputChange}
                      placeholder="e.g. India"
                      form="profile-edit-form"
                    />
                  </div>
                </div>

                <div className="profile-form-actions">
                  <button 
                    type="button" 
                    className="btn btn-outline"
                    onClick={handleCancelEditing}
                    disabled={isSaving}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    form="profile-edit-form"
                    className="btn btn-primary"
                    disabled={isSaving}
                    style={{ minWidth: '130px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Check size={16} />
                        <span>Save Changes</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Security & Session Information Footer Card */}
        <div className="profile-security-card">
          <div className="profile-security-info">
            <div className="profile-security-icon">
              <ShieldCheck size={22} />
            </div>
            <div className="profile-security-text">
              <h4>Secure Authentication Active</h4>
              <p>Your session is protected with strict SameSite HttpOnly credentials. Your password and payment details are never exposed to JavaScript.</p>
            </div>
          </div>
          <button 
            type="button" 
            className="btn btn-outline"
            style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}
            onClick={handleLogoutClick}
          >
            Sign Out
          </button>
        </div>

      </div>
    </motion.div>
  );
};

export default Profile;
