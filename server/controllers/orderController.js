import supabase from '../config/supabase.js';
import { FREE_SHIPPING_THRESHOLD, STANDARD_SHIPPING_FEE, TAX_RATE } from '../utils/currency.js';

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

    // 7. Clear the user's persistent database cart now that the order is placed
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

    res.status(201).json({
      ...order,
      _id: order.id
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

export { addOrderItems, getOrders, getOrderById, updateOrderStatus, getMyOrders };

