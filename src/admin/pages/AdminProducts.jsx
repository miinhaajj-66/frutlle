import { useState } from 'react';
import { Plus, Search, Edit2, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';

const AdminProducts = () => {
  // Mock data for UI demonstration
  const [products] = useState([
    { _id: '1', name: 'Strawberry Jam', price: 250, stock: 45, category: 'Single Fruit', status: 'Active' },
    { _id: '2', name: 'Mango Jam', price: 280, stock: 8, category: 'Single Fruit', status: 'Active' },
    { _id: '3', name: 'Mixed Fruit Jam', price: 300, stock: 0, category: 'Mixed', status: 'Out of Stock' },
    { _id: '4', name: 'Pineapple Jam', price: 260, stock: 120, category: 'Single Fruit', status: 'Active' },
  ]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="admin-section-header">
        <h1 className="admin-section-title">Products</h1>
        <button className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', fontSize: '0.85rem' }}>
          <Plus size={18} />
          Add Product
        </button>
      </div>

      <div className="admin-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', background: '#f5f5f5', padding: '8px 16px', borderRadius: '8px', width: '300px' }}>
            <Search size={18} color="#888" style={{ marginRight: '8px' }} />
            <input 
              type="text" 
              placeholder="Search products..." 
              style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '0.9rem' }}
            />
          </div>
          <select style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #ddd', outline: 'none' }}>
            <option>All Categories</option>
            <option>Single Fruit</option>
            <option>Mixed</option>
            <option>Premium</option>
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
              {products.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '40px' }}>
                    <div style={{ color: '#888', marginBottom: '10px' }}>No products found</div>
                    <button className="btn btn-primary">Create First Product</button>
                  </td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr key={product._id}>
                    <td style={{ fontWeight: '500' }}>{product.name}</td>
                    <td>{product.category}</td>
                    <td>₹{product.price}</td>
                    <td style={{ color: product.stock === 0 ? 'var(--frutlle-red)' : product.stock < 10 ? 'var(--frutlle-gold)' : 'inherit', fontWeight: 'bold' }}>
                      {product.stock}
                    </td>
                    <td>
                      <span className={`admin-badge ${product.status === 'Active' ? 'badge-success' : 'badge-danger'}`}>
                        {product.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4a90e2' }}><Edit2 size={18} /></button>
                        <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--frutlle-red)' }}><Trash2 size={18} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
};

export default AdminProducts;
