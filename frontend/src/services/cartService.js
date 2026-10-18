import api from './api';

export const cartService = {
  // Cart API
  getCart: async () => {
    const response = await api.get('/cart');
    return response.data;
  },

  addToCart: async (productId, variantId, quantity = 1) => {
    const response = await api.post('/cart/items', {
      product_id: productId,
      variant_id: variantId,
      quantity,
    });
    return response.data;
  },

  updateQuantity: async (itemId, quantity) => {
    const response = await api.put(`/cart/items/${itemId}`, { quantity });
    return response.data;
  },

  removeItem: async (itemId) => {
    const response = await api.delete(`/cart/items/${itemId}`);
    return response.data;
  },

  clearCart: async () => {
    const response = await api.delete('/cart');
    return response.data;
  },

  // Wishlist API
  getWishlist: async () => {
    const response = await api.get('/wishlist');
    return response.data;
  },

  toggleWishlist: async (productId) => {
    const response = await api.post(`/wishlist/toggle/${productId}`);
    return response.data;
  },

  // Order API
  createOrder: async (orderData) => {
    const response = await api.post('/orders', orderData);
    return response.data;
  },

  getUserOrders: async () => {
    const response = await api.get('/orders');
    return response.data;
  },

  getOrderDetail: async (orderId) => {
    const response = await api.get(`/orders/${orderId}`);
    return response.data;
  },

  getOrderTracking: async (orderId) => {
    const response = await api.get(`/orders/${orderId}/track`);
    return response.data;
  },

  updateOrderStatus: async (orderId, statusData) => {
    const response = await api.patch(`/orders/${orderId}/status`, statusData);
    return response.data;
  },

  cancelOrder: async (orderId, reason = '') => {
    const url = reason ? `/orders/${orderId}/cancel?reason=${encodeURIComponent(reason)}` : `/orders/${orderId}/cancel`;
    const response = await api.post(url);
    return response.data;
  },

  // Payment API
  initiatePayment: async (paymentData) => {
    const response = await api.post('/payments/initiate', paymentData);
    return response.data;
  },

  verifyPayment: async (verificationData) => {
    const response = await api.post('/payments/verify', verificationData);
    return response.data;
  },

  simulateWebhook: async (webhookData) => {
    const response = await api.post('/payments/simulate-webhook', webhookData);
    return response.data;
  },
};

export default cartService;
