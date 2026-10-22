import supabase from '../config/supabase.js';

// Helper to map DB snake_case and ids to camelCase and _id for Frontend compatibility
const formatProduct = (p) => {
  const stockCount = p.count_in_stock !== null && p.count_in_stock !== undefined ? Number(p.count_in_stock) : 0;
  return {
    ...p,
    _id: p.id,
    shortDescription: p.short_description,
    salePrice: p.sale_price,
    countInStock: stockCount,
    stockStatus: stockCount > 0 ? 'In Stock' : 'Out of Stock',
    lowStockThreshold: p.low_stock_threshold,
    isFeatured: p.is_featured,
    isActive: p.is_active,
    status: p.is_active ? 'Active' : 'Draft',
    numReviews: p.num_reviews,
    createdAt: p.created_at,
    updatedAt: p.updated_at
  };
};

// @desc    Fetch all products
// @route   GET /api/products
// @access  Public
const getProducts = async (req, res, next) => {
  try {
    const { data: products, error } = await supabase.from('products').select('*');
    if (error) throw error;
    res.json(products.map(formatProduct));
  } catch (error) {
    next(error);
  }
};

// @desc    Fetch a single product
// @route   GET /api/products/:id
// @access  Public
const getProductById = async (req, res, next) => {
  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(req.params.id);
    if (!isUuid) {
      res.status(404);
      throw new Error('Product not found');
    }

    const { data: product, error } = await supabase.from('products').select('*').eq('id', req.params.id).single();
    if (error && error.code !== 'PGRST116') throw error;

    if (product) {
      res.json(formatProduct(product));
    } else {
      res.status(404);
      throw new Error('Product not found');
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Create a product
// @route   POST /api/products
// @access  Private/Admin
const createProduct = async (req, res, next) => {
  try {
    const { 
      name, description, shortDescription, category, 
      image, price, salePrice, sku, countInStock, stockStatus, status
    } = req.body;

    let finalStock = 100;
    if (stockStatus !== undefined) {
      finalStock = stockStatus === 'Out of Stock' ? 0 : 100;
    } else if (countInStock !== undefined) {
      finalStock = Number(countInStock);
    }

    const newProduct = {
      name,
      description,
      short_description: shortDescription,
      category,
      image: image || '/Glossy Frutlle Origin Logo.png',
      price: Number(price),
      sale_price: salePrice ? Number(salePrice) : null,
      sku,
      count_in_stock: finalStock,
      is_active: status === 'Active',
      num_reviews: 0,
      rating: 0,
    };

    const { data: createdProduct, error } = await supabase.from('products').insert([newProduct]).select().single();
    if (error) throw error;
    
    res.status(201).json(formatProduct(createdProduct));
  } catch (error) {
    next(error);
  }
};

// @desc    Update a product
// @route   PUT /api/products/:id
// @access  Private/Admin
const updateProduct = async (req, res, next) => {
  try {
    const { name, price, description, shortDescription, image, category, countInStock, stockStatus, sku, salePrice, status, isActive } = req.body;

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (price !== undefined) updates.price = Number(price);
    if (salePrice !== undefined) updates.sale_price = salePrice === '' || salePrice === null ? null : Number(salePrice);
    if (description !== undefined) updates.description = description;
    if (shortDescription !== undefined) updates.short_description = shortDescription;
    if (image !== undefined) updates.image = image;
    if (category !== undefined) updates.category = category;
    
    if (stockStatus !== undefined) {
      if (stockStatus === 'Out of Stock') {
        updates.count_in_stock = 0;
      } else {
        const num = Number(countInStock);
        updates.count_in_stock = (!isNaN(num) && num > 0) ? num : 100;
      }
    } else if (countInStock !== undefined) {
      updates.count_in_stock = Number(countInStock);
    }

    if (sku !== undefined) updates.sku = sku;
    if (status !== undefined) updates.is_active = status === 'Active';
    if (isActive !== undefined) updates.is_active = Boolean(isActive);

    const { data: product, error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) {
      res.status(404);
      throw new Error('Product not found or update failed');
    }
    
    res.json(formatProduct(product));
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a product
// @route   DELETE /api/products/:id
// @access  Private/Admin
const deleteProduct = async (req, res, next) => {
  try {
    const { error } = await supabase.from('products').delete().eq('id', req.params.id);
    if (error) {
      res.status(404);
      throw new Error('Product not found or delete failed');
    }
    res.json({ message: 'Product removed' });
  } catch (error) {
    next(error);
  }
};

export { getProducts, getProductById, createProduct, updateProduct, deleteProduct };
