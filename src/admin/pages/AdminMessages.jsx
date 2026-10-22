import { useState, useEffect } from 'react';
import axios, { getApiUrl } from '../../utils/api';
import { 
  Mail, 
  MailOpen, 
  Search, 
  Trash2, 
  Eye, 
  X, 
  RefreshCw, 
  ExternalLink, 
  Clock, 
  Inbox, 
  CheckCircle, 
  AlertCircle 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import './AdminMessages.css';

const AdminMessages = () => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all' | 'unread' | 'read'
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [feedbackNotice, setFeedbackNotice] = useState('');

  const fetchMessages = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data } = await axios.get(getApiUrl('/api/messages'), { withCredentials: true });
      if (data && Array.isArray(data.messages)) {
        setMessages(data.messages);
      } else {
        setMessages([]);
      }
    } catch (err) {
      console.error('Failed to load contact messages:', err);
      setError(err.response?.data?.message || 'Unable to load contact messages.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();

    // Listen to custom event if other components update messages
    const handleUpdate = () => fetchMessages();
    window.addEventListener('messages-updated', handleUpdate);
    return () => window.removeEventListener('messages-updated', handleUpdate);
  }, []);

  const showFeedback = (msg) => {
    setFeedbackNotice(msg);
    setTimeout(() => setFeedbackNotice(''), 3500);
  };

  // Open modal and automatically mark as read if currently unread
  const handleOpenMessage = async (msg) => {
    setSelectedMessage(msg);

    if (!msg.is_read) {
      try {
        const { data } = await axios.put(
          getApiUrl(`/api/messages/${msg.id}/read`),
          { isRead: true },
          { withCredentials: true }
        );

        if (data?.message) {
          setMessages((prev) =>
            prev.map((m) => (m.id === msg.id ? { ...m, is_read: true } : m))
          );
          setSelectedMessage((prev) => (prev ? { ...prev, is_read: true } : prev));
          window.dispatchEvent(new CustomEvent('messages-updated'));
        }
      } catch (err) {
        console.error('Failed to mark message as read on open:', err);
      }
    }
  };

  const handleCloseModal = () => {
    setSelectedMessage(null);
  };

  // Explicitly toggle read/unread status
  const handleToggleReadStatus = async (msg, e) => {
    if (e) e.stopPropagation();
    const newStatus = !msg.is_read;

    try {
      const { data } = await axios.put(
        getApiUrl(`/api/messages/${msg.id}/read`),
        { isRead: newStatus },
        { withCredentials: true }
      );

      if (data?.message) {
        setMessages((prev) =>
          prev.map((m) => (m.id === msg.id ? { ...m, is_read: newStatus } : m))
        );
        if (selectedMessage && selectedMessage.id === msg.id) {
          setSelectedMessage((prev) => ({ ...prev, is_read: newStatus }));
        }
        showFeedback(newStatus ? 'Message marked as read' : 'Message marked as unread');
        window.dispatchEvent(new CustomEvent('messages-updated'));
      }
    } catch (err) {
      console.error('Failed to toggle message read status:', err);
      alert('Could not update message read status.');
    }
  };

  // Delete message with confirmation
  const handleDeleteMessage = async (id, e) => {
    if (e) e.stopPropagation();
    setDeletingId(id);

    try {
      await axios.delete(getApiUrl(`/api/messages/${id}`), { withCredentials: true });
      setMessages((prev) => prev.filter((m) => m.id !== id));
      if (selectedMessage && selectedMessage.id === id) {
        setSelectedMessage(null);
      }
      setConfirmDeleteId(null);
      showFeedback('Message permanently deleted');
      window.dispatchEvent(new CustomEvent('messages-updated'));
    } catch (err) {
      console.error('Failed to delete message:', err);
      alert(err.response?.data?.message || 'Failed to delete message.');
    } finally {
      setDeletingId(null);
    }
  };

  // Helper date formatter
  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  // Filter & Search computations
  const totalCount = messages.length;
  const unreadCount = messages.filter((m) => !m.is_read).length;
  const readCount = totalCount - unreadCount;

  const filteredMessages = messages.filter((m) => {
    // Search
    const q = searchTerm.trim().toLowerCase();
    const matchesSearch =
      !q ||
      (m.name && m.name.toLowerCase().includes(q)) ||
      (m.email && m.email.toLowerCase().includes(q)) ||
      (m.subject && m.subject.toLowerCase().includes(q)) ||
      (m.message && m.message.toLowerCase().includes(q));

    // Status filter
    let matchesStatus = true;
    if (filterType === 'unread') matchesStatus = !m.is_read;
    if (filterType === 'read') matchesStatus = m.is_read;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="admin-messages-page">
      {/* Feedback Toast */}
      <AnimatePresence>
        {feedbackNotice && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            style={{
              position: 'fixed',
              top: '20px',
              right: '30px',
              zIndex: 2000,
              backgroundColor: 'var(--frutlle-dark-red)',
              color: 'white',
              padding: '12px 20px',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-lg)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '0.9rem',
              fontWeight: 500
            }}
          >
            <CheckCircle size={18} style={{ color: 'var(--frutlle-gold)' }} />
            <span>{feedbackNotice}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="admin-messages-header">
        <div>
          <h1>Customer Messages</h1>
          <p>Review customer inquiries, contact requests, and wholesale queries.</p>
        </div>
        <button
          onClick={fetchMessages}
          disabled={loading}
          className="refresh-btn"
          title="Refresh messages list"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Summary Stat Cards */}
      <div className="admin-messages-stats">
        <div className="messages-stat-card">
          <div className="stat-icon-wrapper total">
            <Inbox size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Total Inquiries</span>
            <span className="stat-value">{totalCount}</span>
          </div>
        </div>

        <div className="messages-stat-card">
          <div className="stat-icon-wrapper unread">
            <Mail size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Unread Messages</span>
            <span className="stat-value">{unreadCount}</span>
          </div>
        </div>

        <div className="messages-stat-card">
          <div className="stat-icon-wrapper read">
            <MailOpen size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Read / Handled</span>
            <span className="stat-value">{readCount}</span>
          </div>
        </div>
      </div>

      {/* Controls: Search & Filters */}
      <div className="messages-controls-card">
        <div className="messages-search-wrapper">
          <Search size={18} className="messages-search-icon" />
          <input
            type="text"
            placeholder="Search by customer, email, subject or keyword..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="messages-search-input"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="messages-search-clear"
              title="Clear search"
            >
              <X size={16} />
            </button>
          )}
        </div>

        <div className="messages-filters-group">
          <button
            className={`filter-tab ${filterType === 'all' ? 'active' : ''}`}
            onClick={() => setFilterType('all')}
          >
            All <span className="filter-tab-count">{totalCount}</span>
          </button>
          <button
            className={`filter-tab ${filterType === 'unread' ? 'active' : ''}`}
            onClick={() => setFilterType('unread')}
          >
            Unread <span className="filter-tab-count">{unreadCount}</span>
          </button>
          <button
            className={`filter-tab ${filterType === 'read' ? 'active' : ''}`}
            onClick={() => setFilterType('read')}
          >
            Read <span className="filter-tab-count">{readCount}</span>
          </button>
        </div>
      </div>

      {/* Main Messages Content */}
      <div className="messages-table-card">
        {loading ? (
          <div className="messages-loading-state">
            <RefreshCw size={28} className="animate-spin" style={{ margin: '0 auto 12px', color: 'var(--frutlle-red)' }} />
            <p>Loading customer messages...</p>
          </div>
        ) : error ? (
          <div className="messages-empty-state">
            <AlertCircle size={40} style={{ color: 'var(--frutlle-red)', margin: '0 auto' }} />
            <h3>Unable to Load Messages</h3>
            <p>{error}</p>
            <button onClick={fetchMessages} className="btn btn-primary" style={{ marginTop: '16px' }}>
              Try Again
            </button>
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="messages-empty-state">
            <Inbox size={48} style={{ color: 'var(--frutlle-gold)', margin: '0 auto' }} />
            <h3>{searchTerm || filterType !== 'all' ? 'No Matching Messages' : 'No Messages Yet'}</h3>
            <p>
              {searchTerm || filterType !== 'all'
                ? 'Try adjusting your search keywords or switching filters to view other inquiries.'
                : 'When customers submit inquiries through your website contact form, they will appear here.'}
            </p>
          </div>
        ) : (
          <div className="admin-table-container">
            <table className="messages-table">
              <thead>
                <tr>
                  <th style={{ width: '22%' }}>Sender</th>
                  <th style={{ width: '38%' }}>Subject & Preview</th>
                  <th style={{ width: '15%' }}>Date Received</th>
                  <th style={{ width: '11%' }}>Status</th>
                  <th style={{ width: '14%', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredMessages.map((msg) => (
                  <tr
                    key={msg.id}
                    className={`messages-row ${!msg.is_read ? 'unread-row' : ''}`}
                    onClick={() => handleOpenMessage(msg)}
                  >
                    <td>
                      <div className="sender-cell">
                        <div className="sender-avatar">
                          {msg.name ? msg.name.charAt(0).toUpperCase() : 'C'}
                        </div>
                        <div className="sender-info">
                          <span className="sender-name">{msg.name}</span>
                          <span className="sender-email">{msg.email}</span>
                        </div>
                      </div>
                    </td>

                    <td>
                      <div className="message-preview-cell">
                        <div className="message-subject-text">{msg.subject}</div>
                        <div className="message-snippet-text">{msg.message}</div>
                      </div>
                    </td>

                    <td>
                      <span style={{ fontSize: '0.86rem', color: '#666' }}>
                        {formatDate(msg.created_at)}
                      </span>
                    </td>

                    <td>
                      {msg.is_read ? (
                        <span className="status-pill read">Read</span>
                      ) : (
                        <span className="status-pill unread">
                          <span className="status-dot" />
                          Unread
                        </span>
                      )}
                    </td>

                    <td>
                      <div className="message-actions" style={{ justifyContent: 'flex-end' }}>
                        <button
                          className="action-icon-btn"
                          title="View Message Details"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenMessage(msg);
                          }}
                        >
                          <Eye size={16} />
                        </button>

                        <button
                          className="action-icon-btn"
                          title={msg.is_read ? 'Mark as Unread' : 'Mark as Read'}
                          onClick={(e) => handleToggleReadStatus(msg, e)}
                        >
                          {msg.is_read ? <Mail size={16} /> : <MailOpen size={16} />}
                        </button>

                        <button
                          className="action-icon-btn delete"
                          title="Delete Message"
                          disabled={deletingId === msg.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDeleteId(msg.id);
                          }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Message Details Modal */}
      <AnimatePresence>
        {selectedMessage && (
          <div className="message-modal-backdrop" onClick={handleCloseModal}>
            <motion.div
              className="message-modal"
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="message-modal-header">
                <div className="message-modal-title-area">
                  <Mail size={22} style={{ color: 'var(--frutlle-red)' }} />
                  <h2>Message Inquiry</h2>
                  {selectedMessage.is_read ? (
                    <span className="status-pill read" style={{ marginLeft: '8px' }}>Read</span>
                  ) : (
                    <span className="status-pill unread" style={{ marginLeft: '8px' }}>
                      <span className="status-dot" />
                      Unread
                    </span>
                  )}
                </div>
                <button className="message-modal-close-btn" onClick={handleCloseModal}>
                  <X size={20} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="message-modal-body">
                {/* Customer Meta */}
                <div className="message-meta-card">
                  <div className="meta-customer-info">
                    <div className="meta-avatar">
                      {selectedMessage.name ? selectedMessage.name.charAt(0).toUpperCase() : 'C'}
                    </div>
                    <div className="meta-customer-text">
                      <h4>{selectedMessage.name}</h4>
                      <a
                        href={`mailto:${selectedMessage.email}?subject=Re: ${encodeURIComponent(selectedMessage.subject)}`}
                        className="meta-email-link"
                        title="Click to open email app"
                      >
                        {selectedMessage.email}
                        <ExternalLink size={13} />
                      </a>
                    </div>
                  </div>

                  <div className="meta-date-box">
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={14} />
                      {formatDate(selectedMessage.created_at)}
                    </span>
                  </div>
                </div>

                {/* Message Content */}
                <div className="message-content-card">
                  <div className="message-subject-header">Subject</div>
                  <div className="message-subject-full">{selectedMessage.subject}</div>

                  <div className="message-subject-header">Message Body</div>
                  <div className="message-body-text">{selectedMessage.message}</div>
                </div>
              </div>

              {/* Modal Footer Actions */}
              <div className="message-modal-footer">
                <div className="modal-footer-left">
                  <button
                    type="button"
                    className="btn btn-outline"
                    style={{ fontSize: '0.88rem', padding: '0.55rem 1.1rem' }}
                    onClick={(e) => handleToggleReadStatus(selectedMessage, e)}
                  >
                    {selectedMessage.is_read ? 'Mark as Unread' : 'Mark as Read'}
                  </button>

                  <button
                    type="button"
                    className="btn btn-outline"
                    style={{ 
                      fontSize: '0.88rem', 
                      padding: '0.55rem 1.1rem',
                      borderColor: '#ffcdd2',
                      color: 'var(--frutlle-red)' 
                    }}
                    onClick={() => setConfirmDeleteId(selectedMessage.id)}
                  >
                    Delete
                  </button>
                </div>

                <div className="modal-footer-right">
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={handleCloseModal}
                    style={{ fontSize: '0.88rem', padding: '0.55rem 1.1rem' }}
                  >
                    Close
                  </button>

                  <a
                    href={`mailto:${selectedMessage.email}?subject=Re: ${encodeURIComponent(selectedMessage.subject)}&body=Dear ${encodeURIComponent(selectedMessage.name)},%0D%0A%0D%0AThank you for contacting FRUTLLE regarding "${encodeURIComponent(selectedMessage.subject)}".%0D%0A%0D%0A`}
                    className="btn btn-primary"
                    style={{
                      fontSize: '0.88rem',
                      padding: '0.55rem 1.3rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      textDecoration: 'none'
                    }}
                  >
                    <Mail size={16} />
                    <span>Reply via Email</span>
                  </a>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {confirmDeleteId && (
          <div
            className="message-modal-backdrop"
            style={{ zIndex: 1200 }}
            onClick={() => setConfirmDeleteId(null)}
          >
            <motion.div
              className="message-modal"
              style={{ maxWidth: '440px', padding: '24px' }}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(169, 27, 36, 0.1)',
                  color: 'var(--frutlle-red)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Trash2 size={22} />
                </div>
                <h3 style={{ fontFamily: 'var(--font-serif)', color: 'var(--frutlle-dark-red)', fontSize: '1.25rem' }}>
                  Delete Message?
                </h3>
              </div>

              <p style={{ color: '#666', fontSize: '0.92rem', lineHeight: '1.5', marginBottom: '20px' }}>
                Are you sure you want to permanently delete this customer message? This action cannot be undone.
              </p>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setConfirmDeleteId(null)}
                  style={{ fontSize: '0.88rem', padding: '0.5rem 1rem' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => handleDeleteMessage(confirmDeleteId)}
                  disabled={deletingId === confirmDeleteId}
                  style={{ fontSize: '0.88rem', padding: '0.5rem 1.2rem', backgroundColor: 'var(--frutlle-red)' }}
                >
                  {deletingId === confirmDeleteId ? 'Deleting...' : 'Yes, Delete'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminMessages;
