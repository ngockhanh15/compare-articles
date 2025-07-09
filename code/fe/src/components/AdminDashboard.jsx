import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import UserManagement from "./UserManagement";
import DocumentManagement from "./DocumentManagement";

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState("users");

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
  ];

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="bg-white border-b shadow-sm border-neutral-200">
        <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <div className="p-2 mr-3 rounded-lg bg-gradient-primary">
                <span className="text-2xl">🎯</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-neutral-800">
                  Bảng điều khiển Admin
                </h1>
                <p className="text-sm text-neutral-600">
                  Quản lý hệ thống Filter Word
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-primary">
                  <span className="text-sm font-medium text-white">
                    {user?.name?.charAt(0)?.toUpperCase()}
                  </span>
                </div>
                <div className="hidden md:block">
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

        {/* Navigation Tabs */}
        <div className="mb-6 bg-white border shadow-sm rounded-2xl border-neutral-200">
          <div className="border-b border-neutral-200">
            <nav className="flex px-6 space-x-8">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? "border-primary-500 text-primary-600"
                      : "border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300"
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === "users" && <UserManagement />}
            {activeTab === "documents" && <DocumentManagement />}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;