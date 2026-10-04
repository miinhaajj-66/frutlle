import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    image: { type: String, required: true },
    description: { type: String, required: true },
    shortDescription: { type: String },
    category: { type: String, required: true },
    price: { type: Number, required: true, default: 0 },
    salePrice: { type: Number },
    countInStock: { type: Number, required: true, default: 0 },
    lowStockThreshold: { type: Number, default: 5 },
    sku: { type: String, required: true, unique: true },
    ingredients: { type: [String] },
    weight: { type: String },
    isFeatured: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    rating: { type: Number, required: true, default: 0 },
    numReviews: { type: Number, required: true, default: 0 },
  },
  { timestamps: true }
);

const Product = mongoose.model('Product', productSchema);

export default Product;
