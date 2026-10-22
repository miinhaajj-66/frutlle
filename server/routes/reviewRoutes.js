import express from 'express';
import { 
  getReviews, 
  getAdminReviews, 
  addReview, 
  markReviewHelpful,
  adminUpdateReview, 
  adminDeleteReview,
  updateReview,
  deleteReview
} from '../controllers/reviewController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
  .get(getReviews)
  .post(protect, addReview);

router.route('/admin')
  .get(protect, admin, getAdminReviews);

router.route('/admin/:id')
  .put(protect, admin, adminUpdateReview)
  .delete(protect, admin, adminDeleteReview);

router.route('/:id/helpful')
  .put(markReviewHelpful);

router.route('/:id')
  .put(protect, updateReview)
  .delete(protect, deleteReview);

export default router;
