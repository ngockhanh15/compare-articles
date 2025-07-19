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

  // Function to highlight matching text segments
  const highlightMatches = (text, matches, isOriginal = true) => {
    if (!matches || matches.length === 0) {
      return <span>{text}</span>;
    }

    // Sort matches by position to avoid overlapping
    const sortedMatches = matches
      .map(match => ({
        text: isOriginal ? match.originalText : match.matchedText,
        start: isOriginal ? 
          text.indexOf(match.originalText) : 
          text.indexOf(match.matchedText),
        end: isOriginal ? 
          text.indexOf(match.originalText) + match.originalText.length :
          text.indexOf(match.matchedText) + match.matchedText.length,
        similarity: match.similarity,
        id: match.id
      }))
      .filter(match => match.start !== -1)
      .sort((a, b) => a.start - b.start);

    if (sortedMatches.length === 0) {
      return <span>{text}</span>;
    }

    const result = [];
    let lastEnd = 0;

    sortedMatches.forEach((match, index) => {
      // Add text before the match
      if (match.start > lastEnd) {
        result.push(
          <span key={`text-${index}`}>
            {text.substring(lastEnd, match.start)}
          </span>
        );
      }

      // Add highlighted match
      const highlightClass = isOriginal ? 
        'bg-blue-200 border-l-4 border-blue-500 px-1 py-0.5 rounded cursor-pointer hover:bg-blue-300 transition-colors' : 
        'bg-orange-200 border-l-4 border-orange-500 px-1 py-0.5 rounded cursor-pointer hover:bg-orange-300 transition-colors';
      
      result.push(
        <span
          key={`match-${match.id}`}
          id={`highlight-${match.id}-${isOriginal ? 'original' : 'matched'}`}
          className={highlightClass}
          title={`${match.similarity}% tương tự - Click để xem chi tiết`}
          onClick={() => scrollToMatch(match.id)}
        >
          {match.text}
        </span>
      );

      lastEnd = match.end;
    });

    // Add remaining text
    if (lastEnd < text.length) {
      result.push(
        <span key="text-end">
          {text.substring(lastEnd)}
        </span>
      );
    }

    return <>{result}</>;
  };

  // Function to scroll to a specific match in the detailed matches section
  const scrollToMatch = (matchId) => {
    const element = document.getElementById(`detailed-match-${matchId}`);
    if (element) {
      element.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
      // Add temporary highlight effect
      element.classList.add('ring-4', 'ring-blue-300');
      setTimeout(() => {
        element.classList.remove('ring-4', 'ring-blue-300');
      }, 2000);
    }
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

        {/* Statistics Overview */}
        {data.detailedMatches && data.detailedMatches.length > 0 && (
          <div className="p-6 mb-8 bg-white shadow-xl rounded-2xl">
            <h2 className="flex items-center mb-4 text-lg font-semibold text-neutral-800">
              <span className="mr-2">📊</span>
              Thống kê so sánh
            </h2>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="p-4 text-center border border-blue-200 rounded-lg bg-blue-50">
                <div className="text-2xl font-bold text-blue-600">{data.detailedMatches?.length || 0}</div>
                <div className="text-sm text-blue-700">Đoạn trùng lặp</div>
              </div>
              <div className="p-4 text-center border border-orange-200 rounded-lg bg-orange-50">
                <div className="text-2xl font-bold text-orange-600">{data.overallSimilarity || 0}%</div>
                <div className="text-sm text-orange-700">Tỷ lệ giống nhau</div>
              </div>
              <div className="p-4 text-center border border-green-200 rounded-lg bg-green-50">
                <div className="text-2xl font-bold text-green-600">
                  {data.detailedMatches?.filter(m => m.similarity > 80).length || 0}
                </div>
                <div className="text-sm text-green-700">Trùng cao (&gt;80%)</div>
              </div>
              <div className="p-4 text-center border border-yellow-200 rounded-lg bg-yellow-50">
                <div className="text-2xl font-bold text-yellow-600">
                  {data.detailedMatches?.length > 0 ? 
                    Math.round(data.detailedMatches.reduce((sum, m) => sum + m.similarity, 0) / data.detailedMatches.length) : 0}%
                </div>
                <div className="text-sm text-yellow-700">Trung bình tương tự</div>
              </div>
            </div>
          </div>
        )}

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
                <span className="text-neutral-600">{data.currentDocument?.fileName || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-neutral-700">Kích thước:</span>
                <span className="text-neutral-600">{data.currentDocument?.fileSize ? formatFileSize(data.currentDocument.fileSize) : 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-neutral-700">Loại file:</span>
                <span className="text-neutral-600">{data.currentDocument?.fileType || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-neutral-700">Số từ:</span>
                <span className="text-neutral-600">{data.currentDocument?.wordCount || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-neutral-700">Tỷ lệ trùng lặp:</span>
                <span className={`font-semibold ${
                  (data.currentDocument?.duplicateRate || 0) >= 50 ? 'text-red-600' : 
                  (data.currentDocument?.duplicateRate || 0) >= 25 ? 'text-yellow-600' : 'text-green-600'
                }`}>
                  {data.currentDocument?.duplicateRate || 0}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-neutral-700">Kiểm tra lúc:</span>
                <span className="text-neutral-600">{data.currentDocument?.checkedAt ? formatDate(data.currentDocument.checkedAt) : 'N/A'}</span>
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
                <span className="text-neutral-600">{data.mostSimilarDocument?.fileName || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-neutral-700">Kích thước:</span>
                <span className="text-neutral-600">{data.mostSimilarDocument?.fileSize ? formatFileSize(data.mostSimilarDocument.fileSize) : 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-neutral-700">Loại file:</span>
                <span className="text-neutral-600">{data.mostSimilarDocument?.fileType || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-neutral-700">Tác giả:</span>
                <span className="text-neutral-600">{data.mostSimilarDocument?.author || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-neutral-700">Tỷ lệ giống nhau:</span>
                <span className={`font-semibold ${
                  (data.overallSimilarity || 0) > 30 ? 'text-red-600' : 
                  (data.overallSimilarity || 0) > 15 ? 'text-yellow-600' : 'text-green-600'
                }`}>
                  {data.overallSimilarity || 0}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-neutral-700">Upload lúc:</span>
                <span className="text-neutral-600">{data.mostSimilarDocument?.uploadedAt ? formatDate(data.mostSimilarDocument.uploadedAt) : 'N/A'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Side-by-side Comparison */}
        <div id="comparison-section" className="p-6 bg-white shadow-xl rounded-2xl">
          <h2 className="flex items-center mb-6 text-xl font-semibold text-neutral-800">
            <span className="mr-2">⚖️</span>
            So sánh nội dung side-by-side
          </h2>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 p-4 mb-6 border rounded-lg bg-neutral-50 border-neutral-200">
            <div className="flex items-center">
              <div className="w-4 h-4 mr-2 bg-blue-200 border-l-4 border-blue-500 rounded"></div>
              <span className="text-sm text-neutral-700">Đoạn trùng trong document của bạn</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 mr-2 bg-orange-200 border-l-4 border-orange-500 rounded"></div>
              <span className="text-sm text-neutral-700">Đoạn trùng trong document giống nhất</span>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Current Document Content */}
            <div>
              <h3 className="mb-4 text-lg font-semibold text-blue-600">
                Document của bạn
                <span className="ml-2 text-sm font-normal text-neutral-500">
                  (Hover để xem % tương tự)
                </span>
              </h3>
              <div className="p-4 overflow-y-auto border rounded-lg border-neutral-200 bg-neutral-50 max-h-96">
                <div className="text-sm leading-relaxed whitespace-pre-wrap text-neutral-700">
                  {data.currentDocument?.content ? 
                    highlightMatches(data.currentDocument.content, data.detailedMatches, true) :
                    <span className="text-neutral-500">Không có nội dung để hiển thị</span>
                  }
                </div>
              </div>
            </div>

            {/* Most Similar Document Content */}
            <div>
              <h3 className="mb-4 text-lg font-semibold text-orange-600">
                Document giống nhất
                <span className="ml-2 text-sm font-normal text-neutral-500">
                  (Hover để xem % tương tự)
                </span>
              </h3>
              <div className="p-4 overflow-y-auto border rounded-lg border-neutral-200 bg-neutral-50 max-h-96">
                <div className="text-sm leading-relaxed whitespace-pre-wrap text-neutral-700">
                  {data.mostSimilarDocument?.content ? 
                    highlightMatches(data.mostSimilarDocument.content, data.detailedMatches, false) :
                    <span className="text-neutral-500">Không có nội dung để hiển thị</span>
                  }
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Matches */}
        {data.detailedMatches && data.detailedMatches.length > 0 && (
          <div id="detailed-matches-section" className="p-6 mt-8 bg-white shadow-xl rounded-2xl">
            <h2 className="flex items-center mb-6 text-xl font-semibold text-neutral-800">
              <span className="mr-2">🔗</span>
              Các đoạn trùng lặp chi tiết
              <span className="ml-2 text-sm font-normal text-neutral-500">
                ({data.detailedMatches.length} đoạn trùng)
              </span>
            </h2>
            
            <div className="p-3 mb-4 border border-blue-200 rounded-lg bg-blue-50">
              <p className="text-sm text-blue-700">
                💡 <strong>Mẹo:</strong> Click vào các đoạn được tô màu trong phần so sánh để nhảy đến chi tiết tương ứng bên dưới.
              </p>
            </div>
            
            <div className="space-y-6">
              {data.detailedMatches.map((match, index) => (
                <div 
                  key={match.id} 
                  id={`detailed-match-${match.id}`}
                  className="p-4 transition-all duration-300 border border-orange-200 rounded-lg bg-orange-50"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-orange-800">
                      Đoạn trùng lặp #{index + 1}
                      <span className="ml-2 text-xs text-neutral-500">(ID: {match.id})</span>
                    </h4>
                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 text-sm font-medium rounded-full ${
                        match.similarity > 80 ? 'text-red-700 bg-red-200' :
                        match.similarity > 60 ? 'text-orange-700 bg-orange-200' :
                        'text-yellow-700 bg-yellow-200'
                      }`}>
                        {match.similarity}% tương tự
                      </span>
                      <button
                        onClick={() => {
                          const originalElement = document.getElementById(`highlight-${match.id}-original`);
                          const matchedElement = document.getElementById(`highlight-${match.id}-matched`);
                          if (originalElement) {
                            originalElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          }
                        }}
                        className="px-2 py-1 text-xs text-blue-600 rounded hover:text-blue-800 hover:bg-blue-100"
                        title="Nhảy đến vị trí trong văn bản"
                      >
                        ↑ Xem trong văn bản
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid gap-4 lg:grid-cols-2">
                    <div>
                      <h5 className="flex items-center mb-2 font-medium text-blue-700">
                        <span className="w-3 h-3 mr-2 bg-blue-200 border-l-4 border-blue-500 rounded"></span>
                        Trong document của bạn:
                      </h5>
                      <div className="p-3 bg-blue-100 border border-blue-200 rounded">
                        <p className="text-sm leading-relaxed text-blue-800">"{match.originalText}"</p>
                      </div>
                    </div>
                    
                    <div>
                      <h5 className="flex items-center mb-2 font-medium text-orange-700">
                        <span className="w-3 h-3 mr-2 bg-orange-200 border-l-4 border-orange-500 rounded"></span>
                        Trong document giống nhất:
                      </h5>
                      <div className="p-3 bg-orange-100 border border-orange-200 rounded">
                        <p className="text-sm leading-relaxed text-orange-800">"{match.matchedText}"</p>
                      </div>
                    </div>
                  </div>
                  
                  {match.url && (
                    <div className="pt-3 mt-3 border-t border-orange-200">
                      <a
                        href={match.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        <span className="mr-1">🔗</span>
                        Xem nguồn gốc: {match.source} →
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Navigation */}
        {data.detailedMatches && data.detailedMatches.length > 0 && (
          <div className="fixed z-50 bottom-6 right-6">
            <div className="flex flex-col gap-2">
              <button
                onClick={() => document.getElementById('comparison-section').scrollIntoView({ behavior: 'smooth' })}
                className="p-3 text-white transition-colors bg-blue-600 rounded-full shadow-lg hover:bg-blue-700"
                title="Nhảy đến phần so sánh"
              >
                <span className="text-lg">⚖️</span>
              </button>
              <button
                onClick={() => document.getElementById('detailed-matches-section').scrollIntoView({ behavior: 'smooth' })}
                className="p-3 text-white transition-colors bg-orange-600 rounded-full shadow-lg hover:bg-orange-700"
                title="Nhảy đến chi tiết trùng lặp"
              >
                <span className="text-lg">🔗</span>
              </button>
              <button
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="p-3 text-white transition-colors rounded-full shadow-lg bg-neutral-600 hover:bg-neutral-700"
                title="Về đầu trang"
              >
                <span className="text-lg">↑</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DetailedComparison;