import api from './api';

export const adminService = {
  getKpis: async () => {
    const response = await api.get('/admin/kpis');
    return response.data;
  },

  getUsers: async (params = {}) => {
    const response = await api.get('/admin/users', { params });
    return response.data;
  },

  updateUserRoleAndStatus: async (userId, data) => {
    const response = await api.patch(`/admin/users/${userId}`, data);
    return response.data;
  },

  getSellers: async (params = {}) => {
    const response = await api.get('/admin/sellers', { params });
    return response.data;
  },

  updateSellerApproval: async (sellerId, isApproved) => {
    const response = await api.patch(`/admin/sellers/${sellerId}/approval`, {
      is_approved: isApproved,
    });
    return response.data;
  },

  createCategory: async (data) => {
    const response = await api.post('/admin/categories', data);
    return response.data;
  },

  updateCategory: async (categoryId, data) => {
    const response = await api.patch(`/admin/categories/${categoryId}`, data);
    return response.data;
  },

  toggleProductVisibility: async (productId, data) => {
    const response = await api.patch(`/admin/products/${productId}/visibility`, data);
    return response.data;
  },

  getReviews: async (params = {}) => {
    const response = await api.get('/admin/reviews', { params });
    return response.data;
  },

  moderateReview: async (reviewId, isApproved) => {
    const response = await api.patch(`/admin/reviews/${reviewId}/moderation`, {
      is_approved: isApproved,
    });
    return response.data;
  },

  getAuditLogs: async (params = {}) => {
    const response = await api.get('/admin/audit-logs', { params });
    return response.data;
  },
};

export default adminService;
