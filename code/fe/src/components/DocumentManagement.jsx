import { useState, useEffect } from "react";
import * as api from "../services/api";

const DocumentManagement = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [documentsPerPage] = useState(10);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      // Giả sử có API để lấy danh sách documents
      // const response = await api.getAllDocuments();
      // setDocuments(response.data.documents);
      
      // Mock data cho demo
      const mockDocuments = [
        {
          _id: "1",
          title: "Báo cáo nghiên cứu khoa học",
          fileName: "bao-cao-nghien-cuu.pdf",
          fileType: "pdf",
          fileSize: 2048576, // bytes
          uploadedBy: {
            name: "Nguyễn Văn A",
            email: "user1@example.com"
          },
          uploadedAt: "2024-01-15T10:30:00Z",
          checkCount: 5,
          lastChecked: "2024-01-20T14:20:00Z",
          status: "processed"
        },
        {
          _id: "2",
          title: "Luận văn tốt nghiệp",
          fileName: "luan-van-tot-nghiep.docx",
          fileType: "docx",
          fileSize: 1536000,
          uploadedBy: {
            name: "Trần Thị B",
            email: "user2@example.com"
          },
          uploadedAt: "2024-01-16T09:15:00Z",
          checkCount: 3,
          lastChecked: "2024-01-19T16:45:00Z",
          status: "processed"
        },
        {
          _id: "3",
          title: "Bài viết blog",
          fileName: "bai-viet-blog.txt",
          fileType: "txt",
          fileSize: 51200,
          uploadedBy: {
            name: "Lê Văn C",
            email: "user3@example.com"
          },
          uploadedAt: "2024-01-17T15:45:00Z",
          checkCount: 1,
          lastChecked: "2024-01-17T15:50:00Z",
          status: "processing"
        }
      ];
      setDocuments(mockDocuments);
    } catch (error) {
      setError("Không thể tải danh sách tài liệu");
      console.error("Error fetching documents:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDocument = async (documentId) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa tài liệu này?")) {
      return;
    }

    try {
      // const response = await api.deleteDocument(documentId);
      // if (response.success) {
        setDocuments(documents.filter(doc => doc._id !== documentId));
      // }
    } catch (error) {
      setError("Không thể xóa tài liệu");
      console.error("Error deleting document:", error);
    }
  };

  const handleDownloadDocument = async (documentId, fileName) => {
    try {
      // const response = await api.downloadDocument(documentId);
      // Tạo link download
      console.log(`Downloading ${fileName}...`);
      // Implement download logic here
    } catch (error) {
      setError("Không thể tải xuống tài liệu");
      console.error("Error downloading document:", error);
    }
  };

  // Filter documents based on search term and type
  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.uploadedBy.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === "all" || doc.fileType === filterType;
    return matchesSearch && matchesType;
  });

  // Pagination
  const indexOfLastDocument = currentPage * documentsPerPage;
  const indexOfFirstDocument = indexOfLastDocument - documentsPerPage;
  const currentDocuments = filteredDocuments.slice(indexOfFirstDocument, indexOfLastDocument);
  const totalPages = Math.ceil(filteredDocuments.length / documentsPerPage);

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
            Tổng cộng {filteredDocuments.length} tài liệu
          </p>
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
            placeholder="Tìm kiếm theo tên tài liệu, tên file hoặc người tải lên..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg border-neutral-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-4 py-2 border rounded-lg border-neutral-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        >
          <option value="all">Tất cả loại file</option>
          <option value="pdf">PDF</option>
          <option value="docx">Word</option>
          <option value="txt">Text</option>
          <option value="xlsx">Excel</option>
          <option value="pptx">PowerPoint</option>
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
              {currentDocuments.map((document) => (
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
            Hiển thị {indexOfFirstDocument + 1} đến {Math.min(indexOfLastDocument, filteredDocuments.length)} trong tổng số {filteredDocuments.length} tài liệu
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
    </div>
  );
};

export default DocumentManagement;