import supabase from '../config/supabase.js';

// Resilient server-side memory store keyed strictly by verified user ID
// Operates as a seamless fallback whenever public.user_carts table migration is pending in Supabase
const fallbackUserCarts = new Map();

// Helper to sanitize incoming cart items
const sanitizeCartItems = (items) => {
  if (!Array.isArray(items)) return [];
  return items.map((item) => {
    const id = item.id || item._id;
    const quantity = Math.max(1, parseInt(item.quantity, 10) || 1);
    const price = typeof item.price === 'number' ? item.price : parseFloat(item.price) || 0;
    const salePrice = item.salePrice !== undefined && item.salePrice !== null 
      ? (typeof item.salePrice === 'number' ? item.salePrice : parseFloat(item.salePrice) || null)
      : null;

    return {
      id: String(id),
      _id: String(id),
      name: String(item.name || 'Unnamed Product'),
      image: String(item.image || '/Frutlle%20Logo.png'),
      price,
      salePrice,
      quantity,
      countInStock: (item.countInStock !== undefined && item.countInStock !== null)
        ? (Number(item.countInStock) <= 0 ? 0 : Number(item.countInStock))
        : (item.count_in_stock !== undefined && item.count_in_stock !== null)
          ? (Number(item.count_in_stock) <= 0 ? 0 : Number(item.count_in_stock))
          : 100,
      category: item.category ? String(item.category) : undefined,
      weight: item.weight ? String(item.weight) : undefined
    };
  });
};

// @desc    Get user's persistent cart
// @route   GET /api/cart
// @access  Private
const getCart = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    if (!userId) {
      res.status(401);
      throw new Error('Not authorized');
    }

    const { data, error } = await supabase
      .from('user_carts')
      .select('items')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      // If table has not yet been migrated in Supabase, return from server user-isolated memory store
      if (error.code === 'PGRST205' || error.message?.includes('does not exist')) {
        const fallbackItems = fallbackUserCarts.get(userId) || [];
        return res.json({ items: fallbackItems });
      }
      throw error;
    }

    const items = data?.items || fallbackUserCarts.get(userId) || [];
    res.json({
      items
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update/Save user's persistent cart
// @route   PUT /api/cart
// @access  Private
const updateCart = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    if (!userId) {
      res.status(401);
      throw new Error('Not authorized');
    }

    const { items } = req.body;
    if (!Array.isArray(items)) {
      res.status(400);
      throw new Error('Cart items must be an array');
    }

    const sanitizedItems = sanitizeCartItems(items);

    // Keep server memory store updated for immediate resilience
    fallbackUserCarts.set(userId, sanitizedItems);

    const { error } = await supabase
      .from('user_carts')
      .upsert(
        {
          user_id: userId,
          items: sanitizedItems,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'user_id' }
      );

    if (error) {
      if (error.code === 'PGRST205' || error.message?.includes('does not exist')) {
        // Table migration pending in Supabase; return memory fallback
        return res.json({ items: sanitizedItems });
      }
      throw error;
    }

    res.json({
      items: sanitizedItems
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Clear user's persistent cart
// @route   DELETE /api/cart
// @access  Private
const clearCart = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    if (!userId) {
      res.status(401);
      throw new Error('Not authorized');
    }

    fallbackUserCarts.set(userId, []);

    const { error } = await supabase
      .from('user_carts')
      .upsert(
        {
          user_id: userId,
          items: [],
          updated_at: new Date().toISOString()
        },
        { onConflict: 'user_id' }
      );

    if (error) {
      if (error.code === 'PGRST205' || error.message?.includes('does not exist')) {
        return res.json({ message: 'Cart cleared', items: [] });
      }
      throw error;
    }

    res.json({ message: 'Cart cleared successfully', items: [] });
  } catch (error) {
    next(error);
  }
};

export { getCart, updateCart, clearCart };
