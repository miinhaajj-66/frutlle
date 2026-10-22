import express from 'express';
import {
  loginUser,
  registerUser,
  logoutUser,
  getUserProfile,
  googleAuth,
  resetUserPassword,
} from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/google', googleAuth);
router.post('/reset-password', resetUserPassword);
router.post('/logout', logoutUser);
router.route('/profile').get(protect, getUserProfile);

export default router;
