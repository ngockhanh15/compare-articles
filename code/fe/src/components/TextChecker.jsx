import { useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';

const TextChecker = () => {
  const { user } = useAuth();
  const [inputText, setInputText] = useState('');
  const [results, setResults] = useState(null);
  const [isChecking, setIsChecking] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Fake forbidden words database
  const FORBIDDEN_WORDS = [
    'spam', 'hack', 'virus', 'scam', 'fake', 'cheat', 'illegal',
    'violence', 'hate', 'discrimination', 'harassment', 'abuse'
  ];

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Kiểm tra định dạng file
    const allowedTypes = [
      'text/plain',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      alert('Chỉ hỗ trợ file định dạng: TXT, PDF, DOC, DOCX');
      return;
    }

    // Kiểm tra kích thước file (tối đa 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('File không được vượt quá 10MB');
      return;
    }

    setSelectedFile(file);
    setInputText(''); // Xóa text đã nhập
    setResults(null); // Xóa kết quả cũ
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadFileToServer = async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      // Thay đổi URL này thành endpoint thực tế của backend
      const response = await fetch('/api/upload-file', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload file thất bại');
      }

      const data = await response.json();
      return data.extractedText || '';
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  };

  const handleCheck = async () => {
    let textToCheck = '';

    if (selectedFile) {
      if (!selectedFile) {
        alert('Vui lòng chọn file cần kiểm tra');
        return;
      }

      setIsChecking(true);
      setIsUploading(true);

      try {
        // Upload file và lấy text đã extract
        textToCheck = await uploadFileToServer(selectedFile);
        setIsUploading(false);
        
        if (!textToCheck.trim()) {
          alert('Không thể đọc nội dung từ file này');
          setIsChecking(false);
          return;
        }
      } catch (error) {
        setIsUploading(false);
        setIsChecking(false);
        alert('Lỗi khi xử lý file: ' + error.message);
        return;
      }
    } else {
      if (!inputText.trim()) {
        alert('Vui lòng nhập văn bản hoặc chọn file cần kiểm tra');
        return;
      }
      textToCheck = inputText;
      setIsChecking(true);
    }
    
    // Simulate API processing time
    await new Promise(resolve => setTimeout(resolve, 2000));

    const text = textToCheck.toLowerCase();
    const foundWords = FORBIDDEN_WORDS.filter(word => 
      text.includes(word.toLowerCase())
    );

    const wordCount = textToCheck.trim().split(/\s+/).length;
    const charCount = textToCheck.length;
    const duplicateRate = Math.floor(Math.random() * 30) + 5; // Random 5-35%

    setResults({
      foundWords,
      wordCount,
      charCount,
      duplicateRate,
      status: foundWords.length > 0 ? 'warning' : 'clean',
      checkedAt: new Date().toLocaleString('vi-VN'),
      source: selectedFile ? 'file' : 'text',
      fileName: selectedFile ? selectedFile.name : null
    });

    setIsChecking(false);
  };

  const handleClear = () => {
    setInputText('');
    setResults(null);
    setSelectedFile(null);
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
              Kiểm tra văn bản
            </h1>
          </div>
          <p className="text-neutral-600">
            Chào mừng <span className="font-semibold text-primary-600">{user?.name}</span>! 
            Kiểm tra văn bản của bạn để phát hiện nội dung không phù hợp.
          </p>
        </div>

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
                  accept=".txt,.pdf,.doc,.docx"
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
                  Hỗ trợ: TXT, PDF, DOC, DOCX (tối đa 10MB)
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
                  onChange={(e) => setInputText(e.target.value)}
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
                  results.status === 'clean' 
                    ? 'bg-green-50 border border-green-200' 
                    : 'bg-yellow-50 border border-yellow-200'
                }`}>
                  <div className="flex items-center">
                    <span className="mr-3 text-2xl">
                      {results.status === 'clean' ? '✅' : '⚠️'}
                    </span>
                    <div>
                      <h3 className={`font-semibold ${
                        results.status === 'clean' ? 'text-green-800' : 'text-yellow-800'
                      }`}>
                        {results.status === 'clean' 
                          ? 'Văn bản sạch' 
                          : 'Phát hiện nội dung cần chú ý'
                        }
                      </h3>
                      <p className={`text-sm ${
                        results.status === 'clean' ? 'text-green-600' : 'text-yellow-600'
                      }`}>
                        {results.status === 'clean' 
                          ? 'Không phát hiện từ khóa không phù hợp' 
                          : `Tìm thấy ${results.foundWords.length} từ khóa cần chú ý`
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
                    <div className="text-2xl font-bold text-accent-600">
                      {results.duplicateRate}%
                    </div>
                    <div className="text-sm text-neutral-600">Tỷ lệ trùng lặp</div>
                  </div>
                  
                  <div className="p-4 border border-neutral-200 rounded-xl bg-neutral-50">
                    <div className="text-2xl font-bold text-red-600">
                      {results.foundWords.length}
                    </div>
                    <div className="text-sm text-neutral-600">Từ cấm</div>
                  </div>
                </div>

                {/* Found Words */}
                {results.foundWords.length > 0 && (
                  <div>
                    <h4 className="mb-3 font-semibold text-neutral-800">
                      Từ khóa được phát hiện:
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {results.foundWords.map((word, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 text-sm font-medium text-red-700 bg-red-100 border border-red-200 rounded-full"
                        >
                          {word}
                        </span>
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
                Nhập hoặc dán văn bản cần kiểm tra vào ô textarea
              </p>
            </div>
            
            <div className="p-4 border border-neutral-200 rounded-xl bg-neutral-50">
              <div className="mb-2 text-2xl">📎</div>
              <h4 className="mb-2 font-medium text-neutral-800">Cách 2: Upload file</h4>
              <p className="text-sm text-neutral-600">
                Chọn file TXT, PDF, DOC, DOCX để kiểm tra nội dung
              </p>
            </div>
            
            <div className="p-4 border border-neutral-200 rounded-xl bg-neutral-50">
              <div className="mb-2 text-2xl">🔍</div>
              <h4 className="mb-2 font-medium text-neutral-800">Bước 2</h4>
              <p className="text-sm text-neutral-600">
                Nhấn nút "Kiểm tra ngay" để bắt đầu phân tích
              </p>
            </div>
            
            <div className="p-4 border border-neutral-200 rounded-xl bg-neutral-50">
              <div className="mb-2 text-2xl">📊</div>
              <h4 className="mb-2 font-medium text-neutral-800">Bước 3</h4>
              <p className="text-sm text-neutral-600">
                Xem kết quả và thống kê chi tiết ở bên phải
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TextChecker;