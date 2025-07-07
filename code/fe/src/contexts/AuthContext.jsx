import { createContext, useContext, useState, useEffect } from 'react';
import * as api from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check if user is logged in on app start
  useEffect(() => {
    const initializeAuth = async () => {
      const savedUser = localStorage.getItem('user');
      const token = localStorage.getItem('token');
      
      if (savedUser && token) {
        try {
          const parsedUser = JSON.parse(savedUser);
          setUser(parsedUser);
          
          // Verify token is still valid by fetching current user
          try {
            const response = await api.getCurrentUser();
            if (response.success) {
              setUser(response.data.user);
              localStorage.setItem('user', JSON.stringify(response.data.user));
            }
          } catch (error) {
            // Token is invalid, clear storage
            console.error('Token validation failed:', error);
            localStorage.removeItem('user');
            localStorage.removeItem('token');
            setUser(null);
          }
        } catch (error) {
          console.error('Error parsing saved user:', error);
          localStorage.removeItem('user');
          localStorage.removeItem('token');
        }
      }
      setIsLoading(false);
    };

    initializeAuth();
  }, []);

  const register = async (userData) => {
    setIsLoading(true);
    try {
      const response = await api.register(userData);
      
      // Sau khi đăng ký thành công, tự động đăng nhập
      if (response.success && response.data.user) {
        setUser(response.data.user);
      }
      
      setIsLoading(false);
      return response;
    } catch (error) {
      setIsLoading(false);
      throw error;
    }
  };

  const login = async (email, password) => {
    setIsLoading(true);
    try {
      const response = await api.login(email, password);
      
      if (response.success && response.data.user) {
        setUser(response.data.user);
      }
      
      setIsLoading(false);
      return response;
    } catch (error) {
      setIsLoading(false);
      throw error;
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await api.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setIsLoading(false);
    }
  };

  const forgotPassword = async (email) => {
    try {
      return await api.forgotPassword(email);
    } catch (error) {
      throw error;
    }
  };

  const resetPassword = async (resetToken, password) => {
    setIsLoading(true);
    try {
      const response = await api.resetPassword(resetToken, password);
      
      if (response.success && response.data.user) {
        setUser(response.data.user);
      }
      
      setIsLoading(false);
      return response;
    } catch (error) {
      setIsLoading(false);
      throw error;
    }
  };

  const value = {
    user,
    register,
    login,
    logout,
    forgotPassword,
    resetPassword,
    isLoading,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;