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
    return new Date(date).toLocaleString("vi-VN");
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "high":
        return "text-red-600 bg-red-100 border-red-200";
      case "medium":
        return "text-yellow-600 bg-yellow-100 border-yellow-200";
      case "low":
        return "text-green-600 bg-green-100 border-green-200";
      default:
        return "text-neutral-600 bg-neutral-100 border-neutral-200";
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "high":
        return "Cao";
      case "medium":
        return "Trung bình";
      case "low":
        return "Thấp";
      default:
        return "Không xác định";
    }
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

  // Helper function để lấy highlighted text chính xác
  const getCurrentHighlightedText = () => {
    // Ưu tiên kết quả mới nhất từ cây
    if (latestComparisonResult?.result?.highlightedText) {
      return latestComparisonResult.result.highlightedText;
    }
    // Fallback về dữ liệu ban đầu
    return data?.currentDocument?.highlightedText;
  };

  // Helper function để kiểm tra có highlighted text không
  const hasHighlightedText = () => {
    const highlightedText = getCurrentHighlightedText();
    return highlightedText && highlightedText.includes("<span");
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

  // Debug logging
  console.log("Full API response data:", data);
  console.log("Current document:", data?.currentDocument);
  console.log("Current document duplicate fields:", {
    duplicateRate: data?.currentDocument?.duplicateRate,
    duplicatePercentage: data?.currentDocument?.duplicatePercentage,
  });
  console.log("Latest comparison result:", latestComparisonResult);
  console.log(
    "Latest duplicate percentage:",
    latestComparisonResult?.result?.duplicatePercentage
  );
  console.log("Final duplicate rate used:", getCurrentDocumentDuplicateRate());
  console.log(
    "Original text length:",
    data?.currentDocument?.originalText?.length
  );
  console.log(
    "Highlighted text length:",
    data?.currentDocument?.highlightedText?.length
  );
  console.log(
    "Latest highlighted text length:",
    latestComparisonResult?.result?.highlightedText?.length
  );
  console.log("Has highlighted text:", hasHighlightedText());
  console.log(
    "Current highlighted text preview:",
    getCurrentHighlightedText()?.substring(0, 200) + "..."
  );
  console.log("Highlighted segments:", data?.highlightedSegments);
  console.log("Raw matching documents:", data?.matchingDocuments);
  console.log(
    "Latest sources from tree:",
    latestComparisonResult?.result?.sources
  );
  console.log(
    "Using latest documents:",
    latestComparisonResult?.result?.sources?.length > 0
  );
  console.log("Matching documents used:", getMatchingDocuments());
  console.log(
    "First matching document duplicate fields:",
    data?.matchingDocuments?.[0]
      ? {
          duplicateRate: data.matchingDocuments[0].duplicateRate,
          duplicatePercentage: data.matchingDocuments[0].duplicatePercentage,
        }
      : "No matching documents"
  );
  console.log("Filter status:", filterStatus);
  console.log("Sort by:", sortBy);
  console.log("Sort order:", sortOrder);
  console.log("Sorted and filtered documents:", sortedAndFilteredDocuments);

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100">
      {/* Custom styles for highlighting */}
      <style jsx>{`
        .highlighted-text span[data-document-id] {
          border-radius: 4px;
          transition: all 0.2s ease;
          cursor: pointer;
        }
        .highlighted-text span[data-document-id]:hover {
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
          <div className="grid gap-4 md:grid-cols-4">
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
            <div className="p-4 border border-neutral-200 rounded-xl bg-neutral-50">
              <div
                className={`text-2xl font-bold ${
                  getCurrentDocumentDuplicateRate() >= 50
                    ? "text-red-600"
                    : getCurrentDocumentDuplicateRate() >= 25
                    ? "text-yellow-600"
                    : "text-green-600"
                }`}
              >
                {getCurrentDocumentDuplicateRate()}%
              </div>
              <div className="text-sm text-neutral-600">Tỷ lệ trùng lặp</div>
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid gap-6 mb-8 md:grid-cols-3">
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

              {data?.currentDocument?.originalText ? (
                <div className="p-4 border rounded-lg border-neutral-200 bg-neutral-50">
                  {hasHighlightedText() ? (
                    // Hiển thị text với highlight
                    <div
                      className="text-sm leading-relaxed whitespace-pre-wrap highlighted-text text-neutral-800"
                      dangerouslySetInnerHTML={{
                        __html: getCurrentHighlightedText(),
                      }}
                      style={{
                        lineHeight: "1.8",
                      }}
                    />
                  ) : (
                    // Hiển thị text gốc với thông báo
                    <div>
                      <div className="text-sm leading-relaxed whitespace-pre-wrap text-neutral-800">
                        {data.currentDocument.originalText}
                      </div>
                      {(data?.matchingDocuments?.length > 0 ||
                        getCurrentDocumentDuplicateRate() > 0) && (
                        <div className="p-3 mt-4 border border-yellow-200 rounded-lg bg-yellow-50">
                          <div className="flex items-center">
                            <span className="mr-2 text-yellow-600">⚠️</span>
                            <div>
                              <h4 className="text-sm font-semibold text-yellow-800">
                                {latestComparisonResult
                                  ? "Đang xử lý highlight..."
                                  : "Chưa thể tô màu nội dung trùng lặp"}
                              </h4>
                              <p className="text-sm text-yellow-700">
                                {latestComparisonResult
                                  ? "Đã lấy được kết quả so sánh mới nhất từ cây, đang cập nhật highlight..."
                                  : `Tìm thấy ${
                                      data?.matchingDocuments?.length || 0
                                    } documents trùng lặp nhưng chưa thể highlight các đoạn text cụ thể.`}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Thông tin về highlighting */}
                  {hasHighlightedText() && (
                    <div className="p-3 mt-4 border border-blue-200 rounded-lg bg-blue-50">
                      <div className="flex items-center">
                        <span className="mr-2 text-blue-600">ℹ️</span>
                        <div>
                          <h4 className="text-sm font-semibold text-blue-800">
                            Thông tin highlighting
                          </h4>
                          <p className="text-sm text-blue-700">
                            {latestComparisonResult?.result?.matches?.length >
                            0 ? (
                              <>
                                Đã tô màu{" "}
                                <strong>
                                  {latestComparisonResult.result.matches.length}
                                </strong>{" "}
                                đoạn văn bản trùng lặp từ{" "}
                                <strong>
                                  {latestComparisonResult.result.totalMatches ||
                                    data?.matchingDocuments?.length ||
                                    0}
                                </strong>{" "}
                                documents.
                                <br />
                                <span className="text-xs">
                                  Kết quả được cập nhật từ cây so sánh mới nhất.
                                  Di chuột lên đoạn được tô màu để xem thông tin
                                  chi tiết.
                                </span>
                              </>
                            ) : data?.highlightedSegments?.length > 0 ? (
                              <>
                                Đã tô màu{" "}
                                <strong>
                                  {data.highlightedSegments.length}
                                </strong>{" "}
                                đoạn văn bản trùng lặp từ{" "}
                                <strong>{data.matchingDocuments.length}</strong>{" "}
                                documents.
                                <br />
                                <span className="text-xs">
                                  Các đoạn được tô màu có độ tương tự từ 5% trở
                                  lên. Di chuột lên đoạn được tô màu để xem
                                  thông tin chi tiết.
                                </span>
                              </>
                            ) : (
                              <>
                                Đã tô màu các từ khóa chung từ{" "}
                                <strong>
                                  {data?.matchingDocuments?.length || 0}
                                </strong>{" "}
                                documents trùng lặp.
                                <br />
                                <span className="text-xs">
                                  Các từ được tô màu là những từ khóa xuất hiện
                                  trong cả văn bản gốc và documents trùng lặp.
                                </span>
                              </>
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-12 text-center">
                  <div className="mb-4 text-4xl">📄</div>
                  <p className="text-neutral-600">
                    Không có nội dung để hiển thị
                  </p>
                  <div className="p-4 mt-4 text-left bg-gray-100 rounded-lg">
                    <h4 className="mb-2 font-semibold text-gray-800">
                      Debug Information:
                    </h4>
                    <div className="space-y-1 text-xs text-gray-600">
                      <div>Data exists: {data ? "Yes" : "No"}</div>
                      <div>
                        Current document exists:{" "}
                        {data?.currentDocument ? "Yes" : "No"}
                      </div>
                      <div>
                        Original text exists:{" "}
                        {data?.currentDocument?.originalText ? "Yes" : "No"}
                      </div>
                      <div>
                        Original text length:{" "}
                        {data?.currentDocument?.originalText?.length || 0}
                      </div>
                      <div>
                        Highlighted text exists:{" "}
                        {data?.currentDocument?.highlightedText ? "Yes" : "No"}
                      </div>
                      <div>
                        Highlighted text length:{" "}
                        {data?.currentDocument?.highlightedText?.length || 0}
                      </div>
                      <div>
                        Matching documents count:{" "}
                        {data?.matchingDocuments?.length || 0}
                      </div>
                      <div>
                        Highlighted segments count:{" "}
                        {data?.highlightedSegments?.length || 0}
                      </div>
                    </div>
                    <details className="mt-3">
                      <summary className="font-medium text-gray-700 cursor-pointer">
                        Raw Data
                      </summary>
                      <pre className="p-2 mt-2 overflow-auto text-xs bg-white border rounded max-h-40">
                        {JSON.stringify(data?.currentDocument || {}, null, 2)}
                      </pre>
                    </details>
                  </div>
                </div>
              )}

              {/* Legend for colors */}
              {data?.currentDocument?.highlightedText?.includes("<span") && (
                <div className="mt-6">
                  <h3 className="mb-3 text-sm font-semibold text-neutral-700">
                    Chú thích màu sắc:
                  </h3>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {data?.highlightedSegments &&
                    data.highlightedSegments.length > 0
                      ? // Hiển thị legend cho segments thực tế
                        Array.from(
                          new Set(
                            data.highlightedSegments.map(
                              (segment) => segment.documentId
                            )
                          )
                        )
                          .slice(0, 10)
                          .map((docId, index) => {
                            const segment = data.highlightedSegments.find(
                              (s) => s.documentId === docId
                            );
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
                            const backgroundColor = color + "20";

                            return (
                              <div
                                key={`legend-${docId}-${index}`}
                                className="flex items-center text-xs"
                              >
                                <div
                                  className="w-4 h-4 mr-2 border rounded"
                                  style={{
                                    backgroundColor: backgroundColor,
                                    borderColor: color,
                                  }}
                                />
                                <span
                                  className="truncate text-neutral-600"
                                  title={
                                    segment?.documentName ||
                                    `Document ${index + 1}`
                                  }
                                >
                                  {segment?.documentName ||
                                    `Document ${index + 1}`}
                                </span>
                              </div>
                            );
                          })
                      : // Hiển thị legend cho từ khóa chung
                        data?.matchingDocuments
                          ?.slice(0, 10)
                          .map((doc, index) => {
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
                            const backgroundColor = color + "20";

                            return (
                              <div
                                key={`legend-common-${doc.id}-${index}`}
                                className="flex items-center text-xs"
                              >
                                <div
                                  className="w-4 h-4 mr-2 border rounded"
                                  style={{
                                    backgroundColor: backgroundColor,
                                    borderColor: color,
                                  }}
                                />
                                <span
                                  className="truncate text-neutral-600"
                                  title={doc.fileName}
                                >
                                  {doc.fileName}
                                </span>
                              </div>
                            );
                          })}
                  </div>
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

                            <div className="space-y-1 text-xs text-neutral-600">
                              <div>
                                Kích thước: {formatFileSize(doc.fileSize)}
                              </div>
                              <div>Loại: {doc.fileType}</div>
                              <div>Tác giả: {doc.author}</div>
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
