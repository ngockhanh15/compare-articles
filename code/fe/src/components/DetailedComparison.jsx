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

  // Function to highlight matching text in content
  const highlightMatches = (content, matches, isCurrentDocument = true) => {
    if (!content || !matches || matches.length === 0) {
      return content;
    }

    let highlightedContent = content;
    
    // Sort matches by position to avoid overlapping issues
    const sortedMatches = [...matches]
      .filter(match => {
        const textToMatch = isCurrentDocument ? match.originalText : match.matchedText;
        return textToMatch && textToMatch.trim().length > 0;
      })
      .sort((a, b) => {
        const textA = isCurrentDocument ? a.originalText : a.matchedText;
        const textB = isCurrentDocument ? b.originalText : b.matchedText;
        return content.indexOf(textA) - content.indexOf(textB);
      });

    // Apply highlights from end to beginning to maintain positions
    for (let i = sortedMatches.length - 1; i >= 0; i--) {
      const match = sortedMatches[i];
      const textToMatch = isCurrentDocument ? match.originalText : match.matchedText;
      
      if (textToMatch && textToMatch.trim().length > 0) {
        // Get similarity color
        const similarity = match.similarity || 0;
        let colorClass = '';
        let bgColor = '';
        
        if (similarity >= 90) {
          colorClass = 'text-red-800';
          bgColor = 'bg-red-200';
        } else if (similarity >= 70) {
          colorClass = 'text-orange-800';
          bgColor = 'bg-orange-200';
        } else if (similarity >= 50) {
          colorClass = 'text-yellow-800';
          bgColor = 'bg-yellow-200';
        } else {
          colorClass = 'text-blue-800';
          bgColor = 'bg-blue-200';
        }

        // Create highlighted span
        const highlightedSpan = `<span class="${bgColor} ${colorClass} px-1 py-0.5 rounded font-medium cursor-pointer hover:shadow-md transition-all" data-match-id="${match.id}" title="Tương tự: ${similarity}% - Click để xem chi tiết" onclick="document.getElementById('detailed-match-${match.id}')?.scrollIntoView({behavior: 'smooth', block: 'center'})">${textToMatch}</span>`;
        
        // Replace the text with highlighted version
        const regex = new RegExp(textToMatch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        highlightedContent = highlightedContent.replace(regex, highlightedSpan);
      }
    }

    return highlightedContent;
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

  // Debug: Log dữ liệu để kiểm tra
  console.log('DetailedComparison data:', {
    currentDocument: data.currentDocument,
    currentDocumentContent: data.currentDocument?.content?.substring(0, 100),
    mostSimilarDocument: data.mostSimilarDocument,
    mostSimilarDocumentContent: data.mostSimilarDocument?.content?.substring(0, 100),
    detailedMatches: data.detailedMatches?.length,
    overallSimilarity: data.overallSimilarity
  });
  
  // Debug: Log chi tiết matches
  if (data.detailedMatches && data.detailedMatches.length > 0) {
    console.log('Detailed matches:', data.detailedMatches.map((match, index) => ({
      index,
      id: match.id,
      originalText: match.originalText?.substring(0, 50) + '...',
      matchedText: match.matchedText?.substring(0, 50) + '...',
      similarity: match.similarity,
      source: match.source
    })));
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100">
      {/* Custom styles for highlighting */}
      <style jsx>{`
        .highlighted-text span[data-match-id] {
          border-radius: 4px;
          transition: all 0.2s ease;
          cursor: pointer;
        }
        .highlighted-text span[data-match-id]:hover {
          transform: scale(1.02);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          z-index: 10;
          position: relative;
        }
      `}</style>
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
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="flex items-center text-xl font-semibold text-neutral-800">
                <span className="mr-2">⚖️</span>
                So sánh nội dung side-by-side
              </h2>
            </div>
            {/* Color Legend */}
            {data.detailedMatches && data.detailedMatches.length > 0 && (
              <div className="p-3 mb-4 border rounded-lg bg-neutral-50 border-neutral-200">
                <p className="mb-2 text-sm font-medium text-neutral-700">Chú thích màu sắc:</p>
                <div className="flex flex-wrap gap-3 text-xs">
                  <div className="flex items-center">
                    <span className="px-2 py-1 mr-1 font-medium text-red-800 bg-red-200 rounded">Văn bản</span>
                    <span className="text-neutral-600">≥90% giống nhau</span>
                  </div>
                  <div className="flex items-center">
                    <span className="px-2 py-1 mr-1 font-medium text-orange-800 bg-orange-200 rounded">Văn bản</span>
                    <span className="text-neutral-600">70-89% giống nhau</span>
                  </div>
                  <div className="flex items-center">
                    <span className="px-2 py-1 mr-1 font-medium text-yellow-800 bg-yellow-200 rounded">Văn bản</span>
                    <span className="text-neutral-600">50-69% giống nhau</span>
                  </div>
                  <div className="flex items-center">
                    <span className="px-2 py-1 mr-1 font-medium text-blue-800 bg-blue-200 rounded">Văn bản</span>
                    <span className="text-neutral-600">&lt;50% giống nhau</span>
                  </div>
                </div>
                <p className="mt-2 text-xs text-neutral-500">💡 Click vào phần được tô màu để xem chi tiết</p>
              </div>
            )}
          </div>

          {/* Check if we have content to display */}
          {(!data.currentDocument?.content && !data.mostSimilarDocument?.content) ? (
            <div className="p-8 text-center border-2 border-dashed rounded-lg border-neutral-300">
              <div className="mb-4 text-4xl">📄</div>
              <h3 className="mb-2 text-lg font-semibold text-neutral-600">Không có nội dung để so sánh</h3>
              <p className="text-neutral-500">Dữ liệu văn bản chưa được tải hoặc không có sẵn.</p>
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Current Document Content */}
              <div className="flex flex-col">
                <h3 className="flex items-center mb-4 text-lg font-semibold text-blue-600">
                  <span className="mr-2">📄</span>
                  Document của bạn
                  <span className="ml-2 text-sm font-normal text-neutral-500">
                    ({data.currentDocument?.wordCount || 0} từ)
                  </span>
                </h3>
                <div 
                  id="current-document-scroll"
                  className="flex-1 p-4 overflow-y-auto border border-blue-200 rounded-lg bg-blue-50 max-h-96 min-h-64"
                >
                  <div className="text-sm leading-relaxed whitespace-pre-wrap text-neutral-700">
                    {data.currentDocument?.content ? (
                      data.currentDocument?.highlightedText && data.currentDocument.highlightedText.includes('<span') ? (
                        // Hiển thị text với highlight từ API
                        <div
                          className="highlighted-text"
                          dangerouslySetInnerHTML={{
                            __html: data.currentDocument.highlightedText,
                          }}
                          style={{
                            lineHeight: "1.8",
                          }}
                        />
                      ) : (
                        // Tự động tô màu dựa trên detailedMatches
                        <div
                          className="highlighted-text"
                          dangerouslySetInnerHTML={{
                            __html: highlightMatches(data.currentDocument.content, data.detailedMatches, true),
                          }}
                          style={{
                            lineHeight: "1.8",
                          }}
                        />
                      )
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <span className="text-neutral-500">
                          Không có nội dung để hiển thị
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                {data.currentDocument?.content && (
                  <div className="mt-2 text-xs text-neutral-500">
                    Tỷ lệ trùng lặp: <span className={`font-semibold ${
                      (data.currentDocument?.duplicateRate || 0) >= 50 ? 'text-red-600' : 
                      (data.currentDocument?.duplicateRate || 0) >= 25 ? 'text-yellow-600' : 'text-green-600'
                    }`}>
                      {data.currentDocument?.duplicateRate || 0}%
                    </span>
                  </div>
                )}
              </div>

              {/* Most Similar Document Content */}
              <div className="flex flex-col">
                <h3 className="flex items-center mb-4 text-lg font-semibold text-orange-600">
                  <span className="mr-2">📋</span>
                  Document giống nhất
                  <span className="ml-2 text-sm font-normal text-neutral-500">
                    ({data.mostSimilarDocument?.wordCount || 'N/A'} từ)
                  </span>
                </h3>
                <div 
                  id="similar-document-scroll"
                  className="flex-1 p-4 overflow-y-auto border border-orange-200 rounded-lg bg-orange-50 max-h-96 min-h-64"
                >
                  <div className="text-sm leading-relaxed whitespace-pre-wrap text-neutral-700">
                    {data.mostSimilarDocument?.content ? (
                      data.mostSimilarDocument?.highlightedText && data.mostSimilarDocument.highlightedText.includes('<span') ? (
                        // Hiển thị text với highlight từ API
                        <div
                          className="highlighted-text"
                          dangerouslySetInnerHTML={{
                            __html: data.mostSimilarDocument.highlightedText,
                          }}
                          style={{
                            lineHeight: "1.8",
                          }}
                        />
                      ) : (
                        // Tự động tô màu dựa trên detailedMatches
                        <div
                          className="highlighted-text"
                          dangerouslySetInnerHTML={{
                            __html: highlightMatches(data.mostSimilarDocument.content, data.detailedMatches, false),
                          }}
                          style={{
                            lineHeight: "1.8",
                          }}
                        />
                      )
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <span className="text-neutral-500">
                          Không có nội dung để hiển thị
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                {data.mostSimilarDocument?.content && (
                  <div className="mt-2 text-xs text-neutral-500">
                    Tỷ lệ giống nhau: <span className={`font-semibold ${
                      (data.overallSimilarity || 0) > 30 ? 'text-red-600' : 
                      (data.overallSimilarity || 0) > 15 ? 'text-yellow-600' : 'text-green-600'
                    }`}>
                      {data.overallSimilarity || 0}%
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Detailed Matches Section */}
        {data.detailedMatches && data.detailedMatches.length > 0 && (
          <div id="detailed-matches-section" className="p-6 mt-8 bg-white shadow-xl rounded-2xl">
            <h2 className="flex items-center mb-6 text-xl font-semibold text-neutral-800">
              <span className="mr-2">🔗</span>
              Chi tiết các đoạn trùng lặp
            </h2>
            <div className="space-y-4">
              {data.detailedMatches.map((match, index) => (
                <div 
                  key={match.id}
                  id={`detailed-match-${match.id}`}
                  className="p-4 border rounded-lg border-neutral-200 bg-neutral-50"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center">
                      <span className="px-2 py-1 text-xs font-semibold text-white bg-blue-600 rounded">
                        #{index + 1}
                      </span>
                      <span className="ml-2 text-sm font-medium text-neutral-700">
                        Tương tự: {match.similarity}%
                      </span>
                      <span className="ml-2 text-xs text-neutral-500">
                        Nguồn: {match.source}
                      </span>
                    </div>
                  </div>
                  
                  <div className="grid gap-4 lg:grid-cols-2">
                    {/* Original Text */}
                    <div>
                      <h4 className="mb-2 text-sm font-semibold text-blue-600">
                        Trong document của bạn:
                      </h4>
                      <div className="p-3 text-sm border border-blue-200 rounded bg-blue-50">
                        <span className="text-neutral-700">
                          {match.originalText || 'Không có nội dung'}
                        </span>
                      </div>
                    </div>
                    
                    {/* Matched Text */}
                    <div>
                      <h4 className="mb-2 text-sm font-semibold text-orange-600">
                        Trong document giống nhất:
                      </h4>
                      <div className="p-3 text-sm border border-orange-200 rounded bg-orange-50">
                        <span className="text-neutral-700">
                          {match.matchedText || 'Không có nội dung'}
                        </span>
                      </div>
                    </div>
                  </div>
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