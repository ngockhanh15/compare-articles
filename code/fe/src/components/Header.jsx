import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const Header = () => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const { user, logout, isAuthenticated } = useAuth();

  const handleLogout = () => {
    logout();
    setShowUserMenu(false);
    setShowMobileMenu(false);
  };

  return (
    <header className="text-white border-b shadow-xl bg-gradient-primary border-primary-600/20">
      <div className="container px-4 py-4 mx-auto">
        <div className="flex items-center justify-between">
          {/* Logo và tên */}
          <Link to="/" className="flex items-center group">
            <div className="p-2 pt-1 pr-1 mr-3 transition-all duration-200 bg-white/20 rounded-xl group-hover:bg-white/30">
              <span className="text-2xl">🎯</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold">So sánh văn bản</h1>
            </div>
          </Link>

          {/* Navigation */}
          <nav className="hidden space-x-1 md:flex">
            <Link
              to="/"
              className="flex items-center gap-2 px-4 py-2 transition-all duration-200 rounded-lg hover:bg-white/10"
            >
              <span>🏠</span>
              <span>Trang chủ</span>
            </Link>
            <Link
              to="/user-guide"
              className="flex items-center gap-2 px-4 py-2 transition-all duration-200 rounded-lg hover:bg-white/10"
            >
              <span>📚</span>
              <span>Hướng dẫn</span>
            </Link>
            {isAuthenticated && (
              <Link
                to="/history"
                className="flex items-center gap-2 px-4 py-2 transition-all duration-200 rounded-lg hover:bg-white/10"
              >
                <span>📋</span>
                <span>Lịch sử</span>
              </Link>
            )}
          </nav>

          {/* User Authentication */}
          <div className="flex items-center space-x-3">
            {!isAuthenticated ? (
              <>
                <Link
                  to="/login"
                  className="bg-white text-primary-600 px-6 py-2.5 rounded-lg hover:bg-primary-50 transition-all duration-200 font-medium shadow-sm hover:shadow-md transform hover:-translate-y-0.5 inline-flex items-center"
                >
                  <span className="mr-2">🔐</span>
                  Đăng nhập
                </Link>
                <Link
                  to="/register"
                  className="border-2 border-white/30 px-6 py-2.5 rounded-lg hover:bg-white/10 hover:border-white/50 transition-all duration-200 font-medium"
                >
                  Đăng ký
                </Link>
              </>
            ) : (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center space-x-3 bg-white/10 backdrop-blur-sm px-4 py-2.5 rounded-xl hover:bg-white/20 transition-all duration-200 border border-white/20"
                >
                  <div className="flex items-center justify-center rounded-full shadow-sm w-9 h-9 bg-gradient-to-br from-accent-400 to-accent-600">
                    <span className="text-sm font-bold text-white">{user?.avatar || 'U'}</span>
                  </div>
                  <div className="hidden text-left sm:block">
                    <p className="text-sm font-medium">{user?.name || 'Người dùng'}</p>
                    <p className="text-xs text-primary-100">Online</p>
                  </div>
                  <span
                    className={`transform transition-transform duration-200 ${
                      showUserMenu ? "rotate-180" : ""
                    }`}
                  >
                    <svg
                      className="w-4 h-4"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </span>
                </button>

                {/* Dropdown Menu */}
                {showUserMenu && (
                  <div className="absolute right-0 z-50 w-56 py-2 mt-3 duration-200 bg-white border shadow-2xl rounded-xl border-neutral-200 animate-in slide-in-from-top-2">
                    <div className="px-4 py-3 border-b border-neutral-100">
                      <p className="text-sm font-medium text-neutral-800">
                        {user?.name || 'Tài khoản của bạn'}
                      </p>
                      <p className="text-xs text-neutral-500">
                        {user?.email || 'user@example.com'}
                      </p>
                      {user?.role === 'admin' && (
                        <span className="inline-flex px-2 py-1 mt-1 text-xs font-semibold text-purple-800 bg-purple-100 rounded-full">
                          Quản trị viên
                        </span>
                      )}
                    </div>

                    <Link
                      to="/profile"
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center gap-3 px-4 py-3 transition-colors text-neutral-700 hover:bg-neutral-50"
                    >
                      <span className="text-lg">👤</span>
                      <span>Thông tin cá nhân</span>
                    </Link>

                    {user?.role === 'admin' && (
                      <>
                        <Link
                          to="/admin"
                          onClick={() => setShowUserMenu(false)}
                          className="flex items-center gap-3 px-4 py-3 transition-colors text-neutral-700 hover:bg-neutral-50"
                        >
                          <span className="text-lg">🛠️</span>
                          <span>Bảng điều khiển Admin</span>
                        </Link>
                      </>
                    )}
                    <button
                      onClick={handleLogout}
                      className="flex items-center w-full gap-3 px-4 py-3 transition-colors text-error-600 hover:bg-error-50"
                    >
                      <span className="text-lg">🚪</span>
                      <span>Đăng xuất</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <button 
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="p-2 transition-colors rounded-lg md:hidden hover:bg-white/10"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d={showMobileMenu ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"}
              />
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {showMobileMenu && (
          <div className="md:hidden">
            <div className="px-4 py-3 space-y-1 border-t border-primary-600/20">
              <Link
                to="/"
                onClick={() => setShowMobileMenu(false)}
                className="flex items-center gap-2 px-3 py-2 transition-all duration-200 rounded-lg hover:bg-white/10"
              >
                <span>🏠</span>
                <span>Trang chủ</span>
              </Link>
              <Link
                to="/user-guide"
                onClick={() => setShowMobileMenu(false)}
                className="flex items-center gap-2 px-3 py-2 transition-all duration-200 rounded-lg hover:bg-white/10"
              >
                <span>📚</span>
                <span>Hướng dẫn</span>
              </Link>
              {isAuthenticated && (
                <Link
                  to="/history"
                  onClick={() => setShowMobileMenu(false)}
                  className="flex items-center gap-2 px-3 py-2 transition-all duration-200 rounded-lg hover:bg-white/10"
                >
                  <span>📋</span>
                  <span>Lịch sử</span>
                </Link>
              )}
              
              {/* Mobile Auth Section */}
              <div className="pt-3 mt-3 border-t border-primary-600/20">
                {!isAuthenticated ? (
                  <div className="space-y-2">
                    <Link
                      to="/login"
                      onClick={() => setShowMobileMenu(false)}
                      className="flex items-center justify-center gap-2 px-4 py-2 text-primary-600 bg-white rounded-lg hover:bg-primary-50 transition-all duration-200 font-medium"
                    >
                      <span>🔐</span>
                      <span>Đăng nhập</span>
                    </Link>
                    <Link
                      to="/register"
                      onClick={() => setShowMobileMenu(false)}
                      className="flex items-center justify-center gap-2 px-4 py-2 border-2 border-white/30 rounded-lg hover:bg-white/10 hover:border-white/50 transition-all duration-200 font-medium"
                    >
                      <span>Đăng ký</span>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 px-3 py-2">
                      <div className="flex items-center justify-center rounded-full shadow-sm w-8 h-8 bg-gradient-to-br from-accent-400 to-accent-600">
                        <span className="text-sm font-bold text-white">{user?.avatar || 'U'}</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium">{user?.name || 'Người dùng'}</p>
                        <p className="text-xs text-primary-100">{user?.email || ''}</p>
                      </div>
                    </div>
                    
                    <Link
                      to="/profile"
                      onClick={() => setShowMobileMenu(false)}
                      className="flex items-center gap-3 px-3 py-2 transition-colors rounded-lg hover:bg-white/10"
                    >
                      <span>👤</span>
                      <span>Thông tin cá nhân</span>
                    </Link>
                    
                    {user?.role === 'admin' && (
                      <Link
                        to="/admin"
                        onClick={() => setShowMobileMenu(false)}
                        className="flex items-center gap-3 px-3 py-2 transition-colors rounded-lg hover:bg-white/10"
                      >
                        <span>🛠️</span>
                        <span>Bảng điều khiển Admin</span>
                      </Link>
                    )}
                    
                    <button
                      onClick={handleLogout}
                      className="flex items-center w-full gap-3 px-3 py-2 transition-colors rounded-lg text-red-200 hover:bg-red-500/20"
                    >
                      <span>🚪</span>
                      <span>Đăng xuất</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
