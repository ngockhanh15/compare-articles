import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";
import * as api from "../services/api";

const UserManagement = () => {
  const { user: authUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [usersPerPage] = useState(5);
  const [pagination, setPagination] = useState({
    totalUsers: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false
  });
  const [showAddModal, setShowAddModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "user",
  });
  const [roleUpdating, setRoleUpdating] = useState({}); // map of userId -> boolean

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      
      const params = {
        page: currentPage,
        limit: usersPerPage,
        search: searchTerm,
        role: filterRole === "all" ? undefined : filterRole,
        sortBy: "createdAt",
        sortOrder: "desc"
      };

      const response = await api.getAllUsers(params);
      
      if (response.success) {
        setUsers(response.data.users);
        
        // Cập nhật pagination
        if (response.data.pagination) {
          setPagination(response.data.pagination);
          
          // Nếu current page lớn hơn total pages, reset về page 1
          if (currentPage > response.data.pagination.totalPages && response.data.pagination.totalPages > 0) {
            setCurrentPage(1);
            return; // fetchUsers sẽ được gọi lại do useEffect
          }
        }
      } else {
        throw new Error(response.error || "Không thể tải danh sách người dùng");
      }
    } catch (error) {
      setError(error.message || "Không thể tải danh sách người dùng");
      console.error("Error fetching users:", error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, filterRole, usersPerPage]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleToggleUserStatus = async (userId, currentStatus) => {
    try {
      const response = await api.toggleUserStatus(userId);
      
      if (response.success) {
        // Cập nhật state local
        setUsers(users.map(user => 
          user._id === userId 
            ? { ...user, isActive: !currentStatus }
            : user
        ));
        
        // Hiển thị thông báo thành công (có thể thêm toast notification)
        console.log(response.message);
      } else {
        throw new Error(response.error || "Không thể cập nhật trạng thái người dùng");
      }
    } catch (error) {
      setError(error.message || "Không thể cập nhật trạng thái người dùng");
      console.error("Error toggling user status:", error);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa người dùng này?")) {
      return;
    }

    try {
      const response = await api.deleteUser(userId);
      
      if (response.success) {
        // Hiển thị thông báo thành công
        console.log(response.message);
        
        // Reload trang sau khi xóa thành công
        window.location.reload();
      } else {
        throw new Error(response.error || "Không thể xóa người dùng");
      }
    } catch (error) {
      setError(error.message || "Không thể xóa người dùng");
      console.error("Error deleting user:", error);
    }
  };

  // Reset về trang 1 khi search hoặc filter thay đổi
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleRoleFilterChange = (e) => {
    setFilterRole(e.target.value);
    setCurrentPage(1);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const handleChangeUserRole = async (userId, newRole, currentRole) => {
    try {
      if (!newRole || newRole === currentRole) return;
      // prevent self role changes on UI
      const selfId = authUser?.id || authUser?._id;
      if (selfId && String(selfId) === String(userId)) {
        setError("Không thể thay đổi vai trò của chính mình");
        return;
      }
      setRoleUpdating((m) => ({ ...m, [userId]: true }));
      await api.updateUserRole(userId, newRole);
      setUsers((prev) => prev.map((u) => (u._id === userId ? { ...u, role: newRole } : u)));
    } catch (e) {
      console.error("Update role error:", e);
      setError(e.message || "Không thể cập nhật vai trò");
    } finally {
      setRoleUpdating((m) => ({ ...m, [userId]: false }));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 border-b-2 rounded-full border-primary-500 animate-spin"></div>
          <span className="text-neutral-600">Đang tải...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-medium text-neutral-900">
            Quản lý người dùng
          </h3>
          <p className="mt-1 text-sm text-neutral-600">
            Tổng cộng {pagination.totalUsers} người dùng
          </p>
        </div>
        <div className="mt-3 sm:mt-0">
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white transition-colors bg-green-600 rounded-lg hover:bg-green-700"
          >
            <span className="mr-2">＋</span>
            Thêm
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 border border-red-200 bg-red-50 rounded-xl">
          <div className="flex items-center">
            <span className="mr-2 text-red-500">❌</span>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Tìm kiếm theo tên hoặc email..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="w-full px-4 py-2 border rounded-lg border-neutral-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
        <select
          value={filterRole}
          onChange={handleRoleFilterChange}
          className="px-4 py-2 border rounded-lg border-neutral-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        >
          <option value="all">Tất cả vai trò</option>
          <option value="user">Người dùng</option>
          <option value="admin">Quản trị viên</option>
        </select>
      </div>

      {/* Users Table */}
      <div className="overflow-hidden bg-white border border-neutral-200 rounded-xl">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-neutral-200">
            <thead className="bg-neutral-50">
              <tr>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left uppercase text-neutral-500">
                  Người dùng
                </th>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left uppercase text-neutral-500">
                  Vai trò
                </th>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left uppercase text-neutral-500">
                  Trạng thái
                </th>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left uppercase text-neutral-500">
                  Ngày tạo
                </th>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left uppercase text-neutral-500">
                  Đăng nhập cuối
                </th>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-right uppercase text-neutral-500">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-neutral-200">
              {users.map((user) => (
                <tr key={user._id} className="hover:bg-neutral-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-primary">
                        <span className="text-sm font-medium text-white">
                          {user.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-neutral-900">
                          {user.name}
                        </div>
                        <div className="text-sm text-neutral-500">
                          {user.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <select
                        value={user.role}
                        onChange={(e) => handleChangeUserRole(user._id, e.target.value, user.role)}
                        disabled={!!roleUpdating[user._id] || String(authUser?.id || authUser?._id) === String(user._id)}
                        className="px-2 py-1 text-xs bg-white border rounded-lg border-neutral-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="user">Người dùng</option>
                        <option value="admin">Quản trị viên</option>
                      </select>
                      {roleUpdating[user._id] && (
                        <div className="w-4 h-4 border-b-2 rounded-full border-primary-500 animate-spin" />
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        user.isActive 
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {user.isActive ? 'Hoạt động' : 'Bị khóa'}
                      </span>
                      {user.emailVerified && (
                        <span className="text-xs text-green-500">✅</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm whitespace-nowrap text-neutral-500">
                    {formatDate(user.createdAt)}
                  </td>
                  <td className="px-6 py-4 text-sm whitespace-nowrap text-neutral-500">
                    {user.lastLogin ? formatDate(user.lastLogin) : 'Chưa đăng nhập'}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-right whitespace-nowrap">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => handleToggleUserStatus(user._id, user.isActive)}
                        className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                          user.isActive
                            ? 'bg-red-100 text-red-700 hover:bg-red-200'
                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                        }`}
                      >
                        {user.isActive ? 'Khóa' : 'Mở khóa'}
                      </button>
                      {user.role !== 'admin' && (
                        <button
                          onClick={() => handleDeleteUser(user._id)}
                          className="px-3 py-1 text-xs font-medium text-red-700 transition-colors bg-red-100 rounded-lg hover:bg-red-200"
                        >
                          Xóa
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-neutral-700">
            Hiển thị {((currentPage - 1) * usersPerPage) + 1} đến {Math.min(currentPage * usersPerPage, pagination.totalUsers)} trong tổng số {pagination.totalUsers} người dùng
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={!pagination.hasPrevPage}
              className="px-3 py-2 text-sm font-medium bg-white border rounded-lg text-neutral-500 border-neutral-300 hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Trước
            </button>
            <span className="px-3 py-2 text-sm font-medium border rounded-lg text-neutral-700 bg-neutral-100 border-neutral-300">
              {currentPage} / {pagination.totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, pagination.totalPages))}
              disabled={!pagination.hasNextPage}
              className="px-3 py-2 text-sm font-medium bg-white border rounded-lg text-neutral-500 border-neutral-300 hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Sau
            </button>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-md bg-white rounded-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold text-neutral-900">Thêm tài khoản</h4>
                <button onClick={() => setShowAddModal(false)} className="text-neutral-400 hover:text-neutral-600">✕</button>
              </div>
              {error && (
                <div className="p-3 mb-3 text-sm text-red-700 border border-red-200 rounded-lg bg-red-50">
                  {error}
                </div>
              )}
              <div className="space-y-3">
              <div>
                <label className="block mb-1 text-sm text-neutral-700">Họ tên</label>
                <input
                  type="text"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg border-neutral-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Nguyễn Văn A"
                />
              </div>
              <div>
                <label className="block mb-1 text-sm text-neutral-700">Email</label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg border-neutral-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="user@example.com"
                />
              </div>
              <div>
                <label className="block mb-1 text-sm text-neutral-700">Mật khẩu</label>
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg border-neutral-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Tối thiểu 6 ký tự"
                />
              </div>
              <div>
                <label className="block mb-1 text-sm text-neutral-700">Xác nhận mật khẩu</label>
                <input
                  type="password"
                  value={newUser.confirmPassword}
                  onChange={(e) => setNewUser({ ...newUser, confirmPassword: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg border-neutral-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Nhập lại mật khẩu"
                />
              </div>
              <div>
                <label className="block mb-1 text-sm text-neutral-700">Vai trò</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg border-neutral-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="user">Người dùng</option>
                  <option value="admin">Quản trị viên</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-sm font-medium bg-white border rounded-lg text-neutral-700 border-neutral-300 hover:bg-neutral-50"
                disabled={creating}
              >
                Hủy
              </button>
              <button
                onClick={async () => {
                  try {
                    setCreating(true);
                    setError("");
                    if (!newUser.name || !newUser.email || !newUser.password || !newUser.confirmPassword) {
                      setError("Vui lòng nhập đủ họ tên, email, mật khẩu và xác nhận mật khẩu");
                      setCreating(false);
                      return;
                    }
                    // Front validations to match backend rules
                    if (newUser.name.length < 2 || newUser.name.length > 50 || !/^[a-zA-ZÀ-ỹ\s]+$/.test(newUser.name)) {
                      setError("Họ tên phải 2-50 ký tự và chỉ chứa chữ cái/khoảng trắng");
                      setCreating(false);
                      return;
                    }
                    if (newUser.password.length < 6 || !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newUser.password)) {
                      setError("Mật khẩu phải ≥6 ký tự, gồm chữ thường, chữ hoa và số");
                      setCreating(false);
                      return;
                    }
                    if (newUser.password !== newUser.confirmPassword) {
                      setError("Xác nhận mật khẩu không khớp");
                      setCreating(false);
                      return;
                    }
                    // 1) Call register to create account
                    const res = await api.adminCreateUser({
                      name: newUser.name,
                      email: newUser.email,
                      password: newUser.password,
                      confirmPassword: newUser.confirmPassword,
                    });
                    if (!res?.success) {
                      throw new Error(res?.error || "Không thể tạo tài khoản");
                    }
                    // 2) If role is admin, set role via admin endpoint
                    const createdId = res?.data?.user?.id || res?.data?.user?._id;
                    if (newUser.role === "admin" && createdId) {
                      await api.updateUserRole(createdId, "admin");
                    }
                    // Clean and refresh list
                    setShowAddModal(false);
                    setNewUser({ name: "", email: "", password: "", confirmPassword: "", role: "user" });
                    
                    // Reload trang sau khi thêm thành công
                    window.location.reload();
                  } catch (e) {
                    console.error(e);
                    setError(e.message || "Không thể tạo tài khoản");
                  } finally {
                    setCreating(false);
                  }
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-60"
                disabled={creating}
              >
                {creating ? "Đang tạo..." : "Thêm"}
              </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;