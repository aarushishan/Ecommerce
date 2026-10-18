import React, { createContext, useContext, useState, useEffect } from 'react';
import { loginApi, registerApi, getMeApi, updateProfileApi } from '../services/authService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('shopsphere_access_token') || null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize auth state by verifying existing token
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('shopsphere_access_token');
      if (storedToken) {
        try {
          const userData = await getMeApi();
          setUser(userData);
          setToken(storedToken);
        } catch (err) {
          console.warn('Session expired or invalid token:', err);
          localStorage.removeItem('shopsphere_access_token');
          setToken(null);
          setUser(null);
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email, password) => {
    const data = await loginApi({ email, password });
    localStorage.setItem('shopsphere_access_token', data.access_token);
    setToken(data.access_token);
    setUser(data.user);
    return data;
  };

  const register = async (userData) => {
    const data = await registerApi(userData);
    localStorage.setItem('shopsphere_access_token', data.access_token);
    setToken(data.access_token);
    setUser(data.user);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('shopsphere_access_token');
    setToken(null);
    setUser(null);
  };

  const updateProfile = async (profileData) => {
    const updated = await updateProfileApi(profileData);
    setUser(updated);
    return updated;
  };

  const refreshUser = async () => {
    try {
      const userData = await getMeApi();
      setUser(userData);
    } catch (err) {
      console.error('Failed to refresh user:', err);
    }
  };

  const value = {
    user,
    token,
    isAuthenticated: !!user,
    isSeller: user?.role?.name === 'SELLER' || user?.role?.name === 'ADMIN',
    isAdmin: user?.role?.name === 'ADMIN',
    isLoading,
    login,
    register,
    logout,
    updateProfile,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
