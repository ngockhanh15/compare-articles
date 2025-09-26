import { useEffect, useState } from "react";
import { getAuditLogs } from "../services/api";
import * as XLSX from 'xlsx';

export default function AuditLog() {
  const [logs, setLogs] = useState([]);
  const [, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0, limit: 5 });

  // Filters state
  const [filters, setFilters] = useState({
    user: "",
    action: "",
    fromDate: "",
    toDate: ""
  });


  const load = async (p = 1, searchFilters = filters) => {
    try {
      setLoading(true);
      setError("");
      const res = await getAuditLogs(p, 5, searchFilters);
      setLogs(res.data || []);
      setPagination(res.pagination || { page: p, totalPages: 1, total: 0, limit: 5 });
    } catch (e) {
      setError(e.message || "Lỗi tải lịch sử");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(1);
  }, []);

  // Handle filter changes
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  // Apply filters
  const applyFilters = () => {
    load(1, filters);
  };

  // Clear filters
  const clearFilters = () => {
    const emptyFilters = { user: "", action: "", fromDate: "", toDate: "" };
    setFilters(emptyFilters);
    load(1, emptyFilters);
  };

  // Export current table data to Excel
  const handleExportExcel = () => {
    try {
      if (logs.length === 0) {
        alert("Không có dữ liệu để xuất");
        return;
      }

      // Chuyển đổi dữ liệu thành format phù hợp cho Excel
      const excelData = logs.map((log, index) => ({
        'STT': index + 1,
        'Người dùng': log.actorName || 'Admin',
        'Hoạt động': actionLabel(log.action),
        'Đối tượng': log.targetName || '-',
        'Thời gian': (() => {
          const date = new Date(log.createdAt);
          const day = date.getDate().toString().padStart(2, '0');
          const month = (date.getMonth() + 1).toString().padStart(2, '0');
          const year = date.getFullYear();
          const hours = date.getHours().toString().padStart(2, '0');
          const minutes = date.getMinutes().toString().padStart(2, '0');
          const seconds = date.getSeconds().toString().padStart(2, '0');
          return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
        })()
      }));

      // Tạo workbook và worksheet
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(excelData);

      // Thiết lập độ rộng cột
      const columnWidths = [
        { wch: 5 },   // STT
        { wch: 20 },  // Người dùng
        { wch: 25 },  // Hoạt động
        { wch: 30 },  // Đối tượng
        { wch: 20 }   // Thời gian
      ];
      worksheet['!cols'] = columnWidths;

      // Thêm worksheet vào workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Lịch sử hoạt động');

      // Tạo tên file với timestamp
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      const filename = `audit-logs_${timestamp}.xlsx`;

      // Xuất file
      XLSX.writeFile(workbook, filename);

      alert(`Đã xuất thành công ${logs.length} bản ghi ra file ${filename}`);
    } catch (error) {
      console.error("Export Excel error:", error);
      alert("Lỗi khi xuất file Excel: " + error.message);
    }
  };

  // Get available actions for filter dropdown
  const availableActions = [
    { value: "upload_document", label: "Upload tài liệu" },
    { value: "update_document", label: "Sửa tài liệu" },
    { value: "delete_document", label: "Xóa tài liệu" },
    { value: "download_document", label: "Tải tài liệu" },
    { value: "create_user", label: "Tạo tài khoản" },
    { value: "delete_user", label: "Xóa tài khoản" },
    { value: "update_user_role", label: "Cập nhật vai trò" },
    { value: "toggle_user_status", label: "Khóa/Mở khóa" },
    { value: "reset_user_password", label: "Reset mật khẩu" },
    { value: "UPDATE_THRESHOLDS", label: "Cập nhật ngưỡng" },
    { value: "RESET_THRESHOLDS", label: "Reset ngưỡng" },
    { value: "FILTER_PLAGIARISM_HISTORY", label: "Lọc lịch sử kiểm tra" },
    { value: "CLEAR_PLAGIARISM_HISTORY_FILTERS", label: "Xóa bộ lọc lịch sử" },
    { value: "EXPORT_PLAGIARISM_HISTORY", label: "Xuất lịch sử kiểm tra" },
    { value: "VIEW_PLAGIARISM_HISTORY_DETAILS", label: "Xem chi tiết lịch sử" },
  ];

  const actionLabel = (action) => {
    const map = {
      upload_document: "Upload tài liệu",
      update_document: "Sửa tài liệu",
      delete_document: "Xóa tài liệu",
      download_document: "Tải tài liệu",
      create_user: "Tạo tài khoản",
      delete_user: "Xóa tài khoản",
      update_user_role: "Cập nhật vai trò",
      toggle_user_status: "Khóa/Mở khóa",
      reset_user_password: "Reset mật khẩu",
      UPDATE_THRESHOLDS: "Cập nhật ngưỡng",
      RESET_THRESHOLDS: "Reset ngưỡng",
      FILTER_PLAGIARISM_HISTORY: "Lọc lịch sử kiểm tra",
      CLEAR_PLAGIARISM_HISTORY_FILTERS: "Xóa bộ lọc lịch sử",
      EXPORT_PLAGIARISM_HISTORY: "Xuất lịch sử kiểm tra",
      VIEW_PLAGIARISM_HISTORY_DETAILS: "Xem chi tiết lịch sử",
    };
    return map[action] || action;
  };

  return (
    <div>
      <div className="mb-4">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-neutral-800">Lịch sử hoạt động</h2>
            <p className="text-sm text-neutral-600">5 hoạt động mỗi trang</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => load(1)}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white transition-colors bg-green-600 rounded-lg hover:bg-green-700"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Tải lại
            </button>
            <button
              onClick={handleExportExcel}
              disabled={loading || logs.length === 0}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white transition-colors bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>📊</span>
              Xuất Excel
            </button>
          </div>
        </div>

        {/* Filters Panel */}
        <div className="p-4 bg-neutral-50 rounded-lg border border-neutral-200">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* User Filter */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Người dùng
              </label>
              <input
                type="text"
                value={filters.user}
                onChange={(e) => handleFilterChange("user", e.target.value)}
                placeholder="Tên người dùng..."
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Action Filter */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Loại hoạt động
              </label>
              <select
                value={filters.action}
                onChange={(e) => handleFilterChange("action", e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Tất cả hoạt động</option>
                {availableActions.map((action) => (
                  <option key={action.value} value={action.value}>
                    {action.label}
                  </option>
                ))}
              </select>
            </div>

            {/* From Date Filter */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Từ ngày
              </label>
              <input
                type="date"
                value={filters.fromDate}
                onChange={(e) => handleFilterChange("fromDate", e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* To Date Filter */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Đến ngày
              </label>
              <input
                type="date"
                value={filters.toDate}
                onChange={(e) => handleFilterChange("toDate", e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Filter Actions */}
          <div className="flex items-center gap-2 mt-4">
            <button
              onClick={applyFilters}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
            >
              Áp dụng
            </button>
            <button
              onClick={clearFilters}
              className="px-4 py-2 bg-neutral-200 text-neutral-700 text-sm rounded-lg hover:bg-neutral-300 transition-colors"
            >
              Xóa bộ lọc
            </button>
          </div>
        </div>
      </div>
      <div className="overflow-hidden bg-white border rounded-xl border-neutral-200">
        <table className="min-w-full text-sm">
          <thead className="bg-neutral-50">
            <tr className="text-left">
              <th className="px-4 py-3">Người dùng</th>
              <th className="px-4 py-3">Hoạt động</th>
              <th className="px-4 py-3">Đối tượng</th>
              <th className="px-4 py-3">Thời gian</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="px-4 py-6" colSpan={4}>Đang tải...</td></tr>
            ) : error ? (
              <tr><td className="px-4 py-6 text-red-600" colSpan={4}>{error}</td></tr>
            ) : logs.length === 0 ? (
              <tr><td className="px-4 py-6" colSpan={4}>Chưa có hoạt động</td></tr>
            ) : (
              logs.map((l) => (
                <tr key={l.id} className="border-t border-neutral-200">
                  <td className="px-4 py-3">{l.actorName || "Admin"}</td>
                  <td className="px-4 py-3">{actionLabel(l.action)}</td>
                  <td className="px-4 py-3">{l.targetName || "-"}</td>
                  <td className="px-4 py-3 text-neutral-600">{(() => {
                    const date = new Date(l.createdAt);
                    const day = date.getDate().toString().padStart(2, '0');
                    const month = (date.getMonth() + 1).toString().padStart(2, '0');
                    const year = date.getFullYear();
                    const hours = date.getHours().toString().padStart(2, '0');
                    const minutes = date.getMinutes().toString().padStart(2, '0');
                    const seconds = date.getSeconds().toString().padStart(2, '0');
                    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
                  })()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between mt-4">
        <div className="text-sm text-neutral-600">Tổng: {pagination.total || 0}</div>
        <div className="space-x-2">
          <button
            className="px-3 py-1 text-sm bg-neutral-100 rounded-lg disabled:opacity-50"
            onClick={() => { const p = Math.max(1, (pagination.page || 1) - 1); setPage(p); load(p, filters); }}
            disabled={!pagination.hasPrev}
          >Trước</button>
          <span className="text-sm">{pagination.page || 1} / {pagination.totalPages || 1}</span>
          <button
            className="px-3 py-1 text-sm bg-neutral-100 rounded-lg disabled:opacity-50"
            onClick={() => { const p = Math.min((pagination.totalPages || 1), (pagination.page || 1) + 1); setPage(p); load(p, filters); }}
            disabled={!pagination.hasNext}
          >Sau</button>
        </div>
      </div>
    </div>
  );
}
