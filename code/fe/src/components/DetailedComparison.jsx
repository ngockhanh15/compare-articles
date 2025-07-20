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
  const [syncScroll, setSyncScroll] = useState(true);

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
    if (!matches || matches.length === 0 || !text) {
      return <span>{text || 'Không có nội dung'}</span>;
    }

    // Create an array to track which characters should be highlighted
    const highlights = new Array(text.length).fill(null);
    
    // Process each match and mark the positions
    matches.forEach(match => {
      const searchText = isOriginal ? match.originalText : match.matchedText;
      if (!searchText) return;
      
      // Find all occurrences of the search text
      let startIndex = 0;
      while (startIndex < text.length) {
        const foundIndex = text.indexOf(searchText, startIndex);
        if (foundIndex === -1) break;
        
        // Check if this position is already highlighted
        let canHighlight = true;
        for (let i = foundIndex; i < foundIndex + searchText.length; i++) {
          if (highlights[i] !== null) {
            canHighlight = false;
            break;
          }
        }
        
        // If we can highlight this occurrence, mark it
        if (canHighlight) {
          for (let i = foundIndex; i < foundIndex + searchText.length; i++) {
            highlights[i] = {
              matchId: match.id,
              similarity: match.similarity,
              isOriginal: isOriginal
            };
          }
          break; // Only highlight the first occurrence of each match
        }
        
        startIndex = foundIndex + 1;
      }
    });

    // Build the result by grouping consecutive highlighted characters
    const result = [];
    let currentSegment = '';
    let currentHighlight = null;
    let segmentIndex = 0;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const highlight = highlights[i];
      
      // If highlight status changed, process the current segment
      if ((highlight === null) !== (currentHighlight === null) || 
          (highlight && currentHighlight && highlight.matchId !== currentHighlight.matchId)) {
        
        if (currentSegment) {
          if (currentHighlight) {
            // This is a highlighted segment
            const highlightClass = currentHighlight.isOriginal ? 
              'bg-blue-200 border-l-4 border-blue-500 px-1 py-0.5 rounded cursor-pointer hover:bg-blue-300 transition-colors' : 
              'bg-orange-200 border-l-4 border-orange-500 px-1 py-0.5 rounded cursor-pointer hover:bg-orange-300 transition-colors';
            
            result.push(
              <span
                key={`match-${currentHighlight.matchId}-${segmentIndex}`}
                id={`highlight-${currentHighlight.matchId}-${currentHighlight.isOriginal ? 'original' : 'matched'}`}
                className={highlightClass}
                title={`${currentHighlight.similarity}% tương tự - Click để xem chi tiết`}
                onClick={() => scrollToMatch(currentHighlight.matchId)}
              >
                {currentSegment}
              </span>
            );
          } else {
            // This is a normal text segment
            result.push(
              <span key={`text-${segmentIndex}`}>
                {currentSegment}
              </span>
            );
          }
          segmentIndex++;
        }
        
        currentSegment = char;
        currentHighlight = highlight;
      } else {
        currentSegment += char;
      }
    }
    
    // Process the last segment
    if (currentSegment) {
      if (currentHighlight) {
        const highlightClass = currentHighlight.isOriginal ? 
          'bg-blue-200 border-l-4 border-blue-500 px-1 py-0.5 rounded cursor-pointer hover:bg-blue-300 transition-colors' : 
          'bg-orange-200 border-l-4 border-orange-500 px-1 py-0.5 rounded cursor-pointer hover:bg-orange-300 transition-colors';
        
        result.push(
          <span
            key={`match-${currentHighlight.matchId}-${segmentIndex}`}
            id={`highlight-${currentHighlight.matchId}-${currentHighlight.isOriginal ? 'original' : 'matched'}`}
            className={highlightClass}
            title={`${currentHighlight.similarity}% tương tự - Click để xem chi tiết`}
            onClick={() => scrollToMatch(currentHighlight.matchId)}
          >
            {currentSegment}
          </span>
        );
      } else {
        result.push(
          <span key={`text-${segmentIndex}`}>
            {currentSegment}
          </span>
        );
      }
    }

    return <>{result}</>;
  };

  // Function to handle synchronized scrolling
  const handleSyncScroll = (sourceElement, targetElement) => {
    if (!syncScroll || !sourceElement || !targetElement) return;
    
    const scrollPercentage = sourceElement.scrollTop / (sourceElement.scrollHeight - sourceElement.clientHeight);
    const targetScrollTop = scrollPercentage * (targetElement.scrollHeight - targetElement.clientHeight);
    
    targetElement.scrollTop = targetScrollTop;
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

  // Debug: Log dữ liệu để kiểm tra
  console.log('DetailedComparison data:', {
    currentDocument: data.currentDocument,
    currentDocumentContent: data.currentDocument?.content?.substring(0, 100),
    mostSimilarDocument: data.mostSimilarDocument,
    mostSimilarDocumentContent: data.mostSimilarDocument?.content?.substring(0, 100),
    detailedMatches: data.detailedMatches?.length,
    overallSimilarity: data.overallSimilarity
  });

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
          <div className="flex items-center justify-between mb-6">
            <h2 className="flex items-center text-xl font-semibold text-neutral-800">
              <span className="mr-2">⚖️</span>
              So sánh nội dung side-by-side
            </h2>
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
                  onScroll={(e) => {
                    const targetElement = document.getElementById('similar-document-scroll');
                    handleSyncScroll(e.target, targetElement);
                  }}
                >
                  <div className="text-sm leading-relaxed whitespace-pre-wrap text-neutral-700">
                    {data.currentDocument?.content ? (
                      (() => {
                        try {
                          return highlightMatches(data.currentDocument.content, data.detailedMatches, true);
                        } catch (error) {
                          console.error('Error in highlightMatches for current document:', error);
                          return <span>{data.currentDocument.content}</span>;
                        }
                      })()
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <span className="text-neutral-500">
                          Không có nội dung để hiển thị
                          {/* Debug info */}
                          <br />
                          <small className="text-xs">
                            Debug: {data.currentDocument ? 'currentDocument exists' : 'currentDocument missing'}, 
                            content: {data.currentDocument?.content ? `${data.currentDocument.content.length} chars` : 'empty'}
                          </small>
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
                  onScroll={(e) => {
                    const targetElement = document.getElementById('current-document-scroll');
                    handleSyncScroll(e.target, targetElement);
                  }}
                >
                  <div className="text-sm leading-relaxed whitespace-pre-wrap text-neutral-700">
                    {data.mostSimilarDocument?.content ? (
                      (() => {
                        try {
                          return highlightMatches(data.mostSimilarDocument.content, data.detailedMatches, false);
                        } catch (error) {
                          console.error('Error in highlightMatches for similar document:', error);
                          return <span>{data.mostSimilarDocument.content}</span>;
                        }
                      })()
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <span className="text-neutral-500">
                          Không có nội dung để hiển thị
                          {/* Debug info */}
                          <br />
                          <small className="text-xs">
                            Debug: {data.mostSimilarDocument ? 'mostSimilarDocument exists' : 'mostSimilarDocument missing'}, 
                            content: {data.mostSimilarDocument?.content ? `${data.mostSimilarDocument.content.length} chars` : 'empty'}
                          </small>
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