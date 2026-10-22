import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, X, Save, Eye, ArrowLeft, Image as ImageIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import axios, { getApiUrl } from '../../utils/api';
import { formatCurrency } from '../../utils/currency';
import './AdminAddProduct.css';

const AdminAddProduct = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    shortDescription: '',
    category: 'Single Fruit',
    brand: '',
    price: '',
    salePrice: '',
    costPrice: '',
    sku: '',
    stockStatus: 'In Stock',
    status: 'Active',
    weight: '',
    dimensions: '',
    tags: ''
  });

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
      // Auto-generate slug from name if slug isn't manually edited yet
      ...(name === 'name' && !prev.slug && { slug: value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') })
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Please upload a valid image file');
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const uploadImage = async () => {
    if (!imageFile) return '';
    const formData = new FormData();
    formData.append('image', imageFile);
    
    try {
      const { data } = await axios.post(getApiUrl('/api/upload'), formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        withCredentials: true
      });
      return data.image;
    } catch (err) {
      console.error('Image upload failed', err);
      throw new Error('Failed to upload image');
    }
  };

  const submitHandler = async (status = 'Active') => {
    setLoading(true);
    setError('');
    
    try {
      // 1. Validate
      if (!formData.name || !formData.price) {
        throw new Error('Name and Regular Price are required.');
      }
      
      // 2. Upload image
      let uploadedImageUrl = formData.image || '';
      if (imageFile) {
        uploadedImageUrl = await uploadImage();
      }

      // 3. Save Product
      const productPayload = {
        ...formData,
        stockStatus: formData.stockStatus,
        countInStock: formData.stockStatus === 'Out of Stock' ? 0 : 100,
        status,
        image: uploadedImageUrl
      };

      await axios.post(getApiUrl('/api/products'), productPayload, {
        withCredentials: true
      });

      // 4. Navigate back to products list
      navigate('/admin/products');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="admin-section-header" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button 
            onClick={() => navigate('/admin/products')} 
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666' }}
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="admin-section-title" style={{ margin: 0 }}>Add New Product</h1>
        </div>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', background: '#ffebee', color: '#c62828', borderRadius: '8px', marginBottom: '24px', fontWeight: '500' }}>
          {error}
        </div>
      )}

      <div className="admin-add-product-container">
        {/* LEFT COLUMN: FORM */}
        <div className="form-column">
          <div className="admin-form-section">
            <h3>Basic Information</h3>
            <div className="form-group">
              <label>Product Title *</label>
              <input type="text" name="name" className="form-control" value={formData.name} onChange={handleChange} placeholder="e.g. Premium Mangoes" />
            </div>
            <div className="form-group-row">
              <div className="form-group">
                <label>URL Slug</label>
                <input type="text" name="slug" className="form-control" value={formData.slug} onChange={handleChange} placeholder="premium-mangoes" />
              </div>
              <div className="form-group">
                <label>Category</label>
                <select name="category" className="form-control" value={formData.category} onChange={handleChange}>
                  <option value="Single Fruit">Single Fruit</option>
                  <option value="Mixed">Mixed</option>
                  <option value="Premium">Premium</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>Short Description</label>
              <input type="text" name="shortDescription" className="form-control" value={formData.shortDescription} onChange={handleChange} placeholder="Brief summary for product cards..." />
            </div>
            <div className="form-group">
              <label>Full Description</label>
              <textarea name="description" className="form-control" value={formData.description} onChange={handleChange} placeholder="Detailed product description..."></textarea>
            </div>
          </div>

          <div className="admin-form-section">
            <h3>Product Images</h3>
            <div className="image-upload-area" onClick={() => document.getElementById('image-upload').click()}>
              <Upload className="upload-icon" size={32} />
              <div className="upload-text">Click to upload or drag and drop</div>
              <div className="upload-hint">SVG, PNG, JPG or WEBP (max. 5MB)</div>
              <input id="image-upload" type="file" accept="image/*" onChange={handleImageChange} />
            </div>
            {imagePreview && (
              <div className="image-preview-container">
                <div className="image-preview-item">
                  <img src={imagePreview} alt="Preview" />
                  <button className="remove-image-btn" onClick={removeImage}><X size={16} /></button>
                </div>
              </div>
            )}
          </div>

          <div className="admin-form-section">
            <h3>Pricing & Inventory</h3>
            <div className="form-group-row">
              <div className="form-group">
                <label>Regular Price (₹) *</label>
                <input type="number" name="price" className="form-control" value={formData.price} onChange={handleChange} placeholder="0.00" />
              </div>
              <div className="form-group">
                <label>Sale Price (₹)</label>
                <input type="number" name="salePrice" className="form-control" value={formData.salePrice} onChange={handleChange} placeholder="0.00" />
              </div>
            </div>
            <div className="form-group-row">
              <div className="form-group">
                <label>Stock Status</label>
                <select 
                  name="stockStatus" 
                  className="form-control" 
                  value={formData.stockStatus} 
                  onChange={handleChange}
                  style={{ backgroundColor: '#fff', cursor: 'pointer' }}
                >
                  <option value="In Stock">In Stock</option>
                  <option value="Out of Stock">Out of Stock</option>
                </select>
              </div>
              <div className="form-group">
                <label>SKU</label>
                <input type="text" name="sku" className="form-control" value={formData.sku} onChange={handleChange} placeholder="FRUT-001" />
              </div>
            </div>
          </div>

          <div className="action-buttons">
            <button className="btn-secondary" onClick={() => navigate('/admin/products')} disabled={loading}>
              Cancel
            </button>
            <button className="btn-draft" onClick={() => submitHandler('Draft')} disabled={loading}>
              <Save size={18} style={{ marginRight: '8px' }} />
              Save as Draft
            </button>
            <button className="btn-publish" onClick={() => submitHandler('Active')} disabled={loading}>
              <Eye size={18} />
              {loading ? 'Publishing...' : 'Publish Product'}
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: PREVIEW */}
        <div className="preview-column">
          <div className="preview-panel">
            <h3 style={{ fontSize: '1rem', color: '#555', marginBottom: '16px' }}>Live Preview</h3>
            <div className="preview-card">
              <div className="preview-header">Product Card Preview</div>
              {imagePreview ? (
                <div style={{ width: '100%', aspectRatio: '1', overflow: 'hidden' }}>
                  <img src={imagePreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              ) : (
                <div className="preview-image-placeholder">
                  <ImageIcon size={48} />
                </div>
              )}
              <div className="preview-details">
                {formData.category && <div style={{ fontSize: '0.8rem', color: '#888', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{formData.category}</div>}
                <div className="preview-title">{formData.name || 'Product Title'}</div>
                
                {formData.salePrice ? (
                  <div className="preview-price">
                    <span className="preview-sale-price">{formatCurrency(formData.salePrice)}</span>
                    <span className="preview-regular-price">{formatCurrency(formData.price)}</span>
                  </div>
                ) : (
                  <div className="preview-price">
                    {formatCurrency(formData.price || 0)}
                  </div>
                )}

                <div style={{ marginTop: '16px' }}>
                  {formData.stockStatus === 'In Stock' ? (
                    <span className="preview-badge badge-instock">In Stock</span>
                  ) : (
                    <span className="preview-badge badge-outofstock">Out of Stock</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default AdminAddProduct;
