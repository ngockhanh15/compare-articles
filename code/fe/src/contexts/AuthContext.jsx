import { createContext, useContext, useState, useEffect } from 'react';
import * as api from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check if user is logged in on app start
  useEffect(() => {
    const initializeAuth = async () => {
      // Kiểm tra nếu đang ở trang public không cần authentication
      const currentPath = window.location.pathname;
      const publicPaths = ['/login', '/register', '/forgot-password', '/reset-password'];
      const isPublicPath = publicPaths.some(path => currentPath.startsWith(path));
      
      const savedUser = localStorage.getItem('user');
      const token = localStorage.getItem('token');
      
      // Kiểm tra localStorage trước
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
              setIsLoading(false);
              return; // Đã tìm thấy user hợp lệ, không cần kiểm tra Google session
            }
          } catch (error) {
            // Token is invalid, clear storage
            console.error('Token validation failed:', error);
            localStorage.removeItem('user');
            localStorage.removeItem('token');
            setUser(null);
            
            // Nếu đang ở trang public, không cần kiểm tra Google session
            if (isPublicPath) {
              setIsLoading(false);
              return;
            }
          }
        } catch (error) {
          console.error('Error parsing saved user:', error);
          localStorage.removeItem('user');
          localStorage.removeItem('token');
          
          // Nếu đang ở trang public, không cần kiểm tra Google session
          if (isPublicPath) {
            setIsLoading(false);
            return;
          }
        }
      } else if (isPublicPath) {
        // Nếu đang ở trang public và không có token, không cần kiểm tra Google session
        setIsLoading(false);
        return;
      }
      
      // Chỉ kiểm tra Google OAuth session nếu không phải trang public
      try {
        const googleSessionResponse = await fetch('http://localhost:3000/auth/google/status', {
          method: 'GET',
          credentials: 'include' // Quan trọng: gửi cookies session
        });
        
        if (googleSessionResponse.ok) {
          const googleData = await googleSessionResponse.json();
          if (googleData.success && googleData.user && googleData.token) {
            console.log('✅ Found valid Google session:', googleData.user);
            
            // Lưu thông tin user và token vào localStorage
            localStorage.setItem('user', JSON.stringify(googleData.user));
            localStorage.setItem('token', googleData.token);
            
            setUser(googleData.user);
            setIsLoading(false);
            return;
          }
        }
      } catch (googleError) {
        console.log('No valid Google session found:', googleError.message);
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
      // Logout from regular auth
      await api.logout();

      // Clear localStorage
      // Also logout from Google OAuth session
      try {
        await fetch('http://localhost:3000/auth/google/logout', {
          method: 'GET',
          credentials: 'include'
        });
      } catch (googleLogoutError) {
        console.error('Google logout error:', googleLogoutError);
      }
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
    setUser,
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