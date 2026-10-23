import crypto from 'crypto';
import supabase from '../config/supabase.js';
import { FREE_SHIPPING_THRESHOLD, STANDARD_SHIPPING_FEE, TAX_RATE } from '../utils/currency.js';
import { getRazorpayInstance, getRazorpayKeyId, isRazorpayConfigured } from '../config/razorpay.js';

// @desc    Create new order
// @route   POST /api/orders
// @access  Private
const addOrderItems = async (req, res, next) => {
  try {
    const {
      orderItems,
      shippingAddress,
      paymentMethod,
      couponCode
    } = req.body;

    if (orderItems && orderItems.length === 0) {
      res.status(400);
      throw new Error('No order items');
    }

    const userId = req.user._id || req.user.id;

    // 1. Recalculate prices from DB
    const productIds = orderItems.map(item => item.product || item._id || item.id);
    const validUuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const hasInvalidId = productIds.some(id => !id || !validUuidRegex.test(id));
    if (hasInvalidId) {
      res.status(400);
      throw new Error('Invalid product ID format in order items');
    }

    const { data: dbProducts, error: prodError } = await supabase
      .from('products')
      .select('id, name, price, sale_price, count_in_stock')
      .in('id', productIds);

    if (prodError) throw prodError;

    let itemsPrice = 0;
    const itemsToInsert = [];

    for (const item of orderItems) {
      const dbProduct = dbProducts.find(p => p.id === (item.product || item._id));
      if (!dbProduct) {
        res.status(404);
        throw new Error(`Product ${item.name} not found in database`);
      }

      // Enforce Out of Stock validation
      const availableStock = Number(dbProduct.count_in_stock ?? 0);
      if (availableStock <= 0) {
        res.status(400);
        throw new Error(`Cannot place order: "${dbProduct.name || item.name}" is currently Out of Stock.`);
      }
      
      const priceToUse = (dbProduct.sale_price !== null && dbProduct.sale_price !== undefined) ? dbProduct.sale_price : dbProduct.price;
      itemsPrice += priceToUse * item.qty;
      
      itemsToInsert.push({
        product_id: dbProduct.id,
        name: item.name,
        qty: item.qty,
        image: item.image,
        price: priceToUse
      });
    }

    // 2. Initial order values
    let discountApplied = 0;
    const taxRate = TAX_RATE;
    
    // 3. Pre-validate coupon if provided
    let validCoupon = null;
    if (couponCode) {
      const { data: coupon, error: couponError } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', couponCode.toUpperCase())
        .eq('status', 'active')
        .single();
        
      if (couponError || !coupon) {
        res.status(400);
        throw new Error('Invalid or inactive coupon');
      }
      
      if (new Date(coupon.starts_at) > new Date()) { res.status(400); throw new Error('Coupon not yet active'); }
      if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) { res.status(400); throw new Error('Coupon expired'); }
      if (itemsPrice < (coupon.minimum_order_amount || 0)) { res.status(400); throw new Error('Minimum order amount not met'); }
      if (coupon.usage_limit && coupon.usage_count >= coupon.usage_limit) { res.status(400); throw new Error('Coupon usage limit reached'); }
      
      if (coupon.per_customer_limit) {
        const { count, error: countError } = await supabase
          .from('coupon_redemptions')
          .select('*', { count: 'exact', head: true })
          .eq('coupon_id', coupon.id)
          .eq('user_id', userId);
        if (!countError && count >= coupon.per_customer_limit) { res.status(400); throw new Error('Usage limit reached for your account'); }
      }
      
      validCoupon = coupon;
      
      if (coupon.discount_type === 'percentage') {
        discountApplied = itemsPrice * (coupon.discount_value / 100);
        if (coupon.maximum_discount_amount && discountApplied > coupon.maximum_discount_amount) {
          discountApplied = coupon.maximum_discount_amount;
        }
      } else {
        discountApplied = coupon.discount_value;
        if (discountApplied > itemsPrice) discountApplied = itemsPrice;
      }
    }

    const subtotalAfterDiscount = itemsPrice - discountApplied;
    const taxPrice = Number((subtotalAfterDiscount * taxRate).toFixed(2));
    const shippingPrice = subtotalAfterDiscount >= FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING_FEE;
    const totalPrice = Number((subtotalAfterDiscount + taxPrice + shippingPrice).toFixed(2));

    // 4. Create the order
    const { data: order, error: orderError } = await supabase.from('orders').insert([{
      user_id: userId,
      shipping_address: shippingAddress,
      payment_method: paymentMethod,
      items_price: itemsPrice,
      tax_price: taxPrice,
      shipping_price: shippingPrice,
      total_price: totalPrice,
      is_paid: false,
      is_delivered: false,
      status: 'Pending'
    }]).select().single();

    if (orderError) throw orderError;

    // 5. Insert items (adding order_id)
    itemsToInsert.forEach(i => i.order_id = order.id);
    const { error: itemsError } = await supabase.from('order_items').insert(itemsToInsert);
    if (itemsError) throw itemsError;

    // 6. Redeem coupon using atomic RPC
    if (validCoupon) {
      const { data: redemptionResult, error: rpcError } = await supabase.rpc('apply_coupon', {
        p_coupon_code: validCoupon.code,
        p_user_id: userId,
        p_order_id: order.id,
        p_subtotal: itemsPrice
      });
      
      if (rpcError || !redemptionResult.success) {
        // If it failed at the last millisecond (e.g., race condition), we should ideally rollback.
        // We'll mark the order as Cancelled to prevent fulfillment.
        await supabase.from('orders').update({ status: 'Cancelled' }).eq('id', order.id);
        res.status(400);
        throw new Error(rpcError ? rpcError.message : redemptionResult.message);
      }
    }

    // 7. If payment method is online, initialize Razorpay order with database-validated total
    let razorpayOrderData = null;
    if (paymentMethod === 'online') {
      try {
        const razorpay = getRazorpayInstance();
        const amountInPaise = Math.round(totalPrice * 100);

        const rzpOrder = await razorpay.orders.create({
          amount: amountInPaise,
          currency: 'INR',
          receipt: `rcpt_${order.id.replace(/-/g, '').slice(0, 20)}`,
          notes: {
            orderId: order.id,
            userId: String(userId)
          }
        });

        await supabase.from('orders').update({
          payment_result: {
            razorpay_order_id: rzpOrder.id,
            status: 'created',
            created_at: new Date().toISOString()
          }
        }).eq('id', order.id);

        razorpayOrderData = {
          id: rzpOrder.id,
          amount: rzpOrder.amount,
          currency: rzpOrder.currency,
          keyId: getRazorpayKeyId()
        };
      } catch (rzpErr) {
        console.error('[ORDER] Razorpay order creation failed:', rzpErr.message);
        res.status(rzpErr.statusCode || 500);
        throw new Error(rzpErr.message || 'Failed to initialize online payment gateway.');
      }
    }

    // 8. Clear the user's persistent database cart (for COD immediately; for online, also cleared upon payment verification)
    if (paymentMethod === 'cod') {
      try {
        await supabase
          .from('user_carts')
          .upsert(
            { user_id: userId, items: [], updated_at: new Date().toISOString() },
            { onConflict: 'user_id' }
          );
      } catch (cartCleanupErr) {
        console.warn('[ORDER] Could not clear user_carts after order placement:', cartCleanupErr.message);
      }
    }

    res.status(201).json({
      ...order,
      _id: order.id,
      razorpayOrder: razorpayOrderData
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all orders
// @route   GET /api/orders
// @access  Private/Admin
const getOrders = async (req, res, next) => {
  try {
    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        *,
        user:users ( id, name, email ),
        order_items (*)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Map for frontend compatibility
    const formattedOrders = orders.map(order => ({
      ...order,
      _id: order.id,
      user: order.user ? { ...order.user, _id: order.user.id } : null
    }));

    res.json(formattedOrders);
  } catch (error) {
    next(error);
  }
};

// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Private
const getOrderById = async (req, res, next) => {
  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(req.params.id);
    if (!isUuid) {
      res.status(404);
      throw new Error('Order not found');
    }

    const { data: order, error } = await supabase
      .from('orders')
      .select(`
        *,
        user:users ( id, name, email ),
        order_items (*)
      `)
      .eq('id', req.params.id)
      .single();

    if (error || !order) {
      res.status(404);
      throw new Error('Order not found');
    }

    // Ensure only the order owner or admin can view
    const userId = req.user._id || req.user.id;
    if (req.user.role !== 'admin' && order.user_id !== userId) {
      res.status(403);
      throw new Error('Not authorized to view this order');
    }

    res.json({
      ...order,
      _id: order.id,
      user: order.user ? { ...order.user, _id: order.user.id } : null
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update order status
// @route   PUT /api/orders/:id/status
// @access  Private/Admin
const updateOrderStatus = async (req, res, next) => {
  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(req.params.id);
    if (!isUuid) {
      res.status(404);
      throw new Error('Order not found');
    }

    const { status } = req.body;
    const validStatuses = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];

    if (!status || !validStatuses.includes(status)) {
      res.status(400);
      throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }

    const updates = {
      status,
      updated_at: new Date().toISOString()
    };

    if (status === 'Delivered') {
      updates.is_delivered = true;
      updates.delivered_at = new Date().toISOString();
    }

    const { data: updatedOrder, error } = await supabase
      .from('orders')
      .update(updates)
      .eq('id', req.params.id)
      .select(`
        *,
        user:users ( id, name, email ),
        order_items (*)
      `)
      .single();

    if (error || !updatedOrder) {
      res.status(404);
      throw new Error('Order not found or update failed');
    }

    res.json({
      ...updatedOrder,
      _id: updatedOrder.id,
      user: updatedOrder.user ? { ...updatedOrder.user, _id: updatedOrder.user.id } : null
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get logged in user orders
// @route   GET /api/orders/myorders
// @access  Private
const getMyOrders = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const formattedOrders = orders.map((order) => ({
      ...order,
      _id: order.id
    }));

    res.json(formattedOrders);
  } catch (error) {
    next(error);
  }
};

// @desc    Create Razorpay order for an existing unpaid order
// @route   POST /api/orders/:id/create-razorpay-order
// @access  Private
const createRazorpayOrder = async (req, res, next) => {
  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(req.params.id);
    if (!isUuid) {
      res.status(404);
      throw new Error('Order not found');
    }

    const { data: order, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error || !order) {
      res.status(404);
      throw new Error('Order not found');
    }

    const userId = req.user._id || req.user.id;
    if (req.user.role !== 'admin' && order.user_id !== userId) {
      res.status(403);
      throw new Error('Not authorized to access this order');
    }

    if (order.is_paid) {
      res.status(400);
      throw new Error('This order has already been paid.');
    }

    if (order.status === 'Cancelled') {
      res.status(400);
      throw new Error('Cannot process payment for a cancelled order.');
    }

    const razorpay = getRazorpayInstance();
    const amountInPaise = Math.round(Number(order.total_price) * 100);

    const rzpOrder = await razorpay.orders.create({
      amount: amountInPaise,
      currency: 'INR',
      receipt: `rcpt_${order.id.replace(/-/g, '').slice(0, 20)}`,
      notes: {
        orderId: order.id,
        userId: String(userId)
      }
    });

    await supabase
      .from('orders')
      .update({
        payment_result: {
          ...(order.payment_result || {}),
          razorpay_order_id: rzpOrder.id,
          status: 'created',
          updated_at: new Date().toISOString()
        }
      })
      .eq('id', order.id);

    res.json({
      razorpayOrder: {
        id: rzpOrder.id,
        amount: rzpOrder.amount,
        currency: rzpOrder.currency,
        keyId: getRazorpayKeyId()
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify Razorpay payment signature and mark order paid
// @route   POST /api/orders/:id/verify-payment
// @access  Private
const verifyRazorpayPayment = async (req, res, next) => {
  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(req.params.id);
    if (!isUuid) {
      res.status(404);
      throw new Error('Order not found');
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      res.status(400);
      throw new Error('Payment verification requires razorpay_order_id, razorpay_payment_id, and razorpay_signature');
    }

    const { data: order, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error || !order) {
      res.status(404);
      throw new Error('Order not found');
    }

    const userId = req.user._id || req.user.id;
    if (req.user.role !== 'admin' && order.user_id !== userId) {
      res.status(403);
      throw new Error('Not authorized to modify this order');
    }

    // Idempotency: Prevent duplicate processing if order is already paid
    if (order.is_paid) {
      return res.json({
        success: true,
        message: 'Order is already marked as paid.',
        order: { ...order, _id: order.id }
      });
    }

    // Cryptographic signature check with constant-time equality
    const secret = (process.env.RAZORPAY_KEY_SECRET || '').trim();
    if (!secret) {
      res.status(500);
      throw new Error('Server payment secret configuration missing.');
    }

    const generatedSignature = crypto
      .createHmac('sha256', secret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    let isSignatureValid = false;
    try {
      isSignatureValid = crypto.timingSafeEqual(
        Buffer.from(generatedSignature, 'utf-8'),
        Buffer.from(razorpay_signature, 'utf-8')
      );
    } catch {
      isSignatureValid = false;
    }

    if (!isSignatureValid) {
      res.status(400);
      throw new Error('Invalid payment signature verification failed.');
    }

    // Fetch and verify payment entity directly from Razorpay
    const razorpay = getRazorpayInstance();
    const payment = await razorpay.payments.fetch(razorpay_payment_id);

    if (!payment) {
      res.status(404);
      throw new Error('Payment details could not be retrieved from Razorpay.');
    }

    if (payment.order_id !== razorpay_order_id) {
      res.status(400);
      throw new Error('Payment does not match the Razorpay order ID.');
    }

    const expectedAmountInPaise = Math.round(Number(order.total_price) * 100);
    if (Number(payment.amount) !== expectedAmountInPaise) {
      res.status(400);
      throw new Error(`Payment amount mismatch: expected ${expectedAmountInPaise} paise, received ${payment.amount} paise.`);
    }

    if (payment.currency !== 'INR') {
      res.status(400);
      throw new Error(`Payment currency mismatch: expected INR, received ${payment.currency}.`);
    }

    const validStatuses = ['captured', 'authorized'];
    if (!validStatuses.includes(payment.status)) {
      res.status(400);
      throw new Error(`Payment is in an invalid status: ${payment.status}`);
    }

    const paymentResult = {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      status: payment.status,
      method: payment.method,
      email: payment.email || null,
      contact: payment.contact || null,
      verified_at: new Date().toISOString()
    };

    const { data: updatedOrder, error: updateError } = await supabase
      .from('orders')
      .update({
        is_paid: true,
        paid_at: new Date().toISOString(),
        status: 'Processing',
        payment_result: paymentResult,
        updated_at: new Date().toISOString()
      })
      .eq('id', order.id)
      .select(`
        *,
        user:users ( id, name, email ),
        order_items (*)
      `)
      .single();

    if (updateError) throw updateError;

    // Clear persistent cart in database upon successful payment verification
    try {
      await supabase
        .from('user_carts')
        .upsert(
          { user_id: userId, items: [], updated_at: new Date().toISOString() },
          { onConflict: 'user_id' }
        );
    } catch (cartCleanupErr) {
      console.warn('[ORDER] Could not clear user_carts after online payment verification:', cartCleanupErr.message);
    }

    res.json({
      success: true,
      message: 'Payment verified successfully',
      order: {
        ...updatedOrder,
        _id: updatedOrder.id
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Handle Razorpay Webhooks (signature verified and idempotent)
// @route   POST /api/orders/webhook
// @access  Public (Signature Verified)
const razorpayWebhook = async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const webhookSecret = (process.env.RAZORPAY_WEBHOOK_SECRET || '').trim();

    if (!webhookSecret) {
      console.warn('[WEBHOOK] RAZORPAY_WEBHOOK_SECRET is not configured on the server.');
      return res.status(500).json({ error: 'Webhook secret not configured on server' });
    }

    if (!signature || !req.rawBody) {
      return res.status(400).json({ error: 'Missing webhook signature or raw payload' });
    }

    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(req.rawBody)
      .digest('hex');

    let isSignatureValid = false;
    try {
      isSignatureValid = crypto.timingSafeEqual(
        Buffer.from(expectedSignature, 'utf-8'),
        Buffer.from(signature, 'utf-8')
      );
    } catch {
      isSignatureValid = false;
    }

    if (!isSignatureValid) {
      console.error('[WEBHOOK] Invalid Razorpay webhook signature');
      return res.status(400).json({ error: 'Invalid webhook signature' });
    }

    const event = req.body?.event;
    console.log(`[WEBHOOK] Received valid Razorpay webhook event: "${event}"`);

    if (event === 'payment.captured' || event === 'order.paid') {
      const payment = req.body?.payload?.payment?.entity;
      const rzpOrderId = payment?.order_id || req.body?.payload?.order?.entity?.id;
      const dbOrderId = payment?.notes?.orderId || req.body?.payload?.order?.entity?.notes?.orderId;

      let order = null;
      if (dbOrderId) {
        const { data } = await supabase.from('orders').select('*').eq('id', dbOrderId).maybeSingle();
        order = data;
      }
      if (!order && rzpOrderId) {
        const { data } = await supabase.from('orders').select('*').eq('payment_result->>razorpay_order_id', rzpOrderId).maybeSingle();
        order = data;
      }

      if (!order) {
        console.warn(`[WEBHOOK] No matching order found for rzpOrderId: ${rzpOrderId}, dbOrderId: ${dbOrderId}`);
        return res.status(200).json({ status: 'ignored', message: 'Order not found' });
      }

      // Idempotency: Already paid check
      if (order.is_paid) {
        console.log(`[WEBHOOK] Order ${order.id} is already marked as paid. Skipping duplicate processing.`);
        return res.status(200).json({ status: 'ok', message: 'Order already marked as paid' });
      }

      // Amount verification if payment entity is provided
      if (payment) {
        const expectedAmountInPaise = Math.round(Number(order.total_price) * 100);
        if (Number(payment.amount) !== expectedAmountInPaise) {
          console.error(`[WEBHOOK] Amount mismatch on order ${order.id}: expected ${expectedAmountInPaise}, received ${payment.amount}`);
          return res.status(400).json({ error: 'Amount mismatch' });
        }
      }

      const updatedPaymentResult = {
        ...(order.payment_result || {}),
        razorpay_order_id: rzpOrderId || order.payment_result?.razorpay_order_id,
        razorpay_payment_id: payment?.id || order.payment_result?.razorpay_payment_id,
        status: payment?.status || 'captured',
        method: payment?.method || order.payment_result?.method,
        webhook_processed_at: new Date().toISOString()
      };

      await supabase.from('orders').update({
        is_paid: true,
        paid_at: new Date(payment?.created_at ? payment.created_at * 1000 : Date.now()).toISOString(),
        status: 'Processing',
        payment_result: updatedPaymentResult,
        updated_at: new Date().toISOString()
      }).eq('id', order.id);

      // Clean persistent cart in DB if user is known
      if (order.user_id) {
        try {
          await supabase
            .from('user_carts')
            .upsert(
              { user_id: order.user_id, items: [], updated_at: new Date().toISOString() },
              { onConflict: 'user_id' }
            );
        } catch (cartCleanupErr) {
          console.warn('[WEBHOOK] Could not clear user_carts after webhook processing:', cartCleanupErr.message);
        }
      }

      console.log(`[WEBHOOK] Order ${order.id} marked as paid via webhook.`);
      return res.status(200).json({ status: 'ok', message: 'Order updated successfully' });
    }

    if (event === 'payment.failed') {
      const payment = req.body?.payload?.payment?.entity;
      const dbOrderId = payment?.notes?.orderId;
      console.log(`[WEBHOOK] Payment failed for order ${dbOrderId || 'unknown'}: ${payment?.error_description || 'Unknown error'}`);
      return res.status(200).json({ status: 'ok', message: 'Failure acknowledged' });
    }

    return res.status(200).json({ status: 'ok', message: `Event ${event} acknowledged` });
  } catch (err) {
    console.error('[WEBHOOK ERROR]', err);
    return res.status(500).json({ error: 'Webhook processing error' });
  }
};

// @desc    Get Razorpay public Key ID
// @route   GET /api/orders/razorpay/key
// @access  Public
const getRazorpayKey = (_req, res) => {
  res.json({
    keyId: getRazorpayKeyId(),
    isConfigured: isRazorpayConfigured()
  });
};

export {
  addOrderItems,
  getOrders,
  getOrderById,
  updateOrderStatus,
  getMyOrders,
  createRazorpayOrder,
  verifyRazorpayPayment,
  razorpayWebhook,
  getRazorpayKey
};

