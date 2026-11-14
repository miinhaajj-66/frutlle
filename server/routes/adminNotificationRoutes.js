import express from 'express';
import {
  getAdminNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  notificationStream
} from '../controllers/adminNotificationController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Real-time Server-Sent Events stream (Admin only)
router.get('/stream', protect, admin, notificationStream);

// Notification collection and counts (Admin only)
router.get('/', protect, admin, getAdminNotifications);
router.get('/unread-count', protect, admin, getUnreadNotificationCount);

// Notification acknowledgement actions (Admin only)
router.put('/mark-all-read', protect, admin, markAllNotificationsAsRead);
router.put('/:id/read', protect, admin, markNotificationAsRead);

export default router;
