import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import {
  checkDocumentSimilarity,
  getUserDocuments,
  getDocumentText,
  getTreeStats,
  getDetailedComparison,
  getThresholds,
} from "../services/api";
import { Link } from "react-router-dom";

const TextChecker = () => {
  const { user } = useAuth();
  const [inputText, setInputText] = useState("");
  const [results, setResults] = useState(null);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState("");
  const [userDocuments, setUserDocuments] = useState([]);
  const [showDocumentSelector, setShowDocumentSelector] = useState(false);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [checkOptions] = useState({
    sensitivity: "medium",
    language: "vi",
  });
  const [thresholds, setThresholds] = useState({
    sentenceThreshold: 50,
    highDuplicationThreshold: 30,
    documentComparisonThreshold: 20
  });
  // const [treeStats, setTreeStats] = useState(null);
  // Helper to render percentage regardless of whether backend returns 0-1 or 0-100
  const formatPercent = (value) => {
    if (value === undefined || value === null || isNaN(Number(value)))
      return "0%";
    let v = Number(value);
    // If value looks like ratio (<=1), convert to %
    if (v <= 1) v = v * 100;
    if (v < 0) v = 0;
    if (v > 100) v = 100;
    return `${v % 1 === 0 ? v.toFixed(0) : v.toFixed(1)}%`;
  };

  // Thêm vào phần khai báo state
  const [, setDetailedStats] = useState({
    totalSentencesWithInputWords: 0,
    maxDuplicateSentences: 0,
    documentWithMostDuplicates: null,
    totalDuplicateSentences: 0,
    totalUniqueWordPairs: 0,
    totalUniqueWords: 0,
  });

  useEffect(() => {
    loadUserDocuments();
    loadThresholds();
    // loadTreeStats();
  }, []);

  const loadThresholds = async () => {
    try {
      const response = await getThresholds();
      if (response.thresholds) {
        setThresholds(response.thresholds);
      }
    } catch (error) {
      console.error("Error loading thresholds:", error);
    }
  };

  // const loadTreeStats = async () => {
  //   try {
  //     const response = await getTreeStats();
  //     if (response.success) {
  //       setTreeStats(response.stats);
  //     }
  //   } catch (error) {
  //     console.error("Error loading tree stats:", error);
  //   }
  // };

  const loadUserDocuments = async () => {
    try {
      setLoadingDocuments(true);
      const response = await getUserDocuments({
        limit: 20,
        status: "processed", // Only show processed documents
      });

      if (response.success) {
        setUserDocuments(response.documents);
      }
    } catch (error) {
      console.error("Error loading user documents:", error);
    } finally {
      setLoadingDocuments(false);
    }
  };

  const handleDocumentSelect = async (documentId) => {
    try {
      setError("");

      const response = await getDocumentText(documentId);

      if (response.success) {
        setInputText(response.extractedText);
        setResults(null); // Clear previous results
        setShowDocumentSelector(false);
      }
    } catch (error) {
      setError("Không thể lấy nội dung tài liệu: " + error.message);
    }
  };

  const handleInputChange = (e) => {
    const newText = e.target.value;
    setInputText(newText);

    // Clear error when user starts typing
    if (error) setError("");

    // Clear results when text changes significantly
    if (results && newText.trim() !== inputText.trim()) {
      setResults(null);
    }
  };

  const handleCheck = async () => {
    setError("");

    // Validate input
    if (!inputText.trim()) {
      setError("Vui lòng nhập văn bản cần kiểm tra");
      return;
    }

    setIsChecking(true);

    try {
      const textToCheck = inputText.trim();

      // Check document similarity with input text
      const similarityResult = await checkDocumentSimilarity(
        textToCheck,
        checkOptions
      );

      // Extract data from document similarity API response
      // let realData = null;
      // try {
      //   realData = await getDetailedComparison(similarityResult.checkId);
      // } catch (detailError) {
      //   console.warn("Could not get detailed comparison:", detailError);
      //   // Continue without detailed data
      //   realData = { overallSimilarity: 0 };
      // }

      const result = similarityResult.result;
      const wordCount = result.wordCount || 0;
      const charCount = result.textLength || 0;

      console.log("Document similarity result:", result);
      console.log("Full similarity result object:", similarityResult);

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

      console.log("Document name found:", documentName);
      console.log("Available fields in result:", Object.keys(result));

      setDetailedStats({
        totalSentencesWithInputWords: result.totalSentencesWithInputWords || 0,
        maxDuplicateSentences: result.maxDuplicateSentences || 0,
        documentWithMostDuplicates: result.documentWithMostDuplicates || null,
        nameDocumentWithMostDuplicates: documentName,
        totalDuplicateSentences: result.totalDuplicateSentences || 0,
        totalUniqueWordPairs: result.totalUniqueWordPairs || 0,
        totalUniqueWords: result.totalUniqueWords || 0,
      });

      // Tính tổng số câu trong văn bản kiểm tra
      const sentences = textToCheck
        .split(/[.!?]+/)
        .filter((sentence) => sentence.trim().length > 0);
      const totalSentencesInText = sentences.length;

      // Tính số câu trùng lặp thực tế từ matches
      const matches = result.matches || [];
      const duplicateSentencesFromText = new Set();

      // Duyệt qua tất cả matches để tìm câu chứa nội dung trùng lặp
      matches.forEach((match) => {
        if (
          match.duplicateSentencesDetails &&
          Array.isArray(match.duplicateSentencesDetails)
        ) {
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

      // Số câu trùng lặp thực tế
      const duplicateSentencesCount = duplicateSentencesFromText.size;

      // Tính dtotal chính xác - sử dụng similarity từ document giống nhất
      const resultMatches = result.matches || [];
      let correctDtotal = 0;

      if (resultMatches.length > 0) {
        // Sắp xếp matches theo similarity giảm dần và lấy document giống nhất
        const sortedMatches = [...resultMatches].sort((a, b) => {
          const simA = a.similarity || 0;
          const simB = b.similarity || 0;
          return simB - simA;
        });
        correctDtotal = sortedMatches[0].similarity || 0;
      } else {
        // Fallback: sử dụng giá trị từ backend hoặc tính toán local
        correctDtotal = result.dtotal || (totalSentencesInText > 0 ? (duplicateSentencesCount / totalSentencesInText) * 100 : 0);
      }

      setResults({
        checkId: similarityResult.checkId,
        // duplicateRate: realData.overallSimilarity || 0,
        matches: result.matches || [],
        sources: result.sources || [],
        wordCount,
        charCount,
        status: result.confidence || "low",
        checkedAt: (() => {
          const now = new Date();
          const day = now.getDate().toString().padStart(2, '0');
          const month = (now.getMonth() + 1).toString().padStart(2, '0');
          const year = now.getFullYear();
          const hours = now.getHours().toString().padStart(2, '0');
          const minutes = now.getMinutes().toString().padStart(2, '0');
          return `${day}/${month}/${year} ${hours}:${minutes}`;
        })(),
        source: "text",
        fileName: null,
        confidence: result.confidence || "low",
        // Thông tin mới từ DocumentAVLService
        processingTime: result.processingTime || 0,
        totalMatches: result.totalMatches || 0,
        checkedDocuments: result.checkedDocuments || 0,
        totalDocumentsInSystem: result.totalDocumentsInSystem || 0,
        // Thông tin tỷ lệ trùng lặp mới - sử dụng dtotal chính xác
        dtotal: correctDtotal,
        dtotalRaw: duplicateSentencesCount, // Số câu trùng thực tế (tính toán local)
        totalSentences: totalSentencesInText, // Tổng số câu trong văn bản kiểm tra (tính toán local)
        dab: result.dab || 0, // Tổng câu trùng không lặp lại so với Document B nào đó
        mostSimilarDocument: result.mostSimilarDocument || null, // Thông tin document giống nhất
        // Tree stats info
        // treeStats: treeStats,
        totalSentencesWithInputWords: result.totalSentencesWithInputWords || 0,
        maxDuplicateSentences: result.maxDuplicateSentences || 0,
        totalInputSentences: result.totalInputSentences || 0, // Thêm totalInputSentences từ backend
        documentWithMostDuplicates: result.documentWithMostDuplicates || null,
        totalDuplicateSentences: result.totalDuplicateSentences || 0,
        totalUniqueWordPairs: result.totalUniqueWordPairs || 0,
        totalUniqueWords: result.totalUniqueWords || 0,
        nameDocumentWithMostDuplicates: documentName,
        // Thông tin về loại kiểm tra
        checkType: "document-based",
      });
    } catch (error) {
      console.error("Document similarity check error:", error);

      // Provide more specific error messages
      let errorMessage = "Đã xảy ra lỗi khi kiểm tra trùng lặp với documents";

      if (error.message) {
        if (
          error.message.includes("network") ||
          error.message.includes("fetch")
        ) {
          errorMessage =
            "Lỗi kết nối mạng. Vui lòng kiểm tra kết nối internet và thử lại.";
        } else if (
          error.message.includes("401") ||
          error.message.includes("unauthorized")
        ) {
          errorMessage = "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
        } else if (error.message.includes("500")) {
          errorMessage = "Lỗi máy chủ. Vui lòng thử lại sau ít phút.";
        } else {
          errorMessage = error.message;
        }
      }

      setError(errorMessage);
    }

    setIsChecking(false);
  };

  const handleClear = () => {
    setInputText("");
    setResults(null);
    setError("");
    setIsChecking(false);
    setShowDocumentSelector(false);
    setDetailedStats({
      totalSentencesWithInputWords: 0,
      maxDuplicateSentences: 0,
      documentWithMostDuplicates: null,
      totalDuplicateSentences: 0,
      totalUniqueWordPairs: 0,
      totalUniqueWords: 0,
    });
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
              Nhập văn bản cần kiểm tra
            </h2>

            {/* Text Input */}
            <textarea
              value={inputText}
              onChange={handleInputChange}
              placeholder="Nhập hoặc dán văn bản của bạn vào đây..."
              className="w-full h-64 p-4 transition-all duration-200 border resize-none bg-neutral-50 border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent focus:bg-white"
            />

            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center gap-3">
                <div className="text-sm text-neutral-500">
                  {inputText.length} ký tự •{" "}
                  {inputText.trim() ? inputText.trim().split(/\s+/).length : 0}{" "}
                  từ
                  {inputText.trim() && (
                    <span className="ml-2">
                      •{" "}
                      {
                        inputText
                          .trim()
                          .split(/[.!?]+/)
                          .filter((s) => s.trim().length > 0).length
                      }{" "}
                      câu
                    </span>
                  )}
                </div>
                {userDocuments.length > 0 && (
                  <button
                    onClick={() => setShowDocumentSelector(true)}
                    className="px-3 py-1 text-xs font-medium text-blue-600 transition-colors bg-blue-100 rounded-lg hover:bg-blue-200"
                  >
                    📄 Chọn từ tài liệu đã upload
                  </button>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={handleClear}
                disabled={!inputText || isChecking}
                className="px-4 py-2 text-sm font-medium transition-all duration-200 bg-white border rounded-lg text-neutral-700 border-neutral-300 hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-neutral-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Xóa
              </button>

              <button
                onClick={handleCheck}
                disabled={!inputText.trim() || isChecking}
                className="px-6 py-2 text-sm font-medium text-white transition-all duration-200 shadow-lg bg-gradient-primary rounded-lg hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-xl transform hover:-translate-y-0.5 disabled:transform-none"
              >
                {isChecking ? (
                  <div className="flex items-center">
                    <div className="w-4 h-4 mr-2 border-b-2 border-white rounded-full animate-spin"></div>
                    Đang kiểm tra...
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

                {/* Document Information */}
                <div className="p-4 border border-blue-200 rounded-xl bg-blue-50">
                  <h4 className="flex items-center mb-3 font-semibold text-blue-800">
                    <span className="mr-2">📄</span>
                    Thông tin document
                  </h4>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <span className="text-sm font-medium text-blue-700">
                        Nguồn:
                      </span>
                      <p className="text-sm text-blue-600">Văn bản nhập tay</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-blue-700">
                        Kích thước:
                      </span>
                      <p className="text-sm text-blue-600">
                        {results.charCount} ký tự
                      </p>
                    </div>
                  </div>
                </div>

                {/* Statistics */}
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                  {/* Số câu trùng */}
                  <div className="p-4 border border-neutral-200 rounded-xl bg-neutral-50">
                    <div className="text-2xl font-bold text-primary-600">
                      {results.dtotalRaw ??
                        results.totalDuplicateSentences ??
                        0}
                    </div>
                    <div className="text-sm text-neutral-600">Câu trùng</div>
                  </div>

                  {/* Số câu trong input */}
                  <div className="p-4 border border-neutral-200 rounded-xl bg-neutral-50">
                    <div className="text-2xl font-bold text-primary-600">
                      {results.totalSentences ?? 0}
                    </div>
                    <div className="text-sm text-neutral-600">
                      Tổng câu
                    </div>
                  </div>

                  {/* % Dtotal */}
                  <div className="p-4 border border-purple-200 rounded-xl bg-purple-50">
                    <div className="text-2xl font-bold text-purple-600">
                      {Math.round((results.dtotalRaw / results.totalInputSentences) * 100) || 0}%
                    </div>
                    <div className="text-sm text-purple-600">% Dtotal</div>
                    <div className="mt-1 text-xs text-purple-500">
                      Tỷ lệ câu trùng so với input
                    </div>
                  </div>
                </div>

                {/* High Duplication Warning */}
                {(() => {
                  const dtotalPercentage = Math.round((results.dtotalRaw / results.totalInputSentences) * 100) || 0;
                  if (dtotalPercentage >= thresholds.highDuplicationThreshold) {
                    return (
                      <div className="p-4 border border-red-200 rounded-xl bg-red-50">
                        <div className="flex items-center">
                          <span className="mr-2 text-red-500">⚠️</span>
                          <div>
                            <h4 className="font-semibold text-red-800">Phát hiện trùng lặp cao</h4>
                            <p className="text-sm text-red-700">
                              Tỷ lệ trùng lặp ({dtotalPercentage}%) vượt ngưỡng cảnh báo ({thresholds.highDuplicationThreshold}%). 
                              Vui lòng xem xét kỹ nội dung và nguồn tham khảo.
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}

                {/* Comparison Buttons */}
                <div className="flex gap-3">
                  {results?.checkId && (
                    <Link
                      to={`/detailed-comparison/${results.checkId}`}
                      className="flex items-center px-4 py-2 text-sm font-medium text-white transition-all duration-200 bg-green-600 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      <span className="mr-2">📄</span>
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
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 border border-neutral-200 rounded-xl bg-neutral-50">
              <div className="mb-2 text-2xl">📝</div>
              <h4 className="mb-2 font-medium text-neutral-800">
                Bước 1: Nhập văn bản
              </h4>
              <p className="text-sm text-neutral-600">
                Nhập hoặc dán văn bản cần kiểm tra trùng lặp vào ô textarea,
                hoặc chọn từ tài liệu đã upload
              </p>
            </div>

            <div className="p-4 border border-neutral-200 rounded-xl bg-neutral-50">
              <div className="mb-2 text-2xl">🔍</div>
              <h4 className="mb-2 font-medium text-neutral-800">
                Bước 2: Kiểm tra
              </h4>
              <p className="text-sm text-neutral-600">
                Nhấn nút "Kiểm tra ngay" để phân tích trùng lặp với cơ sở dữ
                liệu documents
              </p>
            </div>

            <div className="p-4 border border-neutral-200 rounded-xl bg-neutral-50">
              <div className="mb-2 text-2xl">📊</div>
              <h4 className="mb-2 font-medium text-neutral-800">
                Bước 3: Xem kết quả
              </h4>
              <p className="text-sm text-neutral-600">
                Xem tỷ lệ trùng lặp và các nguồn tương tự được tìm thấy trong hệ
                thống
              </p>
            </div>
          </div>
        </div>

        {/* Document Selector Modal */}
        {showDocumentSelector && (
          <DocumentSelectorModal
            documents={userDocuments}
            onClose={() => setShowDocumentSelector(false)}
            onSelect={handleDocumentSelect}
            loading={loadingDocuments}
          />
        )}
      </div>
    </div>
  );
};

// Document Selector Modal Component
const DocumentSelectorModal = ({ documents, onClose, onSelect, loading }) => {
  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  };

  const getFileIcon = (fileType) => {
    switch (fileType) {
      case "pdf":
        return "📄";
      case "docx":
      case "doc":
        return "📝";
      case "txt":
        return "📃";
      case "xlsx":
      case "xls":
        return "📊";
      case "pptx":
      case "ppt":
        return "📊";
      default:
        return "📁";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="w-full max-w-4xl bg-white rounded-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-neutral-900">
              Chọn tài liệu đã upload
            </h2>
            <button
              onClick={onClose}
              className="text-neutral-400 hover:text-neutral-600"
            >
              ✕
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 border-b-2 rounded-full border-primary-500 animate-spin"></div>
                <span className="text-neutral-600">Đang tải...</span>
              </div>
            </div>
          ) : documents.length === 0 ? (
            <div className="py-12 text-center">
              <div className="mb-4 text-4xl">📄</div>
              <p className="mb-4 text-neutral-600">
                Bạn chưa có tài liệu nào đã upload
              </p>
              <button
                onClick={onClose}
                className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                Đóng
              </button>
            </div>
          ) : (
            <div>
              <div className="grid gap-3">
                {documents.map((document) => (
                  <div
                    key={document._id}
                    onClick={() => onSelect(document._id)}
                    className="flex items-center p-4 transition-colors border cursor-pointer border-neutral-200 rounded-xl hover:bg-neutral-50"
                  >
                    <div className="mr-4 text-2xl">
                      {getFileIcon(document.fileType)}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-neutral-900">
                        {document.title}
                      </div>
                      <div className="text-sm text-neutral-500">
                        {document.fileName} •{" "}
                        {formatFileSize(document.fileSize)}
                      </div>
                      <div className="text-xs text-neutral-400">
                        Upload: {formatDate(document.uploadedAt)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-blue-600">
                        Chọn
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end mt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium border rounded-lg text-neutral-700 border-neutral-300 hover:bg-neutral-50"
            >
              Hủy
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TextChecker;
