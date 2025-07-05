import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-50">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 border-4 rounded-full border-primary-200 border-t-primary-600 animate-spin"></div>
          <p className="text-neutral-600">Đang kiểm tra đăng nhập...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect to login page with return url
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

export default ProtectedRoute;