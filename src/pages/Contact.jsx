import { motion } from 'framer-motion';
import { Mail, Phone, MapPin, Clock } from 'lucide-react';
import { useState } from 'react';

const Contact = () => {
  const [formState, setFormState] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => {
    setFormState({ ...formState, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
    // In a real app, you would handle API submission here
    setTimeout(() => {
      setSubmitted(false);
      setFormState({ name: '', email: '', subject: '', message: '' });
    }, 4000);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="container section"
    >
      <div className="text-center" style={{ marginBottom: 'var(--space-4xl)' }}>
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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--space-4xl)' }}>
        
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
          
          {submitted ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{ padding: '2rem', textAlign: 'center', backgroundColor: 'var(--color-secondary)', borderRadius: 'var(--radius-md)', color: 'var(--color-primary-dark)' }}
            >
              <h3 style={{ marginBottom: '0.5rem' }}>Thank You!</h3>
              <p>Your message has been received. We'll get back to you shortly.</p>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Name</label>
                <input required type="text" name="name" value={formState.name} onChange={handleChange} className="form-input" placeholder="Your full name" />
              </div>
              
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Email</label>
                <input required type="email" name="email" value={formState.email} onChange={handleChange} className="form-input" placeholder="you@example.com" />
              </div>
              
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Subject</label>
                <input required type="text" name="subject" value={formState.subject} onChange={handleChange} className="form-input" placeholder="How can we help?" />
              </div>
              
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Message</label>
                <textarea required name="message" value={formState.message} onChange={handleChange} className="form-input" placeholder="Write your message here..." rows="5" style={{ resize: 'vertical', fontFamily: 'var(--font-sans)' }}></textarea>
              </div>

              <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem' }}>
                Send Message
              </button>
            </form>
          )}
        </motion.div>

      </div>
    </motion.div>
  );
};

export default Contact;
