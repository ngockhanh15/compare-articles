import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import UserManagement from "./UserManagement";
import DocumentManagement from "./DocumentManagement";
import AuditLog from "./AuditLog";
import PlagiarismHistory from "./PlagiarismHistory";
import DocumentStatistics from "./DocumentStatistics";
import PlagiarismStatistics from "./PlagiarismStatistics";
import ThresholdManagement from "./ThresholdManagement";
import AdminProfile from "./AdminProfile";

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState(() => {
    // Khôi phục tab từ localStorage hoặc mặc định là "users"
    return localStorage.getItem("adminActiveTab") || "users";
  });
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState(() => {
    // Khôi phục trạng thái expanded từ localStorage
    const saved = localStorage.getItem("adminExpandedMenus");
    return saved ? JSON.parse(saved) : {};
  });

  // Lưu tab hiện tại vào localStorage mỗi khi thay đổi
  useEffect(() => {
    localStorage.setItem("adminActiveTab", activeTab);
  }, [activeTab]);

  // Lưu trạng thái expanded menus vào localStorage
  useEffect(() => {
    localStorage.setItem("adminExpandedMenus", JSON.stringify(expandedMenus));
  }, [expandedMenus]);

  // Đóng dropdown menu khi click bên ngoài
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showUserMenu && !event.target.closest('.user-menu-container')) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserMenu]);

  const handleLogout = async () => {
    try {
      await logout();
      setShowUserMenu(false);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const tabs = [
    { id: "users", name: "Quản lý người dùng", icon: "👥" },
    { id: "documents", name: "Quản lý tài liệu", icon: "📄" },
    { id: "plagiarism", name: "Quản lý lịch sử kiểm tra", icon: "🔍" },
    { 
      id: "statistics", 
      name: "Báo cáo thống kê", 
      icon: "📊",
      submenu: [
        { id: "document-stats", name: "Thống kê Tài liệu", icon: "📄" },
        { id: "plagiarism-stats", name: "Thống kê Kiểm tra", icon: "🔍" },
      ]
    },
    { id: "thresholds", name: "Quản lý ngưỡng", icon: "⚙️" },
    { id: "audit", name: "Nhật ký quản trị", icon: "📝" },
  ];

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const toggleSubmenu = (tabId) => {
    setExpandedMenus(prev => ({
      ...prev,
      [tabId]: !prev[tabId]
    }));
  };

  const handleTabClick = (tabId) => {
    const tab = tabs.find(t => t.id === tabId);
    if (tab && tab.submenu) {
      // Nếu có submenu, toggle submenu
      toggleSubmenu(tabId);
    } else {
      // Nếu không có submenu, set active tab
      setActiveTab(tabId);
    }
  };

  return (
    <div className="flex min-h-screen bg-neutral-50">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 transform transition-transform duration-300 ease-in-out ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0 lg:static lg:inset-0`}>
        <div className="flex items-center justify-between h-16 px-4 bg-gray-800">
          <div className="flex items-center">
            <div className="p-2 mr-3 rounded-lg bg-gradient-primary">
              <span className="text-xl">🎯</span>
            </div>
            <h1 className="text-lg font-bold text-white">Admin Panel</h1>
          </div>
          <button
            onClick={toggleSidebar}
            className="p-2 text-gray-400 rounded-lg hover:bg-gray-700 hover:text-white lg:hidden"
          >
            <span className="text-xl">✕</span>
          </button>
        </div>
        
        <nav className="px-4 py-6">
          <ul className="space-y-2">
            {tabs.map((tab) => (
              <li key={tab.id}>
                <button
                  onClick={() => handleTabClick(tab.id)}
                  className={`w-full flex items-center justify-between px-4 py-3 text-left rounded-lg transition-colors ${
                    (activeTab === tab.id || (tab.submenu && tab.submenu.some(sub => sub.id === activeTab)))
                      ? 'bg-primary-600 text-white'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  <div className="flex items-center">
                    <span className="mr-3 text-lg">{tab.icon}</span>
                    <span className="font-medium">{tab.name}</span>
                  </div>
                  {tab.submenu && (
                    <span className={`text-sm transition-transform ${
                      expandedMenus[tab.id] ? 'rotate-90' : ''
                    }`}>
                      ▶
                    </span>
                  )}
                </button>
                
                {/* Submenu */}
                {tab.submenu && expandedMenus[tab.id] && (
                  <ul className="mt-2 ml-4 space-y-1">
                    {tab.submenu.map((subItem) => (
                      <li key={subItem.id}>
                        <button
                          onClick={() => setActiveTab(subItem.id)}
                          className={`w-full flex items-center px-4 py-2 text-left rounded-lg transition-colors text-sm ${
                            activeTab === subItem.id
                              ? 'bg-primary-500 text-white'
                              : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                          }`}
                        >
                          <span className="mr-3 text-base">{subItem.icon}</span>
                          <span className="font-medium">{subItem.name}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </nav>
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={toggleSidebar}
        ></div>
      )}

      {/* Main Content */}
      <div className="flex-1 lg:ml-0">
        {/* Header */}
        <header className="bg-white border-b shadow-sm border-neutral-200">
          <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center">
                <button
                  onClick={toggleSidebar}
                  className="p-2 mr-4 text-gray-600 rounded-lg hover:bg-gray-100 lg:hidden"
                >
                  <span className="text-xl">☰</span>
                </button>
                <div>
                  <h1 className="text-xl font-bold text-neutral-800">
                    Bảng điều khiển Admin
                  </h1>
                  <p className="text-sm text-neutral-600">
                    Quản lý hệ thống Filter Word
                  </p>
                </div>
              </div>
              
              {/* Desktop user info - dropdown menu like client header */}
              <div className="items-center hidden space-x-4 lg:flex">
                <div className="relative user-menu-container">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center space-x-3 bg-neutral-100 hover:bg-neutral-200 px-4 py-2.5 rounded-xl transition-all duration-200 border border-neutral-200"
                  >
                    <div className="flex items-center justify-center rounded-full shadow-sm w-9 h-9 bg-gradient-to-br from-primary-500 to-accent-500">
                      <span className="text-sm font-bold text-white">{user?.name?.charAt(0)?.toUpperCase() || 'A'}</span>
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium text-neutral-800">{user?.name || 'Admin'}</p>
                      <p className="text-xs text-neutral-600">Quản trị viên</p>
                    </div>
                    <span
                      className={`transform transition-transform duration-200 ${
                        showUserMenu ? "rotate-180" : ""
                      }`}
                    >
                      <svg
                        className="w-4 h-4 text-neutral-600"
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
                          {user?.name || 'Tài khoản Admin'}
                        </p>
                        <p className="text-xs text-neutral-500">
                          {user?.email || 'admin@example.com'}
                        </p>
                        <span className="inline-flex px-2 py-1 mt-1 text-xs font-semibold text-purple-800 bg-purple-100 rounded-full">
                          Quản trị viên
                        </span>
                      </div>

                      <button
                        onClick={() => {
                          setActiveTab('profile');
                          setShowUserMenu(false);
                        }}
                        className="flex items-center w-full gap-3 px-4 py-3 transition-colors text-neutral-700 hover:bg-neutral-50"
                      >
                        <span className="text-lg">👤</span>
                        <span>Thông tin tài khoản</span>
                      </button>

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
              </div>
            </div>
          </div>
        </header>

        <div className="px-4 py-8 mx-auto max-w-7xl sm:px-6 lg:px-8">
          {/* Welcome Card */}
          <div className="p-6 mb-8 text-white bg-gradient-to-r from-primary-500 to-accent-500 rounded-2xl">
            <h2 className="mb-2 text-2xl font-bold">
              Chào mừng, {user?.name}! 👋
            </h2>
            <p className="text-primary-100">
              Bạn đang truy cập với quyền quản trị viên. Hãy quản lý hệ thống một cách hiệu quả.
            </p>
          </div>

          {/* Content */}
          <div className="bg-white border shadow-sm rounded-2xl border-neutral-200">
            <div className="p-6">
              {activeTab === "users" && <UserManagement />}
              {activeTab === "documents" && <DocumentManagement />}
              {activeTab === "plagiarism" && <PlagiarismHistory />}
              {activeTab === "document-stats" && <DocumentStatistics />}
              {activeTab === "plagiarism-stats" && <PlagiarismStatistics />}
              {activeTab === "thresholds" && <ThresholdManagement />}
              {activeTab === "audit" && <AuditLog />}
              {activeTab === "profile" && <AdminProfile />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;