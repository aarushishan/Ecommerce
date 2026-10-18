import api from './api';

export const loginApi = async (credentials) => {
  const response = await api.post('/auth/login', credentials);
  return response.data;
};

export const registerApi = async (userData) => {
  const response = await api.post('/auth/register', userData);
  return response.data;
};

export const getMeApi = async () => {
  const response = await api.get('/auth/me');
  return response.data;
};

export const updateProfileApi = async (profileData) => {
  const response = await api.put('/users/profile', profileData);
  return response.data;
};

export const changePasswordApi = async (passwordData) => {
  const response = await api.put('/users/change-password', passwordData);
  return response.data;
};

export const getAddressesApi = async () => {
  const response = await api.get('/users/addresses');
  return response.data;
};

export const createAddressApi = async (addressData) => {
  const response = await api.post('/users/addresses', addressData);
  return response.data;
};

export const updateAddressApi = async (addressId, addressData) => {
  const response = await api.put(`/users/addresses/${addressId}`, addressData);
  return response.data;
};

export const deleteAddressApi = async (addressId) => {
  const response = await api.delete(`/users/addresses/${addressId}`);
  return response.data;
};

export const setDefaultAddressApi = async (addressId) => {
  const response = await api.put(`/users/addresses/${addressId}/default`);
  return response.data;
};

const authService = {
  login: loginApi,
  register: registerApi,
  getMe: getMeApi,
  updateProfile: updateProfileApi,
  changePassword: changePasswordApi,
  getAddresses: getAddressesApi,
  createAddress: createAddressApi,
  updateAddress: updateAddressApi,
  deleteAddress: deleteAddressApi,
  setDefaultAddress: setDefaultAddressApi,
};

export default authService;
