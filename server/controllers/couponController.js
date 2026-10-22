import supabase from '../config/supabase.js';
import { formatCurrency } from '../utils/currency.js';

// @desc    Create a new coupon
// @route   POST /api/coupons
// @access  Private/Admin
const createCoupon = async (req, res, next) => {
  try {
    const {
      code,
      name,
      description,
      discount_type,
      discount_value,
      minimum_order_amount,
      maximum_discount_amount,
      starts_at,
      expires_at,
      usage_limit,
      per_customer_limit,
      status
    } = req.body;

    const uppercaseCode = code.toUpperCase();

    // Check for existing code
    const { data: existing, error: checkError } = await supabase
      .from('coupons')
      .select('id')
      .eq('code', uppercaseCode)
      .single();

    if (existing) {
      res.status(400);
      throw new Error('Coupon code already exists');
    }

    const { data: coupon, error } = await supabase
      .from('coupons')
      .insert([{
        code: uppercaseCode,
        name,
        description,
        discount_type,
        discount_value,
        minimum_order_amount: minimum_order_amount || 0,
        maximum_discount_amount,
        starts_at: starts_at || new Date().toISOString(),
        expires_at,
        usage_limit,
        per_customer_limit: per_customer_limit || 1,
        status: status || 'active'
      }])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(coupon);
  } catch (error) {
    next(error);
  }
};

// @desc    Get all coupons
// @route   GET /api/coupons
// @access  Private/Admin
const getCoupons = async (req, res, next) => {
  try {
    const { data: coupons, error } = await supabase
      .from('coupons')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(coupons);
  } catch (error) {
    next(error);
  }
};

// @desc    Get coupon by ID
// @route   GET /api/coupons/:id
// @access  Private/Admin
const getCouponById = async (req, res, next) => {
  try {
    const { data: coupon, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) throw error;
    if (!coupon) {
      res.status(404);
      throw new Error('Coupon not found');
    }

    res.json(coupon);
  } catch (error) {
    next(error);
  }
};

// @desc    Update coupon
// @route   PUT /api/coupons/:id
// @access  Private/Admin
const updateCoupon = async (req, res, next) => {
  try {
    const {
      name,
      description,
      discount_type,
      discount_value,
      minimum_order_amount,
      maximum_discount_amount,
      starts_at,
      expires_at,
      usage_limit,
      per_customer_limit,
      status
    } = req.body;

    const { data: coupon, error } = await supabase
      .from('coupons')
      .update({
        name,
        description,
        discount_type,
        discount_value,
        minimum_order_amount,
        maximum_discount_amount,
        starts_at,
        expires_at,
        usage_limit,
        per_customer_limit,
        status
      })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json(coupon);
  } catch (error) {
    next(error);
  }
};

// @desc    Delete coupon
// @route   DELETE /api/coupons/:id
// @access  Private/Admin
const deleteCoupon = async (req, res, next) => {
  try {
    const { error } = await supabase
      .from('coupons')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ message: 'Coupon removed' });
  } catch (error) {
    next(error);
  }
};

// @desc    Validate a coupon during checkout
// @route   POST /api/coupons/validate
// @access  Private
const validateCoupon = async (req, res, next) => {
  try {
    const { code, subtotal } = req.body;
    const userId = req.user._id || req.user.id;

    if (!code) {
      res.status(400);
      throw new Error('Coupon code is required');
    }

    const { data: coupon, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', code.toUpperCase())
      .eq('status', 'active')
      .single();

    if (error || !coupon) {
      res.status(404);
      throw new Error('Invalid or inactive coupon');
    }

    // Validations
    if (new Date(coupon.starts_at) > new Date()) {
      res.status(400);
      throw new Error('Coupon is not active yet');
    }

    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
      res.status(400);
      throw new Error('Coupon has expired');
    }

    if (subtotal < (coupon.minimum_order_amount || 0)) {
      res.status(400);
      throw new Error(`Minimum order amount of ${formatCurrency(coupon.minimum_order_amount)} not met`);
    }

    if (coupon.usage_limit && coupon.usage_count >= coupon.usage_limit) {
      res.status(400);
      throw new Error('Coupon usage limit reached');
    }

    // Check per customer limit
    if (coupon.per_customer_limit) {
      const { count, error: countError } = await supabase
        .from('coupon_redemptions')
        .select('*', { count: 'exact', head: true })
        .eq('coupon_id', coupon.id)
        .eq('user_id', userId);
      
      if (!countError && count >= coupon.per_customer_limit) {
        res.status(400);
        throw new Error('You have reached the usage limit for this coupon');
      }
    }

    // Calculate discount
    let discount = 0;
    if (coupon.discount_type === 'percentage') {
      discount = subtotal * (coupon.discount_value / 100);
      if (coupon.maximum_discount_amount && discount > coupon.maximum_discount_amount) {
        discount = coupon.maximum_discount_amount;
      }
    } else {
      discount = coupon.discount_value;
      if (discount > subtotal) discount = subtotal;
    }

    res.json({
      success: true,
      coupon_id: coupon.id,
      code: coupon.code,
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value,
      discount_applied: discount
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get coupon stats
// @route   GET /api/coupons/stats
// @access  Private/Admin
const getCouponStats = async (req, res, next) => {
  try {
    const { count: totalCoupons } = await supabase.from('coupons').select('*', { count: 'exact', head: true });
    const { count: activeCoupons } = await supabase.from('coupons').select('*', { count: 'exact', head: true }).eq('status', 'active');
    
    // For redemptions and discounts, we aggregate
    const { data: redemptions } = await supabase.from('coupon_redemptions').select('discount_applied');
    
    let totalDiscountGiven = 0;
    let successfulRedemptions = 0;
    
    if (redemptions && redemptions.length > 0) {
      successfulRedemptions = redemptions.length;
      totalDiscountGiven = redemptions.reduce((acc, curr) => acc + (curr.discount_applied || 0), 0);
    }
    
    res.json({
      totalCoupons: totalCoupons || 0,
      activeCoupons: activeCoupons || 0,
      successfulRedemptions,
      totalDiscountGiven
    });
  } catch (error) {
    next(error);
  }
};

export {
  createCoupon,
  getCoupons,
  getCouponById,
  updateCoupon,
  deleteCoupon,
  validateCoupon,
  getCouponStats
};
