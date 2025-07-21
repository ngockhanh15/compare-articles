import { useState, useRef, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import {
  extractTextFromFile,
  uploadFileForCheck,
  checkTextContent,
  checkDocumentSimilarity,
  getUserDocuments,
  getDocumentText,
  getTreeStats,
  getDetailedComparison,
  getDocumentStats,
} from "../services/api";
import { Link } from "react-router-dom";

const TextChecker = () => {
  const { user } = useAuth();
  const [inputText, setInputText] = useState("");
  const [results, setResults] = useState(null);
  const [isChecking, setIsChecking] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);
  const [userDocuments, setUserDocuments] = useState([]);
  const [showDocumentSelector, setShowDocumentSelector] = useState(false);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [checkOptions, setCheckOptions] = useState({
    sensitivity: "medium",
    language: "vi",
  });
  const [treeStats, setTreeStats] = useState(null);
  const [userStats, setUserStats] = useState(null);
  // Thêm vào phần khai báo state
  const [detailedStats, setDetailedStats] = useState({
    totalSentencesWithInputWords: 0,
    maxDuplicateSentences: 0,
    documentWithMostDuplicates: null,
    totalDuplicateSentences: 0,
    totalUniqueWordPairs: 0,
    totalUniqueWords: 0,
  });

  useEffect(() => {
    loadUserDocuments();
    loadTreeStats();
    loadUserStats();
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

  const loadUserStats = async () => {
    try {
      const response = await getDocumentStats();
      if (response.success) {
        setUserStats(response.stats);
      }
    } catch (error) {
      console.error("Error loading user stats:", error);
    }
  };

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
      setIsUploading(true);

      const response = await getDocumentText(documentId);

      if (response.success) {
        setInputText(response.extractedText);
        setSelectedFile(null); // Clear any selected file
        setResults(null); // Clear previous results
        setShowDocumentSelector(false);
      }
    } catch (error) {
      setError("Không thể lấy nội dung tài liệu: " + error.message);
    } finally {
      setIsUploading(false);
    }
  };

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
    setInputText(""); // Xóa text đã nhập
    setResults(null); // Xóa kết quả cũ
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setError("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleInputChange = (e) => {
    setInputText(e.target.value);
    // Clear error when user starts typing
    if (error) setError("");
  };

  const handleCheck = async () => {
    setError("");
    let textToCheck = "";

    // Validate input
    if (!selectedFile && !inputText.trim()) {
      setError("Vui lòng nhập văn bản hoặc chọn file cần kiểm tra");
      return;
    }

    setIsChecking(true);

    try {
      let similarityResult;

      if (selectedFile) {
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
        similarityResult = await checkDocumentSimilarity(
          textToCheck,
          checkOptions,
          selectedFile.name,
          selectedFile.type
        );
      } else {
        textToCheck = inputText.trim();

        // Check document similarity with input text
        similarityResult = await checkDocumentSimilarity(
          textToCheck,
          checkOptions
        );
      }

      // Extract data from document similarity API response
      let realData = null;
      try {
        realData = await getDetailedComparison(similarityResult.checkId);
      } catch (detailError) {
        console.warn("Could not get detailed comparison:", detailError);
        // Continue without detailed data
        realData = { overallSimilarity: 0 };
      }

      const result = similarityResult.result;
      const wordCount = result.wordCount || 0;
      const charCount = result.textLength || 0;

      setDetailedStats({
        totalSentencesWithInputWords: result.totalSentencesWithInputWords || 0,
        maxDuplicateSentences: result.maxDuplicateSentences || 0,
        documentWithMostDuplicates: result.documentWithMostDuplicates || null,
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
        if (match.text) {
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

      // Tính tỷ lệ phần trăm câu trùng so với tổng số câu trong văn bản kiểm tra
      const dtotalPercentage = duplicateSentencesCount;

      console.log("Detailed comparison data:", treeStats);

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
        // Thông tin mới từ DocumentAVLService
        processingTime: result.processingTime || 0,
        totalMatches: result.totalMatches || 0,
        checkedDocuments: result.checkedDocuments || 0,
        totalDocumentsInSystem: result.totalDocumentsInSystem || 0,
        // Thông tin tỷ lệ trùng lặp mới
        dtotal: result.dtotal, // Tỷ lệ phần trăm câu trùng so với tổng số câu trong văn bản kiểm tra
        dtotalRaw: duplicateSentencesCount, // Số câu trùng thực tế
        totalSentences: totalSentencesInText, // Tổng số câu trong văn bản kiểm tra
        dab: result.dab || 0, // Tổng câu trùng không lặp lại so với Document B nào đó
        mostSimilarDocument: result.mostSimilarDocument || null, // Thông tin document giống nhất
        // Tree stats info
        treeStats: treeStats,
        totalSentencesWithInputWords: result.totalSentencesWithInputWords || 0,
        maxDuplicateSentences: result.maxDuplicateSentences || 0,
        documentWithMostDuplicates: result.documentWithMostDuplicates || null,
        totalDuplicateSentences: result.totalDuplicateSentences || 0,
        totalUniqueWordPairs: result.totalUniqueWordPairs || 0,
        totalUniqueWords: result.totalUniqueWords || 0,
        // Thông tin về loại kiểm tra
        checkType: "document-based",
      });
    } catch (error) {
      console.error("Document similarity check error:", error);
      setError(
        error.message || "Đã xảy ra lỗi khi kiểm tra trùng lặp với documents"
      );
      setIsUploading(false);
    }

    setIsChecking(false);
  };

  const handleClear = () => {
    setInputText("");
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
              Nhập văn bản cần kiểm tra
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

            {/* Text Input or File Info */}
            {!selectedFile ? (
              <>
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
                      {inputText.trim()
                        ? inputText.trim().split(/\s+/).length
                        : 0}{" "}
                      từ
                    </div>
                    {userDocuments.length > 0 && (
                      <button
                        onClick={() => setShowDocumentSelector(true)}
                        disabled={isUploading}
                        className="px-3 py-1 text-xs font-medium text-blue-600 transition-colors bg-blue-100 rounded-lg hover:bg-blue-200 disabled:opacity-50"
                      >
                        📄 Chọn từ tài liệu đã upload
                      </button>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-64 border-2 border-dashed bg-neutral-50 border-neutral-300 rounded-xl">
                <div className="text-center">
                  <div className="mb-3 text-4xl">📄</div>
                  <p className="font-medium text-neutral-700">
                    File đã được chọn
                  </p>
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
                className="px-4 py-2 text-sm font-medium transition-all duration-200 bg-white border rounded-lg text-neutral-700 border-neutral-300 hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-neutral-500 disabled:opacity-50 disabled:cursor-not-allowed"
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
                    {isUploading ? "Đang tải file..." : "Đang kiểm tra..."}
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

                  {/* Thêm vào phần hiển thị kết quả */}
                  {results && (
                    <div className="p-6 mt-6 mb-3 bg-white shadow-lg rounded-xl">
                      <h3 className="mb-4 text-xl font-semibold text-neutral-800">
                        Thống kê chi tiết
                      </h3>

                      {/* Thông tin về tài liệu trùng lặp nhiều nhất */}
                      {results.documentWithMostDuplicates && (
                        <div className="p-4 mt-4 rounded-lg bg-green-50">
                          <h4 className="mb-2 font-medium text-green-800">
                            Tài liệu trùng lặp nhiều nhất
                          </h4>
                          <p className="text-sm text-neutral-600">
                            Tài liệu có ID:{" "}
                            <span className="font-medium">
                              {results.documentWithMostDuplicates}
                            </span>{" "}
                            có
                            <span className="font-medium">
                              {" "}
                              {results.maxDuplicateSentences}
                            </span>{" "}
                            câu trùng lặp với văn bản của bạn.
                          </p>
                          <button
                            className="px-3 py-1 mt-2 text-xs font-medium text-green-700 transition-colors bg-green-100 rounded hover:bg-green-200"
                            onClick={() => {
                              // Thêm logic để xem chi tiết tài liệu này nếu cần
                              console.log(
                                "Xem chi tiết tài liệu:",
                                results.documentWithMostDuplicates
                              );
                            }}
                          >
                            Xem chi tiết
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Hiển thị chi tiết các câu trùng lặp */}
                  {results && results.matches && results.matches.length > 0 && (
                    <div className="p-6 mt-6 bg-white shadow-lg rounded-xl">
                      <h3 className="mb-4 text-xl font-semibold text-neutral-800">
                        Chi tiết câu trùng lặp
                      </h3>

                      <div className="space-y-4">
                        {results.matches.map((match, index) => (
                          <div
                            key={index}
                            className="overflow-hidden border rounded-lg border-neutral-200"
                          >
                            <div className="flex items-center justify-between p-3 bg-neutral-100">
                              <div>
                                <span className="font-medium text-neutral-700">
                                  {match.source}
                                </span>
                                <span className="ml-2 text-sm text-neutral-500">
                                  ({match.similarity}% trùng lặp)
                                </span>
                              </div>
                              <div className="text-sm text-neutral-500">
                                {match.duplicateSentences || 0} câu trùng lặp
                              </div>
                            </div>

                            {/* Chi tiết các câu trùng lặp */}
                            {match.duplicateSentencesDetails &&
                              match.duplicateSentencesDetails.length > 0 && (
                                <div className="p-3 space-y-3">
                                  {match.duplicateSentencesDetails.map(
                                    (sentenceDetail, idx) => (
                                      <div
                                        key={idx}
                                        className="py-1 pl-3 text-sm border-l-4 border-amber-400"
                                      >
                                        <div className="mb-1 font-medium text-neutral-700">
                                          Câu trùng lặp (
                                          {Math.round(
                                            sentenceDetail.duplicateRatio
                                          )}
                                          %):
                                        </div>
                                        <div className="text-neutral-600">
                                          {sentenceDetail.sentence}
                                        </div>
                                        <div className="mt-1 text-xs text-neutral-500">
                                          {sentenceDetail.matchedWords.length}{" "}
                                          từ trùng /{" "}
                                          {sentenceDetail.totalWordPairs} cặp từ
                                        </div>
                                      </div>
                                    )
                                  )}

                                  {match.duplicateSentences >
                                    match.duplicateSentencesDetails.length && (
                                    <div className="text-xs italic text-neutral-500">
                                      ... và{" "}
                                      {match.duplicateSentences -
                                        match.duplicateSentencesDetails
                                          .length}{" "}
                                      câu trùng lặp khác
                                    </div>
                                  )}
                                </div>
                              )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

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
                        So sánh với toàn bộ documents
                      </Link>
                    ) : (
                      <button
                        disabled
                        className="flex items-center px-4 py-2 text-sm font-medium text-gray-400 transition-all duration-200 bg-white border border-gray-300 rounded-lg opacity-50 cursor-not-allowed"
                      >
                        <span className="mr-2">📊</span>
                        So sánh với toàn bộ documents
                      </button>
                    )}
                  </div>
                </div>

                {/* Statistics */}
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
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
                    <div className="text-2xl font-bold text-blue-600">
                      {treeStats.totalDocuments ? treeStats.totalDocuments : 0}
                    </div>
                    <div className="text-sm text-neutral-600">
                      Số document tìm kiếm
                    </div>
                  </div>

                  {/* Thông tin tỷ lệ trùng lặp mới */}
                  <div className="p-4 border border-purple-200 rounded-xl bg-purple-50">
                    <div className="text-2xl font-bold text-purple-600">
                      {results.totalDuplicateSentences || 0}
                    </div>
                    <div className="text-sm text-purple-600">Dtotal</div>
                    <div className="mt-1 text-xs text-purple-500">
                      Câu trùng với toàn CSDL
                    </div>
                  </div>

                  <div className="p-4 border border-orange-200 rounded-xl bg-orange-50">
                    <div className="text-2xl font-bold text-orange-600">
                      {results.maxDuplicateSentences}
                    </div>
                    <div className="text-sm text-orange-600">DA/B</div>
                    <div className="mt-1 text-xs text-orange-500">
                      Câu trùng với Doc giống nhất
                    </div>
                  </div>
                </div>

                {/* Thông tin Document giống nhất */}
                {results.mostSimilarDocument && (
                  <div className="p-4 border border-orange-200 rounded-xl bg-orange-50">
                    <h4 className="flex items-center mb-3 font-semibold text-orange-800">
                      <span className="mr-2">🎯</span>
                      Document giống nhất (DA/B)
                    </h4>
                    <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
                      <div>
                        <span className="font-medium text-orange-700">
                          Tên document:
                        </span>
                        <p className="mt-1 text-orange-600">
                          {results.mostSimilarDocument.name || "Không xác định"}
                        </p>
                      </div>
                      <div>
                        <span className="font-medium text-orange-700">
                          ID Document:
                        </span>
                        <p className="mt-1 text-xs text-orange-600">
                          {results.mostSimilarDocument.id || "N/A"}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Phrase Analysis (New) */}
                {results.matches &&
                  results.matches.some(
                    (match) => match.method === "phrase-based"
                  ) && (
                    <div className="p-4 border border-purple-200 rounded-xl bg-purple-50">
                      <h4 className="flex items-center mb-3 font-semibold text-purple-800">
                        <span className="mr-2">🧩</span>
                        Phân tích cụm từ (Phrase-based Detection)
                      </h4>
                      <div className="space-y-3">
                        {results.matches
                          .filter((match) => match.method === "phrase-based")
                          .slice(0, 2)
                          .map((match, index) => (
                            <div
                              key={index}
                              className="p-3 bg-white border border-purple-200 rounded-lg"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-purple-700">
                                  Document {index + 1}
                                </span>
                                <span className="px-2 py-1 text-xs font-semibold text-purple-800 bg-purple-200 rounded-full">
                                  {match.similarity}% cụm từ trùng
                                </span>
                              </div>

                              {match.matchedPhrases &&
                                match.matchedPhrases.length > 0 && (
                                  <div className="mb-2">
                                    <span className="text-xs font-medium text-purple-700">
                                      Cụm từ trùng lặp:
                                    </span>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {match.matchedPhrases
                                        .slice(0, 8)
                                        .map((phrase, phraseIndex) => (
                                          <span
                                            key={phraseIndex}
                                            className="px-2 py-1 text-xs text-purple-700 bg-purple-100 border border-purple-300 rounded-md"
                                          >
                                            {phrase}
                                          </span>
                                        ))}
                                      {match.matchedPhrases.length > 8 && (
                                        <span className="px-2 py-1 text-xs text-purple-600">
                                          +{match.matchedPhrases.length - 8} cụm
                                          từ khác
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                )}

                              <div className="text-xs text-purple-600">
                                {match.details ||
                                  `${match.totalPhrases} cụm từ được phân tích`}
                              </div>

                              <p className="mt-2 text-sm text-purple-600 line-clamp-2">
                                {match.text}
                              </p>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                {/* Plagiarism Matches */}
                {results.matches && results.matches.length > 0 && (
                  <div>
                    <h4 className="mb-3 font-semibold text-neutral-800">
                      Documents tương tự được tìm thấy ({results.matches.length}{" "}
                      files):
                    </h4>
                    <div className="space-y-3">
                      {results.matches.map((match, index) => (
                        <div
                          key={index}
                          className="p-4 border border-orange-200 rounded-lg bg-orange-50"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="mr-2 text-orange-600">🔗</span>
                              <span className="font-medium text-orange-800">
                                {match.source}
                              </span>
                              {match.fileType && (
                                <span className="px-2 py-1 text-xs font-medium text-blue-700 bg-blue-200 rounded-full">
                                  {match.fileType.toUpperCase()}
                                </span>
                              )}
                              {match.fromCache && (
                                <span className="px-2 py-1 text-xs font-medium text-green-700 bg-green-200 rounded-full">
                                  Cache
                                </span>
                              )}
                              {match.method && (
                                <span
                                  className={`px-2 py-1 text-xs font-medium rounded-full ${
                                    match.method === "phrase-based"
                                      ? "text-purple-700 bg-purple-200"
                                      : match.method === "sentence-based"
                                      ? "text-blue-700 bg-blue-200"
                                      : "text-gray-700 bg-gray-200"
                                  }`}
                                >
                                  {match.method === "phrase-based"
                                    ? "🧩 Cụm từ"
                                    : match.method === "sentence-based"
                                    ? "📝 Câu"
                                    : match.method === "word-based"
                                    ? "🔤 Từ"
                                    : match.method}
                                </span>
                              )}
                            </div>
                            <span className="px-2 py-1 text-xs font-medium text-orange-700 bg-orange-200 rounded-full">
                              {match.similarity}% tương tự
                            </span>
                          </div>

                          {/* Thông tin thêm về match */}
                          {match.createdAt && (
                            <div className="mb-2 text-xs text-neutral-500">
                              📅 Ngày tạo:{" "}
                              {new Date(match.createdAt).toLocaleDateString(
                                "vi-VN"
                              )}
                            </div>
                          )}

                          <p className="mb-2 text-sm text-neutral-700">
                            "{match.text}"
                          </p>

                          {/* Hiển thị matched phrases nếu có */}
                          {match.matchedPhrases &&
                            match.matchedPhrases.length > 0 && (
                              <div className="mb-2">
                                <span className="text-xs font-medium text-orange-700">
                                  Cụm từ trùng lặp:
                                </span>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {match.matchedPhrases
                                    .slice(0, 6)
                                    .map((phrase, phraseIndex) => (
                                      <span
                                        key={phraseIndex}
                                        className="px-2 py-1 text-xs text-orange-700 bg-orange-100 border border-orange-300 rounded-md"
                                      >
                                        {phrase}
                                      </span>
                                    ))}
                                  {match.matchedPhrases.length > 6 && (
                                    <span className="px-2 py-1 text-xs text-orange-600">
                                      +{match.matchedPhrases.length - 6} cụm từ
                                      khác
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}

                          {/* Thông tin chi tiết về match */}
                          <div className="flex items-center justify-between pt-2 mt-2 text-xs border-t border-orange-300 text-neutral-600">
                            <div className="flex items-center gap-4">
                              <span>
                                📏 Độ dài: {match.text ? match.text.length : 0}{" "}
                                ký tự
                              </span>
                              {match.matchedWords && (
                                <span>📝 Từ khớp: {match.matchedWords} từ</span>
                              )}
                              {match.totalPhrases && (
                                <span>
                                  🧩 Cụm từ: {match.matchedPhrases?.length || 0}
                                  /{match.totalPhrases}
                                </span>
                              )}
                            </div>
                            {match.url && (
                              <a
                                href={match.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 hover:underline"
                              >
                                Xem nguồn gốc →
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
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
              <h4 className="mb-2 font-medium text-neutral-800">
                Cách 1: Nhập text
              </h4>
              <p className="text-sm text-neutral-600">
                Nhập hoặc dán văn bản cần kiểm tra trùng lặp vào ô textarea
              </p>
            </div>

            <div className="p-4 border border-neutral-200 rounded-xl bg-neutral-50">
              <div className="mb-2 text-2xl">📎</div>
              <h4 className="mb-2 font-medium text-neutral-800">
                Cách 2: Upload file
              </h4>
              <p className="text-sm text-neutral-600">
                Chọn file TXT, PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX để kiểm tra
                nội dung trùng lặp
              </p>
            </div>

            <div className="p-4 border border-neutral-200 rounded-xl bg-neutral-50">
              <div className="mb-2 text-2xl">🔍</div>
              <h4 className="mb-2 font-medium text-neutral-800">Bước 2</h4>
              <p className="text-sm text-neutral-600">
                Nhấn nút "Kiểm tra ngay" để phân tích trùng lặp với cơ sở dữ
                liệu
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
    return new Date(dateString).toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-4xl p-6 mx-4 bg-white rounded-2xl max-h-[80vh] overflow-hidden">
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
          <div className="overflow-y-auto max-h-96">
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
                      {document.fileName} • {formatFileSize(document.fileSize)}
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
  );
};

export default TextChecker;
