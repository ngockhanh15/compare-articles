import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import UserManagement from "./UserManagement";
import DocumentManagement from "./DocumentManagement";
import AuditLog from "./AuditLog";

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState("users");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const tabs = [
    { id: "users", name: "Quản lý người dùng", icon: "👥" },
    { id: "documents", name: "Quản lý tài liệu", icon: "📄" },
    { id: "audit", name: "Lịch sử hoạt động", icon: "📝" },
  ];

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
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
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center px-4 py-3 text-left rounded-lg transition-colors ${
                    activeTab === tab.id
                      ? 'bg-primary-600 text-white'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  <span className="mr-3 text-lg">{tab.icon}</span>
                  <span className="font-medium">{tab.name}</span>
                </button>
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
              
              {/* Desktop user info - hidden on mobile since it's in sidebar */}
              <div className="items-center hidden space-x-4 lg:flex">
                <div className="flex items-center space-x-2">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-primary">
                    <span className="text-sm font-medium text-white">
                      {user?.name?.charAt(0)?.toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-800">{user?.name}</p>
                    <p className="text-xs text-neutral-600">{user?.email}</p>
                  </div>
                </div>
                
                <button
                  onClick={handleLogout}
                  className="flex items-center px-3 py-2 text-sm font-medium transition-colors rounded-lg text-neutral-700 bg-neutral-100 hover:bg-neutral-200"
                >
                  <span className="mr-2">🚪</span>
                  Đăng xuất
                </button>
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
              {activeTab === "audit" && <AuditLog />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;