// API base URL
const API_BASE_URL = 'http://localhost:3000/api';

// Helper function to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` })
  };
};

// Helper function to handle API responses
const handleResponse = async (response) => {
  const data = await response.json();
  
  if (!response.ok) {
    // If token is expired or invalid, clear local storage
    if (response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
    throw new Error(data.error || 'Something went wrong');
  }
  
  return data;
};

// ==================== AUTH API ====================

// Đăng ký tài khoản
export const register = async (userData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: userData.name,
        email: userData.email,
        password: userData.password,
        confirmPassword: userData.confirmPassword
      }),
    });
    
    return await handleResponse(response);
  } catch (error) {
    console.error('Register error:', error);
    throw error;
  }
};

// Đăng nhập
export const login = async (email, password) => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });
    
    const data = await handleResponse(response);
    
    // Save token and user data to localStorage
    if (data.success && data.data.token) {
      localStorage.setItem('token', data.data.token);
      localStorage.setItem('refreshToken', data.data.refreshToken);
      localStorage.setItem('user', JSON.stringify(data.data.user));
    }
    
    return data;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};

// Đăng xuất
export const logout = async () => {
  try {
    const refreshToken = localStorage.getItem('refreshToken');
    
    const response = await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ refreshToken }),
    });
    
    // Clear local storage regardless of response
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.error('Logout error:', error);
    // Still clear local storage even if API call fails
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  }
};

// Lấy thông tin người dùng hiện tại
export const getCurrentUser = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    
    return await handleResponse(response);
  } catch (error) {
    console.error('Get current user error:', error);
    throw error;
  }
};

// Quên mật khẩu
export const forgotPassword = async (email) => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/forgotpassword`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });
    
    return await handleResponse(response);
  } catch (error) {
    console.error('Forgot password error:', error);
    throw error;
  }
};

// Đặt lại mật khẩu
export const resetPassword = async (resetToken, password) => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/resetpassword/${resetToken}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ password }),
    });
    
    const data = await handleResponse(response);
    
    // Save token and user data to localStorage
    if (data.success && data.data.token) {
      localStorage.setItem('token', data.data.token);
      localStorage.setItem('refreshToken', data.data.refreshToken);
      localStorage.setItem('user', JSON.stringify(data.data.user));
    }
    
    return data;
  } catch (error) {
    console.error('Reset password error:', error);
    throw error;
  }
};

// Xác thực email
export const verifyEmail = async (token) => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/verify-email/${token}`, {
      method: 'GET',
    });
    
    return await handleResponse(response);
  } catch (error) {
    console.error('Verify email error:', error);
    throw error;
  }
};

// Gửi lại email xác thực
export const resendEmailVerification = async (email) => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/resend-verification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });
    
    return await handleResponse(response);
  } catch (error) {
    console.error('Resend email verification error:', error);
    throw error;
  }
};

// Refresh token
export const refreshToken = async () => {
  try {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }
    
    const response = await fetch(`${API_BASE_URL}/auth/refresh-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    });
    
    const data = await handleResponse(response);
    
    // Update tokens in localStorage
    if (data.success && data.data.token) {
      localStorage.setItem('token', data.data.token);
      localStorage.setItem('refreshToken', data.data.refreshToken);
    }
    
    return data;
  } catch (error) {
    console.error('Refresh token error:', error);
    // Clear tokens if refresh fails
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    throw error;
  }
};

// ==================== OTHER API ====================

// Hàm so sánh văn bản
export const compareTexts = async (text1, text2) => {
  try {
    const response = await fetch(`${API_BASE_URL}/compare`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ text1, text2 }),
    });
    
    return await handleResponse(response);
  } catch (error) {
    console.error('Compare texts error:', error);
    throw error;
  }
};

// Hàm lấy lịch sử so sánh
export const getHistory = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/history`, {
      headers: getAuthHeaders(),
    });
    
    return await handleResponse(response);
  } catch (error) {
    console.error('Get history error:', error);
    throw error;
  }
};

// Hàm lọc từ khóa
export const filterWords = async (text, keywords) => {
  try {
    const response = await fetch(`${API_BASE_URL}/filter`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ text, keywords }),
    });
    
    return await handleResponse(response);
  } catch (error) {
    console.error('Filter words error:', error);
    throw error;
  }
};