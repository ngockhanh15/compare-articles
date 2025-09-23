// API base URL - tự động detect production vs development
const getApiBaseUrl = () => {
  // Trong production, sử dụng backend domain
  if (import.meta.env.PROD) {
    return import.meta.env.VITE_API_BASE_URL || "https://compare-articles-a7oh.vercel.app";
  }
  // Trong development, sử dụng localhost
  return import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";
};

const API_BASE_URL = `${getApiBaseUrl()}/api`;

// Debug logging
console.log('Environment:', import.meta.env.MODE);
console.log('API Base URL:', API_BASE_URL);

// Helper function to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

// Helper function to create fetch with timeout
const fetchWithTimeout = async (url, options = {}, timeout = 30000) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Request timeout - Vui lòng thử lại');
    }
    throw error;
  }
};

// Helper function to handle API responses
const handleResponse = async (response) => {
  try {
    // Check if response has content
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      console.error("Non-JSON response received:", {
        status: response.status,
        statusText: response.statusText,
        contentType: contentType,
        url: response.url
      });
      
      // Try to get text content for debugging
      const text = await response.text();
      console.error("Response text:", text);
      
      throw new Error(`Server trả về response không hợp lệ (${response.status})`);
    }

    const data = await response.json();
    console.log("Response data structure:", {
      hasSuccess: 'success' in data,
      hasError: 'error' in data,
      hasMessage: 'message' in data,
      keys: Object.keys(data)
    });

    if (!response.ok) {
      // If token is expired or invalid, clear local storage
      if (response.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      }
      
      const errorMessage = data.error || data.message || `HTTP ${response.status}: ${response.statusText}`;
      const err = new Error(errorMessage);
      if (data && data.details) err.details = data.details;
      throw err;
    }

    return data;
  } catch (error) {
    // Handle JSON parsing errors
    if (error instanceof SyntaxError) {
      console.error("JSON parsing error:", error);
      throw new Error("Server response không thể parse JSON");
    }
    // Re-throw other errors (including our custom errors from above)
    throw error;
  }
};

// ==================== AUTH API ====================

// Đăng ký tài khoản
export const register = async (userData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: userData.name,
        email: userData.email,
        password: userData.password,
        confirmPassword: userData.confirmPassword,
      }),
    });

    const data = await handleResponse(response);

    // Save token and user data to localStorage nếu đăng ký thành công
    if (data.success && data.data.token) {
      localStorage.setItem("token", data.data.token);
      localStorage.setItem("user", JSON.stringify(data.data.user));
    }

    return data;
  } catch (error) {
    console.error("Register error:", error);
    throw error;
  }
};

// Admin create user without changing current session
export const adminCreateUser = async (userData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({
  name: (userData.name || "").trim(),
  email: (userData.email || "").trim(),
        password: userData.password,
        confirmPassword: userData.confirmPassword || userData.password,
        // server ignores role here; we'll set via /users/:id/role if needed
      }),
    });

    // Do NOT store token/user from response
    return await handleResponse(response);
  } catch (error) {
    console.error("Admin create user error:", error);
    throw error;
  }
};

// Đăng nhập
export const login = async (email, password) => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await handleResponse(response);

    // Save token and user data to localStorage
    if (data.success && data.data.token) {
      localStorage.setItem("token", data.data.token);
      localStorage.setItem("user", JSON.stringify(data.data.user));
    }

    return data;
  } catch (error) {
    console.error("Login error:", error);
    throw error;
  }
};

// Đăng xuất
export const logout = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/logout`, {
      method: "POST",
      headers: getAuthHeaders(),
    });

    // Clear local storage regardless of response
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.error("Logout error:", error);
    // Still clear local storage even if API call fails
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  }
};

// Lấy thông tin người dùng hiện tại
export const getCurrentUser = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      method: "GET",
      headers: getAuthHeaders(),
    });

    return await handleResponse(response);
  } catch (error) {
    console.error("Get current user error:", error);
    throw error;
  }
};

// Quên mật khẩu
export const forgotPassword = async (email) => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/forgotpassword`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
    });

    return await handleResponse(response);
  } catch (error) {
    console.error("Forgot password error:", error);
    throw error;
  }
};

// Đặt lại mật khẩu
export const resetPassword = async (resetToken, password) => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/auth/resetpassword/${resetToken}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          password,
          confirmPassword: password // Gửi confirmPassword giống với password
        }),
      }
    );

    const data = await handleResponse(response);

    // Save token and user data to localStorage
    if (data.success && data.data.token) {
      localStorage.setItem("token", data.data.token);
      localStorage.setItem("user", JSON.stringify(data.data.user));
    }

    return data;
  } catch (error) {
    console.error("Reset password error:", error);
    throw error;
  }
};

// Cập nhật thông tin profile
export const updateProfile = async (profileData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/updatedetails`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(profileData),
    });

    const data = await handleResponse(response);

    // Update user data in localStorage if successful
    if (data.success && data.data.user) {
      localStorage.setItem("user", JSON.stringify(data.data.user));
    }

    return data;
  } catch (error) {
    console.error("Update profile error:", error);
    throw error;
  }
};

// Thay đổi mật khẩu
export const changePassword = async (currentPassword, newPassword) => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/updatepassword`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify({
        currentPassword,
        newPassword,
        confirmNewPassword: newPassword,
      }),
    });

    return await handleResponse(response);
  } catch (error) {
    console.error("Change password error:", error);
    throw error;
  }
};

// ==================== TEXT CHECKER API ====================

// Upload file và extract text (old API - deprecated)
export const uploadFile = async (file) => {
  try {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`${API_BASE_URL}/plagiarism/upload`, {
      method: "POST",
      headers: {
        // Don't set Content-Type for FormData, let browser set it
        ...(localStorage.getItem("token") && {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        }),
      },
      body: formData,
    });

    return await handleResponse(response);
  } catch (error) {
    console.error("Upload file error:", error);
    throw error;
  }
};

// ==================== USER UPLOAD API (FOR PLAGIARISM CHECK ONLY) ====================

// Extract text from file (no plagiarism check)
export const extractTextFromFile = async (file) => {
  try {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`${API_BASE_URL}/user-upload/extract-text`, {
      method: "POST",
      headers: {
        // Don't set Content-Type for FormData, let browser set it
        ...(localStorage.getItem("token") && {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        }),
      },
      body: formData,
    });

    return await handleResponse(response);
  } catch (error) {
    console.error("Extract text from file error:", error);
    throw error;
  }
};

// Upload file for plagiarism check (temporary, not saved)
export const uploadFileForCheck = async (file, options = {}) => {
  try {
    const formData = new FormData();
    formData.append("file", file);

    // Add check options
    if (options.sensitivity)
      formData.append("sensitivity", options.sensitivity);
    if (options.language) formData.append("language", options.language);

    const response = await fetch(`${API_BASE_URL}/user-upload/check-file`, {
      method: "POST",
      headers: {
        // Don't set Content-Type for FormData, let browser set it
        ...(localStorage.getItem("token") && {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        }),
      },
      body: formData,
    });

    return await handleResponse(response);
  } catch (error) {
    console.error("Upload file for check error:", error);
    throw error;
  }
};

// Check text content for plagiarism (no file upload)
export const checkTextContent = async (text, options = {}) => {
  try {
    const response = await fetch(`${API_BASE_URL}/user-upload/check-text`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({
        text: text,
        options: {
          sensitivity: "medium",
          language: "vi",
          ...options,
        },
      }),
    });

    return await handleResponse(response);
  } catch (error) {
    console.error("Check text content error:", error);
    throw error;
  }
};

// Get AVL tree statistics
export const getTreeStats = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/user-upload/tree-stats`, {
      method: "GET",
      headers: getAuthHeaders(),
    });

    return await handleResponse(response);
  } catch (error) {
    console.error("Get tree stats error:", error);
    throw error;
  }
};

// Kiểm tra plagiarism
export const checkPlagiarism = async (
  text,
  options = {},
  fileName = null,
  fileType = null
) => {
  try {
    const response = await fetch(`${API_BASE_URL}/check-plagiarism`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({
        text: text,
        fileName: fileName,
        fileType: fileType,
        options: {
          checkInternet: true,
          checkDatabase: true,
          sensitivity: "medium",
          ...options,
        },
      }),
    });

    return await handleResponse(response);
  } catch (error) {
    console.error("Check plagiarism error:", error);
    throw error;
  }
};

// Kiểm tra trùng lặp với documents đã upload (sử dụng DocumentAVLService)
// Trong file api.js hoặc tương tự
export const checkDocumentSimilarity = async (
  text,
  options,
  fileName,
  fileType
) => {
  try {
    const response = await fetch(`${API_BASE_URL}/check-document-similarity`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({
        text,
        options,
        fileName,
        fileType,
      }),
    });

    return await handleResponse(response);
  } catch (error) {
    console.error("Error checking document similarity:", error);
    throw error;
  }
};

export const getDetailedComparison = async (checkId) => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/plagiarism/${checkId}/detailed-comparison`,
      {
        method: "GET",
        headers: getAuthHeaders(),
      }
    );

    return await handleResponse(response);
  } catch (error) {
    console.error("Error getting detailed comparison:", error);
    throw error;
  }
};

// Lấy danh sách so sánh với tất cả documents
export const getAllDocumentsComparison = async (checkId) => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/plagiarism/${checkId}/all-documents-comparison`,
      {
        method: "GET",
        headers: getAuthHeaders(),
      }
    );

    return await handleResponse(response);
  } catch (error) {
    console.error("Get all documents comparison error:", error);
    throw error;
  }
};

// Lấy so sánh chi tiết với tất cả documents (bao gồm highlighted text)
export const getDetailedAllDocumentsComparison = async (checkId) => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/plagiarism/${checkId}/detailed-all-documents-comparison`,
      {
        method: "GET",
        headers: getAuthHeaders(),
      }
    );

    return await handleResponse(response);
  } catch (error) {
    console.error("Get detailed all documents comparison error:", error);
    throw error;
  }
};

// Lấy thống kê hệ thống (detection + cache)
export const getSystemStats = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/system/stats`, {
      method: "GET",
      headers: getAuthHeaders(),
    });

    return await handleResponse(response);
  } catch (error) {
    console.error("Get system stats error:", error);
    throw error;
  }
};

// Khởi tạo lại hệ thống plagiarism detection (admin only)
export const initializeSystem = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/system/initialize`, {
      method: "POST",
      headers: getAuthHeaders(),
    });

    return await handleResponse(response);
  } catch (error) {
    console.error("Initialize system error:", error);
    throw error;
  }
};

// Lấy thống kê cache
export const getCacheStats = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/cache/stats`, {
      method: "GET",
      headers: getAuthHeaders(),
    });

    return await handleResponse(response);
  } catch (error) {
    console.error("Get cache stats error:", error);
    throw error;
  }
};

// Tìm văn bản tương tự trong cache
export const findSimilarTexts = async (text, threshold = 0.8) => {
  try {
    const response = await fetch(`${API_BASE_URL}/cache/find-similar`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({
        text: text,
        threshold: threshold,
      }),
    });

    return await handleResponse(response);
  } catch (error) {
    console.error("Find similar texts error:", error);
    throw error;
  }
};

// Xóa toàn bộ cache (admin only)
export const clearCache = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/cache/clear`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });

    return await handleResponse(response);
  } catch (error) {
    console.error("Clear cache error:", error);
    throw error;
  }
};

// ==================== DOCUMENT MANAGEMENT API ====================

// Upload document (persistent storage)
export const uploadDocument = async (file, metadata = {}) => {
  try {
    const formData = new FormData();
    formData.append("file", file);

    // Add metadata
    if (metadata.title) formData.append("title", metadata.title);
    if (metadata.author) formData.append("author", metadata.author);
    if (metadata.description)
      formData.append("description", metadata.description);
    if (metadata.tags) formData.append("tags", metadata.tags);
    if (metadata.isPublic !== undefined)
      formData.append("isPublic", true);

    const response = await fetch(`${API_BASE_URL}/documents/upload`, {
      method: "POST",
      headers: {
        // Don't set Content-Type for FormData, let browser set it
        ...(localStorage.getItem("token") && {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        }),
      },
      body: formData,
    });

    return await handleResponse(response);
  } catch (error) {
    console.error("Upload document error:", error);
    throw error;
  }
};

// Bulk upload documents from zip file
export const bulkUploadDocuments = async (zipFile, onProgress = null) => {
  try {
    const formData = new FormData();
    formData.append("zipFile", zipFile);

    const response = await fetch(`${API_BASE_URL}/documents/bulk-upload`, {
      method: "POST",
      headers: {
        // Don't set Content-Type for FormData, let browser set it
        ...(localStorage.getItem("token") && {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        }),
      },
      body: formData,
    });

    return await handleResponse(response);
  } catch (error) {
    console.error("Bulk upload documents error:", error);
    throw error;
  }
};

// Get user documents with pagination and filters
export const getUserDocuments = async (params = {}) => {
  try {
    const queryParams = new URLSearchParams();

    if (params.page) queryParams.append("page", params.page);
    if (params.limit) queryParams.append("limit", params.limit);
    if (params.search) queryParams.append("search", params.search);
    if (params.fileType) queryParams.append("fileType", params.fileType);
    if (params.status) queryParams.append("status", params.status);
    if (params.sortBy) queryParams.append("sortBy", params.sortBy);
    if (params.sortOrder) queryParams.append("sortOrder", params.sortOrder);
    if (params.startDate) queryParams.append("startDate", params.startDate);
    if (params.endDate) queryParams.append("endDate", params.endDate);

    const response = await fetch(
      `${API_BASE_URL}/documents?${queryParams.toString()}`,
      {
        method: "GET",
        headers: getAuthHeaders(),
      }
    );

    return await handleResponse(response);
  } catch (error) {
    console.error("Get user documents error:", error);
    throw error;
  }
};

// Get document by ID
export const getDocumentById = async (documentId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/documents/${documentId}`, {
      method: "GET",
      headers: getAuthHeaders(),
    });

    return await handleResponse(response);
  } catch (error) {
    console.error("Get document by ID error:", error);
    throw error;
  }
};

// Get extracted text from document for plagiarism check
export const getDocumentText = async (documentId) => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/documents/${documentId}/text`,
      {
        method: "GET",
        headers: getAuthHeaders(),
      }
    );

    return await handleResponse(response);
  } catch (error) {
    console.error("Get document text error:", error);
    throw error;
  }
};

// Download document
export const downloadDocument = async (documentId) => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/documents/${documentId}/download`,
      {
        method: "GET",
        headers: {
          ...(localStorage.getItem("token") && {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          }),
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Download failed");
    }

    // Return the response for blob handling
    return response;
  } catch (error) {
    console.error("Download document error:", error);
    throw error;
  }
};

// Update document metadata
export const updateDocument = async (documentId, metadata) => {
  try {
    const response = await fetch(`${API_BASE_URL}/documents/${documentId}`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(metadata),
    });

    return await handleResponse(response);
  } catch (error) {
    console.error("Update document error:", error);
    throw error;
  }
};

// Delete document
export const deleteDocument = async (documentId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/documents/${documentId}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });

    return await handleResponse(response);
  } catch (error) {
    console.error("Delete document error:", error);
    throw error;
  }
};

// Get document statistics
export const getDocumentStats = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/documents/stats`, {
      method: "GET",
      headers: getAuthHeaders(),
    });

    return await handleResponse(response);
  } catch (error) {
    console.error("Get document stats error:", error);
    throw error;
  }
};

// ==================== ADMIN DOCUMENT MANAGEMENT API ====================

// Get all documents for admin with pagination and filters
export const getAllDocuments = async (params = {}) => {
  try {
    const queryParams = new URLSearchParams();

    if (params.page) queryParams.append("page", params.page);
    if (params.limit) queryParams.append("limit", params.limit);
    if (params.search) queryParams.append("search", params.search);
    if (params.fileType) queryParams.append("fileType", params.fileType);
    if (params.status) queryParams.append("status", params.status);
    if (params.sortBy) queryParams.append("sortBy", params.sortBy);
    if (params.sortOrder) queryParams.append("sortOrder", params.sortOrder);
    if (params.startDate) queryParams.append("startDate", params.startDate);
    if (params.endDate) queryParams.append("endDate", params.endDate);

    const response = await fetch(
      `${API_BASE_URL}/documents/admin/all?${queryParams.toString()}`,
      {
        method: "GET",
        headers: getAuthHeaders(),
      }
    );

    return await handleResponse(response);
  } catch (error) {
    console.error("Get all documents error:", error);
    throw error;
  }
};

// Get all document statistics for admin
export const getAllDocumentStats = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/documents/admin/stats`, {
      method: "GET",
      headers: getAuthHeaders(),
    });

    return await handleResponse(response);
  } catch (error) {
    console.error("Get all document stats error:", error);
    throw error;
  }
};

// Admin delete any document
export const adminDeleteDocument = async (documentId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/documents/admin/${documentId}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });

    return await handleResponse(response);
  } catch (error) {
    console.error("Admin delete document error:", error);
    throw error;
  }
};

// Get uploaded files (legacy support - now uses getUserDocuments)
export const getUploadedFiles = async (params = {}) => {
  try {
    const queryParams = new URLSearchParams();

    if (params.page) queryParams.append("page", params.page);
    if (params.limit) queryParams.append("limit", params.limit);
    if (params.search) queryParams.append("search", params.search);
    if (params.fileType) queryParams.append("fileType", params.fileType);
    if (params.status) queryParams.append("status", params.status);

    const response = await fetch(
      `${API_BASE_URL}/files?${queryParams.toString()}`,
      {
        method: "GET",
        headers: getAuthHeaders(),
      }
    );

    return await handleResponse(response);
  } catch (error) {
    console.error("Get uploaded files error:", error);
    throw error;
  }
};

export const getForHome = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/home`, {
      method: "GET",
      headers: getAuthHeaders(),
    });

    return await handleResponse(response);
  } catch (error) {
    console.error("Get for home error:", error);
    throw error;
  }
};

// ==================== USER MANAGEMENT API ====================

// Lấy danh sách tất cả người dùng (Admin only)
export const getAllUsers = async (params = {}) => {
  try {
    const queryParams = new URLSearchParams();

    if (params.page) queryParams.append("page", params.page);
    if (params.limit) queryParams.append("limit", params.limit);
    if (params.search) queryParams.append("search", params.search);
    if (params.role) queryParams.append("role", params.role);
    if (params.dateFrom) queryParams.append("dateFrom", params.dateFrom);
    if (params.dateTo) queryParams.append("dateTo", params.dateTo);
    if (params.sortBy) queryParams.append("sortBy", params.sortBy);
    if (params.sortOrder) queryParams.append("sortOrder", params.sortOrder);

    const response = await fetch(
      `${API_BASE_URL}/users?${queryParams.toString()}`,
      {
        method: "GET",
        headers: getAuthHeaders(),
      }
    );

    return await handleResponse(response);
  } catch (error) {
    console.error("Get all users error:", error);
    throw error;
  }
};

// Lấy thông tin người dùng theo ID
export const getUserById = async (userId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
      method: "GET",
      headers: getAuthHeaders(),
    });

    return await handleResponse(response);
  } catch (error) {
    console.error("Get user by ID error:", error);
    throw error;
  }
};

// Kích hoạt/vô hiệu hóa người dùng
export const toggleUserStatus = async (userId) => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/users/${userId}/toggle-status`,
      {
        method: "PUT",
        headers: getAuthHeaders(),
      }
    );

    return await handleResponse(response);
  } catch (error) {
    console.error("Toggle user status error:", error);
    throw error;
  }
};

// Cập nhật vai trò người dùng
export const updateUserRole = async (userId, role) => {
  try {
    const response = await fetch(`${API_BASE_URL}/users/${userId}/role`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify({ role }),
    });

    return await handleResponse(response);
  } catch (error) {
    console.error("Update user role error:", error);
    throw error;
  }
};

// Xóa người dùng
export const deleteUser = async (userId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });

    return await handleResponse(response);
  } catch (error) {
    console.error("Delete user error:", error);
    throw error;
  }
};

// Lấy thống kê người dùng
export const getUserStats = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/users/stats`, {
      method: "GET",
      headers: getAuthHeaders(),
    });

    return await handleResponse(response);
  } catch (error) {
    console.error("Get user stats error:", error);
    throw error;
  }
};

// Reset mật khẩu người dùng
export const resetUserPassword = async (userId, newPassword) => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/users/${userId}/reset-password`,
      {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({ newPassword }),
      }
    );

    return await handleResponse(response);
  } catch (error) {
    console.error("Reset user password error:", error);
    throw error;
  }
};

// ==================== AUDIT LOGS ====================
export const createAuditLog = async (logData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/audit-logs`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(logData),
    });

    return await handleResponse(response);
  } catch (error) {
    console.error("Create audit log error:", error);
    throw error;
  }
};

export const getAuditLogs = async (page = 1, limit = 5, filters = {}) => {
  try {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    // Thêm các tham số tìm kiếm nếu có
    if (filters.user) params.append('user', filters.user);
    if (filters.action) params.append('action', filters.action);
    if (filters.fromDate) params.append('fromDate', filters.fromDate);
    if (filters.toDate) params.append('toDate', filters.toDate);

    const response = await fetch(
      `${API_BASE_URL}/audit-logs?${params.toString()}`,
      {
        method: "GET",
        headers: getAuthHeaders(),
      }
    );
    return await handleResponse(response);
  } catch (error) {
    console.error("Get audit logs error:", error);
    throw error;
  }
};

// ==================== PLAGIARISM HISTORY API ====================
export const getPlagiarismHistory = async (limit = 10, offset = 0, filters = {}) => {
  try {
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
    });

    // Add filters if provided (no userName filter since it's automatically filtered by current user)
    if (filters.status) params.append('status', filters.status);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);

    const response = await fetch(
      `${API_BASE_URL}/plagiarism-history?${params.toString()}`,
      {
        method: "GET",
        headers: getAuthHeaders(),
      }
    );

    return await handleResponse(response);
  } catch (error) {
    console.error("Get plagiarism history error:", error);
    throw error;
  }
};

// Get all plagiarism history for admin
export const getAllPlagiarismHistory = async (limit = 10, offset = 0, filters = {}) => {
  try {
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
    });

    // Add filters if provided
    if (filters.userName) params.append('userName', filters.userName);
    if (filters.status) params.append('status', filters.status);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);

    const response = await fetch(
      `${API_BASE_URL}/admin/plagiarism-history?${params.toString()}`,
      {
        method: "GET",
        headers: getAuthHeaders(),
      }
    );

    return await handleResponse(response);
  } catch (error) {
    console.error("Get all plagiarism history error:", error);
    throw error;
  }
};

// ==================== STATISTICS REPORT API ====================

// Get document upload statistics by month
export const getDocumentUploadStats = async (startDate, endDate) => {
  try {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    const response = await fetch(
      `${API_BASE_URL}/documents/admin/stats/document-uploads?${params.toString()}`,
      {
        method: "GET",
        headers: getAuthHeaders(),
      }
    );

    return await handleResponse(response);
  } catch (error) {
    console.error("Get document upload stats error:", error);
    throw error;
  }
};

// Get plagiarism check statistics by month
export const getPlagiarismCheckStats = async (startDate, endDate) => {
  try {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    const response = await fetch(
      `${API_BASE_URL}/admin/stats/plagiarism-checks?${params.toString()}`,
      {
        method: "GET",
        headers: getAuthHeaders(),
      }
    );

    return await handleResponse(response);
  } catch (error) {
    console.error("Get plagiarism check stats error:", error);
    throw error;
  }
};

// ==================== THRESHOLD MANAGEMENT API ====================

// Get system thresholds
export const getThresholds = async () => {
  try {
    console.log("API: Sending GET request to fetch thresholds");
    
    const response = await fetchWithTimeout(`${API_BASE_URL}/admin/thresholds`, {
      method: "GET",
      headers: getAuthHeaders(),
    }, 15000); // 15 second timeout

    console.log("API: Response status:", response.status, response.statusText);
    
    const data = await handleResponse(response);
    console.log("API: Parsed response data:", data);
    
    return data;
  } catch (error) {
    console.error("Get thresholds error:", error);
    throw error;
  }
};

// Update system thresholds
export const updateThresholds = async (thresholds) => {
  try {
    console.log("API: Sending PUT request to update thresholds:", thresholds);
    
    const response = await fetchWithTimeout(`${API_BASE_URL}/admin/thresholds`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(thresholds),
    }, 15000); // 15 second timeout

    console.log("API: Response status:", response.status, response.statusText);
    
    const data = await handleResponse(response);
    console.log("API: Parsed response data:", data);
    
    return data;
  } catch (error) {
    console.error("Update thresholds error:", error);
    throw error;
  }
};

// Reset thresholds to default
export const resetThresholds = async (notes = "") => {
  try {
    console.log("API: Sending POST request to reset thresholds:", { notes });
    
    const response = await fetchWithTimeout(`${API_BASE_URL}/admin/thresholds/reset`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ notes }),
    }, 15000); // 15 second timeout

    console.log("API: Response status:", response.status, response.statusText);
    
    const data = await handleResponse(response);
    console.log("API: Parsed response data:", data);
    
    return data;
  } catch (error) {
    console.error("Reset thresholds error:", error);
    throw error;
  }
};

// Get threshold history
export const getThresholdHistory = async (params = {}) => {
  try {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append("page", params.page);
    if (params.limit) queryParams.append("limit", params.limit);

    const response = await fetch(
      `${API_BASE_URL}/admin/thresholds/history?${queryParams.toString()}`,
      {
        method: "GET",
        headers: getAuthHeaders(),
      }
    );

    return await handleResponse(response);
  } catch (error) {
    console.error("Get threshold history error:", error);
    throw error;
  }
};

// ==================== OTHER API ====================
