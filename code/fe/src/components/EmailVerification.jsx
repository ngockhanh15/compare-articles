import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const EmailVerification = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const { verifyEmail, resendEmailVerification } = useAuth();
  
  const [status, setStatus] = useState("verifying"); // verifying, success, error
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    const handleVerification = async () => {
      if (!token) {
        setStatus("error");
        setMessage("Token xác thực không hợp lệ");
        return;
      }

      try {
        const response = await verifyEmail(token);
        
        if (response.success) {
          setStatus("success");
          setMessage(response.message || "Email đã được xác thực thành công!");
          
          // Redirect to login after 3 seconds
          setTimeout(() => {
            navigate("/login", { 
              state: { 
                message: "Email đã được xác thực! Bạn có thể đăng nhập ngay bây giờ." 
              } 
            });
          }, 3000);
        }
      } catch (error) {
        console.error("Email verification error:", error);
        setStatus("error");
        setMessage(error.message || "Không thể xác thực email. Vui lòng thử lại.");
      }
    };

    handleVerification();
  }, [token, verifyEmail, navigate]);

  const handleResendVerification = async (e) => {
    e.preventDefault();
    
    if (!email.trim()) {
      setMessage("Vui lòng nhập email để gửi lại xác thực");
      return;
    }

    setIsResending(true);
    
    try {
      const response = await resendEmailVerification(email);
      
      if (response.success) {
        setMessage("Email xác thực đã được gửi lại! Vui lòng kiểm tra hộp thư của bạn.");
      }
    } catch (error) {
      console.error("Resend verification error:", error);
      setMessage(error.message || "Không thể gửi lại email xác thực. Vui lòng thử lại.");
    } finally {
      setIsResending(false);
    }
  };

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
            Xác thực Email
          </h2>
          <p className="text-neutral-600">
            {status === "verifying" && "Đang xác thực email của bạn..."}
            {status === "success" && "Email đã được xác thực thành công!"}
            {status === "error" && "Xác thực email thất bại"}
          </p>
        </div>

        {/* Content */}
        <div className="p-8 bg-white border shadow-xl rounded-2xl border-neutral-100">
          {status === "verifying" && (
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 border-4 rounded-full border-primary-200 border-t-primary-600 animate-spin"></div>
              <p className="text-neutral-600">Đang xác thực email...</p>
            </div>
          )}

          {status === "success" && (
            <div className="text-center">
              <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full">
                <span className="text-2xl text-green-600">✅</span>
              </div>
              <p className="mb-4 text-green-700">{message}</p>
              <p className="text-sm text-neutral-600">
                Bạn sẽ được chuyển hướng đến trang đăng nhập trong giây lát...
              </p>
              <Link
                to="/login"
                className="inline-flex items-center justify-center w-full px-4 py-3 mt-4 text-sm font-medium text-white transition-all duration-200 rounded-xl bg-gradient-primary hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                Đăng nhập ngay
              </Link>
            </div>
          )}

          {status === "error" && (
            <div className="text-center">
              <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full">
                <span className="text-2xl text-red-600">❌</span>
              </div>
              <p className="mb-6 text-red-700">{message}</p>
              
              {/* Resend verification form */}
              <div className="text-left">
                <h3 className="mb-4 text-lg font-medium text-neutral-800">
                  Gửi lại email xác thực
                </h3>
                <form onSubmit={handleResendVerification} className="space-y-4">
                  <div>
                    <label htmlFor="email" className="block mb-2 text-sm font-medium text-neutral-700">
                      Email
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="block w-full px-4 py-3 border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-neutral-50 focus:bg-white"
                      placeholder="Nhập email của bạn"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isResending}
                    className="flex justify-center w-full px-4 py-3 text-sm font-medium text-white transition-all duration-200 border border-transparent rounded-xl bg-gradient-primary hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isResending ? (
                      <div className="flex items-center">
                        <div className="w-4 h-4 mr-2 border-b-2 border-white rounded-full animate-spin"></div>
                        Đang gửi...
                      </div>
                    ) : (
                      "Gửi lại email xác thực"
                    )}
                  </button>
                </form>
              </div>

              <div className="pt-6 mt-6 border-t border-neutral-200">
                <Link
                  to="/login"
                  className="text-sm font-medium text-primary-600 hover:text-primary-500"
                >
                  ← Quay lại đăng nhập
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmailVerification;