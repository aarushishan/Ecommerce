import api from './api';

export const getProducts = async (params = {}) => {
  const queryParams = new URLSearchParams();

  if (params.page) queryParams.append('page', params.page);
  if (params.limit) queryParams.append('limit', params.limit);
  if (params.search) queryParams.append('search', params.search);
  if (params.category && params.category !== 'all') queryParams.append('category', params.category);
  if (params.brand) queryParams.append('brand', params.brand);
  if (params.minPrice) queryParams.append('min_price', params.minPrice);
  if (params.maxPrice) queryParams.append('max_price', params.maxPrice);
  if (params.minRating) queryParams.append('min_rating', params.minRating);
  if (params.inStock) queryParams.append('in_stock', 'true');
  if (params.sort) queryParams.append('sort', params.sort);

  const response = await api.get(`/products?${queryParams.toString()}`);
  return response.data;
};

export const getProductBySlug = async (slugOrId) => {
  const response = await api.get(`/products/${encodeURIComponent(slugOrId)}`);
  return response.data;
};

export const getCategories = async () => {
  const response = await api.get('/categories');
  return response.data;
};

export const getFeaturedProducts = async (limit = 8) => {
  const response = await api.get(`/products/featured?limit=${limit}`);
  return response.data;
};

export const getTrendingProducts = async (limit = 8) => {
  const response = await api.get(`/products/trending?limit=${limit}`);
  return response.data;
};

export const getRelatedProducts = async (productId, limit = 4) => {
  const response = await api.get(`/products/${productId}/related?limit=${limit}`);
  return response.data;
};

const productService = {
  getProducts,
  getProductBySlug,
  getCategories,
  getFeaturedProducts,
  getTrendingProducts,
  getRelatedProducts,
};

export default productService;
