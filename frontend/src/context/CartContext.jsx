import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import cartService from '../services/cartService';
import { useAuth } from './AuthContext';

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [cart, setCart] = useState({
    items: [],
    total_items: 0,
    subtotal: 0,
    discount_amount: 0,
    shipping_fee: 0,
    tax_amount: 0,
    total_amount: 0,
    eligible_for_free_shipping: false,
    free_shipping_threshold: 499,
  });
  const [wishlist, setWishlist] = useState([]);
  const [wishlistIds, setWishlistIds] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (message, type = 'success') => {
    setToastMessage({ message, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const fetchCart = useCallback(async () => {
    try {
      const data = await cartService.getCart();
      setCart(data);
    } catch (err) {
      console.error('Failed to fetch cart:', err);
    }
  }, []);

  const fetchWishlist = useCallback(async () => {
    if (!isAuthenticated) {
      setWishlist([]);
      setWishlistIds(new Set());
      return;
    }
    try {
      const data = await cartService.getWishlist();
      setWishlist(data);
      setWishlistIds(new Set(data.map((item) => item.product_id)));
    } catch (err) {
      console.error('Failed to fetch wishlist:', err);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchCart();
    fetchWishlist();
  }, [fetchCart, fetchWishlist, user]);

  const addToCart = async (productId, variantId, quantity = 1) => {
    setLoading(true);
    try {
      const updatedCart = await cartService.addToCart(productId, variantId, quantity);
      setCart(updatedCart);
      showToast('Item added to cart! 🛒');
      return { success: true };
    } catch (err) {
      showToast(err.message || 'Failed to add item to cart', 'error');
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = async (itemId, quantity) => {
    setLoading(true);
    try {
      const updatedCart = await cartService.updateQuantity(itemId, quantity);
      setCart(updatedCart);
      return { success: true };
    } catch (err) {
      showToast(err.message || 'Failed to update quantity', 'error');
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const removeItem = async (itemId) => {
    setLoading(true);
    try {
      const updatedCart = await cartService.removeItem(itemId);
      setCart(updatedCart);
      showToast('Item removed from cart', 'info');
      return { success: true };
    } catch (err) {
      showToast(err.message || 'Failed to remove item', 'error');
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const clearCart = async () => {
    setLoading(true);
    try {
      await cartService.clearCart();
      setCart({
        items: [],
        total_items: 0,
        subtotal: 0,
        discount_amount: 0,
        shipping_fee: 0,
        tax_amount: 0,
        total_amount: 0,
        eligible_for_free_shipping: false,
        free_shipping_threshold: 499,
      });
      showToast('Cart cleared', 'info');
    } catch (err) {
      showToast(err.message || 'Failed to clear cart', 'error');
    } finally {
      setLoading(false);
    }
  };

  const toggleWishlist = async (productId) => {
    if (!isAuthenticated) {
      showToast('Please sign in to save items to your wishlist', 'error');
      return { success: false, requiresAuth: true };
    }
    try {
      const res = await cartService.toggleWishlist(productId);
      await fetchWishlist();
      showToast(res.message || 'Wishlist updated');
      return { success: true, isWishlisted: res.is_wishlisted };
    } catch (err) {
      showToast(err.message || 'Failed to update wishlist', 'error');
      return { success: false, error: err.message };
    }
  };

  const isWishlisted = (productId) => wishlistIds.has(productId);

  return (
    <CartContext.Provider
      value={{
        cart,
        wishlist,
        wishlistCount: wishlist.length,
        loading,
        addToCart,
        updateQuantity,
        removeItem,
        clearCart,
        toggleWishlist,
        isWishlisted,
        fetchCart,
        fetchWishlist,
      }}
    >
      {children}
      {/* Global floating toast notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce">
          <div
            className={`px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 text-sm font-semibold border backdrop-blur-md ${
              toastMessage.type === 'error'
                ? 'bg-rose-950/90 text-rose-200 border-rose-700/50'
                : toastMessage.type === 'info'
                ? 'bg-slate-900/90 text-slate-200 border-slate-700/50'
                : 'bg-emerald-950/90 text-emerald-200 border-emerald-700/50'
            }`}
          >
            <span>{toastMessage.message}</span>
          </div>
        </div>
      )}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
