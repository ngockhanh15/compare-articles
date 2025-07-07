import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const Register = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    agreeToTerms: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState("");

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
    
    // Clear error and success message when user starts typing
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: "",
      });
    }
    if (successMessage) {
      setSuccessMessage("");
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = "Vui lòng nhập họ tên";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Vui lòng nhập email";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Email không hợp lệ";
    }

    if (!formData.password) {
      newErrors.password = "Vui lòng nhập mật khẩu";
    } else if (formData.password.length < 6) {
      newErrors.password = "Mật khẩu phải có ít nhất 6 ký tự";
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Vui lòng xác nhận mật khẩu";
    } else if (formData.password.trim() !== formData.confirmPassword.trim()) {
      newErrors.confirmPassword = "Mật khẩu xác nhận không khớp";
    }

    if (!formData.agreeToTerms) {
      newErrors.agreeToTerms = "Vui lòng đồng ý với điều khoản sử dụng";
    }

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const newErrors = validateForm();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);
    setErrors({});
    setSuccessMessage("");
    
    try {
      const response = await register({
        name: formData.fullName,
        email: formData.email,
        password: formData.password,
        confirmPassword: formData.confirmPassword
      });

      if (response.success) {
        setSuccessMessage(response.message || "Đăng ký thành công! Chào mừng bạn đến với Filter Word App.");
        
        // Reset form
        setFormData({
          fullName: "",
          email: "",
          password: "",
          confirmPassword: "",
          agreeToTerms: false,
        });

        // Redirect to home page after 3 seconds vì đã tự động đăng nhập
        setTimeout(() => {
          navigate("/", { 
            state: { 
              message: "Đăng ký thành công! Chào mừng bạn đến với Filter Word App." 
            } 
          });
        }, 3000);
      }
    } catch (error) {
      console.error("Register error:", error);
      
      // Handle validation errors from backend
      if (error.message.includes('details')) {
        try {
          const errorData = JSON.parse(error.message);
          if (errorData.details) {
            const backendErrors = {};
            errorData.details.forEach(detail => {
              if (detail.path === 'name') backendErrors.fullName = detail.msg;
              else if (detail.path === 'email') backendErrors.email = detail.msg;
              else if (detail.path === 'password') backendErrors.password = detail.msg;
            });
            setErrors(backendErrors);
          }
        } catch {
          setErrors({ general: error.message });
        }
      } else {
        setErrors({ general: error.message });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleRegister = () => {
    // Implement Google OAuth registration
    console.log("Google register clicked");
  };

  // Bỏ function handleResendEmailVerification vì không cần xác thực email nữa

  return (
    <div className="flex items-center justify-center min-h-screen px-4 py-12 bg-gradient-to-br from-primary-50 via-white to-accent-50 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center">
          <Link to="/" className="inline-flex items-center justify-center mb-6">
            <div className="p-3 pt-2 pr-2 shadow-lg bg-gradient-primary rounded-2xl">
              <span className="text-3xl">🎯</span>
            </div>
          </Link>
          <h2 className="mb-2 text-3xl font-bold text-neutral-800">
            Tạo tài khoản mới
          </h2>
          <p className="text-neutral-600">
            Đăng ký để bắt đầu sử dụng dịch vụ
          </p>
        </div>

        {/* Register Form */}
        <div className="p-8 bg-white border shadow-xl rounded-2xl border-neutral-100">
          {/* Success Message */}
          {successMessage && (
            <div className="p-4 mb-6 border border-green-200 bg-green-50 rounded-xl">
              <div className="flex items-center">
                <span className="mr-2 text-green-500">✅</span>
                <p className="text-sm text-green-700">{successMessage}</p>
              </div>
              <div className="pt-3 mt-3 border-t border-green-200">
                <p className="text-xs text-green-600">
                  Bạn sẽ được chuyển hướng đến trang chủ trong giây lát...
                </p>
              </div>
            </div>
          )}

          {/* General Error Message */}
          {errors.general && (
            <div className="p-4 mb-6 border border-red-200 bg-red-50 rounded-xl">
              <div className="flex items-center">
                <span className="mr-2 text-red-500">❌</span>
                <p className="text-sm text-red-700">{errors.general}</p>
              </div>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Full Name Field */}
            <div>
              <label htmlFor="fullName" className="block mb-2 text-sm font-medium text-neutral-700">
                Họ và tên
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <span className="text-neutral-400">👤</span>
                </div>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={handleChange}
                  className={`block w-full pl-10 pr-3 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-neutral-50 focus:bg-white ${
                    errors.fullName ? "border-error-500" : "border-neutral-300"
                  }`}
                  placeholder="Nhập họ và tên"
                />
              </div>
              {errors.fullName && (
                <p className="mt-1 text-sm text-error-600">{errors.fullName}</p>
              )}
            </div>

            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block mb-2 text-sm font-medium text-neutral-700">
                Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <span className="text-neutral-400">📧</span>
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className={`block w-full pl-10 pr-3 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-neutral-50 focus:bg-white ${
                    errors.email ? "border-error-500" : "border-neutral-300"
                  }`}
                  placeholder="Nhập email của bạn"
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-sm text-error-600">{errors.email}</p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block mb-2 text-sm font-medium text-neutral-700">
                Mật khẩu
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <span className="text-neutral-400">🔒</span>
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className={`block w-full pl-10 pr-12 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-neutral-50 focus:bg-white ${
                    errors.password ? "border-error-500" : "border-neutral-300"
                  }`}
                  placeholder="Nhập mật khẩu (ít nhất 6 ký tự)"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3"
                >
                  <span className="text-neutral-400 hover:text-neutral-600">
                    {showPassword ? "🙈" : "👁️"}
                  </span>
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-error-600">{errors.password}</p>
              )}
            </div>

            {/* Confirm Password Field */}
            <div>
              <label htmlFor="confirmPassword" className="block mb-2 text-sm font-medium text-neutral-700">
                Xác nhận mật khẩu
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <span className="text-neutral-400">🔒</span>
                </div>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className={`block w-full pl-10 pr-12 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-neutral-50 focus:bg-white ${
                    errors.confirmPassword ? "border-error-500" : "border-neutral-300"
                  }`}
                  placeholder="Nhập lại mật khẩu"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3"
                >
                  <span className="text-neutral-400 hover:text-neutral-600">
                    {showConfirmPassword ? "🙈" : "👁️"}
                  </span>
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-error-600">{errors.confirmPassword}</p>
              )}
            </div>

            {/* Terms Agreement */}
            <div>
              <div className="flex items-start">
                <input
                  id="agreeToTerms"
                  name="agreeToTerms"
                  type="checkbox"
                  checked={formData.agreeToTerms}
                  onChange={handleChange}
                  className={`h-4 w-4 text-primary-600 focus:ring-primary-500 border-neutral-300 rounded mt-1 ${
                    errors.agreeToTerms ? "border-error-500" : ""
                  }`}
                />
                <label htmlFor="agreeToTerms" className="block ml-2 text-sm text-neutral-700">
                  Tôi đồng ý với{" "}
                  <Link to="/terms" className="font-medium text-primary-600 hover:text-primary-500">
                    Điều khoản sử dụng
                  </Link>{" "}
                  và{" "}
                  <Link to="/privacy" className="font-medium text-primary-600 hover:text-primary-500">
                    Chính sách bảo mật
                  </Link>
                </label>
              </div>
              {errors.agreeToTerms && (
                <p className="mt-1 text-sm text-error-600">{errors.agreeToTerms}</p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-xl text-white bg-gradient-primary hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="w-4 h-4 mr-2 border-b-2 border-white rounded-full animate-spin"></div>
                  Đang tạo tài khoản...
                </div>
              ) : (
                <>
                  <span className="mr-2">✨</span>
                  Tạo tài khoản
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-neutral-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-neutral-500">Hoặc</span>
              </div>
            </div>
          </div>

          {/* Google Register */}
          <button
            onClick={handleGoogleRegister}
            className="flex items-center justify-center w-full px-4 py-3 mt-4 text-sm font-medium transition-all duration-200 bg-white border shadow-sm border-neutral-300 rounded-xl text-neutral-700 hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 hover:shadow-md"
          >
            <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Đăng ký với Google
          </button>

          {/* Login Link */}
          <p className="mt-6 text-sm text-center text-neutral-600">
            Đã có tài khoản?{" "}
            <Link
              to="/login"
              className="font-medium transition-colors text-primary-600 hover:text-primary-500"
            >
              Đăng nhập ngay
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;