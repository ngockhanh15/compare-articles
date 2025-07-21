import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { getDetailedComparison } from "../services/api";

const DetailedComparison = () => {
  const { checkId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await getDetailedComparison(checkId);
        setData(response);
      } catch (error) {
        console.error("Error fetching detailed comparison:", error);
        setError(error.message || "Lỗi khi tải dữ liệu so sánh");
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
    return new Date(date).toLocaleString("vi-VN");
  };

  const formatFileType = (fileType) => {
    if (!fileType) return "N/A";
    
    // Bản đồ MIME types và extensions thành tên thân thiện
    const fileTypeMap = {
      // Microsoft Office Documents
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Tài liệu Word (.docx)',
      'application/msword': 'Tài liệu Word (.doc)',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Bảng tính Excel (.xlsx)',
      'application/vnd.ms-excel': 'Bảng tính Excel (.xls)',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'Bài thuyết trình PowerPoint (.pptx)',
      'application/vnd.ms-powerpoint': 'Bài thuyết trình PowerPoint (.ppt)',
      
      // PDF
      'application/pdf': 'Tài liệu PDF',
      
      // Text files
      'text/plain': 'Tệp văn bản',
      'text/html': 'Trang web HTML',
      'text/css': 'Tệp CSS',
      'text/javascript': 'Tệp JavaScript',
      'application/json': 'Tệp JSON',
      'application/xml': 'Tệp XML',
      'text/xml': 'Tệp XML',
      'text/csv': 'Tệp CSV',
      'application/rtf': 'Tài liệu RTF',
      
      // Images
      'image/jpeg': 'Hình ảnh JPEG',
      'image/jpg': 'Hình ảnh JPEG',
      'image/png': 'Hình ảnh PNG',
      'image/gif': 'Hình ảnh GIF',
      'image/bmp': 'Hình ảnh BMP',
      'image/svg+xml': 'Hình ảnh SVG',
      'image/webp': 'Hình ảnh WebP',
      
      // Archives
      'application/zip': 'Tệp nén ZIP',
      'application/x-rar-compressed': 'Tệp nén RAR',
      'application/x-7z-compressed': 'Tệp nén 7-Zip',
      'application/gzip': 'Tệp nén GZIP',
      
      // OpenDocument
      'application/vnd.oasis.opendocument.text': 'Tài liệu OpenDocument (.odt)',
      'application/vnd.oasis.opendocument.spreadsheet': 'Bảng tính OpenDocument (.ods)',
      'application/vnd.oasis.opendocument.presentation': 'Bài thuyết trình OpenDocument (.odp)',
      
      // Extensions fallback
      'docx': 'Tài liệu Word (.docx)',
      'doc': 'Tài liệu Word (.doc)',
      'pdf': 'Tài liệu PDF',
      'txt': 'Tệp văn bản',
      'xlsx': 'Bảng tính Excel (.xlsx)',
      'xls': 'Bảng tính Excel (.xls)',
      'pptx': 'Bài thuyết trình PowerPoint (.pptx)',
      'ppt': 'Bài thuyết trình PowerPoint (.ppt)',
      'jpg': 'Hình ảnh JPEG',
      'jpeg': 'Hình ảnh JPEG',
      'png': 'Hình ảnh PNG',
      'gif': 'Hình ảnh GIF',
      'html': 'Trang web HTML',
      'css': 'Tệp CSS',
      'js': 'Tệp JavaScript',
      'json': 'Tệp JSON',
      'xml': 'Tệp XML',
      'csv': 'Tệp CSV',
      'zip': 'Tệp nén ZIP',
      'rar': 'Tệp nén RAR'
    };
    
    // Chuyển về chữ thường để so sánh
    const lowerFileType = fileType.toLowerCase().trim();
    
    // Kiểm tra MIME type trước
    if (fileTypeMap[lowerFileType]) {
      return fileTypeMap[lowerFileType];
    }
    
    // Nếu không phải MIME type, thử loại bỏ dấu chấm và kiểm tra extension
    const cleanFileType = lowerFileType.startsWith('.') ? lowerFileType.substring(1) : lowerFileType;
    if (fileTypeMap[cleanFileType]) {
      return fileTypeMap[cleanFileType];
    }
    
    // Nếu là MIME type dài, thử rút gọn
    if (lowerFileType.includes('/')) {
      const parts = lowerFileType.split('/');
      const mainType = parts[0];
      const subType = parts[1];
      
      // Xử lý một số trường hợp đặc biệt
      if (mainType === 'application') {
        if (subType.includes('word')) return 'Tài liệu Word';
        if (subType.includes('excel') || subType.includes('spreadsheet')) return 'Bảng tính Excel';
        if (subType.includes('powerpoint') || subType.includes('presentation')) return 'Bài thuyết trình PowerPoint';
        if (subType.includes('pdf')) return 'Tài liệu PDF';
      }
      
      if (mainType === 'text') return 'Tệp văn bản';
      if (mainType === 'image') return 'Hình ảnh';
      if (mainType === 'audio') return 'Tệp âm thanh';
      if (mainType === 'video') return 'Tệp video';
      
      return `Tệp ${mainType.charAt(0).toUpperCase() + mainType.slice(1)}`;
    }
    
    // Fallback: hiển thị dạng viết hoa
    return `Tệp ${fileType.toUpperCase()}`;
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
                onClick={() => navigate("/text-checker")}
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
              <h2 className="mb-2 text-xl font-semibold text-neutral-800">
                Không tìm thấy dữ liệu
              </h2>
              <p className="mb-4 text-neutral-600">
                Không thể tải thông tin so sánh
              </p>
              <button
                onClick={() => navigate("/text-checker")}
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

  // Lọc chỉ các matches có tỷ lệ trùng lặp > 50%
  const filteredMatches = data.detailedMatches?.filter(match => match.similarity > 50) || [];

  // Debug: Log dữ liệu để kiểm tra
  console.log("DetailedComparison data:", {
    currentDocument: data.currentDocument,
    currentDocumentContent: data.currentDocument?.content?.substring(0, 100),
    mostSimilarDocument: data.mostSimilarDocument,
    mostSimilarDocumentContent: data.mostSimilarDocument?.content?.substring(
      0,
      100
    ),
    detailedMatches: data.detailedMatches?.length,
    filteredMatches: filteredMatches.length,
    overallSimilarity: data.overallSimilarity,
  });

  // Debug: Log chi tiết matches
  if (filteredMatches && filteredMatches.length > 0) {
    console.log("=== FILTERED MATCHES DEBUG ===");
    console.log("Total matches:", data.detailedMatches?.length || 0);
    console.log("Filtered matches (>50%):", filteredMatches.length);
    
    filteredMatches.forEach((match, index) => {
      console.log(`Match ${index + 1}:`, {
        id: match.id,
        originalText: match.originalText ? match.originalText.substring(0, 100) + "..." : "NULL/UNDEFINED",
        matchedText: match.matchedText ? match.matchedText.substring(0, 100) + "..." : "NULL/UNDEFINED", 
        text: match.text ? match.text.substring(0, 100) + "..." : "NULL/UNDEFINED",
        similarity: match.similarity,
        source: match.source,
        allKeys: Object.keys(match)
      });
    });
    
    console.log("=== END DEBUG ===");
  } else {
    console.log("❌ NO FILTERED MATCHES FOUND (>50%)");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100">
      <div className="px-4 py-8 mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <button
                onClick={() => navigate("/text-checker")}
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
                  Danh sách các câu trùng lặp
                </h1>
              </div>
            </div>
          </div>
          <p className="text-neutral-600">
            Chào mừng{" "}
            <span className="font-semibold text-primary-600">{user?.name}</span>
            ! Dưới đây là danh sách các câu trùng lặp giữa document của bạn và
            document giống nhất trong cơ sở dữ liệu.
          </p>
        </div>

        {/* Statistics Overview */}
        {filteredMatches && filteredMatches.length > 0 && (
          <div className="p-6 mb-8 bg-white shadow-xl rounded-2xl">
            <h2 className="flex items-center mb-4 text-lg font-semibold text-neutral-800">
              <span className="mr-2">📊</span>
              Thống kê so sánh (chỉ tính câu trùng &gt;50%)
            </h2>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="p-4 text-center border border-blue-200 rounded-lg bg-blue-50">
                <div className="text-2xl font-bold text-blue-600">
                  {filteredMatches?.length || 0}
                </div>
                <div className="text-sm text-blue-700">Câu trùng lặp</div>
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
                <span className="text-neutral-600">
                  {data.currentDocument?.fileName || "N/A"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-neutral-700">
                  Kích thước:
                </span>
                <span className="text-neutral-600">
                  {data.currentDocument?.fileSize
                    ? formatFileSize(data.currentDocument.fileSize)
                    : "N/A"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-neutral-700">Loại file:</span>
                <span className="text-neutral-600">
                  {formatFileType(data.currentDocument?.fileType)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-neutral-700">Số từ:</span>
                <span className="text-neutral-600">
                  {data.currentDocument?.wordCount || "N/A"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-neutral-700">
                  Kiểm tra lúc:
                </span>
                <span className="text-neutral-600">
                  {data.currentDocument?.checkedAt
                    ? formatDate(data.currentDocument.checkedAt)
                    : "N/A"}
                </span>
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
                <span className="text-neutral-600">
                  {data.mostSimilarDocument?.fileName || "N/A"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-neutral-700">
                  Kích thước:
                </span>
                <span className="text-neutral-600">
                  {data.mostSimilarDocument?.fileSize
                    ? formatFileSize(data.mostSimilarDocument.fileSize)
                    : "N/A"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-neutral-700">Loại file:</span>
                <span className="text-neutral-600">
                  {formatFileType(data.mostSimilarDocument?.fileType)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-neutral-700">Tác giả:</span>
                <span className="text-neutral-600">
                  {data.mostSimilarDocument?.author || "N/A"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-neutral-700">
                  Upload lúc:
                </span>
                <span className="text-neutral-600">
                  {data.mostSimilarDocument?.uploadedAt
                    ? formatDate(data.mostSimilarDocument.uploadedAt)
                    : "N/A"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Matches Section */}
        {filteredMatches && filteredMatches.length > 0 ? (
          <div
            id="detailed-matches-section"
            className="p-6 mt-8 bg-white shadow-xl rounded-2xl"
          >
            <h2 className="flex items-center mb-6 text-xl font-semibold text-neutral-800">
              <span className="mr-2">🔗</span>
              Chi tiết các câu trùng lặp (tỷ lệ &gt;50%)
            </h2>
            <div className="space-y-6">
              {filteredMatches.map((match, index) => (
                <div
                  key={match.id || index}
                  id={`detailed-match-${match.id || index}`}
                  className="p-5 border-2 rounded-xl border-neutral-200 bg-gradient-to-r from-neutral-50 to-neutral-100"
                >
                  {/* Header với thông tin trùng lặp */}
                  <div className="flex items-center justify-between pb-3 mb-4 border-b border-neutral-300">
                    <div className="flex items-center">
                      <span className="px-3 py-1 text-sm font-bold text-white rounded-full shadow-sm bg-gradient-to-r from-blue-600 to-blue-700">
                        Cặp #{index + 1}
                      </span>
                      <div className="px-4 py-2 ml-3 border-2 border-red-300 rounded-full bg-gradient-to-r from-red-100 to-red-200">
                        <span className="text-sm font-bold text-red-700">
                          🎯 Tỷ lệ trùng lặp: {match.similarity}%
                        </span>
                      </div>
                    </div>
                    {match.source && (
                      <span className="px-2 py-1 text-xs rounded bg-neutral-200 text-neutral-600">
                        Nguồn: {match.source}
                      </span>
                    )}
                  </div>

                  {/* So sánh 2 câu cạnh nhau */}
                  <div className="grid gap-6 lg:grid-cols-2">
                    {/* Câu gốc */}
                    <div className="relative">
                      <div className="flex items-center mb-3">
                        <span className="mr-2 text-lg">📝</span>
                        <h4 className="text-sm font-bold tracking-wide text-blue-700 uppercase">
                          Câu trong document của bạn
                        </h4>
                      </div>
                      <div className="p-4 border-2 border-blue-300 rounded-lg shadow-sm bg-gradient-to-br from-blue-50 to-blue-100">
                        <p className="text-sm leading-relaxed text-neutral-800">
                          {match.originalText || match.text || "Không có nội dung gốc"}
                        </p>
                        {(!match.originalText && !match.text) && (
                          <div className="p-2 mt-2 text-xs text-yellow-700 bg-yellow-100 border border-yellow-300 rounded">
                            ⚠️ Dữ liệu câu gốc không có từ backend
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Câu trùng lặp */}
                    <div className="relative">
                      <div className="flex items-center mb-3">
                        <span className="mr-2 text-lg">📋</span>
                        <h4 className="text-sm font-bold tracking-wide text-orange-700 uppercase">
                          Câu trùng lặp trong document giống nhất
                        </h4>
                      </div>
                      <div className="p-4 border-2 border-orange-300 rounded-lg shadow-sm bg-gradient-to-br from-orange-50 to-orange-100">
                        <p className="text-sm leading-relaxed text-neutral-800">
                          {match.matchedText || match.text || "Không có nội dung trùng lặp"}
                        </p>
                        {(!match.matchedText && !match.text) && (
                          <div className="p-2 mt-2 text-xs text-yellow-700 bg-yellow-100 border border-yellow-300 rounded">
                            ⚠️ Dữ liệu câu trùng lặp không có từ backend
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Thanh chỉ báo mức độ trùng lặp */}
                  <div className="pt-3 mt-4 border-t border-neutral-300">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-neutral-600">Mức độ trùng lặp</span>
                      <span className="text-xs font-bold text-neutral-800">{match.similarity}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-neutral-200">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${
                          match.similarity >= 80 ? 'bg-gradient-to-r from-red-500 to-red-600' :
                          match.similarity >= 60 ? 'bg-gradient-to-r from-yellow-500 to-yellow-600' :
                          'bg-gradient-to-r from-green-500 to-green-600'
                        }`}
                        style={{ width: `${match.similarity}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-6 mt-8 bg-white shadow-xl rounded-2xl">
            <h2 className="flex items-center mb-6 text-xl font-semibold text-neutral-800">
              <span className="mr-2">🔗</span>
              Chi tiết các câu trùng lặp
            </h2>
            <div className="py-12 text-center">
              <div className="mb-4 text-6xl">
                {data.overallSimilarity > 0 ? '🔍' : '📝'}
              </div>
              <h3 className="mb-2 text-lg font-semibold text-neutral-700">
                {data.overallSimilarity > 0 
                  ? 'Không có câu trùng lặp đáng kể' 
                  : 'Không tìm thấy câu trùng lặp'
                }
              </h3>
              <p className="mb-4 text-neutral-600">
                {data.detailedMatches && data.detailedMatches.length > 0
                  ? `Tìm thấy ${data.detailedMatches.length} câu tương tự, nhưng không có câu nào có tỷ lệ trùng lặp >50% để hiển thị chi tiết.`
                  : data.overallSimilarity > 0 
                    ? `Mặc dù có ${data.overallSimilarity}% tương tự tổng thể, nhưng không có câu nào đạt ngưỡng trùng lặp >50% để hiển thị chi tiết.`
                    : 'Không tìm thấy nội dung trùng lặp giữa document của bạn và các document trong cơ sở dữ liệu.'
                }
              </p>
              
              {data.overallSimilarity > 0 && (
                <div className="max-w-lg p-4 mx-auto mb-4 border border-blue-200 rounded-lg bg-blue-50">
                  <h4 className="mb-2 font-semibold text-blue-800">💡 Giải thích:</h4>
                  <p className="text-sm text-blue-700">
                    Hệ thống chỉ hiển thị những câu có độ tương tự &gt;50% để đảm bảo chính xác. 
                    {data.overallSimilarity > 0 && `Tỷ lệ ${data.overallSimilarity}% có thể do từ ngữ chung hoặc chủ đề tương tự, 
                    nhưng không phải trùng lặp thực sự.`}
                  </p>
                </div>
              )}
              
              {data.mostSimilarDocument && data.mostSimilarDocument.fileName !== 'Không tìm thấy document tương tự' && (
                <div className="max-w-lg p-4 mx-auto mb-4 border border-green-200 rounded-lg bg-green-50">
                  <h4 className="mb-2 font-semibold text-green-800">📋 Document tương tự nhất:</h4>
                  <p className="text-sm text-green-700">
                    <strong>{data.mostSimilarDocument.fileName}</strong><br/>
                    Tác giả: {data.mostSimilarDocument.author}<br/>
                    Tỷ lệ tương tự: {data.overallSimilarity}%
                  </p>
                </div>
              )}
              
              <div className="max-w-md p-4 mx-auto border rounded-lg border-neutral-200 bg-neutral-50">
                <p className="text-xs text-neutral-600">
                  <strong>Thông tin kỹ thuật:</strong><br/>
                  - Matches tìm thấy: {data.detailedMatches ? data.detailedMatches.length : 0}<br/>
                  - Matches hiển thị (&gt;50%): {filteredMatches ? filteredMatches.length : 0}<br/>
                  - Tỷ lệ tương tự tổng thể: {data.overallSimilarity || 0}%<br/>
                  - Ngưỡng hiển thị: &gt;50%
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Quick Navigation */}
        {filteredMatches && filteredMatches.length > 0 && (
          <div className="fixed z-50 bottom-6 right-6">
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="p-3 text-white transition-colors rounded-full shadow-lg bg-neutral-600 hover:bg-neutral-700"
              title="Về đầu trang"
            >
              <span className="text-lg">↑</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default DetailedComparison;
