import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getDetailedComparison } from '../services/api';

const DetailedComparison = () => {
  const { checkId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await getDetailedComparison(checkId);
        setData(response);
      } catch (error) {
        console.error('Error fetching detailed comparison:', error);
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
                  <span className="text-3xl">🔍</span>
                </div>
                <h1 className="text-3xl font-bold text-neutral-800">
                  So sánh chi tiết với document giống nhất
                </h1>
              </div>
            </div>
          </div>
          <p className="text-neutral-600">
            Chào mừng <span className="font-semibold text-primary-600">{user?.name}</span>! 
            So sánh side-by-side giữa document của bạn và document giống nhất trong cơ sở dữ liệu.
          </p>
        </div>

        {/* Document Info Cards */}
        <div className="grid gap-6 mb-8 lg:grid-cols-2">
          {/* Current Document */}
          <div className="p-6 bg-white shadow-xl rounded-2xl">
            <h2 className="flex items-center mb-4 text-xl font-semibold text-neutral-800">
              <span className="mr-2">📄</span>
              Document của bạn
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="font-medium text-neutral-700">Tên file:</span>
                <span className="text-neutral-600">{data.currentDocument.fileName}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-neutral-700">Kích thước:</span>
                <span className="text-neutral-600">{formatFileSize(data.currentDocument.fileSize)}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-neutral-700">Loại file:</span>
                <span className="text-neutral-600">{data.currentDocument.fileType}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-neutral-700">Số từ:</span>
                <span className="text-neutral-600">{data.currentDocument.wordCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-neutral-700">Tỷ lệ trùng lặp:</span>
                <span className={`font-semibold ${
                  data.currentDocument.duplicateRate > 30 ? 'text-red-600' : 
                  data.currentDocument.duplicateRate > 15 ? 'text-yellow-600' : 'text-green-600'
                }`}>
                  {data.currentDocument.duplicateRate}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-neutral-700">Kiểm tra lúc:</span>
                <span className="text-neutral-600">{formatDate(data.currentDocument.checkedAt)}</span>
              </div>
            </div>
          </div>

          {/* Most Similar Document */}
          <div className="p-6 bg-white shadow-xl rounded-2xl">
            <h2 className="flex items-center mb-4 text-xl font-semibold text-neutral-800">
              <span className="mr-2">📋</span>
              Document giống nhất
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="font-medium text-neutral-700">Tên file:</span>
                <span className="text-neutral-600">{data.mostSimilarDocument.fileName}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-neutral-700">Kích thước:</span>
                <span className="text-neutral-600">{formatFileSize(data.mostSimilarDocument.fileSize)}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-neutral-700">Loại file:</span>
                <span className="text-neutral-600">{data.mostSimilarDocument.fileType}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-neutral-700">Tác giả:</span>
                <span className="text-neutral-600">{data.mostSimilarDocument.author}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-neutral-700">Tỷ lệ giống nhau:</span>
                <span className={`font-semibold ${
                  data.overallSimilarity > 30 ? 'text-red-600' : 
                  data.overallSimilarity > 15 ? 'text-yellow-600' : 'text-green-600'
                }`}>
                  {data.overallSimilarity}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-neutral-700">Upload lúc:</span>
                <span className="text-neutral-600">{formatDate(data.mostSimilarDocument.uploadedAt)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Side-by-side Comparison */}
        <div className="p-6 bg-white shadow-xl rounded-2xl">
          <h2 className="flex items-center mb-6 text-xl font-semibold text-neutral-800">
            <span className="mr-2">⚖️</span>
            So sánh nội dung side-by-side
          </h2>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Current Document Content */}
            <div>
              <h3 className="mb-4 text-lg font-semibold text-blue-600">Document của bạn</h3>
              <div className="p-4 overflow-y-auto border rounded-lg border-neutral-200 bg-neutral-50 max-h-96">
                <pre className="text-sm whitespace-pre-wrap text-neutral-700">
                  {data.currentDocument.content}
                </pre>
              </div>
            </div>

            {/* Most Similar Document Content */}
            <div>
              <h3 className="mb-4 text-lg font-semibold text-orange-600">Document giống nhất</h3>
              <div className="p-4 overflow-y-auto border rounded-lg border-neutral-200 bg-neutral-50 max-h-96">
                <pre className="text-sm whitespace-pre-wrap text-neutral-700">
                  {data.mostSimilarDocument.content}
                </pre>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Matches */}
        {data.detailedMatches && data.detailedMatches.length > 0 && (
          <div className="p-6 mt-8 bg-white shadow-xl rounded-2xl">
            <h2 className="flex items-center mb-6 text-xl font-semibold text-neutral-800">
              <span className="mr-2">🔗</span>
              Các đoạn trùng lặp chi tiết
            </h2>
            
            <div className="space-y-6">
              {data.detailedMatches.map((match) => (
                <div key={match.id} className="p-4 border border-orange-200 rounded-lg bg-orange-50">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-orange-800">
                      Đoạn trùng lặp #{match.id}
                    </h4>
                    <span className="px-3 py-1 text-sm font-medium text-orange-700 bg-orange-200 rounded-full">
                      {match.similarity}% tương tự
                    </span>
                  </div>
                  
                  <div className="grid gap-4 lg:grid-cols-2">
                    <div>
                      <h5 className="mb-2 font-medium text-blue-700">Trong document của bạn:</h5>
                      <div className="p-3 bg-blue-100 border border-blue-200 rounded">
                        <p className="text-sm text-blue-800">"{match.originalText}"</p>
                      </div>
                    </div>
                    
                    <div>
                      <h5 className="mb-2 font-medium text-orange-700">Trong document giống nhất:</h5>
                      <div className="p-3 bg-orange-100 border border-orange-200 rounded">
                        <p className="text-sm text-orange-800">"{match.matchedText}"</p>
                      </div>
                    </div>
                  </div>
                  
                  {match.url && (
                    <div className="mt-3">
                      <a
                        href={match.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        Xem nguồn gốc: {match.source} →
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DetailedComparison;