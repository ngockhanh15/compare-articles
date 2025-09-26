import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import * as api from "../services/api";
import BulkUploadModal from "./BulkUploadModal";
import * as XLSX from 'xlsx';

const DocumentManagement = () => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [inputValue, setInputValue] = useState(""); // Separate state for input value
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [documentsPerPage, setDocumentsPerPage] = useState(5);
  const [totalPages, setTotalPages] = useState(1);
  const [totalDocuments, setTotalDocuments] = useState(0);
  const [stats, setStats] = useState(null);
  const [setTreeStats] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Date filter states
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [appliedStartDate, setAppliedStartDate] = useState("");
  const [appliedEndDate, setAppliedEndDate] = useState("");

  // Ref for debounce timeout
  const debounceRef = useRef(null);

  // Check if current user is admin
  const isAdmin = user?.role === 'admin';

  // Debounced search function
  const debouncedSearch = useCallback((value) => {
    // Clear existing timeout
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Set new timeout
    debounceRef.current = setTimeout(() => {
      setSearchTerm(value);
      setCurrentPage(1); // Reset to first page when searching
    }, 500); // 500ms delay
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  // Sync inputValue with searchTerm on initial load
  useEffect(() => {
    setInputValue(searchTerm);
  }, []);

  useEffect(() => {
    fetchDocuments();
    fetchStats();
    fetchTreeStats();
  }, [currentPage, documentsPerPage, searchTerm, filterType, filterStatus, appliedStartDate, appliedEndDate, isAdmin]);

  const fetchTreeStats = async () => {
    try {
      const response = await api.getTreeStats();
      if (response.success) {
        setTreeStats(response.stats);
      }
    } catch (error) {
      console.error("Error fetching tree stats:", error);
    }
  };

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit: documentsPerPage,
        search: searchTerm,
        fileType: filterType,
        status: filterStatus,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      };

      // Add date filters if they are applied
      if (appliedStartDate) {
        params.startDate = appliedStartDate;
      }
      if (appliedEndDate) {
        params.endDate = appliedEndDate;
      }

      console.log("Fetching documents with params:", params);
      console.log("Applied date filters:", { appliedStartDate, appliedEndDate });

      const response = isAdmin
        ? await api.getAllDocuments(params)
        : await api.getUserDocuments(params);

      if (response.success) {
        setDocuments(response.documents);
        setTotalPages(response.pagination.totalPages);
        setTotalDocuments(response.pagination.totalDocuments);
      }
    } catch (error) {
      setError("Không thể tải danh sách tài liệu: " + error.message);
      console.error("Error fetching documents:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = isAdmin
        ? await api.getAllDocumentStats()
        : await api.getDocumentStats();
      if (response.success) {
        setStats(response.stats);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const handleDeleteDocument = async (documentId, documentTitle, ownerName) => {
    const confirmMessage = isAdmin && ownerName
      ? `Bạn có chắc chắn muốn xóa tài liệu "${documentTitle}" của người dùng "${ownerName}"?`
      : "Bạn có chắc chắn muốn xóa tài liệu này?";

    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      const response = isAdmin
        ? await api.adminDeleteDocument(documentId)
        : await api.deleteDocument(documentId);
      if (response.success) {
        setDocuments(documents.filter(doc => doc._id !== documentId));
        setTotalDocuments(prev => {
          const newTotal = prev - 1;
          const newTotalPages = Math.ceil(newTotal / documentsPerPage);
          // Update total pages based on new total
          setTotalPages(newTotalPages);
          // If current page is greater than new total pages, go to last page
          if (currentPage > newTotalPages && newTotalPages > 0) {
            setCurrentPage(newTotalPages);
          }
          window.location.reload();
          return newTotal;
        });
        fetchStats(); // Refresh stats
        fetchTreeStats(); // Refresh tree stats
        setError("");
      }
    } catch (error) {
      setError("Không thể xóa tài liệu: " + error.message);
      console.error("Error deleting document:", error);
    }
  };

  const handleDownloadDocument = async (documentId, fileName) => {
    try {
      const response = await api.downloadDocument(documentId);

      // Create blob from response
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      // Create download link
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();

      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setError("");
    } catch (error) {
      setError("Không thể tải xuống tài liệu: " + error.message);
      console.error("Error downloading document:", error);
    }
  };

  const handleViewDocument = async (documentId, documentTitle) => {
    try {
      const response = await api.getDocumentText(documentId);
      if (response.success) {
        // Kiểm tra và xử lý nội dung text - API trả về extractedText
        const documentText = response.extractedText || response.text || response.data?.extractedText || response.data?.text || '';
        
        if (!documentText.trim()) {
          setError("Tài liệu không có nội dung văn bản hoặc không thể trích xuất được nội dung.");
          return;
        }

        // Escape HTML để tránh XSS và xử lý ký tự đặc biệt
        const escapeHtml = (text) => {
          const div = document.createElement('div');
          div.textContent = text;
          return div.innerHTML;
        };

        const escapedTitle = escapeHtml(documentTitle);
        const escapedText = escapeHtml(documentText);

        // Tạo một trang mới để hiển thị nội dung
        const newWindow = window.open('', '_blank');
        if (newWindow) {
          newWindow.document.write(`
            <!DOCTYPE html>
            <html lang="vi">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>${escapedTitle} - Xem nội dung</title>
              <style>
                body {
                  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                  line-height: 1.6;
                  max-width: 800px;
                  margin: 0 auto;
                  padding: 20px;
                  background-color: #f8f9fa;
                }
                .header {
                  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                  color: white;
                  padding: 20px;
                  border-radius: 10px;
                  margin-bottom: 20px;
                  text-align: center;
                }
                .content {
                  background: white;
                  padding: 30px;
                  border-radius: 10px;
                  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                  white-space: pre-wrap;
                  word-wrap: break-word;
                  font-size: 14px;
                  line-height: 1.8;
                }
                .footer {
                  text-align: center;
                  margin-top: 20px;
                  color: #666;
                  font-size: 14px;
                }
                .no-content {
                  text-align: center;
                  color: #999;
                  font-style: italic;
                  padding: 40px;
                }
                @media print {
                  body { background-color: white; }
                  .header { background: #333 !important; }
                }
              </style>
            </head>
            <body>
              <div class="header">
                <h1>📄 ${escapedTitle}</h1>
                <p>Nội dung tài liệu được trích xuất</p>
              </div>
              <div class="content">
                ${escapedText.replace(/\n/g, '<br>').replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;')}
              </div>
              <div class="footer">
                <p>Được tạo bởi hệ thống quản lý tài liệu - ${(() => {
                  const now = new Date();
                  const day = now.getDate().toString().padStart(2, '0');
                  const month = (now.getMonth() + 1).toString().padStart(2, '0');
                  const year = now.getFullYear();
                  const hours = now.getHours().toString().padStart(2, '0');
                  const minutes = now.getMinutes().toString().padStart(2, '0');
                  return `${day}/${month}/${year} ${hours}:${minutes}`;
                })()}</p>
              </div>
            </body>
            </html>
          `);
          newWindow.document.close();
        } else {
          setError("Không thể mở cửa sổ mới. Vui lòng kiểm tra cài đặt trình duyệt.");
        }
      } else {
        setError("Không thể lấy nội dung tài liệu: " + (response.message || "Lỗi không xác định"));
      }
      setError("");
    } catch (error) {
      setError("Không thể xem nội dung tài liệu: " + error.message);
      console.error("Error viewing document:", error);
    }
  };

  const handleUploadDocument = async (file, metadata) => {
    try {
      setIsUploading(true);
      setUploadProgress(0);

      const response = await api.uploadDocument(file, metadata);

      if (response.success) {
        setShowUploadModal(false);
        // Update total documents count
        setTotalDocuments(prev => {
          const newTotal = prev + 1;
          const newTotalPages = Math.ceil(newTotal / documentsPerPage);
          setTotalPages(newTotalPages);
          return newTotal;
        });
        fetchDocuments(); // Refresh documents list
        fetchStats(); // Refresh stats
        fetchTreeStats(); // Refresh tree stats
        setError("");
        setUploadProgress(100);
      }
    } catch (error) {
      setError("Không thể upload tài liệu: " + error.message);
      console.error("Error uploading document:", error);
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  // Handle bulk upload success
  const handleBulkUploadSuccess = () => {
    setShowBulkUploadModal(false);
    fetchDocuments(); // Refresh documents list
    fetchStats(); // Refresh stats
    fetchTreeStats(); // Refresh tree stats
    setError("");
  };

  // Search and filter are now handled by the API
  const handleSearchChange = (value) => {
    setInputValue(value); // Update input value immediately for UI responsiveness
    debouncedSearch(value); // Debounced API call
  };

  const handleFilterTypeChange = (value) => {
    setFilterType(value);
    setCurrentPage(1); // Reset to first page when filtering
  };

  const handleFilterStatusChange = (value) => {
    setFilterStatus(value);
    setCurrentPage(1); // Reset to first page when filtering
  };

  const handleDocumentsPerPageChange = (value) => {
    setDocumentsPerPage(parseInt(value));
    setCurrentPage(1); // Reset to first page when changing page size
  };

  // Handle date filter application
  const handleApplyDateFilter = () => {
    // Validate date range
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      setError("Ngày bắt đầu không thể lớn hơn ngày kết thúc");
      return;
    }
    
    console.log("Applying date filter:", { startDate, endDate });
    setAppliedStartDate(startDate);
    setAppliedEndDate(endDate);
    setCurrentPage(1); // Reset to first page when applying date filter
    setError(""); // Clear any previous errors
  };

  // Handle clearing date filter
  const handleClearDateFilter = () => {
    setStartDate("");
    setEndDate("");
    setAppliedStartDate("");
    setAppliedEndDate("");
    setCurrentPage(1); // Reset to first page when clearing date filter
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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

  const getFileIcon = (fileType) => {
    switch (fileType) {
      case 'pdf': return '📄';
      case 'docx': case 'doc': return '📝';
      case 'txt': return '📃';
      case 'xlsx': case 'xls': return '📊';
      case 'pptx': case 'ppt': return '📊';
      default: return '📁';
    }
  };

  // Export to Excel function
  const handleExportToExcel = async () => {
    try {
      setIsExporting(true);
      
      // Use current documents in the table (no need to fetch again)
      if (documents.length === 0) {
        setError("Không có dữ liệu để xuất");
        return;
      }

      const exportData = documents.map((doc, index) => {
          const baseData = {
            'STT': index + 1,
            'Tên tài liệu': doc.title || '',
            'Tên file': doc.fileName || '',
            'Tác giả': doc.author || 'Không có thông tin tác giả',
            'Loại file': doc.fileType?.toUpperCase() || '',
            'Kích thước': formatFileSize(doc.fileSize || 0),
            'Trạng thái': doc.status === 'processed' ? 'Đã xử lý' : 
                         doc.status === 'processing' ? 'Đang xử lý' : 
                         doc.status === 'failed' ? 'Lỗi' : doc.status,
            'Ngày tải lên': formatDate(doc.uploadedAt),
            'Mô tả': doc.description || '',
            'Tags': doc.tags || ''
          };

          // Add uploader info if admin
          if (isAdmin) {
            baseData['Người tải lên'] = doc.uploadedBy?.name || 'Không xác định';
            baseData['Email người tải'] = doc.uploadedBy?.email || '';
          }

          return baseData;
        });

        // Create workbook and worksheet
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(exportData);

        // Set column widths
        const colWidths = [
          { wch: 5 },   // STT
          { wch: 30 },  // Tên tài liệu
          { wch: 25 },  // Tên file
          { wch: 20 },  // Tác giả
          { wch: 10 },  // Loại file
          { wch: 12 },  // Kích thước
          { wch: 12 },  // Trạng thái
          { wch: 18 },  // Ngày tải lên
          { wch: 30 },  // Mô tả
          { wch: 20 },  // Tags
        ];

        if (isAdmin) {
          colWidths.push({ wch: 20 }); // Người tải lên
          colWidths.push({ wch: 25 }); // Email người tải
        }

        ws['!cols'] = colWidths;

        // Add worksheet to workbook
        XLSX.utils.book_append_sheet(wb, ws, 'Danh sách tài liệu');

        // Generate filename with current date and page info
        let filename = 'Danh_sach_tai_lieu';
        if (searchTerm) {
          filename += `_tim_kiem_${searchTerm.replace(/[^a-zA-Z0-9]/g, '_')}`;
        }
        if (filterType !== 'all') {
          filename += `_${filterType}`;
        }
        if (appliedStartDate || appliedEndDate) {
          filename += '_loc_ngay';
          if (appliedStartDate) {
            filename += `_tu_${appliedStartDate.replace(/-/g, '')}`;
          }
          if (appliedEndDate) {
            filename += `_den_${appliedEndDate.replace(/-/g, '')}`;
          }
        }
        filename += `_trang_${currentPage}_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.xlsx`;

        // Save file
        XLSX.writeFile(wb, filename);

        // Show success message temporarily
        const successMessage = `Đã xuất thành công ${exportData.length} tài liệu (trang ${currentPage}) ra file Excel: ${filename}`;
        setError(""); // Clear any previous errors
        
        // Show success notification (you can replace this with a proper toast notification)
        const originalTitle = document.title;
        document.title = "✅ Xuất Excel thành công!";
        setTimeout(() => {
          document.title = originalTitle;
        }, 3000);
    } catch (error) {
      setError("Không thể xuất file Excel: " + error.message);
      console.error("Error exporting to Excel:", error);
    } finally {
      setIsExporting(false);
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
            {isAdmin ? 'Quản lý tất cả tài liệu' : 'Quản lý tài liệu'}
          </h3>
          <p className="mt-1 text-sm text-neutral-600">
            {isAdmin
              ? `Tổng cộng ${totalDocuments} tài liệu trong hệ thống`
              : `Tổng cộng ${totalDocuments} tài liệu của bạn`
            }
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={handleExportToExcel}
            disabled={loading || documents.length === 0 || isExporting}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white transition-colors bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Xuất tài liệu đang hiển thị trong bảng ra file Excel"
          >
            {isExporting ? (
              <>
                <span className="inline-block w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                Đang xuất...
              </>
            ) : (
              <>📊 Xuất Excel</>
            )}
          </button>
          <button
            onClick={() => setShowUploadModal(true)}
            className="px-4 py-2 text-white transition-colors bg-green-600 rounded-lg hover:bg-green-700"
          >
            📤 Upload tài liệu
          </button>
          <button
            onClick={() => setShowBulkUploadModal(true)}
            className="px-4 py-2 text-white transition-colors bg-green-600 rounded-lg hover:bg-green-700"
          >
            📦 Upload hàng loạt
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
      <div className="space-y-4">
        {/* Main filters row */}
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Tìm kiếm theo tên tài liệu, tên file, tác giả hoặc mô tả..."
              value={inputValue}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg border-neutral-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => handleFilterTypeChange(e.target.value)}
            className="px-4 py-2 border rounded-lg border-neutral-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="all">Tất cả loại file</option>
            <option value="pdf">PDF</option>
            <option value="docx">Word (DOCX)</option>
            <option value="doc">Word (DOC)</option>
            <option value="txt">Text</option>
            <option value="xlsx">Excel (XLSX)</option>
            <option value="xls">Excel (XLS)</option>
            <option value="pptx">PowerPoint (PPTX)</option>
            <option value="ppt">PowerPoint (PPT)</option>
          </select>
        </div>

        {/* Date filter row */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
            <label className="text-sm font-medium text-neutral-700 whitespace-nowrap">
              Lọc theo ngày tải lên:
            </label>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2">
              <div className="flex flex-col">
                <label className="text-xs text-neutral-500 mb-1">Từ ngày</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  max={endDate || undefined}
                  className="px-3 py-2 border rounded-lg border-neutral-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                />
              </div>
              <div className="flex flex-col">
                <label className="text-xs text-neutral-500 mb-1">Đến ngày</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate || undefined}
                  className="px-3 py-2 border rounded-lg border-neutral-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                />
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleApplyDateFilter}
              disabled={!startDate && !endDate}
              className="px-3 py-2 text-sm font-medium text-white transition-colors bg-primary-600 border border-primary-600 rounded-lg hover:bg-primary-700"
              title={!startDate && !endDate ? "Vui lòng chọn ít nhất một ngày" : "Áp dụng bộ lọc ngày"}
            >
              Áp dụng lọc
            </button>
            {(appliedStartDate || appliedEndDate) && (
              <button
                onClick={handleClearDateFilter}
                className="px-3 py-2 text-sm font-medium text-red-600 transition-colors bg-red-50 border border-red-200 rounded-lg hover:bg-red-100"
              >
                Xóa bộ lọc
              </button>
            )}
          </div>
        </div>

        {/* Applied date filter indicator */}
        {(appliedStartDate || appliedEndDate) && (
          <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <span className="text-blue-600">📅</span>
            <span className="text-sm text-blue-700">
              Đang lọc theo ngày: 
              {appliedStartDate && ` từ ${new Date(appliedStartDate).toLocaleDateString('vi-VN')}`}
              {appliedStartDate && appliedEndDate && ' '}
              {appliedEndDate && ` đến ${new Date(appliedEndDate).toLocaleDateString('vi-VN')}`}
            </span>
          </div>
        )}
      </div>

      {/* Documents Table */}
      <div className="overflow-hidden bg-white border border-neutral-200 rounded-xl">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-neutral-200">
            <thead className="bg-neutral-50">
              <tr>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left uppercase text-neutral-500">
                  Tài liệu
                </th>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left uppercase text-neutral-500">
                  Tác giả
                </th>
                {isAdmin && (
                  <th className="px-6 py-3 text-xs font-medium tracking-wider text-left uppercase text-neutral-500">
                    Người tải lên
                  </th>
                )}
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left uppercase text-neutral-500">
                  Kích thước
                </th>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left uppercase text-neutral-500">
                  Ngày tải lên
                </th>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-right uppercase text-neutral-500">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-neutral-200">
              {documents.map((document) => (
                <tr key={document._id} className="hover:bg-neutral-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="mr-3 text-2xl">
                        {getFileIcon(document.fileType)}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-neutral-900">
                          {document.title}
                        </div>
                        <div className="text-sm text-neutral-500">
                          {document.fileName}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-neutral-900">
                      {document.author || 'Không có thông tin tác giả'}
                    </div>
                  </td>
                  {isAdmin && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-neutral-900">
                        {document.uploadedBy?.name || 'Không xác định'}
                      </div>
                      <div className="text-xs text-neutral-500">
                        {document.uploadedBy?.email || ''}
                      </div>
                    </td>
                  )}
                  <td className="px-6 py-4 text-sm whitespace-nowrap text-neutral-500">
                    {formatFileSize(document.fileSize)}
                  </td>
                  <td className="px-6 py-4 text-sm whitespace-nowrap text-neutral-500">
                    {formatDate(document.uploadedAt)}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-right whitespace-nowrap">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => handleViewDocument(document._id, document.title)}
                        className="px-3 py-1 text-xs font-medium text-green-700 transition-colors bg-green-100 rounded-lg hover:bg-green-200"
                        title="Xem chi tiết nội dung"
                      >
                        👁️ Xem
                      </button>
                      <button
                        onClick={() => handleDownloadDocument(document._id, document.fileName)}
                        className="px-3 py-1 text-xs font-medium text-blue-700 transition-colors bg-blue-100 rounded-lg hover:bg-blue-200"
                        title="Tải xuống"
                      >
                        📥 Tải
                      </button>
                      <button
                        onClick={() => handleDeleteDocument(document._id, document.title, document.uploadedBy?.name)}
                        className="px-3 py-1 text-xs font-medium text-red-700 transition-colors bg-red-100 rounded-lg hover:bg-red-200"
                        title={isAdmin ? "Xóa tài liệu (Admin)" : "Xóa tài liệu"}
                      >
                        🗑️ Xóa
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-neutral-700">
            Hiển thị {((currentPage - 1) * documentsPerPage) + 1} đến {Math.min(currentPage * documentsPerPage, totalDocuments)} trong tổng số {totalDocuments} tài liệu
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-2 text-sm font-medium bg-white border rounded-lg text-neutral-500 border-neutral-300 hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Trước
            </button>
            <span className="px-3 py-2 text-sm font-medium border rounded-lg text-neutral-700 bg-neutral-100 border-neutral-300">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-3 py-2 text-sm font-medium bg-white border rounded-lg text-neutral-500 border-neutral-300 hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Sau
            </button>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <UploadModal
          onClose={() => setShowUploadModal(false)}
          onUpload={handleUploadDocument}
          isUploading={isUploading}
          uploadProgress={uploadProgress}
        />
      )}

      {/* Bulk Upload Modal */}
      {showBulkUploadModal && (
        <BulkUploadModal
          onClose={() => setShowBulkUploadModal(false)}
          onSuccess={handleBulkUploadSuccess}
        />
      )}
    </div>
  );
};

// Upload Modal Component
const UploadModal = ({ onClose, onUpload, isUploading, uploadProgress }) => {
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      setFile(droppedFile);
      if (!title) {
        setTitle(droppedFile.name.replace(/\.[^/.]+$/, ""));
      }
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      if (!title) {
        setTitle(selectedFile.name.replace(/\.[^/.]+$/, ""));
      }
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!file) return;

    const metadata = {
      title: title || file.name,
      author,
      description,
      tags,
      isPublic
    };

    onUpload(file, metadata);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="w-full max-w-2xl bg-white rounded-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-neutral-900">Upload tài liệu</h2>
            <button
              onClick={onClose}
              className="text-neutral-400 hover:text-neutral-600"
              disabled={isUploading}
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* File Upload Area */}
            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${dragActive
                  ? 'border-blue-400 bg-blue-50'
                  : 'border-neutral-300 hover:border-neutral-400'
                }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              {file ? (
                <div className="space-y-2">
                  <div className="text-2xl">📄</div>
                  <div className="font-medium text-neutral-900">{file.name}</div>
                  <div className="text-sm text-neutral-500">{formatFileSize(file.size)}</div>
                  <button
                    type="button"
                    onClick={() => setFile(null)}
                    className="text-sm text-red-600 hover:text-red-700"
                  >
                    Xóa file
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="text-4xl">📤</div>
                  <div className="font-medium text-neutral-900">
                    Kéo thả file vào đây hoặc click để chọn
                  </div>
                  <div className="text-sm text-neutral-500">
                    Hỗ trợ: PDF, DOC, DOCX, TXT, XLS, XLSX, PPT, PPTX (tối đa 50MB)
                  </div>
                  <input
                    type="file"
                    onChange={handleFileChange}
                    accept=".pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx"
                    className="hidden"
                    id="file-upload"
                  />
                  <label
                    htmlFor="file-upload"
                    className="inline-block px-4 py-2 text-sm font-medium text-blue-600 bg-blue-100 rounded-lg cursor-pointer hover:bg-blue-200"
                  >
                    Chọn file
                  </label>
                </div>
              )}
            </div>

            {/* Metadata Fields */}
            <div className="space-y-4">
              <div>
                <label className="block mb-2 text-sm font-medium text-neutral-700">
                  Tiêu đề tài liệu
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg border-neutral-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Nhập tiêu đề tài liệu..."
                />
              </div>

              <div>
                <label className="block mb-2 text-sm font-medium text-neutral-700">
                  Tác giả
                </label>
                <input
                  type="text"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg border-neutral-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Nhập tên tác giả..."
                />
              </div>

              <div>
                <label className="block mb-2 text-sm font-medium text-neutral-700">
                  Mô tả (tùy chọn)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg border-neutral-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Mô tả ngắn về tài liệu..."
                />
              </div>

              <div>
                <label className="block mb-2 text-sm font-medium text-neutral-700">
                  Tags (tùy chọn)
                </label>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg border-neutral-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Nhập tags, cách nhau bằng dấu phẩy..."
                />
              </div>
            </div>

            {/* Upload Progress */}
            {isUploading && uploadProgress > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Đang upload...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-neutral-200">
                  <div
                    className="h-2 transition-all duration-300 bg-blue-600 rounded-full"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isUploading}
                className="px-4 py-2 text-sm font-medium border rounded-lg text-neutral-700 border-neutral-300 hover:bg-neutral-50 disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={!file || isUploading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUploading ? 'Đang upload...' : 'Upload'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default DocumentManagement;