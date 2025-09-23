import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  getDetailedAllDocumentsComparison,
  checkDocumentSimilarity,
} from "../services/api";

const AllDocumentsComparison = () => {
  const { checkId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sortBy, setSortBy] = useState("duplicateRate"); // duplicateRate, fileName, uploadedAt
  const [sortOrder, setSortOrder] = useState("desc"); // asc, desc
  const [filterStatus, setFilterStatus] = useState("all"); // all, high, medium, low
  const [latestComparisonResult, setLatestComparisonResult] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await getDetailedAllDocumentsComparison(checkId);
        console.log("Detailed all documents comparison response:", response);
        setData(response);

        // Gọi lại API so sánh để lấy tỷ lệ trùng lặp mới nhất từ cây
        if (response?.currentDocument?.originalText) {
          try {
            const latestResult = await checkDocumentSimilarity(
              response.currentDocument.originalText,
              { sensitivity: "medium", language: "vi" },
              response.currentDocument.fileName,
              response.currentDocument.fileType
            );
            console.log("Latest comparison result:", latestResult);
            setLatestComparisonResult(latestResult);
          } catch (comparisonError) {
            console.error("Error getting latest comparison:", comparisonError);
            // Không set error vì đây chỉ là để cập nhật tỷ lệ, không phải lỗi chính
          }
        }
      } catch (error) {
        console.error(
          "Error fetching detailed all documents comparison:",
          error
        );
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
    const dateObj = new Date(date);
    const day = dateObj.getDate().toString().padStart(2, '0');
    const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
    const year = dateObj.getFullYear();
    const hours = dateObj.getHours().toString().padStart(2, '0');
    const minutes = dateObj.getMinutes().toString().padStart(2, '0');
    
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  };
  // Helper function để lấy tỷ lệ trùng lặp chính xác
  const getCurrentDocumentDuplicateRate = () => {
    // Ưu tiên kết quả mới nhất từ cây
    if (latestComparisonResult?.result?.duplicatePercentage !== undefined) {
      return latestComparisonResult.result.duplicatePercentage;
    }
    // Fallback về dữ liệu ban đầu
    return (
      data?.currentDocument?.duplicatePercentage ||
      data?.currentDocument?.duplicateRate ||
      0
    );
  };

  // Lấy danh sách documents từ kết quả mới nhất hoặc dữ liệu ban đầu
  const getMatchingDocuments = () => {
    const originalDocuments = data?.matchingDocuments || [];

    // Nếu có kết quả mới nhất từ cây, cập nhật tỷ lệ trùng lặp
    if (
      latestComparisonResult?.result?.sources &&
      latestComparisonResult.result.sources.length > 0
    ) {
      const latestSources = latestComparisonResult.result.sources;

      // Merge dữ liệu: giữ thông tin gốc từ originalDocuments, cập nhật tỷ lệ từ latestSources
      const mergedDocuments = originalDocuments.map((originalDoc) => {
        // Tìm document tương ứng trong kết quả mới (có thể match theo documentId, fileName, etc.)
        const matchingSource = latestSources.find(
          (source) =>
            source.documentId === originalDoc.documentId ||
            source.fileName === originalDoc.fileName ||
            source.id === originalDoc.id
        );

        if (matchingSource) {
          const newDuplicateRate =
            matchingSource.duplicatePercentage ||
            matchingSource.duplicateRate ||
            originalDoc.duplicatePercentage ||
            originalDoc.duplicateRate ||
            0;
          return {
            ...originalDoc,
            duplicatePercentage: newDuplicateRate,
            duplicateRate: newDuplicateRate,
            status:
              newDuplicateRate >= 50
                ? "high"
                : newDuplicateRate >= 25
                ? "medium"
                : "low",
            // Đánh dấu là đã được cập nhật từ cây
            updatedFromTree: true,
          };
        }

        return originalDoc;
      });

      // Thêm các documents mới từ latestSources nếu không có trong originalDocuments
      const newDocuments = latestSources
        .filter((source) => {
          return !originalDocuments.some(
            (originalDoc) =>
              source.documentId === originalDoc.documentId ||
              source.fileName === originalDoc.fileName ||
              source.id === originalDoc.id
          );
        })
        .map((source) => {
          const duplicateRate =
            source.duplicatePercentage || source.duplicateRate || 0;
          return {
            ...source,
            duplicatePercentage: duplicateRate,
            duplicateRate: duplicateRate,
            status:
              duplicateRate >= 50
                ? "high"
                : duplicateRate >= 25
                ? "medium"
                : "low",
            // Đảm bảo có các fields cần thiết với giá trị mặc định
            fileSize: source.fileSize || 0,
            fileType: source.fileType || "Unknown",
            author: source.author || "Unknown",
            uploadedAt:
              source.uploadedAt || source.createdAt || new Date().toISOString(),
            updatedFromTree: true,
            isNewFromTree: true,
          };
        });

      return [...mergedDocuments, ...newDocuments];
    }

    // Fallback về dữ liệu ban đầu
    return originalDocuments;
  };

  const sortedAndFilteredDocuments =
    getMatchingDocuments().length > 0
      ? getMatchingDocuments()
          .filter(
            (doc) => filterStatus === "all" || doc.status === filterStatus
          )
          .sort((a, b) => {
            let aValue, bValue;

            if (sortBy === "duplicateRate") {
              // Use duplicatePercentage if available, fallback to duplicateRate
              aValue = a.duplicatePercentage || a.duplicateRate || 0;
              bValue = b.duplicatePercentage || b.duplicateRate || 0;
            } else {
              aValue = a[sortBy];
              bValue = b[sortBy];
            }

            if (sortBy === "uploadedAt") {
              aValue = new Date(aValue);
              bValue = new Date(bValue);
            }

            if (sortOrder === "asc") {
              return aValue > bValue ? 1 : -1;
            } else {
              return aValue < bValue ? 1 : -1;
            }
          })
      : [];

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

  if (!data || !data.currentDocument) {
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

  function getCurrentHighlightedText() {
    const originalText = data?.currentDocument?.originalText || "";
    const sources = latestComparisonResult?.result?.matches || [];

    if (!originalText || sources.length === 0) return originalText;

    const highlightColors = [
      { bg: "bg-red-200", text: "text-red-900", border: "border-red-400" },
      {
        bg: "bg-orange-200",
        text: "text-orange-900",
        border: "border-orange-400",
      },
      {
        bg: "bg-yellow-200",
        text: "text-yellow-900",
        border: "border-yellow-400",
      },
      {
        bg: "bg-green-200",
        text: "text-green-900",
        border: "border-green-400",
      },
      { bg: "bg-blue-200", text: "text-blue-900", border: "border-blue-400" },
      {
        bg: "bg-indigo-200",
        text: "text-indigo-900",
        border: "border-indigo-400",
      },
      {
        bg: "bg-purple-200",
        text: "text-purple-900",
        border: "border-purple-400",
      },
      { bg: "bg-pink-200", text: "text-pink-900", border: "border-pink-400" },
      { bg: "bg-cyan-200", text: "text-cyan-900", border: "border-cyan-400" },
      { bg: "bg-teal-200", text: "text-teal-900", border: "border-teal-400" },
    ];

    // Gom các match theo câu
    const sentenceMap = new Map();

    sources.forEach((source, index) => {
      console.log("Checking source:", source);
      const color = highlightColors[index % highlightColors.length];

      source.duplicateSentencesDetails?.forEach((detail) => {
        const sentence = detail.inputSentence;

        if (!sentenceMap.has(sentence)) {
          sentenceMap.set(sentence, {
            color,
            sources: [],
          });
        }

        sentenceMap.get(sentence).sources.push({
          source: source.source,
          similarity: detail.similarity,
          url: source.url,
        });
      });
    });

    // Tạo danh sách các matches với vị trí cụ thể trong originalText
    const matches = [];

    for (const [sentence, { color, sources }] of sentenceMap.entries()) {
      const start = originalText.indexOf(sentence);
      if (start !== -1) {
        const end = start + sentence.length;
        const tooltip = sources
          .map((s) => `• ${s.source} (${s.similarity}%)`)
          .join("\n\n");
        matches.push({ start, end, sentence, color, tooltip });
      }
    }

    // Sắp xếp theo vị trí để giữ thứ tự đúng
    matches.sort((a, b) => a.start - b.start);

    const result = [];
    let lastIndex = 0;

    matches.forEach((match) => {
      const { start, end, sentence, color, tooltip } = match;

      if (start < lastIndex) return; // tránh highlight chồng lặp

      result.push(originalText.slice(lastIndex, start));

      result.push(
        `<span 
        class="group px-1 border ${color.bg} ${color.text} ${
          color.border
        } rounded cursor-help"
        title="${tooltip.replace(/"/g, "&quot;")}"
      >${sentence}</span>`
      );

      lastIndex = end;
    });

    result.push(originalText.slice(lastIndex));

    return result.join("");
  }

  function hasHighlightedText() {
    const sources = latestComparisonResult?.result?.sources || [];
    const matches = latestComparisonResult?.result?.matches || [];

    if (sources.length === 0 && matches.length === 0) {
      // Fallback: Nếu có tỷ lệ trùng lặp > 10% thì cũng coi như có highlight
      return getCurrentDocumentDuplicateRate() > 10;
    }

    // Kiểm tra nhiều cách khác nhau để tìm dữ liệu highlight
    const sourcesToCheck = [...sources, ...matches];
    const hasDetailedHighlight = sourcesToCheck.some((source) => {
      return (
        // Cách 1: duplicateSentencesDetails
        (source.duplicateSentencesDetails &&
          source.duplicateSentencesDetails.length > 0) ||
        // Cách 2: duplicateSentences
        (source.duplicateSentences && source.duplicateSentences.length > 0) ||
        // Cách 3: matches
        (source.matches && source.matches.length > 0) ||
        // Cách 4: duplicateText hoặc matchedText
        source.duplicateText ||
        source.matchedText ||
        // Cách 5: content hoặc text
        source.content ||
        source.text ||
        // Cách 6: Kiểm tra có bất kỳ string property nào có thể là text
        Object.values(source).some(
          (value) =>
            typeof value === "string" &&
            value.length > 10 &&
            value.length < 1000
        )
      );
    });

    // Trả về true nếu có dữ liệu chi tiết hoặc tỷ lệ trùng lặp cao
    return hasDetailedHighlight || getCurrentDocumentDuplicateRate() > 10;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100">
      {/* Custom styles for highlighting */}
      <style jsx>{`
        .highlighted-text span[data-highlight-index] {
          border-radius: 4px;
          transition: all 0.3s ease;
          cursor: pointer;
          display: inline-block;
          position: relative;
        }

        .highlighted-text span[data-highlight-index]:hover {
          transform: scale(1.05);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          z-index: 20;
          position: relative;
        }

        /* Tooltip styles */
        .highlighted-text span[data-highlight-index]:hover::after {
          content: attr(title);
          position: absolute;
          bottom: 100%;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(0, 0, 0, 0.9);
          color: white;
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 12px;
          white-space: pre-line;
          z-index: 30;
          max-width: 300px;
          text-align: center;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
          animation: tooltipFadeIn 0.2s ease-in-out;
        }

        .highlighted-text span[data-highlight-index]:hover::before {
          content: "";
          position: absolute;
          bottom: 100%;
          left: 50%;
          transform: translateX(-50%) translateY(2px);
          border: 6px solid transparent;
          border-top-color: rgba(0, 0, 0, 0.9);
          z-index: 30;
        }

        @keyframes tooltipFadeIn {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(5px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }

        /* Pulse animation for newly highlighted text */
        .highlighted-text span[data-highlight-index] {
          animation: highlightPulse 2s ease-in-out;
        }

        @keyframes highlightPulse {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.8;
          }
        }

        /* Styles for multiple sources */
        .highlighted-text span[data-source-count="2"] {
          border-style: dashed;
          border-width: 3px;
        }

        .highlighted-text span[data-source-count="3"] {
          border-style: dotted;
          border-width: 3px;
        }

        .highlighted-text span[data-source-count]:not([data-source-count="1"]) {
          box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.8);
        }

        /* Badge styles for source count */
        .highlighted-text span sup {
          font-size: 10px;
          font-weight: bold;
          line-height: 1;
          min-width: 16px;
          height: 16px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(0, 0, 0, 0.1);
        }

        /* Enhanced hover effect for multiple sources */
        .highlighted-text
          span[data-source-count]:not([data-source-count="1"]):hover {
          transform: scale(1.08);
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
        }
      `}</style>
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
                  <span className="text-3xl">📊</span>
                </div>
                <h1 className="text-3xl font-bold text-neutral-800">
                  So sánh với toàn bộ database
                </h1>
              </div>
            </div>
          </div>
          <p className="text-neutral-600">
            Chào mừng{" "}
            <span className="font-semibold text-primary-600">{user?.name}</span>
            ! Danh sách tất cả documents có trùng lặp với document của bạn.
          </p>
        </div>

        {/* Current Document Info */}
        <div className="p-6 mb-8 bg-white shadow-xl rounded-2xl">
          <h2 className="flex items-center mb-4 text-xl font-semibold text-neutral-800">
            <span className="mr-2">📄</span>
            Document của bạn
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="p-4 border border-neutral-200 rounded-xl bg-neutral-50">
              <div className="text-2xl font-bold text-primary-600">
                {data.currentDocument.fileName}
              </div>
              <div className="text-sm text-neutral-600">Tên file</div>
            </div>
            <div className="p-4 border border-neutral-200 rounded-xl bg-neutral-50">
              <div className="text-2xl font-bold text-primary-600">
                {formatFileSize(data.currentDocument.fileSize)}
              </div>
              <div className="text-sm text-neutral-600">Kích thước</div>
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid gap-6 mb-8 md:grid-cols-3">
          ``
          <div className="p-6 bg-white shadow-xl rounded-2xl">
            <div className="flex items-center">
              <div className="p-3 mr-4 bg-blue-100 rounded-full">
                <span className="text-2xl">📊</span>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {latestComparisonResult?.result?.totalMatches ||
                    data?.displayedMatches ||
                    data?.totalMatches ||
                    0}
                  {(latestComparisonResult?.result?.hasMoreMatches ||
                    data?.hasMoreMatches) && (
                    <span className="text-sm text-neutral-500">
                      /
                      {latestComparisonResult?.result?.totalDocumentsInSystem ||
                        data?.totalMatches}
                    </span>
                  )}
                </div>
                <div className="text-sm text-neutral-600">
                  Documents trùng lặp
                  {(latestComparisonResult?.result?.hasMoreMatches ||
                    data?.hasMoreMatches) && (
                    <div className="text-xs text-orange-600">
                      Hiển thị top matches
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Warning for too many matches */}
        {data.hasMoreMatches && (
          <div className="p-4 mb-6 border-l-4 border-orange-500 rounded-r-lg bg-orange-50">
            <div className="flex items-center">
              <div className="mr-3 text-orange-500">
                <span className="text-xl">⚠️</span>
              </div>
              <div>
                <h4 className="font-semibold text-orange-800">
                  Có quá nhiều documents trùng lặp
                </h4>
                <p className="text-sm text-orange-700">
                  Tìm thấy {data.totalMatches} documents trùng lặp, chỉ hiển thị
                  top 10 documents có tỷ lệ trùng lặp cao nhất.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Detailed Comparison View */}
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Left Side - Original Text with Highlights */}
          <div className="lg:col-span-2">
            <div className="p-6 bg-white shadow-xl rounded-2xl">
              <h2 className="flex items-center mb-6 text-xl font-semibold text-neutral-800">
                <span className="mr-2">📝</span>
                Nội dung văn bản cần kiểm tra
              </h2>

              {/* Legend cho các màu highlight */}
              {hasHighlightedText() &&
                ((latestComparisonResult?.result?.sources &&
                  latestComparisonResult.result.sources.length > 0) ||
                  (latestComparisonResult?.result?.matches &&
                    latestComparisonResult.result.matches.length > 0)) && (
                  <div className="p-4 mb-4 border rounded-lg border-neutral-200 bg-neutral-50">
                    <div className="text-xs text-neutral-600">
                      💡 <strong>Mẹo:</strong> Di chuột qua các đoạn text được
                      tô màu để xem chi tiết tỷ lệ trùng lặp
                    </div>
                  </div>
                )}

              {data?.currentDocument?.originalText && (
                <div className="p-4 border rounded-lg border-neutral-200 bg-neutral-50">
                  <div
                      className="text-sm leading-relaxed whitespace-pre-wrap highlighted-text text-neutral-800"
                      dangerouslySetInnerHTML={{
                        __html: getCurrentHighlightedText(),
                      }}
                      style={{ lineHeight: "1.8" }}
                    />
                </div>
              )}
            </div>
          </div>

          {/* Right Side - Matching Documents List */}
          <div className="lg:col-span-1">
            <div className="p-6 bg-white shadow-xl rounded-2xl">
              <h2 className="flex items-center mb-6 text-xl font-semibold text-neutral-800">
                <span className="mr-2">📋</span>
                Documents trùng lặp ({sortedAndFilteredDocuments.length})
              </h2>

              {sortedAndFilteredDocuments.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="mb-4 text-4xl">📄</div>
                  <p className="text-neutral-600">
                    {data?.matchingDocuments?.length > 0
                      ? `Không có documents nào phù hợp với bộ lọc "${filterStatus}"`
                      : "Không tìm thấy documents trùng lặp"}
                  </p>
                  {data?.matchingDocuments?.length > 0 && (
                    <button
                      onClick={() => setFilterStatus("all")}
                      className="px-4 py-2 mt-3 text-sm text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50"
                    >
                      Hiển thị tất cả
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {sortedAndFilteredDocuments.map((doc, index) => {
                    const colors = [
                      "#ef4444",
                      "#f97316",
                      "#eab308",
                      "#22c55e",
                      "#06b6d4",
                      "#3b82f6",
                      "#8b5cf6",
                      "#ec4899",
                      "#f43f5e",
                      "#84cc16",
                    ];
                    const color = colors[index % colors.length];

                    return (
                      <div
                        key={doc.id}
                        className="p-4 transition-shadow border rounded-lg border-neutral-200 hover:shadow-md"
                        style={{
                          borderLeftColor: color,
                          borderLeftWidth: "4px",
                        }}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center mb-2">
                              <span className="mr-2 text-lg">📄</span>
                              <h3
                                className="font-medium truncate text-neutral-800"
                                title={doc.fileName}
                              >
                                {doc.fileName}
                              </h3>

                              {doc.isNewFromTree && (
                                <span className="ml-1 px-1.5 py-0.5 text-xs text-blue-600 bg-blue-100 rounded-full">
                                  Mới
                                </span>
                              )}
                            </div>

                            {/* Hiển thị tỷ lệ trùng lặp */}
                            <div className="mb-2">
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-neutral-600">
                                  Tỷ lệ trùng lặp:
                                </span>
                                <span
                                  className={`text-sm font-bold ${
                                    (doc.duplicatePercentage ||
                                      doc.duplicateRate ||
                                      0) >= 50
                                      ? "text-red-600"
                                      : (doc.duplicatePercentage ||
                                          doc.duplicateRate ||
                                          0) >= 25
                                      ? "text-orange-600"
                                      : "text-green-600"
                                  }`}
                                >
                                  {(
                                    doc.duplicatePercentage ||
                                    doc.duplicateRate ||
                                    0
                                  ).toFixed(1)}
                                  %
                                </span>
                              </div>
                              <div className="w-full h-2 mt-1 bg-gray-200 rounded-full">
                                <div
                                  className={`h-2 rounded-full ${
                                    (doc.duplicatePercentage ||
                                      doc.duplicateRate ||
                                      0) >= 50
                                      ? "bg-red-500"
                                      : (doc.duplicatePercentage ||
                                          doc.duplicateRate ||
                                          0) >= 25
                                      ? "bg-orange-500"
                                      : "bg-green-500"
                                  }`}
                                  style={{
                                    width: `${Math.min(
                                      doc.duplicatePercentage ||
                                        doc.duplicateRate ||
                                        0,
                                      100
                                    )}%`,
                                  }}
                                ></div>
                              </div>
                            </div>

                            <div className="space-y-1 text-xs text-neutral-600">
                              <div>
                                Kích thước: {formatFileSize(doc.fileSize)}
                              </div>
                              <div>Loại: {doc.fileType}</div>
                              <div>Ngày: {formatDate(doc.uploadedAt)}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AllDocumentsComparison;
