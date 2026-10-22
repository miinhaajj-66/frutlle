import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Phone, MapPin, Clock, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { useState } from 'react';
import axios from 'axios';

const Contact = () => {
  const [formState, setFormState] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [submitted, setSubmitted] = useState(false);
  const [lastSubmittedName, setLastSubmittedName] = useState('');
  const [lastSubmittedEmail, setLastSubmittedEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleChange = (e) => {
    setFormState({ ...formState, [e.target.name]: e.target.value });
    if (errorMessage) setErrorMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    // Validate fields
    if (!formState.name.trim() || formState.name.trim().length < 2) {
      setErrorMessage('Please enter your full name (at least 2 characters).');
      return;
    }
    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    if (!formState.email.trim() || !emailRegex.test(formState.email.trim())) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }
    if (!formState.subject.trim() || formState.subject.trim().length < 2) {
      setErrorMessage('Please enter a message subject (at least 2 characters).');
      return;
    }
    if (!formState.message.trim() || formState.message.trim().length < 5) {
      setErrorMessage('Please write a message with at least 5 characters.');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      await axios.post('/api/messages', {
        name: formState.name.trim(),
        email: formState.email.trim(),
        subject: formState.subject.trim(),
        message: formState.message.trim()
      });

      setLastSubmittedName(formState.name.trim());
      setLastSubmittedEmail(formState.email.trim());
      setSubmitted(true);
      setFormState({ name: '', email: '', subject: '', message: '' });
    } catch (err) {
      console.error('Contact form submission error:', err);
      const msg = err.response?.data?.message || 'We could not send your message right now. Please try again or email us directly.';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResetForm = () => {
    setSubmitted(false);
    setErrorMessage('');
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="container section"
    >
      <div className="text-center" style={{ marginBottom: 'clamp(var(--space-xl), 5vw, var(--space-4xl))' }}>
        <motion.h1 
          className="heading-lg"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          Get in Touch
        </motion.h1>
        <motion.p 
          style={{ maxWidth: '600px', margin: '0 auto', color: 'var(--color-text)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          Have a question about our preserves, wholesale opportunities, or just want to say hello? We'd love to hear from you.
        </motion.p>
      </div>

      <div className="contact-grid">
        
        {/* Contact Info */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <h2 className="heading-sm" style={{ marginBottom: 'var(--space-xl)', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>Contact Information</h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <div style={{ padding: '0.75rem', backgroundColor: 'var(--color-secondary)', borderRadius: '50%', color: 'var(--color-primary)' }}>
                <MapPin size={24} />
              </div>
              <div>
                <h4 style={{ marginBottom: '0.25rem', fontFamily: 'var(--font-sans)', fontWeight: 600 }}>Our Farm & Kitchen</h4>
                <p style={{ color: 'var(--color-text)' }}>123 Orchard Lane<br/>Berryville, CA 90210</p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <div style={{ padding: '0.75rem', backgroundColor: 'var(--color-secondary)', borderRadius: '50%', color: 'var(--color-primary)' }}>
                <Phone size={24} />
              </div>
              <div>
                <h4 style={{ marginBottom: '0.25rem', fontFamily: 'var(--font-sans)', fontWeight: 600 }}>Phone</h4>
                <p style={{ color: 'var(--color-text)' }}>+1 (555) 123-4567</p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <div style={{ padding: '0.75rem', backgroundColor: 'var(--color-secondary)', borderRadius: '50%', color: 'var(--color-primary)' }}>
                <Mail size={24} />
              </div>
              <div>
                <h4 style={{ marginBottom: '0.25rem', fontFamily: 'var(--font-sans)', fontWeight: 600 }}>Email</h4>
                <p style={{ color: 'var(--color-text)' }}>hello@frutlle.com</p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <div style={{ padding: '0.75rem', backgroundColor: 'var(--color-secondary)', borderRadius: '50%', color: 'var(--color-primary)' }}>
                <Clock size={24} />
              </div>
              <div>
                <h4 style={{ marginBottom: '0.25rem', fontFamily: 'var(--font-sans)', fontWeight: 600 }}>Business Hours</h4>
                <p style={{ color: 'var(--color-text)' }}>Monday - Friday: 9am - 5pm PST<br/>Weekend: Closed</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Contact Form */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          style={{ background: 'var(--color-white)', padding: 'var(--space-2xl)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-md)' }}
        >
          <h2 className="heading-sm" style={{ marginBottom: 'var(--space-xl)' }}>Send a Message</h2>
          
          <AnimatePresence mode="wait">
            {submitted ? (
              <motion.div 
                key="success"
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.4 }}
                style={{
                  padding: '2.5rem 2rem',
                  textAlign: 'center',
                  backgroundColor: 'var(--color-secondary)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--frutlle-gold)',
                  boxShadow: 'var(--shadow-sm)'
                }}
              >
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--frutlle-red)',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1.25rem'
                }}>
                  <CheckCircle2 size={32} />
                </div>
                <h3 style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: '1.6rem',
                  color: 'var(--frutlle-dark-red)',
                  marginBottom: '0.75rem'
                }}>
                  Thank You{lastSubmittedName ? `, ${lastSubmittedName}` : ''}!
                </h3>
                <p style={{
                  color: 'var(--color-text)',
                  fontSize: '1rem',
                  lineHeight: '1.6',
                  maxWidth: '420px',
                  margin: '0 auto 1.5rem'
                }}>
                  Your message has been received securely. Our team will review your inquiry and reply to{' '}
                  <strong style={{ color: 'var(--frutlle-dark-red)' }}>{lastSubmittedEmail || 'your email'}</strong> as soon as possible.
                </p>
                <button
                  type="button"
                  onClick={handleResetForm}
                  className="btn btn-outline"
                  style={{
                    borderColor: 'var(--frutlle-dark-red)',
                    color: 'var(--frutlle-dark-red)',
                    fontSize: '0.9rem',
                    padding: '0.6rem 1.5rem'
                  }}
                >
                  Send Another Message
                </button>
              </motion.div>
            ) : (
              <motion.form 
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onSubmit={handleSubmit} 
                style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}
              >
                {errorMessage && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '0.85rem 1rem',
                      backgroundColor: 'rgba(169, 27, 36, 0.08)',
                      border: '1px solid var(--frutlle-red)',
                      borderRadius: 'var(--radius-md)',
                      color: 'var(--frutlle-red)',
                      fontSize: '0.9rem'
                    }}
                  >
                    <AlertCircle size={20} style={{ flexShrink: 0 }} />
                    <span>{errorMessage}</span>
                  </motion.div>
                )}

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" htmlFor="contact-name">Name</label>
                  <input 
                    id="contact-name"
                    required 
                    type="text" 
                    name="name" 
                    disabled={loading}
                    value={formState.name} 
                    onChange={handleChange} 
                    className="form-input" 
                    placeholder="Your full name" 
                  />
                </div>
                
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" htmlFor="contact-email">Email</label>
                  <input 
                    id="contact-email"
                    required 
                    type="email" 
                    name="email" 
                    disabled={loading}
                    value={formState.email} 
                    onChange={handleChange} 
                    className="form-input" 
                    placeholder="you@example.com" 
                  />
                </div>
                
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" htmlFor="contact-subject">Subject</label>
                  <input 
                    id="contact-subject"
                    required 
                    type="text" 
                    name="subject" 
                    disabled={loading}
                    value={formState.subject} 
                    onChange={handleChange} 
                    className="form-input" 
                    placeholder="How can we help?" 
                  />
                </div>
                
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" htmlFor="contact-message">Message</label>
                  <textarea 
                    id="contact-message"
                    required 
                    name="message" 
                    disabled={loading}
                    value={formState.message} 
                    onChange={handleChange} 
                    className="form-input" 
                    placeholder="Write your message here..." 
                    rows="5" 
                    style={{ resize: 'vertical', fontFamily: 'var(--font-sans)' }}
                  />
                </div>

                <button 
                  type="submit" 
                  disabled={loading}
                  className="btn btn-primary" 
                  style={{ 
                    marginTop: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    opacity: loading ? 0.8 : 1,
                    cursor: loading ? 'not-allowed' : 'pointer'
                  }}
                >
                  {loading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      <span>Sending Message...</span>
                    </>
                  ) : (
                    'Send Message'
                  )}
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </motion.div>

      </div>
    </motion.div>
  );
};

export default Contact;
