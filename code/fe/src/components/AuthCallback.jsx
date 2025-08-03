import { useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import * as api from "../services/api";

function AuthCallback() {
  const { setUser } = useAuth();

  useEffect(() => {
    const handleGoogleCallback = async () => {
      const params = new URLSearchParams(window.location.search);
      const token = params.get("token");
      const success = params.get("success");
      const userInfo = params.get("user");

      if (token && success === "true") {
        try {
          // Lưu token với key đúng
          localStorage.setItem("token", token);
          
          let userData;
          
          if (userInfo) {
            // Sử dụng thông tin user từ URL
            userData = JSON.parse(decodeURIComponent(userInfo));
            console.log("✅ Using user info from URL:", userData);
          } else {
            // Fallback: lấy thông tin user từ API
            const response = await api.getCurrentUser();
            if (response.success && response.data.user) {
              userData = response.data.user;
              console.log("✅ Using user info from API:", userData);
            } else {
              throw new Error("Failed to get user info");
            }
          }
          
          // Lưu thông tin user
          localStorage.setItem("user", JSON.stringify(userData));
          
          // Cập nhật context
          setUser(userData);
          
          console.log("✅ Google login successful:", userData);
          
          // Redirect về trang chủ sau một chút delay để đảm bảo state được cập nhật
          setTimeout(() => {
            window.location.href = "/";
          }, 100);
        } catch (error) {
          console.error("❌ Error processing Google callback:", error);
          // Xóa token nếu có lỗi
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          window.location.href = "/login";
        }
      } else {
        console.error("❌ No token or success parameter found");
        window.location.href = "/login";
      }
    };

    handleGoogleCallback();
  }, [setUser]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="w-12 h-12 mx-auto mb-4 border-b-2 rounded-full animate-spin border-primary-600"></div>
        <p className="text-lg text-gray-600">Đang xử lý đăng nhập Google...</p>
      </div>
    </div>
  );
}

export default AuthCallback;
