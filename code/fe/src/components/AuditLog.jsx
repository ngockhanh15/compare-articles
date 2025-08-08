import { useEffect, useState } from "react";
import { getAuditLogs } from "../services/api";

export default function AuditLog() {
  const [logs, setLogs] = useState([]);
  const [, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0, limit: 5 });

  const load = async (p = 1) => {
    try {
      setLoading(true);
      const res = await getAuditLogs(p, 5);
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
    };
    return map[action] || action;
  };

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-neutral-800">Lịch sử hoạt động</h2>
        <p className="text-sm text-neutral-600">5 hoạt động mỗi trang</p>
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
                  <td className="px-4 py-3 text-neutral-600">{new Date(l.createdAt).toLocaleString()}</td>
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
            onClick={() => { const p = Math.max(1, (pagination.page || 1) - 1); setPage(p); load(p); }}
            disabled={!pagination.hasPrev}
          >Trước</button>
          <span className="text-sm">{pagination.page || 1} / {pagination.totalPages || 1}</span>
          <button
            className="px-3 py-1 text-sm bg-neutral-100 rounded-lg disabled:opacity-50"
            onClick={() => { const p = Math.min((pagination.totalPages || 1), (pagination.page || 1) + 1); setPage(p); load(p); }}
            disabled={!pagination.hasNext}
          >Sau</button>
        </div>
      </div>
    </div>
  );
}
