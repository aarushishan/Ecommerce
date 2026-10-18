import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { CompareProvider } from './context/CompareContext';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import SphereBot from './components/ai/SphereBot';
import CompareTray from './components/catalog/CompareTray';
import ProductComparisonModal from './components/catalog/ProductComparisonModal';
import Home from './pages/Home';
import Catalog from './pages/Catalog';
import ProductDetail from './pages/ProductDetail';
import Cart from './pages/Cart';
import Wishlist from './pages/Wishlist';
import Checkout from './pages/Checkout';
import OrderConfirmation from './pages/OrderConfirmation';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import SellerDashboard from './pages/SellerDashboard';
import AdminDashboard from './pages/AdminDashboard';
import ProtectedRoute from './components/common/ProtectedRoute';

function App() {
  const [isApiConnected, setIsApiConnected] = useState(true);

  return (
    <AuthProvider>
      <CartProvider>
        <CompareProvider>
          <Router>
            <div className="flex flex-col min-h-screen bg-slate-50 selection:bg-brand-600 selection:text-white relative">
              <Navbar isApiConnected={isApiConnected} />
              <main className="flex-1">
              <Routes>
                {/* Public Browsing Routes */}
                <Route path="/" element={<Home onApiStatusChange={setIsApiConnected} />} />
                <Route path="/catalog" element={<Catalog />} />
                <Route path="/products/:slug" element={<ProductDetail />} />
                <Route path="/cart" element={<Cart />} />
                <Route path="/wishlist" element={<Wishlist />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />

                {/* Protected Customer Routes */}
                <Route
                  path="/checkout"
                  element={
                    <ProtectedRoute>
                      <Checkout />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/orders/:orderId"
                  element={
                    <ProtectedRoute>
                      <OrderConfirmation />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/profile"
                  element={
                    <ProtectedRoute>
                      <Profile />
                    </ProtectedRoute>
                  }
                />

                {/* Seller Portal (Onboarding & Storefront Management) */}
                <Route
                  path="/seller"
                  element={
                    <ProtectedRoute>
                      <SellerDashboard />
                    </ProtectedRoute>
                  }
                />

                {/* Admin Platform Command Center */}
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN']}>
                      <AdminDashboard />
                    </ProtectedRoute>
                  }
                />

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
            <Footer />

            {/* Phase 7 AI Suite Components */}
            <SphereBot />
            <CompareTray />
            <ProductComparisonModal />
          </div>
        </Router>
      </CompareProvider>
    </CartProvider>
  </AuthProvider>
);
}

export default App;
