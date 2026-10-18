import api from './api';

export const sellerService = {
  onboardSeller: async (data) => {
    const response = await api.post('/seller/onboard', data);
    return response.data;
  },

  getProfile: async () => {
    const response = await api.get('/seller/profile');
    return response.data;
  },

  getMetrics: async () => {
    const response = await api.get('/seller/metrics');
    return response.data;
  },

  getProducts: async (params = {}) => {
    const response = await api.get('/seller/products', { params });
    return response.data;
  },

  createProduct: async (data) => {
    const response = await api.post('/seller/products', data);
    return response.data;
  },

  updateProduct: async (productId, data) => {
    const response = await api.patch(`/seller/products/${productId}`, data);
    return response.data;
  },

  updateStock: async (variantId, stockData) => {
    const response = await api.patch(`/seller/inventory/${variantId}`, stockData);
    return response.data;
  },

  getOrderItems: async () => {
    const response = await api.get('/seller/orders');
    return response.data;
  },
};

export default sellerService;
