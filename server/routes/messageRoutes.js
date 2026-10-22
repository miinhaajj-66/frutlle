import express from 'express';
import {
  submitContactMessage,
  getContactMessages,
  getUnreadCount,
  getContactMessageById,
  updateMessageReadStatus,
  deleteContactMessage
} from '../controllers/messageController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public route to submit a contact message
router.post('/', submitContactMessage);

// Protected admin routes
router.get('/', protect, admin, getContactMessages);
router.get('/unread-count', protect, admin, getUnreadCount);
router.get('/:id', protect, admin, getContactMessageById);
router.put('/:id/read', protect, admin, updateMessageReadStatus);
router.delete('/:id', protect, admin, deleteContactMessage);

export default router;
