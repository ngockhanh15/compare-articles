import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { getPlagiarismHistory } from "../services/api";
import * as XLSX from 'xlsx';

const HistoryPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [filters, setFilters] = useState({
    status: "",
    startDate: "",
    endDate: "",
  });

  const [tempDateFilters, setTempDateFilters] = useState({
    startDate: "",
    endDate: "",
  });
  const [isExporting, setIsExporting] = useState(false);
  
  const itemsPerPage = 10;

  const fetchHistory = async (page = 1) => {
    try {
      setLoading(true);
      setError(null);
      
      const offset = (page - 1) * itemsPerPage;
      const cleanFilters = {};
      if (filters.status) cleanFilters.status = filters.status;
      if (filters.startDate) cleanFilters.startDate = filters.startDate;
      if (filters.endDate) cleanFilters.endDate = filters.endDate;
      
      const response = await getPlagiarismHistory(itemsPerPage, offset, cleanFilters);
      
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

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleFilterChange = (key, value) => {
    if (key === 'startDate' || key === 'endDate') {
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
    }
  };

  const applyDateFilters = () => {
    setFilters(prev => ({
      ...prev,
      startDate: tempDateFilters.startDate,
      endDate: tempDateFilters.endDate,
    }));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({
      status: "",
      startDate: "",
      endDate: "",
    });
    setTempDateFilters({
      startDate: "",
      endDate: "",
    });
    setCurrentPage(1);
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

  const setQuickDateFilter = (days) => {
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
  };

  const setTodayFilter = () => {
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
  };

  const getSourceIcon = (source) => {
    return source === "file" ? "📄" : "📝";
  };

  const handleViewDetails = (item) => {
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
      if (filters.status) cleanFilters.status = filters.status;
      if (filters.startDate) cleanFilters.startDate = filters.startDate;
      if (filters.endDate) cleanFilters.endDate = filters.endDate;
      
      const response = await getPlagiarismHistory(10000, 0, cleanFilters); // Lấy tối đa 10000 records
      
      if (!response.success) {
        throw new Error("Không thể lấy dữ liệu để xuất Excel");
      }

      // Chuẩn bị dữ liệu cho Excel
      const excelData = response.history.map((item, index) => ({
        'STT': index + 1,
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
      
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      alert('Có lỗi xảy ra khi xuất file Excel: ' + error.message);
    } finally {
      setIsExporting(false);
    }
  };

  if (loading && currentPage === 1) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100">
        <div className="px-4 py-8 mx-auto max-w-7xl">
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-neutral-600">Đang tải lịch sử kiểm tra...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100">
        <div className="px-4 py-8 mx-auto max-w-7xl">
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
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100">
      <div className="px-4 py-8 mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="p-3 mr-3 shadow-lg bg-gradient-primary rounded-2xl">
              <span className="text-3xl">📋</span>
            </div>
            <h1 className="text-3xl font-bold text-neutral-800">
              Lịch sử kiểm tra
            </h1>
          </div>
          <p className="text-neutral-600">
            Chào mừng{" "}
            <span className="font-semibold text-primary-600">{user?.name}</span>
            ! Xem lại các lần kiểm tra trùng lặp nội dung đã thực hiện.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-6 mb-8 md:grid-cols-2">
          <div className="p-6 bg-white shadow-lg rounded-2xl">
            <div className="flex items-center">
              <div className="p-3 mr-4 rounded-full bg-blue-100">
                <span className="text-2xl">📊</span>
              </div>
              <div>
                <p className="text-sm font-medium text-neutral-600">Tổng số lần kiểm tra</p>
                <p className="text-2xl font-bold text-blue-600">{total}</p>
              </div>
            </div>
          </div>
          
          <div className="p-6 bg-white shadow-lg rounded-2xl">
            <div className="flex items-center">
              <div className="p-3 mr-4 rounded-full bg-purple-100">
                <span className="text-2xl">📈</span>
              </div>
              <div>
                <p className="text-sm font-medium text-neutral-600">Kết quả hiển thị</p>
                <p className="text-2xl font-bold text-purple-600">{history.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="p-6 bg-white shadow-xl rounded-2xl">
          {/* Filters */}
          <div className="p-4 mb-6 border rounded-lg bg-neutral-50 border-neutral-200">
            <div className="space-y-4">
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

                <button
                  onClick={applyDateFilters}
                  className="px-4 py-2 text-sm font-medium text-white transition-colors rounded-lg bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                >
                  Áp dụng
                </button>
              </div>

              {/* Third row - Quick filters */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-neutral-700">Lọc nhanh:</span>
                <button
                  onClick={setTodayFilter}
                  className="px-3 py-1 text-xs font-medium transition-colors border rounded-full text-neutral-600 border-neutral-300 hover:bg-neutral-100"
                >
                  Hôm nay
                </button>
                <button
                  onClick={() => setQuickDateFilter(7)}
                  className="px-3 py-1 text-xs font-medium transition-colors border rounded-full text-neutral-600 border-neutral-300 hover:bg-neutral-100"
                >
                  7 ngày qua
                </button>
                <button
                  onClick={() => setQuickDateFilter(30)}
                  className="px-3 py-1 text-xs font-medium transition-colors border rounded-full text-neutral-600 border-neutral-300 hover:bg-neutral-100"
                >
                  30 ngày qua
                </button>
                <button
                  onClick={clearFilters}
                  className="px-3 py-1 text-xs font-medium text-white transition-colors rounded-full bg-neutral-500 hover:bg-neutral-600"
                >
                  Xóa bộ lọc
                </button>
              </div>
            </div>
          </div>

          {/* Export Button */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2 text-sm text-neutral-600">
              <span>Tổng cộng:</span>
              <span className="font-semibold text-primary-600">{total}</span>
              <span>lần kiểm tra</span>
            </div>
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

          {/* History Table */}
          {history.length === 0 ? (
            <div className="py-12 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 mb-4 rounded-full bg-neutral-100">
                <span className="text-2xl">📋</span>
              </div>
              <h3 className="mb-2 text-lg font-semibold text-neutral-800">
                Chưa có lịch sử kiểm tra
              </h3>
              <p className="text-neutral-600">
                Bạn chưa thực hiện lần kiểm tra nào. Hãy bắt đầu kiểm tra văn bản của bạn!
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-neutral-200">
                      <th className="px-4 py-3 text-left font-medium text-neutral-700">Nội dung</th>
                      <th className="px-4 py-3 text-left font-medium text-neutral-700">Loại</th>
                      <th className="px-4 py-3 text-left font-medium text-neutral-700">Số câu trùng</th>
                      <th className="px-4 py-3 text-left font-medium text-neutral-700">Tổng số câu</th>
                      <th className="px-4 py-3 text-left font-medium text-neutral-700">Tỷ lệ trùng</th>
                      <th className="px-4 py-3 text-left font-medium text-neutral-700">Thời gian</th>
                      <th className="px-4 py-3 text-left font-medium text-neutral-700">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((item) => (
                      <tr key={item.id} className="border-b border-neutral-100 hover:bg-neutral-50">
                        <td className="px-4 py-3">
                          <div className="max-w-xs">
                            <p className="font-medium text-neutral-800 truncate">
                              {item.fileName || 'Kiểm tra văn bản'}
                            </p>
                            <p className="text-xs text-neutral-500 truncate">
                              {item.text ? `${item.text.substring(0, 50)}...` : 'Không có nội dung'}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center space-x-2">
                            <span className="text-lg">{getSourceIcon(item.source)}</span>
                            <span className="text-sm text-neutral-600">
                              {item.source === 'file' ? 'File' : 'Văn bản'}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-semibold text-orange-600">
                            {item.duplicateSentenceCount || 0}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-semibold text-neutral-700">
                            {item.sentenceCount || 0}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center space-x-2">
                            <div className={`w-3 h-3 rounded-full ${
                              (item.duplicatePercentage || 0) > 50 ? 'bg-red-500' :
                              (item.duplicatePercentage || 0) > 25 ? 'bg-yellow-500' : 'bg-green-500'
                            }`}></div>
                            <span className="font-medium text-neutral-800">
                              {Math.round(item.duplicatePercentage || 0)}%
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-neutral-600">{formatDate(item.checkedAt)}</p>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleViewDetails(item)}
                            className="flex items-center space-x-1 px-3 py-1 text-xs font-medium text-primary-600 transition-colors border border-primary-200 rounded-lg hover:bg-primary-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                          >
                            <span>👁️</span>
                            <span>Xem chi tiết</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6">
                  <div className="text-sm text-neutral-600">
                    Hiển thị {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, total)} trong tổng số {total} kết quả
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="px-3 py-2 text-sm font-medium text-neutral-600 transition-colors border border-neutral-300 rounded-lg hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Trước
                    </button>
                    
                    {/* Page numbers */}
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
                          className={`px-3 py-2 text-sm font-medium transition-colors border rounded-lg ${
                            currentPage === pageNum
                              ? 'bg-primary-600 text-white border-primary-600'
                              : 'text-neutral-600 border-neutral-300 hover:bg-neutral-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                    
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="px-3 py-2 text-sm font-medium text-neutral-600 transition-colors border border-neutral-300 rounded-lg hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Sau
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default HistoryPage;