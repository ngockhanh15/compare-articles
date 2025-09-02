import { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { resetPassword } from "../services/api";

const ResetPassword = () => {
  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  
  const { resetToken } = useParams();
  const navigate = useNavigate();

  // Check if reset token exists
  useEffect(() => {
    if (!resetToken) {
      navigate("/forgot-password");
    }
  }, [resetToken, navigate]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    // Clear error when user starts typing
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError("Mật khẩu xác nhận không khớp");
      setIsLoading(false);
      return;
    }

    // Validate password length
    if (formData.password.length < 6) {
      setError("Mật khẩu phải có ít nhất 6 ký tự");
      setIsLoading(false);
      return;
    }

    try {
      const result = await resetPassword(resetToken, formData.password);
      
      if (result.success) {
        setIsSuccess(true);
        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate("/login", {
            state: {
              message: "Đặt lại mật khẩu thành công! Bạn đã được đăng nhập.",
            },
          });
        }, 3000);
      }
    } catch (error) {
      console.error("Reset password error:", error);
      setError(error.message || "Đã xảy ra lỗi khi đặt lại mật khẩu");
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="flex items-center justify-center min-h-screen px-4 py-12 bg-gradient-to-br from-primary-50 via-white to-accent-50 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <Link to="/" className="inline-flex items-center justify-center mb-6">
              <div className="p-3 pt-2 pr-2 shadow-lg bg-gradient-primary rounded-2xl">
                <span className="text-3xl">🎯</span>
              </div>
            </Link>
            <div className="p-8 border bg-success-50 border-success-200 rounded-2xl">
              <div className="text-center">
                <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-success-100">
                  <span className="text-2xl">✅</span>
                </div>
                <h2 className="mb-2 text-2xl font-bold text-neutral-800">
                  Đặt lại mật khẩu thành công!
                </h2>
                <p className="mb-6 text-neutral-600">
                  Mật khẩu của bạn đã được cập nhật. Bạn sẽ được chuyển hướng đến trang đăng nhập trong giây lát...
                </p>
                <div className="space-y-3">
                  <Link
                    to="/login"
                    className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-xl text-white bg-gradient-primary hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  >
                    Đăng nhập ngay
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
            Đặt lại mật khẩu
          </h2>
          <p className="text-neutral-600">
            Nhập mật khẩu mới cho tài khoản của bạn
          </p>
        </div>

        {/* Reset Password Form */}
        <div className="p-8 bg-white border shadow-xl rounded-2xl border-neutral-100">
          {/* Error Message */}
          {error && (
            <div className="p-4 mb-6 border border-red-200 bg-red-50 rounded-xl">
              <div className="flex items-center">
                <span className="mr-2 text-red-500">❌</span>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block mb-2 text-sm font-medium text-neutral-700">
                Mật khẩu mới
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
                  className="block w-full py-3 pl-10 pr-12 transition-all duration-200 border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-neutral-50 focus:bg-white"
                  placeholder="Nhập mật khẩu mới"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-neutral-400 hover:text-neutral-600"
                >
                  <span>{showPassword ? "🙈" : "👁️"}</span>
                </button>
              </div>
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
                  className="block w-full py-3 pl-10 pr-12 transition-all duration-200 border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-neutral-50 focus:bg-white"
                  placeholder="Nhập lại mật khẩu mới"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-neutral-400 hover:text-neutral-600"
                >
                  <span>{showConfirmPassword ? "🙈" : "👁️"}</span>
                </button>
              </div>
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
                  Đang đặt lại mật khẩu...
                </div>
              ) : (
                <>
                  <span className="mr-2">🔄</span>
                  Đặt lại mật khẩu
                </>
              )}
            </button>
          </form>

          {/* Back to Login */}
          <div className="mt-6 text-center">
            <Link
              to="/login"
              className="inline-flex items-center text-sm font-medium text-primary-600 hover:text-primary-500"
            >
              <span className="mr-1">←</span>
              Quay lại đăng nhập
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;