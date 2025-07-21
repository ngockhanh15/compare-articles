import { useState, useEffect } from "react";
import * as api from "../services/api";

const DocumentManagement = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [documentsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalDocuments, setTotalDocuments] = useState(0);
  const [stats, setStats] = useState(null);
  const [treeStats, setTreeStats] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    fetchDocuments();
    fetchStats();
    fetchTreeStats();
  }, [currentPage, searchTerm, filterType, filterStatus]);

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
      const response = await api.getUserDocuments({
        page: currentPage,
        limit: documentsPerPage,
        search: searchTerm,
        fileType: filterType,
        status: filterStatus,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      });
      
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
      const response = await api.getDocumentStats();
      if (response.success) {
        setStats(response.stats);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const handleDeleteDocument = async (documentId) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa tài liệu này?")) {
      return;
    }

    try {
      const response = await api.deleteDocument(documentId);
      if (response.success) {
        setDocuments(documents.filter(doc => doc._id !== documentId));
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

  const handleUploadDocument = async (file, metadata) => {
    try {
      setIsUploading(true);
      setUploadProgress(0);
      
      const response = await api.uploadDocument(file, metadata);
      
      if (response.success) {
        setShowUploadModal(false);
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

  const handleCheckDocument = async (documentId) => {
    try {
      const response = await api.getDocumentText(documentId);
      if (response.success) {
        // Navigate to text checker with extracted text
        // This would typically use React Router
        console.log("Document text:", response.extractedText);
        // You can implement navigation logic here
      }
    } catch (error) {
      setError("Không thể lấy nội dung tài liệu: " + error.message);
      console.error("Error getting document text:", error);
    }
  };

  // Search and filter are now handled by the API
  const handleSearchChange = (value) => {
    setSearchTerm(value);
    setCurrentPage(1); // Reset to first page when searching
  };

  const handleFilterTypeChange = (value) => {
    setFilterType(value);
    setCurrentPage(1); // Reset to first page when filtering
  };

  const handleFilterStatusChange = (value) => {
    setFilterStatus(value);
    setCurrentPage(1); // Reset to first page when filtering
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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

  const getStatusBadge = (status) => {
    switch (status) {
      case 'processed':
        return <span className="inline-flex px-2 py-1 text-xs font-semibold text-green-800 bg-green-100 rounded-full">Đã xử lý</span>;
      case 'processing':
        return <span className="inline-flex px-2 py-1 text-xs font-semibold text-yellow-800 bg-yellow-100 rounded-full">Đang xử lý</span>;
      case 'failed':
        return <span className="inline-flex px-2 py-1 text-xs font-semibold text-red-800 bg-red-100 rounded-full">Lỗi</span>;
      default:
        return <span className="inline-flex px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 rounded-full">Không xác định</span>;
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
            Quản lý tài liệu
          </h3>
          <p className="mt-1 text-sm text-neutral-600">
            Tổng cộng {totalDocuments} tài liệu
          </p>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="px-4 py-2 text-white transition-colors bg-blue-600 rounded-lg hover:bg-blue-700"
        >
          📤 Upload tài liệu
        </button>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <div className="p-4 bg-white border border-neutral-200 rounded-xl">
            <div className="text-2xl font-bold text-blue-600">{stats.totalDocuments}</div>
            <div className="text-sm text-neutral-600">Tổng tài liệu</div>
          </div>
          <div className="p-4 bg-white border border-neutral-200 rounded-xl">
            <div className="text-2xl font-bold text-green-600">
              {formatFileSize(stats.totalStorage)}
            </div>
            <div className="text-sm text-neutral-600">Dung lượng sử dụng</div>
          </div>
          <div className="p-4 bg-white border border-neutral-200 rounded-xl">
            <div className="text-2xl font-bold text-purple-600">
              {Object.values(stats.byFileType).reduce((sum, type) => sum + type.totalChecks, 0)}
            </div>
            <div className="text-sm text-neutral-600">Tổng lần kiểm tra</div>
          </div>
          <div className="p-4 bg-white border border-neutral-200 rounded-xl">
            <div className="text-2xl font-bold text-orange-600">
              {Object.values(stats.byFileType).reduce((sum, type) => sum + type.totalDownloads, 0)}
            </div>
            <div className="text-sm text-neutral-600">Tổng lượt tải</div>
          </div>
        </div>
      )}

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
            placeholder="Tìm kiếm theo tên tài liệu, tên file hoặc mô tả..."
            value={searchTerm}
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
        <select
          value={filterStatus}
          onChange={(e) => handleFilterStatusChange(e.target.value)}
          className="px-4 py-2 border rounded-lg border-neutral-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="processed">Đã xử lý</option>
          <option value="processing">Đang xử lý</option>
          <option value="failed">Lỗi</option>
        </select>
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
                  Người tải lên
                </th>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left uppercase text-neutral-500">
                  Kích thước
                </th>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left uppercase text-neutral-500">
                  Trạng thái
                </th>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left uppercase text-neutral-500">
                  Số lần kiểm tra
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
                      {document.uploadedBy.name}
                    </div>
                    <div className="text-sm text-neutral-500">
                      {document.uploadedBy.email}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm whitespace-nowrap text-neutral-500">
                    {formatFileSize(document.fileSize)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(document.status)}
                  </td>
                  <td className="px-6 py-4 text-sm whitespace-nowrap text-neutral-500">
                    <div className="flex items-center">
                      <span className="font-medium">{document.checkCount}</span>
                      <span className="ml-1">lần</span>
                    </div>
                    {document.lastChecked && (
                      <div className="text-xs text-neutral-400">
                        Cuối: {formatDate(document.lastChecked)}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm whitespace-nowrap text-neutral-500">
                    {formatDate(document.uploadedAt)}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-right whitespace-nowrap">
                    <div className="flex items-center justify-end space-x-2">
                      {document.status === 'processed' && (
                        <button
                          onClick={() => handleCheckDocument(document._id)}
                          className="px-3 py-1 text-xs font-medium text-green-700 transition-colors bg-green-100 rounded-lg hover:bg-green-200"
                          title="Kiểm tra plagiarism"
                        >
                          🔍 Kiểm tra
                        </button>
                      )}
                      <button
                        onClick={() => handleDownloadDocument(document._id, document.fileName)}
                        className="px-3 py-1 text-xs font-medium text-blue-700 transition-colors bg-blue-100 rounded-lg hover:bg-blue-200"
                        title="Tải xuống"
                      >
                        📥 Tải
                      </button>
                      <button
                        onClick={() => handleDeleteDocument(document._id)}
                        className="px-3 py-1 text-xs font-medium text-red-700 transition-colors bg-red-100 rounded-lg hover:bg-red-200"
                        title="Xóa tài liệu"
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
    </div>
  );
};

// Upload Modal Component
const UploadModal = ({ onClose, onUpload, isUploading, uploadProgress }) => {
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-2xl p-6 mx-4 bg-white rounded-2xl">
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
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
              dragActive 
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

            <div className="flex items-center">
              <input
                type="checkbox"
                id="isPublic"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded border-neutral-300 focus:ring-blue-500"
              />
              <label htmlFor="isPublic" className="ml-2 text-sm text-neutral-700">
                Cho phép người khác xem tài liệu này
              </label>
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
  );
};

export default DocumentManagement;