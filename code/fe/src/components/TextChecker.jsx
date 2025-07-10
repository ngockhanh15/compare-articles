import { useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { uploadFile, checkPlagiarism } from '../services/api';
import { Link } from 'react-router-dom';

const TextChecker = () => {
  const { user } = useAuth();
  const [inputText, setInputText] = useState('');
  const [results, setResults] = useState(null);
  const [isChecking, setIsChecking] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Clear previous errors
    setError('');

    // Kiểm tra định dạng file
    const allowedTypes = [
      'text/plain',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      setError('Chỉ hỗ trợ file định dạng: TXT, PDF, DOC, DOCX');
      return;
    }

    // Kiểm tra kích thước file (tối đa 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('File không được vượt quá 10MB');
      return;
    }

    setSelectedFile(file);
    setInputText(''); // Xóa text đã nhập
    setResults(null); // Xóa kết quả cũ
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleInputChange = (e) => {
    setInputText(e.target.value);
    // Clear error when user starts typing
    if (error) setError('');
  };

  const handleCheck = async () => {
    setError('');
    let textToCheck = '';

    // Validate input
    if (!selectedFile && !inputText.trim()) {
      setError('Vui lòng nhập văn bản hoặc chọn file cần kiểm tra');
      return;
    }

    setIsChecking(true);

    try {
      if (selectedFile) {
        setIsUploading(true);
        
        // Upload file và lấy text đã extract
        const uploadResult = await uploadFile(selectedFile);
        textToCheck = uploadResult.extractedText || '';
        setIsUploading(false);
        
        if (!textToCheck.trim()) {
          setError('Không thể đọc nội dung từ file này');
          setIsChecking(false);
          return;
        }
      } else {
        textToCheck = inputText;
      }
      
      // Gọi API kiểm tra trùng lặp
      const plagiarismResult = await checkPlagiarism(textToCheck);
      
      const wordCount = textToCheck.trim().split(/\s+/).length;
      const charCount = textToCheck.length;

      setResults({
        checkId: plagiarismResult.checkId,
        duplicateRate: plagiarismResult.duplicatePercentage || 0,
        matches: plagiarismResult.matches || [],
        sources: plagiarismResult.sources || [],
        wordCount,
        charCount,
        status: plagiarismResult.duplicatePercentage > 30 ? 'high' : 
                plagiarismResult.duplicatePercentage > 15 ? 'medium' : 'low',
        checkedAt: new Date().toLocaleString('vi-VN'),
        source: selectedFile ? 'file' : 'text',
        fileName: selectedFile ? selectedFile.name : null,
        confidence: plagiarismResult.confidence || 'medium',
        // Thông tin mới từ hệ thống AVL
        processingTime: plagiarismResult.processingTime || 0,
        totalDocumentsInDatabase: plagiarismResult.totalDocumentsInDatabase || 0,
        totalChunksInDatabase: plagiarismResult.totalChunksInDatabase || 0,
        fromCache: plagiarismResult.fromCache || false,
        cacheOptimized: plagiarismResult.cacheOptimized || false
      });
    } catch (error) {
      console.error('Text checker error:', error);
      setError(error.message || 'Đã xảy ra lỗi khi kiểm tra trùng lặp');
      setIsUploading(false);
    }

    setIsChecking(false);
  };

  const handleClear = () => {
    setInputText('');
    setResults(null);
    setSelectedFile(null);
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100">
      <div className="px-4 py-8 mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="p-3 mr-3 shadow-lg bg-gradient-primary rounded-2xl">
              <span className="text-3xl">🔍</span>
            </div>
            <h1 className="text-3xl font-bold text-neutral-800">
              Kiểm tra trùng lặp nội dung
            </h1>
          </div>
          <p className="text-neutral-600">
            Chào mừng <span className="font-semibold text-primary-600">{user?.name}</span>! 
            Kiểm tra văn bản của bạn để phát hiện nội dung trùng lặp trong cơ sở dữ liệu.
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-4 mb-6 border border-red-200 bg-red-50 rounded-xl">
            <div className="flex items-center">
              <span className="mr-2 text-red-500">❌</span>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Input Section */}
          <div className="p-6 bg-white shadow-xl rounded-2xl">
            <h2 className="flex items-center mb-4 text-xl font-semibold text-neutral-800">
              <span className="mr-2">📝</span>
              Nhập văn bản cần kiểm tra
            </h2>

            {/* File Upload Section */}
            <div className="mb-4">
              <div className="flex items-center gap-4 mb-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="flex items-center px-4 py-2 text-sm font-medium transition-all duration-200 border rounded-lg cursor-pointer border-neutral-300 text-neutral-700 hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="mr-2">📎</span>
                  Chọn file
                </label>
                <span className="text-sm text-neutral-500">
                  Hiện tại chỉ hỗ trợ: TXT (tối đa 10MB)
                </span>
              </div>

              {/* Selected File Display */}
              {selectedFile && (
                <div className="flex items-center justify-between p-3 border border-blue-200 rounded-lg bg-blue-50">
                  <div className="flex items-center">
                    <span className="mr-2 text-lg">📄</span>
                    <div>
                      <div className="font-medium text-blue-800">{selectedFile.name}</div>
                      <div className="text-sm text-blue-600">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={handleRemoveFile}
                    className="p-1 text-blue-600 transition-colors rounded hover:text-blue-800 hover:bg-blue-100"
                    title="Xóa file"
                  >
                    <span className="text-lg">✕</span>
                  </button>
                </div>
              )}
            </div>

            {/* Text Input or File Info */}
            {!selectedFile ? (
              <>
                <textarea
                  value={inputText}
                  onChange={handleInputChange}
                  placeholder="Nhập hoặc dán văn bản của bạn vào đây..."
                  className="w-full h-64 p-4 transition-all duration-200 border resize-none border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-neutral-50 focus:bg-white"
                />
                
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-neutral-500">
                    {inputText.length} ký tự • {inputText.trim() ? inputText.trim().split(/\s+/).length : 0} từ
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-64 border-2 border-dashed border-neutral-300 rounded-xl bg-neutral-50">
                <div className="text-center">
                  <div className="mb-3 text-4xl">📄</div>
                  <p className="font-medium text-neutral-700">File đã được chọn</p>
                  <p className="text-sm text-neutral-500">
                    Nhấn "Kiểm tra ngay" để phân tích nội dung file
                  </p>
                </div>
              </div>
            )}
            
            {/* Action Buttons */}
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={handleClear}
                disabled={(!inputText && !selectedFile) || isChecking}
                className="px-4 py-2 text-sm font-medium transition-all duration-200 border rounded-lg border-neutral-300 text-neutral-700 hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-neutral-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Xóa
              </button>
              
              <button
                onClick={handleCheck}
                disabled={(!inputText.trim() && !selectedFile) || isChecking}
                className="px-6 py-2 text-sm font-medium text-white transition-all duration-200 shadow-lg bg-gradient-primary rounded-lg hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-xl transform hover:-translate-y-0.5 disabled:transform-none"
              >
                {isChecking ? (
                  <div className="flex items-center">
                    <div className="w-4 h-4 mr-2 border-b-2 border-white rounded-full animate-spin"></div>
                    {isUploading ? 'Đang tải file...' : 'Đang kiểm tra...'}
                  </div>
                ) : (
                  <>
                    <span className="mr-2">🔍</span>
                    Kiểm tra ngay
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Results Section */}
          <div className="p-6 bg-white shadow-xl rounded-2xl">
            <h2 className="flex items-center mb-4 text-xl font-semibold text-neutral-800">
              <span className="mr-2">📊</span>
              Kết quả kiểm tra
            </h2>

            {!results ? (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <div className="p-4 mb-4 rounded-full bg-neutral-100">
                  <span className="text-4xl">⏳</span>
                </div>
                <p className="text-neutral-500">
                  Nhập văn bản và nhấn "Kiểm tra ngay" để xem kết quả
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Status */}
                <div className={`p-4 rounded-xl ${
                  results.status === 'low' 
                    ? 'bg-green-50 border border-green-200' 
                    : results.status === 'medium'
                    ? 'bg-yellow-50 border border-yellow-200'
                    : 'bg-red-50 border border-red-200'
                }`}>
                  <div className="flex items-center">
                    <span className="mr-3 text-2xl">
                      {results.status === 'low' ? '✅' : results.status === 'medium' ? '⚠️' : '🚨'}
                    </span>
                    <div>
                      <h3 className={`font-semibold ${
                        results.status === 'low' ? 'text-green-800' : 
                        results.status === 'medium' ? 'text-yellow-800' : 'text-red-800'
                      }`}>
                        {results.status === 'low' 
                          ? 'Tỷ lệ trùng lặp thấp' 
                          : results.status === 'medium'
                          ? 'Tỷ lệ trùng lặp trung bình'
                          : 'Tỷ lệ trùng lặp cao'
                        }
                      </h3>
                      <p className={`text-sm ${
                        results.status === 'low' ? 'text-green-600' : 
                        results.status === 'medium' ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {results.duplicateRate}% nội dung có thể trùng lặp
                        {results.matches && results.matches.length > 0 && 
                          ` • Tìm thấy ${results.matches.length} nguồn tương tự`
                        }
                      </p>
                    </div>
                  </div>
                </div>

                {/* Statistics */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 border border-neutral-200 rounded-xl bg-neutral-50">
                    <div className="text-2xl font-bold text-primary-600">
                      {results.wordCount}
                    </div>
                    <div className="text-sm text-neutral-600">Số từ</div>
                  </div>
                  
                  <div className="p-4 border border-neutral-200 rounded-xl bg-neutral-50">
                    <div className="text-2xl font-bold text-primary-600">
                      {results.charCount}
                    </div>
                    <div className="text-sm text-neutral-600">Ký tự</div>
                  </div>
                  
                  <div className="p-4 border border-neutral-200 rounded-xl bg-neutral-50">
                    <div className={`text-2xl font-bold ${
                      results.status === 'low' ? 'text-green-600' : 
                      results.status === 'medium' ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {results.duplicateRate}%
                    </div>
                    <div className="text-sm text-neutral-600">Tỷ lệ trùng lặp</div>
                  </div>
                  
                  <div className="p-4 border border-neutral-200 rounded-xl bg-neutral-50">
                    <div className="text-2xl font-bold text-blue-600">
                      {results.sources ? results.sources.length : 0}
                    </div>
                    <div className="text-sm text-neutral-600">Nguồn tìm thấy</div>
                  </div>
                </div>

                {/* Processing Information */}
                {(results.fromCache || results.cacheOptimized || results.processingTime) && (
                  <div className="p-4 border border-green-200 rounded-xl bg-green-50">
                    <h4 className="flex items-center mb-3 font-semibold text-green-800">
                      <span className="mr-2">⚡</span>
                      Thông tin xử lý
                    </h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {results.fromCache && (
                        <div className="flex items-center">
                          <span className="mr-2 text-green-600">✅</span>
                          <span className="text-green-700">Từ cache (tối ưu)</span>
                        </div>
                      )}
                      {results.cacheOptimized && !results.fromCache && (
                        <div className="flex items-center">
                          <span className="mr-2 text-blue-600">🚀</span>
                          <span className="text-green-700">Đã tối ưu hóa</span>
                        </div>
                      )}
                      {results.processingTime && (
                        <div className="flex items-center">
                          <span className="mr-2 text-gray-600">⏱️</span>
                          <span className="text-green-700">
                            Xử lý: {results.processingTime}ms
                          </span>
                        </div>
                      )}
                      {results.similarChunksFound > 0 && (
                        <div className="flex items-center">
                          <span className="mr-2 text-orange-600">🔍</span>
                          <span className="text-green-700">
                            {results.similarChunksFound} đoạn tương tự
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Database Statistics */}
                {(results.totalDocumentsInDatabase > 0 || results.totalChunksInDatabase > 0) && (
                  <div className="p-4 border border-purple-200 rounded-xl bg-purple-50">
                    <h4 className="flex items-center mb-3 font-semibold text-purple-800">
                      <span className="mr-2">🗄️</span>
                      Thống kê cơ sở dữ liệu
                    </h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {results.totalDocumentsInDatabase > 0 && (
                        <div className="flex items-center">
                          <span className="mr-2 text-purple-600">📚</span>
                          <span className="text-purple-700">
                            {results.totalDocumentsInDatabase.toLocaleString()} tài liệu
                          </span>
                        </div>
                      )}
                      {results.totalChunksInDatabase > 0 && (
                        <div className="flex items-center">
                          <span className="mr-2 text-purple-600">🧩</span>
                          <span className="text-purple-700">
                            {results.totalChunksInDatabase.toLocaleString()} đoạn văn
                          </span>
                        </div>
                      )}
                      <div className="flex items-center">
                        <span className="mr-2 text-purple-600">🔍</span>
                        <span className="text-purple-700">
                          Sử dụng cây AVL để tối ưu
                        </span>
                      </div>
                      <div className="flex items-center">
                        <span className="mr-2 text-purple-600">⚡</span>
                        <span className="text-purple-700">
                          Kiểm tra thời gian thực
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Document Information */}
                <div className="p-4 border border-blue-200 rounded-xl bg-blue-50">
                  <h4 className="flex items-center mb-3 font-semibold text-blue-800">
                    <span className="mr-2">📄</span>
                    Thông tin document
                  </h4>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <span className="text-sm font-medium text-blue-700">Tên file:</span>
                      <p className="text-sm text-blue-600">
                        {results.fileName || 'Văn bản nhập tay'}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-blue-700">Kích thước:</span>
                      <p className="text-sm text-blue-600">
                        {results.source === 'file' 
                          ? `${(results.charCount / 1024).toFixed(2)} KB` 
                          : `${results.charCount} ký tự`
                        }
                      </p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-blue-700">Loại file:</span>
                      <p className="text-sm text-blue-600">
                        {results.source === 'file' ? 'File upload' : 'Text input'}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-blue-700">Tỷ lệ trùng lặp:</span>
                      <p className={`text-sm font-semibold ${
                        results.status === 'low' ? 'text-green-600' : 
                        results.status === 'medium' ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {results.duplicateRate}%
                      </p>
                    </div>
                  </div>
                  
                  {/* Comparison Buttons */}
                  <div className="flex gap-3">
                    {results?.checkId ? (
                      <Link
                        to={`/detailed-comparison/${results.checkId}`}
                        className="flex items-center px-4 py-2 text-sm font-medium text-white transition-all duration-200 bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <span className="mr-2">🔍</span>
                        So sánh với document giống nhất
                      </Link>
                    ) : (
                      <button
                        disabled
                        className="flex items-center px-4 py-2 text-sm font-medium text-white transition-all duration-200 bg-gray-400 rounded-lg opacity-50 cursor-not-allowed"
                      >
                        <span className="mr-2">🔍</span>
                        So sánh với document giống nhất
                      </button>
                    )}
                    
                    {results?.checkId ? (
                      <Link
                        to={`/all-documents-comparison/${results.checkId}`}
                        className="flex items-center px-4 py-2 text-sm font-medium text-blue-600 transition-all duration-200 bg-white border border-blue-600 rounded-lg hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <span className="mr-2">📊</span>
                        So sánh với toàn bộ database
                      </Link>
                    ) : (
                      <button
                        disabled
                        className="flex items-center px-4 py-2 text-sm font-medium text-gray-400 transition-all duration-200 bg-white border border-gray-300 rounded-lg opacity-50 cursor-not-allowed"
                      >
                        <span className="mr-2">📊</span>
                        So sánh với toàn bộ database
                      </button>
                    )}
                  </div>
                </div>

                {/* Plagiarism Matches */}
                {results.matches && results.matches.length > 0 && (
                  <div>
                    <h4 className="mb-3 font-semibold text-neutral-800">
                      Các đoạn trùng lặp được tìm thấy:
                    </h4>
                    <div className="space-y-3">
                      {results.matches.map((match, index) => (
                        <div
                          key={index}
                          className="p-4 border border-orange-200 rounded-lg bg-orange-50"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center">
                              <span className="mr-2 text-orange-600">🔗</span>
                              <span className="font-medium text-orange-800">
                                {match.source}
                              </span>
                              {match.fromCache && (
                                <span className="px-2 py-1 ml-2 text-xs font-medium text-green-700 bg-green-200 rounded-full">
                                  Cache
                                </span>
                              )}
                            </div>
                            <span className="px-2 py-1 text-xs font-medium text-orange-700 bg-orange-200 rounded-full">
                              {match.similarity}% tương tự
                            </span>
                          </div>
                          <p className="mb-2 text-sm text-neutral-700">
                            "{match.text}"
                          </p>
                          {match.url && (
                            <a
                              href={match.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
                            >
                              Xem nguồn gốc →
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Source Info */}
                {results.source === 'file' && (
                  <div className="p-3 border border-neutral-200 rounded-xl bg-neutral-50">
                    <div className="flex items-center">
                      <span className="mr-2 text-lg">📄</span>
                      <div>
                        <div className="font-medium text-neutral-800">
                          Nguồn: {results.fileName}
                        </div>
                        <div className="text-sm text-neutral-600">
                          Nội dung được trích xuất từ file
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Timestamp */}
                <div className="pt-4 text-xs text-center border-t border-neutral-200 text-neutral-500">
                  Kiểm tra lúc: {results.checkedAt}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Help Section */}
        <div className="p-6 mt-8 bg-white shadow-xl rounded-2xl">
          <h3 className="flex items-center mb-4 text-lg font-semibold text-neutral-800">
            <span className="mr-2">💡</span>
            Hướng dẫn sử dụng
          </h3>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="p-4 border border-neutral-200 rounded-xl bg-neutral-50">
              <div className="mb-2 text-2xl">📝</div>
              <h4 className="mb-2 font-medium text-neutral-800">Cách 1: Nhập text</h4>
              <p className="text-sm text-neutral-600">
                Nhập hoặc dán văn bản cần kiểm tra trùng lặp vào ô textarea
              </p>
            </div>
            
            <div className="p-4 border border-neutral-200 rounded-xl bg-neutral-50">
              <div className="mb-2 text-2xl">📎</div>
              <h4 className="mb-2 font-medium text-neutral-800">Cách 2: Upload file</h4>
              <p className="text-sm text-neutral-600">
                Chọn file TXT, PDF, DOC, DOCX để kiểm tra nội dung trùng lặp
              </p>
            </div>
            
            <div className="p-4 border border-neutral-200 rounded-xl bg-neutral-50">
              <div className="mb-2 text-2xl">🔍</div>
              <h4 className="mb-2 font-medium text-neutral-800">Bước 2</h4>
              <p className="text-sm text-neutral-600">
                Nhấn nút "Kiểm tra ngay" để phân tích trùng lặp với cơ sở dữ liệu
              </p>
            </div>
            
            <div className="p-4 border border-neutral-200 rounded-xl bg-neutral-50">
              <div className="mb-2 text-2xl">📊</div>
              <h4 className="mb-2 font-medium text-neutral-800">Bước 3</h4>
              <p className="text-sm text-neutral-600">
                Xem tỷ lệ trùng lặp và các nguồn tương tự được tìm thấy
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TextChecker;