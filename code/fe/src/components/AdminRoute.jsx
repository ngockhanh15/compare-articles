import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const AdminRoute = ({ children }) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 border-b-2 border-primary-500 rounded-full animate-spin"></div>
          <span className="text-neutral-600">Đang kiểm tra quyền truy cập...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    // Chưa đăng nhập, chuyển đến trang login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (user.role !== 'admin') {
    // Không phải admin, chuyển về trang chủ hoặc text-checker
    return <Navigate to="/text-checker" replace />;
  }

  // Là admin, cho phép truy cập
  return children;
};

export default AdminRoute;