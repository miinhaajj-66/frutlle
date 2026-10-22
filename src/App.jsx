import { Routes, Route, useLocation } from 'react-router-dom';
import ScrollToTop from './components/ScrollToTop';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import About from './pages/About';
import Products from './pages/Products';
import ProductDetails from './pages/ProductDetails';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import OrderConfirmation from './pages/OrderConfirmation';
import Contact from './pages/Contact';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

import Reviews from './pages/Reviews';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import AdminLayout from './admin/layouts/AdminLayout';
import Dashboard from './admin/pages/Dashboard';
import AdminProducts from './admin/pages/AdminProducts';
import AdminAddProduct from './admin/pages/AdminAddProduct';
import AdminOrders from './admin/pages/AdminOrders';
import AdminReviews from './admin/pages/AdminReviews';
import AdminCoupons from './admin/pages/AdminCoupons';
import AdminAddCoupon from './admin/pages/AdminAddCoupon';
import AdminMessages from './admin/pages/AdminMessages';
import LogoutModal from './components/LogoutModal';
import { useAuth } from './context/AuthContext';
import { AnimatePresence } from 'framer-motion';

function App() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');
  const { isLogoutModalOpen, cancelLogout, confirmLogout, isLoggingOut } = useAuth();

  return (
    <div className="app-container">
      <ScrollToTop />
      {!isAdminRoute && <Navbar />}
      <main style={isAdminRoute ? { minHeight: '100vh', padding: 0 } : { minHeight: '80vh', paddingTop: 'var(--nav-height, 80px)' }}>
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/products" element={<Products />} />
            <Route path="/products/:id" element={<ProductDetails />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
            <Route path="/order-confirmation" element={<ProtectedRoute><OrderConfirmation /></ProtectedRoute>} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/reviews" element={<Reviews />} />

            
            {/* Auth Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/admin/login" element={<Login />} />
            
            {/* Admin Routes */}
            <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
              <Route index element={<Dashboard />} />
              <Route path="orders" element={<AdminOrders />} />
              <Route path="products" element={<AdminProducts />} />
              <Route path="products/add" element={<AdminAddProduct />} />
              <Route path="messages" element={<AdminMessages />} />
              <Route path="reviews" element={<AdminReviews />} />
              <Route path="coupons" element={<AdminCoupons />} />
              <Route path="coupons/add" element={<AdminAddCoupon />} />
              <Route path="*" element={<Dashboard />} /> {/* Catch-all for unbuilt routes */}
            </Route>
          </Routes>
        </AnimatePresence>
      </main>
      {!isAdminRoute && <Footer />}
      <LogoutModal 
        isOpen={isLogoutModalOpen}
        onClose={cancelLogout}
        onConfirm={confirmLogout}
        isProcessing={isLoggingOut}
      />
    </div>
  );
}

export default App;
