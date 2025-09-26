import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { updateProfile, changePassword } from "../services/api";
import Swal from "sweetalert2";

const Profile = () => {
  const { user, setUser } = useAuth();
  
  // Profile form state
  const [profileData, setProfileData] = useState({
    name: "",
    email: "",
  });
  
  // Password form state
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  
  // Loading states
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  
  // Form validation states
  const [profileErrors, setProfileErrors] = useState({});
  const [passwordErrors, setPasswordErrors] = useState({});
  
  // Active tab state
  const [activeTab, setActiveTab] = useState("profile");
  
  // Password visibility states
  const [showPasswords, setShowPasswords] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  });

  // Initialize form data with user info
  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name || "",
        email: user.email || "",
      });
    }
  }, [user]);

  // Validate profile form
  const validateProfileForm = () => {
    const errors = {};
    
    if (!profileData.name.trim()) {
      errors.name = "Tên không được để trống";
    } else if (profileData.name.trim().length < 2) {
      errors.name = "Tên phải có ít nhất 2 ký tự";
    } else if (profileData.name.trim().length > 50) {
      errors.name = "Tên không được quá 50 ký tự";
    } else if (!/^[a-zA-ZÀ-ỹĂăÂâÊêÔôƠơƯưĐđ\s]+$/.test(profileData.name.trim())) {
      errors.name = "Tên chỉ được chứa chữ cái và khoảng trắng";
    }
    
    if (!profileData.email.trim()) {
      errors.email = "Email không được để trống";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profileData.email)) {
      errors.email = "Email không hợp lệ";
    }
    
    setProfileErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Validate password form
  const validatePasswordForm = () => {
    const errors = {};
    
    if (!passwordData.currentPassword) {
      errors.currentPassword = "Vui lòng nhập mật khẩu hiện tại";
    }
    
    if (!passwordData.newPassword) {
      errors.newPassword = "Vui lòng nhập mật khẩu mới";
    } else if (passwordData.newPassword.length < 6) {
      errors.newPassword = "Mật khẩu mới phải có ít nhất 6 ký tự";
    } else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(passwordData.newPassword)) {
      errors.newPassword = "Mật khẩu mới phải chứa ít nhất 1 chữ thường, 1 chữ hoa và 1 số";
    }
    
    if (!passwordData.confirmPassword) {
      errors.confirmPassword = "Vui lòng xác nhận mật khẩu mới";
    } else if (passwordData.newPassword !== passwordData.confirmPassword) {
      errors.confirmPassword = "Mật khẩu xác nhận không khớp";
    }
    
    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle profile form input changes
  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (profileErrors[name]) {
      setProfileErrors(prev => ({
        ...prev,
        [name]: ""
      }));
    }
  };

  // Handle password form input changes
  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (passwordErrors[name]) {
      setPasswordErrors(prev => ({
        ...prev,
        [name]: ""
      }));
    }
  };

  // Handle profile update
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateProfileForm()) {
      return;
    }
    
    setIsUpdatingProfile(true);
    
    try {
      const dataToSend = {
        name: profileData.name.trim(),
        email: profileData.email.trim(),
      };
      
      console.log("Sending profile data:", dataToSend);
      
      const response = await updateProfile(dataToSend);
      
      if (response.success) {
        // Update user context
        setUser(response.data.user);
        
        // Show success alert
        Swal.fire({
          icon: 'success',
          title: 'Thành công!',
          text: 'Cập nhật thông tin thành công!',
          confirmButtonText: 'OK',
          confirmButtonColor: '#10b981',
          timer: 2000,
          timerProgressBar: true
        });
      }
    } catch (error) {
      console.error("Profile update error:", error);
      
      // Handle validation errors from backend
      if (error.details && Array.isArray(error.details)) {
        const backendErrors = {};
        const errorMessages = [];
        
        error.details.forEach(detail => {
          if (detail.path) {
            backendErrors[detail.path] = detail.msg;
            errorMessages.push(`• ${detail.msg}`);
          }
        });
        
        setProfileErrors(prev => ({ ...prev, ...backendErrors }));
        
        // Show validation error alert
        Swal.fire({
          icon: 'error',
          title: 'Dữ liệu không hợp lệ!',
          html: `<div style="text-align: left;">${errorMessages.join('<br>')}</div>`,
          confirmButtonText: 'OK',
          confirmButtonColor: '#ef4444'
        });
      } else {
        // Show general error alert
        Swal.fire({
          icon: 'error',
          title: 'Có lỗi xảy ra!',
          text: error.message || "Có lỗi xảy ra khi cập nhật thông tin",
          confirmButtonText: 'OK',
          confirmButtonColor: '#ef4444'
        });
      }
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  // Toggle password visibility
  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  // Handle password change
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    
    if (!validatePasswordForm()) {
      return;
    }

    // Show confirmation dialog
    const result = await Swal.fire({
      icon: 'question',
      title: 'Xác nhận đổi mật khẩu',
      text: 'Bạn có chắc chắn muốn đổi mật khẩu không?',
      showCancelButton: true,
      confirmButtonText: 'Đồng ý',
      cancelButtonText: 'Hủy',
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#6b7280'
    });

    if (!result.isConfirmed) {
      return;
    }
    
    setIsChangingPassword(true);
    
    try {
      const response = await changePassword(
        passwordData.currentPassword,
        passwordData.newPassword
      );
      
      if (response.success) {
        // Clear password form
        setPasswordData({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
        
        // Show success alert
        Swal.fire({
          icon: 'success',
          title: 'Thành công!',
          text: 'Đổi mật khẩu thành công!',
          confirmButtonText: 'OK',
          confirmButtonColor: '#10b981',
          timer: 2000,
          timerProgressBar: true
        });
      }
    } catch (error) {
      console.error("Password change error:", error);
      
      // Handle validation errors from backend
      if (error.details && Array.isArray(error.details)) {
        const backendErrors = {};
        const errorMessages = [];
        
        error.details.forEach(detail => {
          if (detail.path) {
            backendErrors[detail.path] = detail.msg;
            errorMessages.push(`• ${detail.msg}`);
          }
        });
        
        setPasswordErrors(prev => ({ ...prev, ...backendErrors }));
        
        // Show validation error alert
        Swal.fire({
          icon: 'error',
          title: 'Dữ liệu không hợp lệ!',
          html: `<div style="text-align: left;">${errorMessages.join('<br>')}</div>`,
          confirmButtonText: 'OK',
          confirmButtonColor: '#ef4444'
        });
      } else {
        // Show general error alert
        Swal.fire({
          icon: 'error',
          title: 'Có lỗi xảy ra!',
          text: error.message || "Có lỗi xảy ra khi đổi mật khẩu",
          confirmButtonText: 'OK',
          confirmButtonColor: '#ef4444'
        });
      }
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="min-h-screen py-8 bg-neutral-50">
      <div className="container px-4 mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-neutral-800 mb-2">
            Thông tin cá nhân
          </h1>
          <p className="text-neutral-600">
            Quản lý thông tin tài khoản và bảo mật của bạn
          </p>
        </div>

        {/* User Info Card */}
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 shadow-lg">
              <span className="text-2xl font-bold text-white">
                {user?.avatar || user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-neutral-800">
                {user?.name || 'Người dùng'}
              </h2>
              <p className="text-neutral-600">{user?.email}</p>
              {user?.role === 'admin' && (
                <span className="inline-flex px-2 py-1 mt-1 text-xs font-semibold text-purple-800 bg-purple-100 rounded-full">
                  Quản trị viên
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
          <div className="border-b border-neutral-200">
            <nav className="flex">
              <button
                onClick={() => setActiveTab("profile")}
                className={`px-6 py-4 text-sm font-medium transition-colors ${
                  activeTab === "profile"
                    ? "text-primary-600 border-b-2 border-primary-600 bg-primary-50"
                    : "text-neutral-600 hover:text-neutral-800 hover:bg-neutral-50"
                }`}
              >
                <span className="flex items-center gap-2">
                  <span>👤</span>
                  Thông tin cá nhân
                </span>
              </button>
              <button
                onClick={() => setActiveTab("password")}
                className={`px-6 py-4 text-sm font-medium transition-colors ${
                  activeTab === "password"
                    ? "text-primary-600 border-b-2 border-primary-600 bg-primary-50"
                    : "text-neutral-600 hover:text-neutral-800 hover:bg-neutral-50"
                }`}
              >
                <span className="flex items-center gap-2">
                  <span>🔒</span>
                  Đổi mật khẩu
                </span>
              </button>
            </nav>
          </div>

          <div className="p-6">
            {/* Profile Tab */}
            {activeTab === "profile" && (
              <form onSubmit={handleProfileSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Họ và tên
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={profileData.name}
                    onChange={handleProfileChange}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${
                      profileErrors.name
                        ? "border-red-300 focus:ring-red-500 focus:border-red-500"
                        : "border-neutral-300"
                    }`}
                    placeholder="Nhập họ và tên của bạn"
                  />
                  {profileErrors.name && (
                    <p className="mt-1 text-sm text-red-600">{profileErrors.name}</p>
                  )}
                  <p className="mt-1 text-xs text-neutral-500">
                    Tên phải từ 2-50 ký tự, chỉ chứa chữ cái và khoảng trắng
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={profileData.email}
                    onChange={handleProfileChange}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${
                      profileErrors.email
                        ? "border-red-300 focus:ring-red-500 focus:border-red-500"
                        : "border-neutral-300"
                    }`}
                    placeholder="Nhập email của bạn"
                  />
                  {profileErrors.email && (
                    <p className="mt-1 text-sm text-red-600">{profileErrors.email}</p>
                  )}
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isUpdatingProfile}
                    className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isUpdatingProfile ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Đang cập nhật...
                      </>
                    ) : (
                      <>
                        <span>💾</span>
                        Cập nhật thông tin
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* Password Tab */}
            {activeTab === "password" && (
              <form onSubmit={handlePasswordSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Mật khẩu hiện tại
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswords.currentPassword ? "text" : "password"}
                      name="currentPassword"
                      value={passwordData.currentPassword}
                      onChange={handlePasswordChange}
                      className={`w-full px-4 py-3 pr-12 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${
                        passwordErrors.currentPassword
                          ? "border-red-300 focus:ring-red-500 focus:border-red-500"
                          : "border-neutral-300"
                      }`}
                      placeholder="Nhập mật khẩu hiện tại"
                    />
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility('currentPassword')}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-neutral-400 hover:text-neutral-600 transition-colors"
                    >
                      {showPasswords.currentPassword ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                  {passwordErrors.currentPassword && (
                    <p className="mt-1 text-sm text-red-600">{passwordErrors.currentPassword}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Mật khẩu mới
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswords.newPassword ? "text" : "password"}
                      name="newPassword"
                      value={passwordData.newPassword}
                      onChange={handlePasswordChange}
                      className={`w-full px-4 py-3 pr-12 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${
                        passwordErrors.newPassword
                          ? "border-red-300 focus:ring-red-500 focus:border-red-500"
                          : "border-neutral-300"
                      }`}
                      placeholder="Nhập mật khẩu mới (ít nhất 6 ký tự)"
                    />
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility('newPassword')}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-neutral-400 hover:text-neutral-600 transition-colors"
                    >
                      {showPasswords.newPassword ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                  {passwordErrors.newPassword && (
                    <p className="mt-1 text-sm text-red-600">{passwordErrors.newPassword}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Xác nhận mật khẩu mới
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswords.confirmPassword ? "text" : "password"}
                      name="confirmPassword"
                      value={passwordData.confirmPassword}
                      onChange={handlePasswordChange}
                      className={`w-full px-4 py-3 pr-12 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${
                        passwordErrors.confirmPassword
                          ? "border-red-300 focus:ring-red-500 focus:border-red-500"
                          : "border-neutral-300"
                      }`}
                      placeholder="Nhập lại mật khẩu mới"
                    />
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility('confirmPassword')}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-neutral-400 hover:text-neutral-600 transition-colors"
                    >
                      {showPasswords.confirmPassword ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                  {passwordErrors.confirmPassword && (
                    <p className="mt-1 text-sm text-red-600">{passwordErrors.confirmPassword}</p>
                  )}
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-amber-600 text-lg">⚠️</span>
                    <div>
                      <h4 className="text-sm font-medium text-amber-800 mb-1">
                        Lưu ý khi đổi mật khẩu
                      </h4>
                      <ul className="text-sm text-amber-700 space-y-1">
                        <li>• Mật khẩu mới phải có ít nhất 6 ký tự</li>
                        <li>• Phải chứa ít nhất 1 chữ hoa, 1 chữ thường và 1 số</li>
                        <li>• Không sử dụng thông tin cá nhân dễ đoán</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isChangingPassword}
                    className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isChangingPassword ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Đang đổi mật khẩu...
                      </>
                    ) : (
                      <>
                        <span>🔐</span>
                        Đổi mật khẩu
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;