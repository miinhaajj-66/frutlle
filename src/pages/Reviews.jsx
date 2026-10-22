import { motion } from 'framer-motion';
import ReviewsSection from '../components/Reviews/ReviewsSection';

const Reviews = () => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="container section"
    >
      <div style={{ textAlign: 'center', marginBottom: 'var(--space-2xl)' }}>
        <h1 className="heading-lg" style={{ color: 'var(--color-primary)' }}>Customer Reviews</h1>
        <p style={{ color: 'var(--color-text)', maxWidth: '600px', margin: '0 auto', fontSize: '1.1rem' }}>
          Discover what our community is saying about Frutlle's products and shopping experience.
        </p>
      </div>

      <ReviewsSection />
    </motion.div>
  );
};

export default Reviews;
