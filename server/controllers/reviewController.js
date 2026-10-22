import supabase from '../config/supabase.js';

// @desc    Get all approved reviews (optionally filtered by product)
// @route   GET /api/reviews
// @access  Public
const getReviews = async (req, res, next) => {
  try {
    const { productId, page = 1, limit = 10 } = req.query;
    
    // Calculate pagination range
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from('reviews')
      .select('*, user:users (name)', { count: 'exact' })
      .eq('status', 'Approved')
      .order('created_at', { ascending: false })
      .range(from, to);

    if (productId) {
      query = query.or(`product_id.eq.${productId},type.eq.service`);
    }

    const { data: reviews, error, count } = await query;

    if (error) {
      if (error.code === '42P01') return res.json({ reviews: [], page, pages: 0, total: 0 }); 
      throw error;
    }

    const formattedReviews = reviews.map(r => ({
      _id: r.id,
      type: r.type,
      rating: r.rating,
      serviceRatings: r.service_ratings,
      title: r.title,
      comment: r.comment,
      name: r.user ? r.user.name : 'Anonymous User',
      avatar: r.user?.avatar_url || null,
      user: r.user_id,
      productId: r.product_id,
      images: r.images || [],
      isVerified: r.is_verified,
      helpfulCount: r.helpful_count || 0,
      isEdited: r.is_edited || false,
      editedByAdmin: r.edited_by_admin || false,
      createdAt: r.created_at
    }));

    res.json({
      reviews: formattedReviews,
      page: Number(page),
      pages: Math.ceil((count || 0) / limit),
      total: count || 0
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all reviews (admin)
// @route   GET /api/reviews/admin
// @access  Private/Admin
const getAdminReviews = async (req, res, next) => {
  try {
    const { data: reviews, error } = await supabase
      .from('reviews')
      .select('*, user:users (name, email)')
      .order('created_at', { ascending: false });

    if (error) {
      if (error.code === '42P01') return res.json([]); 
      throw error;
    }

    res.json(reviews.map(r => ({
      ...r,
      _id: r.id,
      customerName: r.user ? r.user.name : 'Unknown',
      customerEmail: r.user ? r.user.email : 'Unknown',
      productName: r.product_id ? `Product ${r.product_id}` : 'N/A'
    })));
  } catch (error) {
    next(error);
  }
};

// @desc    Create new review
// @route   POST /api/reviews
// @access  Private
const addReview = async (req, res, next) => {
  try {
    const { type, productId, rating, serviceRatings, title, comment, images } = req.body;
    const userId = req.user._id;

    // Check if verified purchase
    let isVerified = false;
    let orderId = null;

    if (type === 'product' && productId) {
      const { data: ordersData } = await supabase
        .from('orders')
        .select('id, order_items!inner(product_id)')
        .eq('user_id', userId)
        .eq('order_items.product_id', productId);
      
      if (ordersData && ordersData.length > 0) {
        isVerified = true;
        orderId = ordersData[0].id;
      }
    } else if (type === 'service') {
      const { data: userOrders } = await supabase
        .from('orders')
        .select('id')
        .eq('user_id', userId)
        .limit(1);
      
      if (userOrders && userOrders.length > 0) {
        isVerified = true;
        orderId = userOrders[0].id;
      }
    }

    // Check for duplicate product review
    if (type === 'product') {
      const { data: existingReview } = await supabase
        .from('reviews')
        .select('id')
        .eq('product_id', productId)
        .eq('user_id', userId)
        .maybeSingle();

      if (existingReview) {
        res.status(400);
        throw new Error('You have already reviewed this product');
      }
    } else if (type === 'service') {
      const { data: existingServiceReview } = await supabase
        .from('reviews')
        .select('id')
        .eq('type', 'service')
        .eq('user_id', userId)
        .maybeSingle();

      if (existingServiceReview) {
        res.status(400);
        throw new Error('You have already submitted a service review');
      }
    }

    const newReview = {
      user_id: userId,
      product_id: type === 'product' ? productId : null,
      order_id: orderId,
      type: type,
      rating: Number(rating),
      service_ratings: serviceRatings || null,
      title: title || '',
      comment: comment,
      images: images || [],
      is_verified: isVerified,
      helpful_count: 0,
      status: 'Approved' // Auto-approve to make it instantly visible publicly
    };

    const { data: createdReview, error: insertError } = await supabase
      .from('reviews')
      .insert([newReview])
      .select()
      .single();

    if (insertError) throw insertError;

    res.status(201).json({ ...createdReview, _id: createdReview.id });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark review as helpful
// @route   PUT /api/reviews/:id/helpful
// @access  Public
const markReviewHelpful = async (req, res, next) => {
  try {
    // Ideally we track which users voted to prevent spam, but skipping for simplicity
    const { data: review } = await supabase.from('reviews').select('helpful_count').eq('id', req.params.id).single();
    if (!review) {
      res.status(404);
      throw new Error('Review not found');
    }

    const { data: updated, error } = await supabase
      .from('reviews')
      .update({ helpful_count: (review.helpful_count || 0) + 1 })
      .eq('id', req.params.id)
      .select()
      .single();
      
    if (error) throw error;
    res.json({ message: 'Marked as helpful', helpfulCount: updated.helpful_count });
  } catch (error) {
    next(error);
  }
};

// @desc    Update review (User)
// @route   PUT /api/reviews/:id
// @access  Private
const updateReview = async (req, res, next) => {
  try {
    const { rating, title, comment } = req.body;
    
    // Verify ownership
    const { data: existingReview, error: fetchErr } = await supabase
      .from('reviews')
      .select('user_id')
      .eq('id', req.params.id)
      .single();
      
    if (fetchErr || !existingReview) {
      res.status(404);
      throw new Error('Review not found');
    }
    
    if (existingReview.user_id !== req.user._id) {
      res.status(403);
      throw new Error('You do not have permission to edit this review');
    }

    // Since we can't be sure if is_edited exists in the DB, we try without it first, or just rely on title/comment
    const { data: updated, error } = await supabase
      .from('reviews')
      .update({ rating: Number(rating), title, comment })
      .eq('id', req.params.id)
      .select()
      .single();
      
    if (error) throw error;
    res.json({ ...updated, _id: updated.id });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete review (User)
// @route   DELETE /api/reviews/:id
// @access  Private
const deleteReview = async (req, res, next) => {
  try {
    // Verify ownership
    const { data: existingReview, error: fetchErr } = await supabase
      .from('reviews')
      .select('user_id')
      .eq('id', req.params.id)
      .single();
      
    if (fetchErr || !existingReview) {
      res.status(404);
      throw new Error('Review not found');
    }
    
    if (existingReview.user_id !== req.user._id) {
      res.status(403);
      throw new Error('You do not have permission to delete this review');
    }

    await supabase.from('reviews').update({ status: 'Deleted by User' }).eq('id', req.params.id);
    res.json({ message: 'Review successfully removed from public view' });
  } catch (error) {
    next(error);
  }
};

// @desc    Update review status or content (admin)
// @route   PUT /api/reviews/admin/:id
// @access  Private/Admin
const adminUpdateReview = async (req, res, next) => {
  try {
    const { status, title, comment, rating } = req.body;
    
    const updates = {};
    if (status) updates.status = status;
    if (title !== undefined) updates.title = title;
    if (comment !== undefined) updates.comment = comment;
    if (rating !== undefined) updates.rating = rating;
    
    const { data: updated, error } = await supabase
      .from('reviews')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single();
      
    if (error) throw error;
    res.json({ ...updated, _id: updated.id });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete review (admin)
// @route   DELETE /api/reviews/admin/:id
// @access  Private/Admin
const adminDeleteReview = async (req, res, next) => {
  try {
    await supabase.from('reviews').delete().eq('id', req.params.id);
    res.json({ message: 'Review deleted by admin' });
  } catch (error) {
    next(error);
  }
};

export { 
  getReviews, 
  getAdminReviews, 
  addReview, 
  markReviewHelpful, 
  adminUpdateReview, 
  adminDeleteReview,
  updateReview,
  deleteReview
};
