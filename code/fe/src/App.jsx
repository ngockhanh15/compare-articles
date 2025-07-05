import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import Header from './components/Header'
import Home from './components/Home'
import Login from './components/Login'
import Register from './components/Register'
import ForgotPassword from './components/ForgotPassword'
import EmailVerification from './components/EmailVerification'
import TextChecker from './components/TextChecker'
import ProtectedRoute from './components/ProtectedRoute'

// Layout component để hiển thị Header và Footer chỉ khi không phải trang login/register
const Layout = ({ children }) => {
  const location = useLocation();
  const hideHeaderFooter = ['/login', '/register', '/forgot-password'].includes(location.pathname) || 
                          location.pathname.startsWith('/verify-email');

  if (hideHeaderFooter) {
    return children;
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <Header />
      <main>
        {children}
      </main>
      <footer className="text-white bg-gradient-to-r from-neutral-800 to-neutral-900">
        <div className="px-4 py-8 mx-auto max-w-7xl">
          <div className="grid gap-8 mb-6 md:grid-cols-3">
            {/* Company Info */}
            <div>
              <div className="flex items-center mb-4">
                <span className="mr-2 text-2xl">🎯</span>
                <h3 className="text-lg font-bold">So sánh văn bản</h3>
              </div>
              <p className="text-sm leading-relaxed text-neutral-300">
               Giúp kiểm tra các văn bản có trùng lặp với thông tin dữ liệu không.
              </p>
            </div>
            
            {/* Quick Links */}
            <div>
              <h4 className="mb-4 font-semibold text-neutral-200">Liên kết nhanh</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="transition-colors text-neutral-300 hover:text-white">Trang chủ</a></li>
                <li><a href="#" className="transition-colors text-neutral-300 hover:text-white">Kiểm tra văn bản</a></li>
                <li><a href="#" className="transition-colors text-neutral-300 hover:text-white">Hướng dẫn sử dụng</a></li>
              </ul>
            </div>
            
            {/* Contact */}
            <div>
              <h4 className="mb-4 font-semibold text-neutral-200">Liên hệ</h4>
              <ul className="space-y-2 text-sm text-neutral-300">
                <li className="flex items-center gap-2">
                  <span>📧</span>
                  <span>support@filterword.com</span>
                </li>
                <li className="flex items-center gap-2">
                  <span>📞</span>
                  <span>+84 123 456 789</span>
                </li>
                <li className="flex items-center gap-2">
                  <span>🌐</span>
                  <span>www.filterword.com</span>
                </li>
              </ul>
            </div>
          </div>
          
          <div className="flex flex-col items-center justify-between pt-6 border-t border-neutral-700 md:flex-row">
            <p className="text-sm text-neutral-400">
              &copy; 2024 Hệ thống Lọc Từ. All rights reserved.
            </p>
            <div className="flex mt-4 space-x-4 md:mt-0">
              <a href="#" className="text-sm transition-colors text-neutral-400 hover:text-white">
                Chính sách bảo mật
              </a>
              <a href="#" className="text-sm transition-colors text-neutral-400 hover:text-white">
                Điều khoản sử dụng
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route 
              path="/text-checker" 
              element={
                <ProtectedRoute>
                  <TextChecker />
                </ProtectedRoute>
              } 
            />
          </Routes>
        </Layout>
      </Router>
    </AuthProvider>
  )
}

export default App
