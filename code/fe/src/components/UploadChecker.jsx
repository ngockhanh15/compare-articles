import { useState, useRef, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { extractTextFromFile, checkDocumentSimilarity, getTreeStats, getDetailedComparison } from "../services/api";
import { Link } from "react-router-dom";

const UploadChecker = () => {
  const { user } = useAuth();
  const [results, setResults] = useState(null);
  const [isChecking, setIsChecking] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);
  const [checkOptions] = useState({
    sensitivity: "medium",
    language: "vi",
  });
  const [treeStats, setTreeStats] = useState(null);
  // Text input only for selected existing documents; no manual typing UI

  useEffect(() => {
    loadTreeStats();
  }, []);

  const loadTreeStats = async () => {
    try {
      const response = await getTreeStats();
      if (response.success) {
        setTreeStats(response.stats);
      }
    } catch (error) {
      console.error("Error loading tree stats:", error);
    }
  };

  // Removed user stats loader; not displayed in this component

  // Removed document selection flow; only file upload is supported

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Clear previous errors
    setError("");

    // Kiểm tra định dạng file
    const allowedTypes = [
      "text/plain",
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
      "application/msword", // .doc
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
      "application/vnd.ms-excel", // .xls
      "application/vnd.openxmlformats-officedocument.presentationml.presentation", // .pptx
      "application/vnd.ms-powerpoint", // .ppt
    ];

    if (!allowedTypes.includes(file.type)) {
      setError(
        "Chỉ hỗ trợ file định dạng: TXT, PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX"
      );
      return;
    }

    // Kiểm tra kích thước file (tối đa 50MB)
    if (file.size > 50 * 1024 * 1024) {
      setError("File không được vượt quá 50MB");
      return;
    }

    setSelectedFile(file);
    setResults(null); // Xóa kết quả cũ
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setError("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleCheck = async () => {
    setError("");
    let textToCheck = "";

    // Validate input
    if (!selectedFile) {
      setError("Vui lòng chọn file cần kiểm tra");
      return;
    }

    setIsChecking(true);

    try {
      setIsUploading(true);
      // Extract text from file first (using new API)
      const fileResult = await extractTextFromFile(selectedFile);
      setIsUploading(false);

      if (!fileResult.success) {
        setError("Không thể đọc nội dung file này");
        setIsChecking(false);
        return;
      }

      textToCheck = fileResult.extractedText;

      // Validate extracted text
      if (!textToCheck || textToCheck.trim().length === 0) {
        setError("File không chứa văn bản có thể đọc được");
        setIsChecking(false);
        return;
      }

      // Check document similarity with extracted text
      const similarityResult = await checkDocumentSimilarity(
        textToCheck,
        checkOptions,
        selectedFile.name,
        selectedFile.type
      );

      // Extract data from document similarity API response
      let realData = null;
      try {
        realData = await getDetailedComparison(similarityResult.checkId);
      } catch (detailError) {
        console.warn("Could not get detailed comparison:", detailError);
        realData = { overallSimilarity: 0 };
      }

      const result = similarityResult.result;
      const wordCount = result.wordCount || 0;
      const charCount = result.textLength || 0;

      // Lấy tên document trùng nhất từ nhiều nguồn có thể
      const documentName =
        result.mostSimilarDocumentName ||
        result.nameDocumentWithMostDuplicates ||
        result.documentWithMostDuplicates?.name ||
        result.documentWithMostDuplicates?.title ||
        result.documentWithMostDuplicates?.fileName ||
        (result.mostSimilarDocument && result.mostSimilarDocument.name) ||
        (result.mostSimilarDocument && result.mostSimilarDocument.title) ||
        (result.mostSimilarDocument && result.mostSimilarDocument.fileName) ||
        "";

      // Tính tổng số câu trong văn bản kiểm tra
      const sentences = textToCheck
        .split(/[.!?]+/)
        .filter((sentence) => sentence.trim().length > 0);
      const totalSentencesInText = sentences.length;

      // Tính số câu trùng lặp thực tế từ matches
      const matches = result.matches || [];
      const duplicateSentencesFromText = new Set();

      matches.forEach((match) => {
        if (match.duplicateSentencesDetails && Array.isArray(match.duplicateSentencesDetails)) {
          // Sử dụng duplicateSentencesDetails từ backend nếu có
          match.duplicateSentencesDetails.forEach((detail) => {
            if (detail.inputSentenceIndex !== undefined) {
              duplicateSentencesFromText.add(detail.inputSentenceIndex);
            }
          });
        } else if (match.text) {
          // Fallback: so sánh với match.text
          sentences.forEach((sentence, index) => {
            if (
              sentence.trim().includes(match.text.trim()) ||
              match.text.trim().includes(sentence.trim())
            ) {
              duplicateSentencesFromText.add(index);
            }
          });
        }
      });

      const duplicateSentencesCount = duplicateSentencesFromText.size;
      
      // Tính dtotal chính xác
      const calculatedDtotal = totalSentencesInText > 0 ? (duplicateSentencesCount / totalSentencesInText) * 100 : 0;

      setResults({
        checkId: similarityResult.checkId,
        duplicateRate: realData.overallSimilarity || 0,
        matches: result.matches || [],
        sources: result.sources || [],
        wordCount,
        charCount,
        status: result.confidence || "low",
        checkedAt: new Date().toLocaleString("vi-VN"),
        source: selectedFile ? "file" : "text",
        fileName: selectedFile ? selectedFile.name : null,
        confidence: result.confidence || "low",
        processingTime: result.processingTime || 0,
        totalMatches: result.totalMatches || 0,
        checkedDocuments: result.checkedDocuments || 0,
        totalDocumentsInSystem: result.totalDocumentsInSystem || 0,
        dtotal: result.dtotal || calculatedDtotal, // Ưu tiên giá trị từ backend, fallback về tính toán local
        dtotalRaw: duplicateSentencesCount, // Số câu trùng thực tế (tính toán local)
        totalSentences: totalSentencesInText, // Tổng số câu trong văn bản kiểm tra (tính toán local)
        dab: result.dab || 0,
        mostSimilarDocument: result.mostSimilarDocument || null,
        treeStats: treeStats,
        totalSentencesWithInputWords: result.totalSentencesWithInputWords || 0,
        maxDuplicateSentences: result.maxDuplicateSentences || 0,
        documentWithMostDuplicates: result.documentWithMostDuplicates || null,
        totalDuplicateSentences: result.totalDuplicateSentences || 0,
        totalUniqueWordPairs: result.totalUniqueWordPairs || 0,
        totalUniqueWords: result.totalUniqueWords || 0,
        nameDocumentWithMostDuplicates: documentName,
        checkType: "document-based",
      });
    } catch (error) {
      console.error("Document similarity check error:", error);

      let errorMessage = "Đã xảy ra lỗi khi kiểm tra trùng lặp với documents";
      if (error?.message) {
        if (error.message.includes("network") || error.message.includes("fetch")) {
          errorMessage = "Lỗi kết nối mạng. Vui lòng kiểm tra kết nối internet và thử lại.";
        } else if (error.message.includes("401") || error.message.includes("unauthorized")) {
          errorMessage = "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
        } else if (error.message.includes("500")) {
          errorMessage = "Lỗi máy chủ. Vui lòng thử lại sau ít phút.";
        } else {
          errorMessage = error.message;
        }
      }
      setError(errorMessage);
      setIsUploading(false);
    }

    setIsChecking(false);
  };

  const handleClear = () => {
    setResults(null);
    setSelectedFile(null);
    setError("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
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
              Kiểm tra trùng lặp với Documents
            </h1>
          </div>
          <p className="text-neutral-600">
            Chào mừng{" "}
            <span className="font-semibold text-primary-600">{user?.name}</span>
            ! Kiểm tra văn bản của bạn để phát hiện nội dung trùng lặp với các
            documents đã upload trong dự án.
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
              Tải lên văn bản cần kiểm tra
            </h2>

            {/* File Upload Section */}
            <div className="mb-4">
              <div className="flex items-center gap-4 mb-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.doc,.docx,.pdf,.xls,.xlsx,.ppt,.pptx"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="flex items-center px-4 py-2 text-sm font-medium transition-all duration-200 bg-white border rounded-lg cursor-pointer text-neutral-700 border-neutral-300 hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="mr-2">📎</span>
                  Chọn file
                </label>
                <span className="text-sm text-neutral-500">
                  Hỗ trợ: TXT, DOC, DOCX, PDF, XLS, XLSX, PPT, PPTX (tối đa
                  50MB)
                </span>
              </div>

              {/* Selected File Display */}
              {selectedFile && (
                <div className="flex items-center justify-between p-3 border border-blue-200 rounded-lg bg-blue-50">
                  <div className="flex items-center">
                    <span className="mr-2 text-lg">📄</span>
                    <div>
                      <div className="font-medium text-blue-800">
                        {selectedFile.name}
                      </div>
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

    {/* Guidance panel when no file selected */}
            {!selectedFile ? (
              <div className="flex items-center justify-center h-64 border-2 border-dashed bg-neutral-50 border-neutral-300 rounded-xl">
                <div className="text-center">
                  <div className="mb-3 text-4xl">📝</div>
      <p className="font-medium text-neutral-700">Chỉ hỗ trợ kiểm tra qua file upload</p>
      <p className="text-sm text-neutral-500">Vui lòng chọn file để bắt đầu</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-64 border-2 border-dashed bg-neutral-50 border-neutral-300 rounded-xl">
                <div className="text-center">
                  <div className="mb-3 text-4xl">📄</div>
                  <p className="font-medium text-neutral-700">File đã được chọn</p>
                  <p className="text-sm text-neutral-500">Nhấn "Kiểm tra" để phân tích nội dung file</p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={handleClear}
                disabled={!selectedFile || isChecking}
                className="px-4 py-2 text-sm font-medium transition-all duration-200 bg-white border rounded-lg text-neutral-700 border-neutral-300 hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-neutral-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Xóa
              </button>

              <button
                onClick={handleCheck}
                disabled={!selectedFile || isChecking}
                className="px-6 py-2 text-sm font-medium text-white transition-all duration-200 shadow-lg bg-gradient-primary rounded-lg hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-xl transform hover:-translate-y-0.5 disabled:transform-none"
              >
                {isChecking ? (
                  <div className="flex items-center">
                    <div className="w-4 h-4 mr-2 border-b-2 border-white rounded-full animate-spin"></div>
                    {isUploading ? "Đang tải file..." : "Đang kiểm tra..."}
                  </div>
                ) : (
                  <>
                    <span className="mr-2">🔍</span>
                    Kiểm tra
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
                  Tải lên văn bản và nhấn "Kiểm tra" để xem kết quả
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Status */}

                {/* Document Information */}
                <div className="p-4 border border-blue-200 rounded-xl bg-blue-50">
                  <h4 className="flex items-center mb-3 font-semibold text-blue-800">
                    <span className="mr-2">📄</span>
                    Thông tin document
                  </h4>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <span className="text-sm font-medium text-blue-700">
                        Tên file:
                      </span>
                      <p className="text-sm text-blue-600">
                        {results.fileName || "Văn bản nhập tay"}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-blue-700">
                        Kích thước:
                      </span>
                      <p className="text-sm text-blue-600">
                        {results.source === "file"
                          ? `${(results.charCount / 1024).toFixed(2)} KB`
                          : `${results.charCount} ký tự`}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-blue-700">
                        Loại file:
                      </span>
                      <p className="text-sm text-blue-600">
                        {results.source === "file"
                          ? "File upload"
                          : "Text input"}
                      </p>
                    </div>
                  </div>

                  {/* Thống kê chi tiết đã được ẩn theo yêu cầu */}
                </div>

                {/* Statistics */}
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                  <div className="p-4 border border-neutral-200 rounded-xl bg-neutral-50">
                    <div className="text-2xl font-bold text-primary-600">
                      {results.dtotalRaw || 0}
                    </div>
                    <div className="text-sm text-neutral-600">Câu trùng</div>
                  </div>

                  <div className="p-4 border border-neutral-200 rounded-xl bg-neutral-50">
                    <div className="text-2xl font-bold text-primary-600">
                      {results.totalSentences || 0}
                    </div>
                    <div className="text-sm text-neutral-600">Tổng câu</div>
                  </div>

                  {/* Ẩn thẻ Số document tìm kiếm */}

                  {/* Thông tin tỷ lệ trùng lặp mới */}
                  <div className="p-4 border border-purple-200 rounded-xl bg-purple-50">
                    <div className="text-lg font-bold text-purple-600">
                      {Math.round(results.dtotal || 0)}%
                    </div>
                    <div className="text-sm text-purple-600">Dtotal</div>
                    <div className="mt-1 text-xs text-purple-500">
                      Câu trùng với toàn CSDL (%)
                    </div>
                  </div>

                  {/* Ẩn thẻ DA/B */}
                </div>

                {/* Comparison Buttons replaced with a single details button */}
                <div className="flex gap-3">
                  {results?.checkId && (
                    <Link
                      to={`/detailed-comparison/${results.checkId}`}
                      className="flex items-center px-4 py-2 text-sm font-medium text-white transition-all duration-200 bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <span className="mr-2">�</span>
                      Kết quả chi tiết
                    </Link>
                  )}
                </div>

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
              <div className="mb-2 text-2xl">�</div>
              <h4 className="mb-2 font-medium text-neutral-800">Cách 1: Upload file</h4>
              <p className="text-sm text-neutral-600">
                Chọn file TXT, PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX để kiểm tra nội dung trùng lặp
              </p>
            </div>

            <div className="p-4 border border-neutral-200 rounded-xl bg-neutral-50">
              <div className="mb-2 text-2xl">�</div>
              <h4 className="mb-2 font-medium text-neutral-800">Cách 2: Chọn tài liệu đã upload</h4>
              <p className="text-sm text-neutral-600">
                Chọn một tài liệu đã xử lý trong hệ thống để kiểm tra trùng lặp
              </p>
            </div>

            <div className="p-4 border border-neutral-200 rounded-xl bg-neutral-50">
              <div className="mb-2 text-2xl">🔍</div>
              <h4 className="mb-2 font-medium text-neutral-800">Bước 2</h4>
              <p className="text-sm text-neutral-600">
                Nhấn nút "Kiểm tra" để phân tích trùng lặp với cơ sở dữ liệu
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

  {/* Document Selector removed */}
      </div>
    </div>
  );
};

export default UploadChecker;
