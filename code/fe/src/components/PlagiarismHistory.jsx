import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getAllPlagiarismHistory, createAuditLog } from "../services/api";
import * as XLSX from 'xlsx';

const PlagiarismHistory = () => {
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [filters, setFilters] = useState({
    userName: "",
    status: "",
    startDate: "",
    endDate: "",
  });
  const [searchInput, setSearchInput] = useState("");
  const [searchTimeout, setSearchTimeout] = useState(null);
  const [tempDateFilters, setTempDateFilters] = useState({
    startDate: "",
    endDate: "",
  });
  const [isExporting, setIsExporting] = useState(false);

  const itemsPerPage = 5;

  // Function to log audit actions
  const logAuditAction = async (action, metadata = {}) => {
    try {
      await createAuditLog({
        action,
        targetType: "plagiarism_history",
        targetName: "Lịch sử kiểm tra Plagiarism",
        metadata
      });
    } catch (error) {
      console.error("Failed to log audit action:", error);
      // Don't throw error to avoid disrupting user experience
    }
  };

  const fetchHistory = async (page = 1) => {
    try {
      setLoading(true);
      setError(null);

      const offset = (page - 1) * itemsPerPage;
      const cleanFilters = {};
      if (filters.userName) cleanFilters.userName = filters.userName;
      if (filters.status) cleanFilters.status = filters.status;
      if (filters.startDate) cleanFilters.startDate = filters.startDate;
      if (filters.endDate) cleanFilters.endDate = filters.endDate;

      const response = await getAllPlagiarismHistory(itemsPerPage, offset, cleanFilters);

      if (response.success) {
        setHistory(response.history);
        setTotal(response.total);
        setHasMore(response.hasMore);
        setTotalPages(Math.ceil(response.total / itemsPerPage));
      } else {
        setError("Không thể tải lịch sử kiểm tra");
      }
    } catch (err) {
      console.error("Error fetching plagiarism history:", err);
      setError("Lỗi khi tải lịch sử kiểm tra: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory(currentPage);
  }, [currentPage, filters]);

  // Sync tempDateFilters with filters when filters change externally
  useEffect(() => {
    setTempDateFilters({
      startDate: filters.startDate,
      endDate: filters.endDate,
    });
  }, [filters.startDate, filters.endDate]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchTimeout]);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleFilterChange = (key, value) => {
    if (key === 'userName') {
      setSearchInput(value);

      // Clear existing timeout
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }

      // Set new timeout for debounced search
      const timeout = setTimeout(async () => {
        setFilters(prev => ({
          ...prev,
          userName: value
        }));
        setCurrentPage(1);

        // Log audit action for user name filter
        if (value.trim()) {
          await logAuditAction("FILTER_PLAGIARISM_HISTORY", {
            filterType: "userName",
            filterValue: value,
            description: `Lọc lịch sử theo tên người dùng: "${value}"`
          });
        }
      }, 500); // 500ms delay

      setSearchTimeout(timeout);
    } else if (key === 'startDate' || key === 'endDate') {
      // For date filters, only update temp state, don't apply immediately
      setTempDateFilters(prev => ({
        ...prev,
        [key]: value
      }));
    } else {
      setFilters(prev => ({
        ...prev,
        [key]: value
      }));
      setCurrentPage(1);

      // Log audit action for other filters
      if (value) {
        logAuditAction("FILTER_PLAGIARISM_HISTORY", {
          filterType: key,
          filterValue: value,
          description: `Lọc lịch sử theo ${key}: "${value}"`
        });
      }
    }
  };

  const applyDateFilters = async () => {
    setFilters(prev => ({
      ...prev,
      startDate: tempDateFilters.startDate,
      endDate: tempDateFilters.endDate,
    }));
    setCurrentPage(1);

    // Log audit action for date filter
    if (tempDateFilters.startDate || tempDateFilters.endDate) {
      await logAuditAction("FILTER_PLAGIARISM_HISTORY", {
        filterType: "dateRange",
        filterValue: {
          startDate: tempDateFilters.startDate,
          endDate: tempDateFilters.endDate
        },
        description: `Lọc lịch sử theo khoảng thời gian: ${tempDateFilters.startDate || 'không giới hạn'} đến ${tempDateFilters.endDate || 'không giới hạn'}`
      });
    }
  };

  const clearFilters = async () => {
    setFilters({
      userName: "",
      status: "",
      startDate: "",
      endDate: "",
    });
    setTempDateFilters({
      startDate: "",
      endDate: "",
    });
    setSearchInput("");
    setCurrentPage(1);

    // Clear any pending search timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
      setSearchTimeout(null);
    }

    // Log audit action for clearing filters
    await logAuditAction("CLEAR_PLAGIARISM_HISTORY_FILTERS", {
      description: "Xóa tất cả bộ lọc lịch sử kiểm tra"
    });
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');

    return `${day}/${month}/${year} ${hours}:${minutes}`;
  };

  const formatDateForInput = (date) => {
    return date.toISOString().split('T')[0];
  };

  const formatDateForDisplay = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();

    return `${day}/${month}/${year}`;
  };

  const setQuickDateFilter = async (days) => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    const startDateStr = formatDateForInput(startDate);
    const endDateStr = formatDateForInput(endDate);

    setTempDateFilters({
      startDate: startDateStr,
      endDate: endDateStr
    });

    setFilters(prev => ({
      ...prev,
      startDate: startDateStr,
      endDate: endDateStr
    }));
    setCurrentPage(1);

    // Log audit action for quick date filter
    await logAuditAction("FILTER_PLAGIARISM_HISTORY", {
      filterType: "quickDateFilter",
      filterValue: `${days} ngày`,
      description: `Lọc lịch sử theo ${days} ngày gần đây`
    });
  };

  const setTodayFilter = async () => {
    const today = new Date();
    const todayStr = formatDateForInput(today);

    setTempDateFilters({
      startDate: todayStr,
      endDate: todayStr
    });

    setFilters(prev => ({
      ...prev,
      startDate: todayStr,
      endDate: todayStr
    }));
    setCurrentPage(1);

    // Log audit action for today filter
    await logAuditAction("FILTER_PLAGIARISM_HISTORY", {
      filterType: "todayFilter",
      filterValue: "hôm nay",
      description: "Lọc lịch sử theo hôm nay"
    });
  };

  const getSourceIcon = (source) => {
    return source === "file" ? "📄" : "📝";
  };

  const handleViewDetails = async (item) => {
    // Log audit action for viewing details
    await logAuditAction("VIEW_PLAGIARISM_HISTORY_DETAILS", {
      targetId: item.id,
      targetName: item.fileName || 'Kiểm tra văn bản',
      sourceType: item.source,
      description: `Xem chi tiết lịch sử kiểm tra: ${item.fileName || 'Kiểm tra văn bản'} (${item.source === 'file' ? 'File' : 'Văn bản'})`
    });

    // Điều hướng đến trang so sánh chi tiết dựa trên loại source
    if (item.source === "file") {
      navigate(`/detail-checker/${item.id}`);
    } else {
      navigate(`/detailed-comparison/${item.id}`);
    }
  };

  const exportToExcel = async () => {
    try {
      setIsExporting(true);

      // Lấy tất cả dữ liệu (không phân trang)
      const cleanFilters = {};
      if (filters.userName) cleanFilters.userName = filters.userName;
      if (filters.status) cleanFilters.status = filters.status;
      if (filters.startDate) cleanFilters.startDate = filters.startDate;
      if (filters.endDate) cleanFilters.endDate = filters.endDate;

      const response = await getAllPlagiarismHistory(10000, 0, cleanFilters); // Lấy tối đa 10000 records

      if (!response.success) {
        throw new Error("Không thể lấy dữ liệu để xuất Excel");
      }

      // Chuẩn bị dữ liệu cho Excel
      const excelData = response.history.map((item, index) => ({
        'STT': index + 1,
        'Tên người dùng': item.user?.name || '',
        'Email': item.user?.email || '',
        'Tên file': item.fileName || 'Kiểm tra văn bản',
        'Loại nguồn': item.source === 'file' ? 'File' : 'Văn bản',
        'Nội dung': item.text || '',
        'Số câu trùng': item.duplicateSentenceCount || 0,
        'Tổng số câu': item.sentenceCount || 0,
        'Tỷ lệ trùng lặp (%)': Math.round(item.duplicatePercentage || 0),
        'Thời gian kiểm tra': formatDate(item.checkedAt)
      }));

      // Tạo workbook và worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelData);

      // Thiết lập độ rộng cột
      const colWidths = [
        { wch: 5 },   // STT
        { wch: 20 },  // Tên người dùng
        { wch: 25 },  // Email
        { wch: 30 },  // Tên file
        { wch: 12 },  // Loại nguồn
        { wch: 50 },  // Nội dung
        { wch: 12 },  // Số câu trùng
        { wch: 12 },  // Tổng số câu
        { wch: 15 },  // Tỷ lệ trùng lặp
        { wch: 20 }   // Thời gian kiểm tra
      ];
      ws['!cols'] = colWidths;

      // Thêm worksheet vào workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Lịch sử kiểm tra Plagiarism');

      // Tạo tên file với timestamp
      const now = new Date();
      const timestamp = now.toISOString().slice(0, 19).replace(/[:-]/g, '').replace('T', '_');
      const fileName = `Lich_su_kiem_tra_plagiarism_${timestamp}.xlsx`;

      // Xuất file
      XLSX.writeFile(wb, fileName);

      // Log audit action for Excel export
      await logAuditAction("EXPORT_PLAGIARISM_HISTORY", {
        exportType: "excel",
        fileName: fileName,
        recordCount: response.history.length,
        filters: cleanFilters,
        description: `Xuất ${response.history.length} bản ghi lịch sử kiểm tra ra file Excel: ${fileName}`
      });

    } catch (error) {
      console.error('Error exporting to Excel:', error);
      alert('Có lỗi xảy ra khi xuất file Excel: ' + error.message);
    } finally {
      setIsExporting(false);
    }
  };

  if (loading && currentPage === 1) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-neutral-600">Đang tải lịch sử kiểm tra...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 mb-4 rounded-full bg-red-100">
          <span className="text-2xl">⚠️</span>
        </div>
        <h3 className="mb-2 text-lg font-semibold text-neutral-800">
          Có lỗi xảy ra
        </h3>
        <p className="mb-4 text-neutral-600">{error}</p>
        <button
          onClick={() => fetchHistory(currentPage)}
          className="px-4 py-2 text-white transition-colors rounded-lg bg-primary-600 hover:bg-primary-700"
        >
          Thử lại
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-neutral-800">
            Lịch sử kiểm tra Plagiarism
          </h2>
          <p className="text-neutral-600">
            Xem lại các lần kiểm tra trùng lặp nội dung đã thực hiện bởi tất cả người dùng
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 text-sm text-neutral-600">
            <span>Tổng cộng:</span>
            <span className="font-semibold text-primary-600">{total}</span>
            <span>lần kiểm tra</span>
          </div>
          {/* Nút xuất Excel */}
          <button
            onClick={exportToExcel}
            disabled={isExporting || history.length === 0}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white transition-colors bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExporting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Đang xuất...</span>
              </>
            ) : (
              <>
                <span>📊</span>
                <span>Xuất Excel</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="p-4 border rounded-lg bg-neutral-50 border-neutral-200">
        <div className="space-y-4">
          {/* First row - User search */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-neutral-700">
                Tên người dùng:
              </label>
              <input
                type="text"
                value={searchInput}
                onChange={(e) => handleFilterChange("userName", e.target.value)}
                placeholder="Nhập tên người dùng..."
                className="px-3 py-2 text-sm border rounded-lg border-neutral-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent w-48"
              />
            </div>
          </div>

          {/* Second row - Date filters */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-neutral-700">
                Từ ngày:
              </label>
              <input
                type="date"
                value={tempDateFilters.startDate}
                onChange={(e) => handleFilterChange("startDate", e.target.value)}
                className="px-3 py-2 text-sm border rounded-lg border-neutral-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-neutral-700">
                Đến ngày:
              </label>
              <input
                type="date"
                value={tempDateFilters.endDate}
                onChange={(e) => handleFilterChange("endDate", e.target.value)}
                className="px-3 py-2 text-sm border rounded-lg border-neutral-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            {/* Apply date filter button */}
            <button
              onClick={applyDateFilters}
              className="px-3 py-2 text-sm font-medium text-white transition-colors rounded-lg bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            >
              Áp dụng
            </button>

            {/* Quick date filters */}
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-neutral-700">Nhanh:</span>
              <button
                onClick={setTodayFilter}
                className="px-2 py-1 text-xs font-medium transition-colors border rounded border-neutral-300 text-neutral-700 hover:bg-neutral-100"
              >
                Hôm nay
              </button>
              <button
                onClick={() => setQuickDateFilter(7)}
                className="px-2 py-1 text-xs font-medium transition-colors border rounded border-neutral-300 text-neutral-700 hover:bg-neutral-100"
              >
                7 ngày
              </button>
              <button
                onClick={() => setQuickDateFilter(30)}
                className="px-2 py-1 text-xs font-medium transition-colors border rounded border-neutral-300 text-neutral-700 hover:bg-neutral-100"
              >
                30 ngày
              </button>
            </div>
          </div>

          {/* Active filters display */}
          {(filters.startDate || filters.endDate) && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-neutral-700">Bộ lọc đang áp dụng:</span>
              {filters.startDate && (
                <span className="px-2 py-1 text-xs font-medium rounded-full bg-primary-100 text-primary-700">
                  Từ: {formatDateForDisplay(filters.startDate)}
                </span>
              )}
              {filters.endDate && (
                <span className="px-2 py-1 text-xs font-medium rounded-full bg-primary-100 text-primary-700">
                  Đến: {formatDateForDisplay(filters.endDate)}
                </span>
              )}
            </div>
          )}

          {/* Clear filters button */}
          {(searchInput || filters.status || filters.startDate || filters.endDate) && (
            <div className="flex justify-start">
              <button
                onClick={clearFilters}
                className="px-3 py-2 text-sm font-medium transition-colors border rounded-lg border-neutral-300 text-neutral-700 hover:bg-neutral-100"
              >
                Xóa tất cả bộ lọc
              </button>
            </div>
          )}
        </div>
      </div>

      {/* History List */}
      {history.length === 0 ? (
        <div className="py-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 mb-4 rounded-full bg-neutral-100">
            <span className="text-2xl">📋</span>
          </div>
          <h3 className="mb-2 text-lg font-semibold text-neutral-800">
            Chưa có lịch sử kiểm tra
          </h3>
          <p className="text-neutral-600">
            Chưa có lịch sử kiểm tra nào phù hợp với bộ lọc hiện tại.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {history.map((item) => (
            <div
              key={item.id}
              className="p-6 transition-shadow bg-white border rounded-lg border-neutral-200 hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center mb-3 space-x-3">
                    <span className="text-xl">{getSourceIcon(item.source)}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-neutral-800">
                          {item.fileName || "Kiểm tra văn bản"}
                        </h3>
                        <div className="flex items-center space-x-2 text-sm text-neutral-600">
                          <span>👤</span>
                          <span className="font-medium">{item.user?.name}</span>
                          <span className="text-neutral-400">({item.user?.email})</span>
                        </div>
                      </div>
                      <p className="text-sm text-neutral-600">
                        {formatDate(item.checkedAt)}
                      </p>
                    </div>
                  </div>

                  <div className="mb-3">
                    <p className="text-neutral-700" style={{
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}>
                      {item.text}
                    </p>
                  </div>

                  {/* Thông tin số câu */}
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-neutral-600">Số câu trùng:</span>
                        <span className="font-semibold text-orange-600">
                          {item.duplicateSentenceCount || 0}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-neutral-600">Tổng số câu:</span>
                        <span className="font-semibold text-neutral-700">
                          {item.sentenceCount || 0}
                        </span>
                      </div>
                    </div>

                    {/* Nút xem chi tiết */}
                    <button
                      onClick={() => handleViewDetails(item)}
                      className="inline-flex items-center px-4 py-2 text-sm font-medium text-white transition-colors bg-green-600 rounded-lg hover:bg-green-700"
                    >
                      <span className="flex items-center space-x-2">
                        <span>🔍</span>
                        <span>Xem chi tiết</span>
                      </span>
                    </button>
                  </div>
                </div>

                <div className="ml-4">
                  <div className="flex flex-col items-center space-y-2">
                    <div className="flex items-center justify-center w-16 h-16 rounded-full bg-neutral-100">
                      <div className="text-center">
                        <div className="text-lg font-bold text-primary-600">
                          {Math.round(item.duplicatePercentage)}%
                        </div>
                        <div className="text-xs text-neutral-600">trùng lặp</div>
                      </div>
                    </div>
                    {item.sentenceCount > 0 && (
                      <div className="text-center">
                        <div className="text-sm font-semibold text-orange-600">
                          {item.duplicateSentenceCount || 0}/{item.sentenceCount}
                        </div>
                        <div className="text-xs text-neutral-600">câu trùng</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-6 border-t border-neutral-200">
          <div className="text-sm text-neutral-600">
            Hiển thị {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, total)} trong tổng số {total} kết quả
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-2 text-sm font-medium transition-colors border rounded-lg border-neutral-300 text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Trước
            </button>

            <div className="flex items-center space-x-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }

                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${currentPage === pageNum
                      ? "bg-primary-600 text-white"
                      : "text-neutral-700 hover:bg-neutral-100"
                      }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-3 py-2 text-sm font-medium transition-colors border rounded-lg border-neutral-300 text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Sau
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlagiarismHistory;