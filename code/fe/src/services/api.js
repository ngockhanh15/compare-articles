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
    
    const data = await handleResponse(response);
    
    // Save token and user data to localStorage nếu đăng ký thành công
    if (data.success && data.data.token) {
      localStorage.setItem('token', data.data.token);
      localStorage.setItem('user', JSON.stringify(data.data.user));
    }
    
    return data;
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
    const response = await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    
    // Clear local storage regardless of response
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.error('Logout error:', error);
    // Still clear local storage even if API call fails
    localStorage.removeItem('token');
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
      localStorage.setItem('user', JSON.stringify(data.data.user));
    }
    
    return data;
  } catch (error) {
    console.error('Reset password error:', error);
    throw error;
  }
};


// ==================== TEXT CHECKER API ====================

// Upload file và extract text
export const uploadFile = async (file) => {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/plagiarism/upload`, {
      method: 'POST',
      headers: {
        // Don't set Content-Type for FormData, let browser set it
        ...(localStorage.getItem('token') && { 
          Authorization: `Bearer ${localStorage.getItem('token')}` 
        })
      },
      body: formData,
    });

    return await handleResponse(response);
  } catch (error) {
    console.error('Upload file error:', error);
    throw error;
  }
};

// Kiểm tra plagiarism
export const checkPlagiarism = async (text, options = {}) => {
  try {
    const response = await fetch(`${API_BASE_URL}/check-plagiarism`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        text: text,
        options: {
          checkInternet: true,
          checkDatabase: true,
          sensitivity: 'medium',
          ...options
        }
      }),
    });

    return await handleResponse(response);
  } catch (error) {
    console.error('Check plagiarism error:', error);
    throw error;
  }
};

// ==================== OTHER API ====================

