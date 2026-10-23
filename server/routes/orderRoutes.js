import express from 'express';
import {
  addOrderItems,
  getOrders,
  getOrderById,
  updateOrderStatus,
  getMyOrders,
  createRazorpayOrder,
  verifyRazorpayPayment,
  razorpayWebhook,
  getRazorpayKey
} from '../controllers/orderController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Specific routes must come before parameterized routes (:id)
router.route('/razorpay/key').get(getRazorpayKey);
router.route('/webhook').post(razorpayWebhook);

router.route('/').post(protect, addOrderItems).get(protect, admin, getOrders);
router.route('/myorders').get(protect, getMyOrders);

router.route('/:id').get(protect, getOrderById);
router.route('/:id/status').put(protect, admin, updateOrderStatus);
router.route('/:id/create-razorpay-order').post(protect, createRazorpayOrder);
router.route('/:id/verify-payment').post(protect, verifyRazorpayPayment);

export default router;
