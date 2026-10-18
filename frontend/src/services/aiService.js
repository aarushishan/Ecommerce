import api from './api';

/**
 * AI Shopping Assistant ('SphereBot') grounded conversational chat
 * @param {string} query
 * @param {object} context - e.g. { current_product_id: '...', current_category: '...' }
 * @param {string|null} sessionId
 */
export const chatWithSphereBot = async (query, context = {}, sessionId = null) => {
  const payload = {
    query,
    context,
    session_id: sessionId,
  };
  const response = await api.post('/ai/chat', payload);
  return response.data;
};

/**
 * Content-based recommendation engine utilizing vector cosine similarity
 * @param {string} productId
 * @param {number} limit
 */
export const getSimilarProducts = async (productId, limit = 6) => {
  const response = await api.get(`/ai/recommendations/similar/${encodeURIComponent(productId)}?limit=${limit}`);
  return response.data;
};

/**
 * Frequently co-purchased items with catalog fallback
 * @param {string} productId
 * @param {number} limit
 */
export const getFrequentlyBoughtTogether = async (productId, limit = 3) => {
  const response = await api.get(`/ai/recommendations/frequently-bought-together/${encodeURIComponent(productId)}?limit=${limit}`);
  return response.data;
};

/**
 * Personalized recommendation feed based on affinity or top trending/featured
 * @param {number} limit
 */
export const getRecommendationsForYou = async (limit = 8) => {
  const response = await api.get(`/ai/recommendations/for-you?limit=${limit}`);
  return response.data;
};

/**
 * Smart side-by-side product comparison matrix with algorithmic value verdict
 * @param {string[]} productIds - Array of 2 to 4 product IDs
 */
export const compareProducts = async (productIds) => {
  const response = await api.post('/ai/compare', { product_ids: productIds });
  return response.data;
};

/**
 * Natural language intent parser & vector cosine similarity search
 * @param {string} query
 * @param {number} limit
 */
export const semanticSearch = async (query, limit = 12) => {
  const response = await api.get(`/ai/semantic-search?q=${encodeURIComponent(query)}&limit=${limit}`);
  return response.data;
};

const aiService = {
  chatWithSphereBot,
  getSimilarProducts,
  getFrequentlyBoughtTogether,
  getRecommendationsForYou,
  compareProducts,
  semanticSearch,
};

export default aiService;
