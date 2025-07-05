import { useState } from "react";
import { Link } from "react-router-dom";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isEmailSent, setIsEmailSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      console.log("Reset password email sent to:", email);
      setIsLoading(false);
      setIsEmailSent(true);
    }, 1500);
  };

  if (isEmailSent) {
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
                  <span className="text-2xl">📧</span>
                </div>
                <h2 className="mb-2 text-2xl font-bold text-neutral-800">
                  Email đã được gửi!
                </h2>
                <p className="mb-6 text-neutral-600">
                  Chúng tôi đã gửi hướng dẫn đặt lại mật khẩu đến email <strong>{email}</strong>. 
                  Vui lòng kiểm tra hộp thư của bạn.
                </p>
                <div className="space-y-3">
                  <Link
                    to="/login"
                    className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-xl text-white bg-gradient-primary hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  >
                    Quay lại đăng nhập
                  </Link>
                  <button
                    onClick={() => {
                      setIsEmailSent(false);
                      setEmail("");
                    }}
                    className="flex justify-center w-full px-4 py-3 text-sm font-medium transition-all duration-200 bg-white border border-neutral-300 rounded-xl text-neutral-700 hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    Gửi lại email
                  </button>
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
            Quên mật khẩu?
          </h2>
          <p className="text-neutral-600">
            Nhập email của bạn để nhận hướng dẫn đặt lại mật khẩu
          </p>
        </div>

        {/* Forgot Password Form */}
        <div className="p-8 bg-white border shadow-xl rounded-2xl border-neutral-100">
          <form className="space-y-6" onSubmit={handleSubmit}>
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
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full py-3 pl-10 pr-3 transition-all duration-200 border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-neutral-50 focus:bg-white"
                  placeholder="Nhập email của bạn"
                />
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
                  Đang gửi email...
                </div>
              ) : (
                <>
                  <span className="mr-2">📧</span>
                  Gửi hướng dẫn
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

export default ForgotPassword;