import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Ensure persistent guest session token
const getSessionToken = () => {
  let token = localStorage.getItem('shopsphere_session_token');
  if (!token) {
    token = 'guest_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    localStorage.setItem('shopsphere_session_token', token);
  }
  return token;
};

// Request interceptor to attach JWT token and guest session token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('shopsphere_access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    config.headers['X-Session-Token'] = getSessionToken();
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for unified error formatting
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const normalizedError = {
      message: error.response?.data?.detail || error.message || 'An unexpected error occurred',
      status: error.response?.status,
      data: error.response?.data,
    };
    return Promise.reject(normalizedError);
  }
);

export const checkHealth = async () => {
  const response = await api.get('/health');
  return response.data;
};

export default api;
