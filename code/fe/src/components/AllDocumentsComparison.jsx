import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getAllDocumentsComparison } from '../services/api';

const AllDocumentsComparison = () => {
  const { checkId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sortBy, setSortBy] = useState('duplicateRate'); // duplicateRate, fileName, uploadedAt
  const [sortOrder, setSortOrder] = useState('desc'); // asc, desc
  const [filterStatus, setFilterStatus] = useState('all'); // all, high, medium, low

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await getAllDocumentsComparison(checkId);
        setData(response);
      } catch (error) {
        console.error('Error fetching all documents comparison:', error);
        setError(error.message || 'Lỗi khi tải dữ liệu so sánh');
      } finally {
        setLoading(false);
      }
    };

    if (checkId) {
      fetchData();
    }
  }, [checkId]);

  const formatFileSize = (size) => {
    if (size < 1024) return `${size} bytes`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(2)} KB`;
    return `${(size / (1024 * 1024)).toFixed(2)} MB`;
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleString('vi-VN');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'high': return 'text-red-600 bg-red-100 border-red-200';
      case 'medium': return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-100 border-green-200';
      default: return 'text-neutral-600 bg-neutral-100 border-neutral-200';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'high': return 'Cao';
      case 'medium': return 'Trung bình';
      case 'low': return 'Thấp';
      default: return 'Không xác định';
    }
  };

  const sortedAndFilteredDocuments = data?.allDocuments ? 
    data.allDocuments
      .filter(doc => filterStatus === 'all' || doc.status === filterStatus)
      .sort((a, b) => {
        let aValue = a[sortBy];
        let bValue = b[sortBy];
        
        if (sortBy === 'uploadedAt') {
          aValue = new Date(aValue);
          bValue = new Date(bValue);
        }
        
        if (sortOrder === 'asc') {
          return aValue > bValue ? 1 : -1;
        } else {
          return aValue < bValue ? 1 : -1;
        }
      }) : [];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100">
        <div className="px-4 py-8 mx-auto max-w-7xl">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 border-b-2 border-blue-600 rounded-full animate-spin"></div>
              <p className="text-neutral-600">Đang tải dữ liệu so sánh...</p>
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
          <div className="p-6 bg-white shadow-xl rounded-2xl">
            <div className="text-center">
              <div className="mb-4 text-4xl">❌</div>
              <h2 className="mb-2 text-xl font-semibold text-red-600">Lỗi</h2>
              <p className="mb-4 text-neutral-600">{error}</p>
              <button
                onClick={() => navigate('/text-checker')}
                className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                Quay lại kiểm tra
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100">
        <div className="px-4 py-8 mx-auto max-w-7xl">
          <div className="p-6 bg-white shadow-xl rounded-2xl">
            <div className="text-center">
              <div className="mb-4 text-4xl">📄</div>
              <h2 className="mb-2 text-xl font-semibold text-neutral-800">Không tìm thấy dữ liệu</h2>
              <p className="mb-4 text-neutral-600">Không thể tải thông tin so sánh</p>
              <button
                onClick={() => navigate('/text-checker')}
                className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                Quay lại kiểm tra
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100">
      <div className="px-4 py-8 mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <button
                onClick={() => navigate('/text-checker')}
                className="flex items-center px-3 py-2 mr-4 text-sm text-neutral-600 hover:text-neutral-800"
              >
                <span className="mr-1">←</span>
                Quay lại
              </button>
              <div className="flex items-center">
                <div className="p-3 mr-3 shadow-lg bg-gradient-primary rounded-2xl">
                  <span className="text-3xl">📊</span>
                </div>
                <h1 className="text-3xl font-bold text-neutral-800">
                  So sánh với toàn bộ database
                </h1>
              </div>
            </div>
          </div>
          <p className="text-neutral-600">
            Chào mừng <span className="font-semibold text-primary-600">{user?.name}</span>! 
            Danh sách tất cả documents có trùng lặp với document của bạn.
          </p>
        </div>

        {/* Current Document Info */}
        <div className="p-6 mb-8 bg-white shadow-xl rounded-2xl">
          <h2 className="flex items-center mb-4 text-xl font-semibold text-neutral-800">
            <span className="mr-2">📄</span>
            Document của bạn
          </h2>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="p-4 border border-neutral-200 rounded-xl bg-neutral-50">
              <div className="text-2xl font-bold text-primary-600">
                {data.currentDocument.fileName}
              </div>
              <div className="text-sm text-neutral-600">Tên file</div>
            </div>
            <div className="p-4 border border-neutral-200 rounded-xl bg-neutral-50">
              <div className="text-2xl font-bold text-primary-600">
                {formatFileSize(data.currentDocument.fileSize)}
              </div>
              <div className="text-sm text-neutral-600">Kích thước</div>
            </div>
            <div className="p-4 border border-neutral-200 rounded-xl bg-neutral-50">
              <div className="text-2xl font-bold text-primary-600">
                {data.currentDocument.fileType}
              </div>
              <div className="text-sm text-neutral-600">Loại file</div>
            </div>
            <div className="p-4 border border-neutral-200 rounded-xl bg-neutral-50">
              <div className={`text-2xl font-bold ${
                data.currentDocument.duplicateRate > 30 ? 'text-red-600' : 
                data.currentDocument.duplicateRate > 15 ? 'text-yellow-600' : 'text-green-600'
              }`}>
                {data.currentDocument.duplicateRate}%
              </div>
              <div className="text-sm text-neutral-600">Tỷ lệ trùng lặp</div>
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid gap-6 mb-8 md:grid-cols-4">
          <div className="p-6 bg-white shadow-xl rounded-2xl">
            <div className="flex items-center">
              <div className="p-3 mr-4 bg-blue-100 rounded-full">
                <span className="text-2xl">📊</span>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">{data.totalDocuments}</div>
                <div className="text-sm text-neutral-600">Tổng documents</div>
              </div>
            </div>
          </div>
          
          <div className="p-6 bg-white shadow-xl rounded-2xl">
            <div className="flex items-center">
              <div className="p-3 mr-4 bg-red-100 rounded-full">
                <span className="text-2xl">🚨</span>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">{data.highRiskCount}</div>
                <div className="text-sm text-neutral-600">Rủi ro cao</div>
              </div>
            </div>
          </div>
          
          <div className="p-6 bg-white shadow-xl rounded-2xl">
            <div className="flex items-center">
              <div className="p-3 mr-4 bg-yellow-100 rounded-full">
                <span className="text-2xl">⚠️</span>
              </div>
              <div>
                <div className="text-2xl font-bold text-yellow-600">{data.mediumRiskCount}</div>
                <div className="text-sm text-neutral-600">Rủi ro trung bình</div>
              </div>
            </div>
          </div>
          
          <div className="p-6 bg-white shadow-xl rounded-2xl">
            <div className="flex items-center">
              <div className="p-3 mr-4 bg-green-100 rounded-full">
                <span className="text-2xl">✅</span>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">{data.lowRiskCount}</div>
                <div className="text-sm text-neutral-600">Rủi ro thấp</div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Sorting */}
        <div className="p-6 mb-8 bg-white shadow-xl rounded-2xl">
          <h3 className="mb-4 text-lg font-semibold text-neutral-800">Bộ lọc và sắp xếp</h3>
          <div className="flex flex-wrap gap-4">
            {/* Filter by Status */}
            <div>
              <label className="block mb-2 text-sm font-medium text-neutral-700">Lọc theo mức độ:</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border rounded-lg border-neutral-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Tất cả</option>
                <option value="high">Rủi ro cao</option>
                <option value="medium">Rủi ro trung bình</option>
                <option value="low">Rủi ro thấp</option>
              </select>
            </div>

            {/* Sort by */}
            <div>
              <label className="block mb-2 text-sm font-medium text-neutral-700">Sắp xếp theo:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 border rounded-lg border-neutral-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="duplicateRate">Tỷ lệ trùng lặp</option>
                <option value="fileName">Tên file</option>
                <option value="uploadedAt">Ngày upload</option>
              </select>
            </div>

            {/* Sort Order */}
            <div>
              <label className="block mb-2 text-sm font-medium text-neutral-700">Thứ tự:</label>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="px-3 py-2 border rounded-lg border-neutral-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="desc">Giảm dần</option>
                <option value="asc">Tăng dần</option>
              </select>
            </div>
          </div>
        </div>

        {/* Documents List */}
        <div className="p-6 bg-white shadow-xl rounded-2xl">
          <h2 className="flex items-center mb-6 text-xl font-semibold text-neutral-800">
            <span className="mr-2">📋</span>
            Danh sách documents ({sortedAndFilteredDocuments.length})
          </h2>

          {sortedAndFilteredDocuments.length === 0 ? (
            <div className="py-12 text-center">
              <div className="mb-4 text-4xl">📄</div>
              <p className="text-neutral-600">Không tìm thấy documents phù hợp với bộ lọc</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-neutral-200">
                    <th className="px-4 py-3 text-sm font-medium text-left text-neutral-700">Tên file</th>
                    <th className="px-4 py-3 text-sm font-medium text-left text-neutral-700">Kích thước</th>
                    <th className="px-4 py-3 text-sm font-medium text-left text-neutral-700">Loại file</th>
                    <th className="px-4 py-3 text-sm font-medium text-left text-neutral-700">Tỷ lệ trùng lặp</th>
                    <th className="px-4 py-3 text-sm font-medium text-left text-neutral-700">Mức độ</th>
                    <th className="px-4 py-3 text-sm font-medium text-left text-neutral-700">Ngày upload</th>
                    <th className="px-4 py-3 text-sm font-medium text-left text-neutral-700">Tác giả</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedAndFilteredDocuments.map((doc, index) => (
                    <tr key={doc.id} className={`border-b border-neutral-100 ${index % 2 === 0 ? 'bg-neutral-50' : 'bg-white'} hover:bg-blue-50 transition-colors`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center">
                          <span className="mr-2 text-lg">📄</span>
                          <span className="font-medium text-neutral-800">{doc.fileName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-neutral-600">
                        {formatFileSize(doc.fileSize)}
                      </td>
                      <td className="px-4 py-3 text-sm text-neutral-600">
                        {doc.fileType}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`font-semibold ${
                          doc.duplicateRate > 30 ? 'text-red-600' : 
                          doc.duplicateRate > 15 ? 'text-yellow-600' : 'text-green-600'
                        }`}>
                          {doc.duplicateRate}%
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(doc.status)}`}>
                          {getStatusText(doc.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-neutral-600">
                        {formatDate(doc.uploadedAt)}
                      </td>
                      <td className="px-4 py-3 text-sm text-neutral-600">
                        {doc.author}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AllDocumentsComparison;