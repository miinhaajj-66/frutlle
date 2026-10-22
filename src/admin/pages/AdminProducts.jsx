import { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, X, Check, Save } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { formatCurrency } from '../../utils/currency';

const AdminProducts = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  
  // Edit Product Modal State
  const [editingProduct, setEditingProduct] = useState(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    category: '',
    price: '',
    salePrice: '',
    stockStatus: 'In Stock',
    status: 'Active'
  });
  const [savingEdit, setSavingEdit] = useState(false);
  const [message, setMessage] = useState('');

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get('/api/products');
      setProducts(data);
    } catch (error) {
      console.error('Error fetching products', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const showFeedback = (msg) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 3000);
  };

  const handleDeleteProduct = async (productId, productName) => {
    if (window.confirm(`Are you sure you want to delete "${productName}"? This action cannot be undone.`)) {
      try {
        await axios.delete(`/api/products/${productId}`, { withCredentials: true });
        showFeedback(`Product "${productName}" deleted successfully`);
        fetchProducts();
      } catch (err) {
        console.error('Failed to delete product', err);
        alert(err.response?.data?.message || 'Failed to delete product');
      }
    }
  };

  const handleToggleStatus = async (product) => {
    try {
      const newStatus = product.isActive ? 'Draft' : 'Active';
      await axios.put(`/api/products/${product._id || product.id}`, { status: newStatus }, { withCredentials: true });
      showFeedback(`Product "${product.name}" status set to ${newStatus}`);
      fetchProducts();
    } catch (err) {
      console.error('Failed to toggle product status', err);
      alert('Failed to update product status');
    }
  };

  const openEditModal = (product) => {
    setEditingProduct(product);
    const isProductInStock = product.stockStatus 
      ? product.stockStatus === 'In Stock'
      : (product.countInStock !== undefined ? Number(product.countInStock) > 0 : true);
    setEditFormData({
      name: product.name || '',
      category: product.category || 'Classic',
      price: product.price || '',
      salePrice: product.salePrice ?? '',
      stockStatus: isProductInStock ? 'In Stock' : 'Out of Stock',
      status: product.isActive ? 'Active' : 'Draft'
    });
  };

  const closeEditModal = () => {
    setEditingProduct(null);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingProduct) return;
    setSavingEdit(true);

    try {
      await axios.put(`/api/products/${editingProduct._id || editingProduct.id}`, {
        name: editFormData.name,
        category: editFormData.category,
        price: Number(editFormData.price),
        salePrice: editFormData.salePrice === '' ? null : Number(editFormData.salePrice),
        stockStatus: editFormData.stockStatus,
        countInStock: editFormData.stockStatus === 'Out of Stock' ? 0 : 100,
        status: editFormData.status
      }, { withCredentials: true });

      showFeedback(`Product "${editFormData.name}" updated successfully`);
      closeEditModal();
      fetchProducts();
    } catch (err) {
      console.error('Failed to update product', err);
      alert(err.response?.data?.message || 'Failed to update product');
    } finally {
      setSavingEdit(false);
    }
  };

  // Filter products by search term and category
  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All Categories' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = ['All Categories', ...new Set(products.map(p => p.category).filter(Boolean))];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="admin-section-header">
        <h1 className="admin-section-title">Products</h1>
        <Link to="/admin/products/add" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', fontSize: '0.85rem', textDecoration: 'none' }}>
          <Plus size={18} />
          Add Product
        </Link>
      </div>

      {message && (
        <div style={{ padding: '12px 16px', background: '#d1fae5', color: '#065f46', borderRadius: '8px', marginBottom: '16px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Check size={16} />
          {message}
        </div>
      )}

      <div className="admin-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', gap: '15px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', background: '#f5f5f5', padding: '8px 16px', borderRadius: '8px', maxWidth: '300px', width: '100%', minWidth: 0, flex: 1 }}>
            <Search size={18} color="#888" style={{ marginRight: '8px', flexShrink: 0 }} />
            <input 
              type="text" 
              placeholder="Search products..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', minWidth: 0, fontSize: '0.9rem' }}
            />
          </div>
          <select 
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #ddd', outline: 'none', background: '#fff' }}
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Product Name</th>
                <th>Category</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: '#888' }}>
                    Loading products...
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '40px' }}>
                    <div style={{ color: '#888', marginBottom: '10px' }}>No products found</div>
                    <Link to="/admin/products/add" className="btn btn-primary" style={{ textDecoration: 'none', display: 'inline-block' }}>Create First Product</Link>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => (
                  <tr key={product._id || product.id}>
                    <td style={{ fontWeight: '500' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {product.image ? (
                          <img src={product.image} alt={product.name} style={{ width: '40px', height: '40px', borderRadius: '4px', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: '40px', height: '40px', borderRadius: '4px', background: '#f5f5f5' }}></div>
                        )}
                        {product.name}
                      </div>
                    </td>
                    <td>{product.category}</td>
                    <td>
                      {product.salePrice ? (
                        <>
                          <span style={{ textDecoration: 'line-through', color: '#999', marginRight: '5px', fontSize: '0.9em' }}>{formatCurrency(product.price)}</span>
                          <span style={{ color: 'var(--frutlle-green)', fontWeight: 'bold' }}>{formatCurrency(product.salePrice)}</span>
                        </>
                      ) : (
                        formatCurrency(product.price)
                      )}
                    </td>
                    <td>
                      <span className={`admin-badge ${product.countInStock > 0 ? 'badge-success' : 'badge-danger'}`}>
                        {product.countInStock > 0 ? 'In Stock' : 'Out of Stock'}
                      </span>
                    </td>
                    <td>
                      <span 
                        onClick={() => handleToggleStatus(product)}
                        title="Click to toggle status"
                        className={`admin-badge ${product.isActive ? 'badge-success' : 'badge-danger'}`}
                        style={{ cursor: 'pointer' }}
                      >
                        {product.isActive ? 'Active' : 'Draft'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button 
                          type="button"
                          onClick={() => openEditModal(product)}
                          title="Edit product"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4a90e2' }}
                        >
                          <Edit2 size={18} />
                        </button>
                        <button 
                          type="button"
                          onClick={() => handleDeleteProduct(product._id || product.id, product.name)}
                          title="Delete product"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--frutlle-red)' }}
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Edit Product Modal */}
      <AnimatePresence>
        {editingProduct && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '12px' }}>
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              style={{ background: '#fff', borderRadius: '12px', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #f0f0f0' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Edit Product</h3>
                <button type="button" onClick={closeEditModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888' }}>
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSaveEdit} style={{ padding: '20px' }}>
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: '#374151', marginBottom: '4px' }}>Product Name</label>
                  <input 
                    type="text" 
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    required
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.9rem' }}
                  />
                </div>

                <div className="admin-form-row-2" style={{ marginBottom: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: '#374151', marginBottom: '4px' }}>Category</label>
                    <input 
                      type="text" 
                      value={editFormData.category}
                      onChange={(e) => setEditFormData({ ...editFormData, category: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.9rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: '#374151', marginBottom: '4px' }}>Status</label>
                    <select 
                      value={editFormData.status}
                      onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.9rem', background: '#fff' }}
                    >
                      <option value="Active">Active</option>
                      <option value="Draft">Draft</option>
                    </select>
                  </div>
                </div>

                <div className="admin-form-row-3" style={{ marginBottom: '20px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: '#374151', marginBottom: '4px' }}>Price (₹)</label>
                    <input 
                      type="number" 
                      step="0.01"
                      value={editFormData.price}
                      onChange={(e) => setEditFormData({ ...editFormData, price: e.target.value })}
                      required
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.9rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: '#374151', marginBottom: '4px' }}>Sale Price (₹)</label>
                    <input 
                      type="number" 
                      step="0.01"
                      placeholder="Optional"
                      value={editFormData.salePrice}
                      onChange={(e) => setEditFormData({ ...editFormData, salePrice: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.9rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: '#374151', marginBottom: '4px' }}>Stock Status</label>
                    <select 
                      value={editFormData.stockStatus}
                      onChange={(e) => setEditFormData({ ...editFormData, stockStatus: e.target.value })}
                      required
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.9rem', backgroundColor: '#fff', cursor: 'pointer' }}
                    >
                      <option value="In Stock">In Stock</option>
                      <option value="Out of Stock">Out of Stock</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button 
                    type="button" 
                    onClick={closeEditModal}
                    className="btn btn-secondary"
                    style={{ padding: '8px 16px', fontSize: '0.875rem' }}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={savingEdit}
                    className="btn btn-primary"
                    style={{ padding: '8px 16px', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Save size={16} />
                    {savingEdit ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default AdminProducts;
