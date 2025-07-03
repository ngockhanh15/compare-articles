import { useState } from "react";

const Header = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleLogin = () => {
    // Tạm thời chỉ toggle state, sau này sẽ integrate với Google OAuth
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setShowUserMenu(false);
  };

  return (
    <header className="bg-gradient-primary text-white shadow-xl border-b border-primary-600/20">
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          {/* Logo và tên */}
          <div className="flex items-center group">
            <div className="bg-white/20 p-2 pt-1 pr-1 rounded-xl mr-3 group-hover:bg-white/30 transition-all duration-200">
              <span className="text-2xl">🎯</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold">So sánh văn bản</h1>
            </div>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex space-x-1">
            <a
              href="#"
              className="px-4 py-2 rounded-lg hover:bg-white/10 transition-all duration-200 flex items-center gap-2"
            >
              <span>🏠</span>
              <span>Trang chủ</span>
            </a>
            <a
              href="#"
              className="px-4 py-2 rounded-lg hover:bg-white/10 transition-all duration-200 flex items-center gap-2"
            >
              <span>📝</span>
              <span>Kiểm tra</span>
            </a>
            <a
              href="#"
              className="px-4 py-2 rounded-lg hover:bg-white/10 transition-all duration-200 flex items-center gap-2"
            >
              <span>📚</span>
              <span>Hướng dẫn</span>
            </a>
          </nav>

          {/* User Authentication */}
          <div className="flex items-center space-x-3">
            {!isLoggedIn ? (
              <>
                <button
                  onClick={handleLogin}
                  className="bg-white text-primary-600 px-6 py-2.5 rounded-lg hover:bg-primary-50 transition-all duration-200 font-medium shadow-sm hover:shadow-md transform hover:-translate-y-0.5"
                >
                  <span className="mr-2">🔐</span>
                  Đăng nhập
                </button>
                <button className="border-2 border-white/30 px-6 py-2.5 rounded-lg hover:bg-white/10 hover:border-white/50 transition-all duration-200 font-medium">
                  Đăng ký
                </button>
              </>
            ) : (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center space-x-3 bg-white/10 backdrop-blur-sm px-4 py-2.5 rounded-xl hover:bg-white/20 transition-all duration-200 border border-white/20"
                >
                  <div className="w-9 h-9 bg-gradient-to-br from-accent-400 to-accent-600 rounded-full flex items-center justify-center shadow-sm">
                    <span className="text-white font-bold text-sm">U</span>
                  </div>
                  <div className="hidden sm:block text-left">
                    <p className="text-sm font-medium">Người dùng</p>
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
                  <div className="absolute right-0 mt-3 w-56 bg-white rounded-xl shadow-2xl py-2 z-50 border border-neutral-200 animate-in slide-in-from-top-2 duration-200">
                    <div className="px-4 py-3 border-b border-neutral-100">
                      <p className="text-sm font-medium text-neutral-800">
                        Tài khoản của bạn
                      </p>
                      <p className="text-xs text-neutral-500">
                        user@example.com
                      </p>
                    </div>

                    <a
                      href="#"
                      className="flex items-center gap-3 px-4 py-3 text-neutral-700 hover:bg-neutral-50 transition-colors"
                    >
                      <span className="text-lg">👤</span>
                      <span>Hồ sơ cá nhân</span>
                    </a>
                    <a
                      href="#"
                      className="flex items-center gap-3 px-4 py-3 text-neutral-700 hover:bg-neutral-50 transition-colors"
                    >
                      <span className="text-lg">⚙️</span>
                      <span>Cài đặt</span>
                    </a>
                    <a
                      href="#"
                      className="flex items-center gap-3 px-4 py-3 text-neutral-700 hover:bg-neutral-50 transition-colors"
                    >
                      <span className="text-lg">📊</span>
                      <span>Thống kê</span>
                    </a>

                    <hr className="my-2 border-neutral-100" />

                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-3 w-full px-4 py-3 text-error-600 hover:bg-error-50 transition-colors"
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
          <button className="md:hidden p-2 rounded-lg hover:bg-white/10 transition-colors">
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
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
