import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { getDetailedComparison } from "../services/api";

const formatFileSize = (size) => {
  if (!size && size !== 0) return "N/A";
  if (size < 1024) return `${size} bytes`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(2)} KB`;
  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
};

export default function TextDetailedComparison() {
  const { checkId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showComparisonOnly, setShowComparisonOnly] = useState(false);


  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await getDetailedComparison(checkId);
        setData(response);
      } catch (err) {
        console.error("Error fetching detailed comparison:", err);
        setError(err.message || "Lỗi khi tải dữ liệu so sánh");
      } finally {
        setLoading(false);
      }
    };
    if (checkId) fetchData();
  }, [checkId]);

  useEffect(() => {
    if (!data || !data.detailedMatches) return;
    const docId = searchParams.get("docId");
    if (docId) {
      const idx = data.detailedMatches.findIndex(
        (m) => String(m.documentId) === String(docId)
      );
      setSelectedIndex(idx >= 0 ? idx : 0);
    } else {
      setSelectedIndex(0);
    }
  }, [data, searchParams]);

  const matches = useMemo(() => {
    const rawMatches = data?.detailedMatches || [];

    // Hiển thị tất cả documents có trùng lặp, sắp xếp theo similarity giảm dần
    if (rawMatches.length > 0) {
      const sortedMatches = [...rawMatches].sort((a, b) => {
        const simA = a.similarity || 0;
        const simB = b.similarity || 0;
        return simB - simA;
      });

      console.log(`Found ${sortedMatches.length} documents with matches`);
      return sortedMatches;
    }

    return [];
  }, [data]);

  const leftHtml = useMemo(() => {
    // Lấy input text từ data
    const inputText = data?.inputText || data?.currentDocument?.content || "";
    if (!inputText) return "";

    const selected = matches[selectedIndex];
    if (!selected) {
      return `<div style="white-space:pre-wrap; line-height:1.6">${inputText.replace(/\n/g, "<br/>")}</div>`;
    }

    const details = selected.duplicateSentencesDetails || [];
    if (Array.isArray(details) && details.length > 0) {
      // Tạo highlighted text từ input text
      let highlightedText = inputText;

      details.forEach((d) => {
        if (d.inputSentence) {
          const sim = typeof d.similarity === "number" ? d.similarity : selected.similarity || 0;
          const color = sim >= 80 ? "#ef4444" : sim >= 60 ? "#f59e0b" : "#22c55e";
          const highlightStyle = `background-color:${color}20; border-left:3px solid ${color}; padding:2px 6px; border-radius:4px`;

          // Highlight câu trùng lặp trong input text
          highlightedText = highlightedText.replace(
            d.inputSentence,
            `<span style="${highlightStyle}" title="${sim}%">${d.inputSentence}</span>`
          );
        }
      });

      return `<div style="white-space:pre-wrap; line-height:1.6">${highlightedText.replace(/\n/g, "<br/>")}</div>`;
    }

    return `<div style="white-space:pre-wrap; line-height:1.6">${inputText.replace(/\n/g, "<br/>")}</div>`;
  }, [data, matches, selectedIndex]);

  const rightHtml = useMemo(() => {
    const selected = matches[selectedIndex];
    if (!selected) return "";

    // Lấy toàn bộ nội dung văn bản từ document được chọn
    // Ưu tiên các nguồn khác nhau của nội dung đầy đủ
    const fullDocumentContent = 
      // Từ document được chọn
      selected.fullContent ||
      selected.content ||
      selected.text ||
      // Từ mostSimilarDocument trong response
      data?.mostSimilarDocument?.fullContent ||
      data?.mostSimilarDocument?.content ||
      data?.mostSimilarDocument?.matchedText ||
      // Fallback cuối
      selected.matchedText || "";

    if (!fullDocumentContent) {
      return "<div>Không có nội dung để hiển thị</div>";
    }

    const details = selected.duplicateSentencesDetails || [];
    if (Array.isArray(details) && details.length > 0) {
      // Tạo highlighted text từ toàn bộ nội dung document
      let highlightedText = fullDocumentContent;

      // Highlight các câu trùng lặp trong toàn bộ nội dung
      details.forEach((d) => {
        const docSentence = d.docSentence || d.matched || d.text || d.sourceSentence || d.matchedSentence || "";
        if (docSentence && highlightedText.includes(docSentence)) {
          const sim = typeof d.similarity === "number" ? d.similarity : selected.similarity || 0;
          const color = sim >= 80 ? "#ef4444" : sim >= 60 ? "#f59e0b" : "#22c55e";
          const highlightStyle = `background-color:${color}20; border-left:3px solid ${color}; padding:2px 6px; border-radius:4px`;

          // Highlight câu trùng lặp trong toàn bộ nội dung
          // Sử dụng regex để tránh highlight nhiều lần cùng một câu
          const regex = new RegExp(docSentence.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
          highlightedText = highlightedText.replace(regex, `<span style="${highlightStyle}" title="${sim}%">${docSentence}</span>`);
        }
      });

      return `<div style="white-space:pre-wrap; line-height:1.6">${highlightedText.replace(/\n/g, "<br/>")}</div>`;
    }

    // Nếu không có details, hiển thị toàn bộ nội dung không có highlight
    console.log("Displaying full document content without highlights:", {
      hasFullContent: !!selected.fullContent,
      hasContent: !!selected.content,
      hasText: !!selected.text,
      hasMostSimilarDocument: !!data?.mostSimilarDocument,
      contentLength: fullDocumentContent.length
    });
    
    return `<div style="white-space:pre-wrap; line-height:1.6">${fullDocumentContent.replace(/\n/g, "<br/>")}</div>`;
  }, [matches, selectedIndex, data]);

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

  if (error || !data) {
    const message = error || "Không thể tải thông tin so sánh";
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100">
        <div className="px-4 py-8 mx-auto max-w-7xl">
          <div className="p-6 bg-white shadow-xl rounded-2xl">
            <div className="text-center">
              <div className="mb-4 text-4xl">❌</div>
              <h2 className="mb-2 text-xl font-semibold text-red-600">Lỗi</h2>
              <p className="mb-4 text-neutral-600">{message}</p>
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



  // Nếu showComparisonOnly là true, chỉ hiển thị phần so sánh
  if (showComparisonOnly && matches.length > 0 && matches[selectedIndex]) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100">
        <div className="px-4 py-8 mx-auto max-w-7xl">
          {/* Header đơn giản */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <button
                  onClick={() => {
                    setShowComparisonOnly(false);
                    window.scrollTo({ top: 0, behavior: "auto" });
                  }}
                  className="flex items-center px-3 py-2 mr-4 text-sm text-neutral-600 hover:text-neutral-800"
                >
                  <span className="mr-1">←</span>
                  Quay lại
                </button>
                <div className="flex items-center">
                  <div className="p-3 mr-3 shadow-lg bg-gradient-primary rounded-2xl">
                    <span className="text-3xl">🔍</span>
                  </div>
                  <h1 className="text-3xl font-bold text-neutral-800">So sánh chi tiết</h1>
                </div>
              </div>
            </div>
          </div>

          {/* Side-by-side view */}
          <div className="grid gap-6 mb-8 lg:grid-cols-2">
            <div className="p-6 bg-white shadow-xl rounded-2xl">
              <h3 className="flex items-center mb-4 text-lg font-semibold text-neutral-800">
                <span className="mr-2">📄</span>
                Tài liệu của bạn (đã tô đậm chỗ trùng)
              </h3>
              <div className="p-4 border rounded-lg border-neutral-200 bg-neutral-50 max-h-[80vh] overflow-auto">
                <div
                  className="text-sm leading-relaxed whitespace-pre-wrap text-neutral-800"
                  dangerouslySetInnerHTML={{
                    __html: leftHtml
                  }}
                />
              </div>
            </div>
            <div className="p-6 bg-white shadow-xl rounded-2xl">
              <h3 className="flex items-center mb-2 text-lg font-semibold text-neutral-800">
                <span className="mr-2">📚</span>
                Văn bản trong cơ sở dữ liệu (đã tô đậm chỗ trùng)
              </h3>
              <div className="mb-3 text-sm text-neutral-600">
                Nguồn: <span className="font-medium text-neutral-800">{matches[selectedIndex].source || matches[selectedIndex].title || "Document"}</span>
                {/* Hiển thị thông tin câu trùng thay vì D A/B */}
                {matches[selectedIndex].duplicateSentencesDetails && matches[selectedIndex].duplicateSentencesDetails.length > 0 && (
                  <span> · Câu trùng: <span className="font-bold">{matches[selectedIndex].duplicateSentencesDetails.length}</span></span>
                )}
              </div>
              <div className="p-4 border rounded-lg border-neutral-200 bg-neutral-50 max-h-[80vh] overflow-auto">
                <div
                  className="text-sm leading-relaxed whitespace-pre-wrap text-neutral-800"
                  dangerouslySetInnerHTML={{ __html: rightHtml }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Hiển thị giao diện đầy đủ
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
                <h1 className="text-3xl font-bold text-neutral-800">Kết quả chi tiết</h1>
              </div>
            </div>
          </div>
          <p className="text-neutral-600">
            Xin chào <span className="font-semibold text-primary-600">{user?.name}</span>
          </p>
        </div>

        {/* Current Document summary with Dtotal */}
        <div className="p-6 mb-8 bg-white shadow-xl rounded-2xl">
          <h2 className="flex items-center mb-4 text-xl font-semibold text-neutral-800">
            <span className="mr-2">📄</span>
            Document của bạn
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 border border-neutral-200 rounded-xl bg-neutral-50">
              <div className="text-2xl font-bold text-primary-600">{data.currentDocument?.fileName}</div>
              <div className="text-sm text-neutral-600">Tên file</div>
            </div>
            <div className="p-4 border border-neutral-200 rounded-xl bg-neutral-50">
              <div className="text-2xl font-bold text-primary-600">{formatFileSize(data.currentDocument?.fileSize || 0)}</div>
              <div className="text-sm text-neutral-600">Kích thước</div>
            </div>
            <div className="p-4 border border-purple-200 rounded-xl bg-purple-50">
              <div className="text-lg font-bold text-purple-600">
                {data.totalDuplicatedSentences > 0
                  ? Math.round(( data.totalDuplicatedSentences / data.totalInputSentences) * 100) + "%"
                  : "0%"}
              </div>
              <div className="mt-1 text-xs text-purple-600">Dtotal</div>
            </div>
          </div>
        </div>

        {/* Danh sách tất cả documents trùng lặp */}
        {matches.length > 0 && (
          <div className="p-6 mb-8 bg-white shadow-xl rounded-2xl">
            <h2 className="flex items-center mb-6 text-xl font-semibold text-neutral-800">
              <span className="mr-2">📋</span>
              Tất cả Documents có trùng lặp ({matches.length} documents)
            </h2>

            <div className="space-y-4">
              {matches.map((match, idx) => {
                const isSelected = idx === selectedIndex;

                return (
                  <div
                    key={`${match.documentId}_${idx}`}
                    className={`p-4 border rounded-lg transition-all cursor-pointer ${isSelected
                        ? 'border-blue-500 bg-blue-50 shadow-md'
                        : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                      }`}
                    onClick={() => setSelectedIndex(idx)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          <span className="mr-2 text-lg">📄</span>
                          <h3 className="font-medium text-neutral-800">
                            {match.source || match.title || `Document ${idx + 1}`}
                          </h3>
                          {isSelected && (
                            <span className="ml-2 px-2 py-1 text-xs font-medium text-white bg-blue-500 rounded-full">
                              Đang xem
                            </span>
                          )}
                        </div>

                        <div className="text-xs text-neutral-600 mb-2">
                          Câu trùng: {match.duplicateSentences || match.duplicateSentencesDetails?.length || 0}
                        </div>

                        {/* Hiển thị % trùng nhau của từng câu thay vì D A/B */}
                        {match.duplicateSentencesDetails && match.duplicateSentencesDetails.length > 0 && (
                          <div className="mt-2">
                            <div className="text-xs text-gray-500 mb-1">Chi tiết độ trùng của từng câu:</div>
                            <div className="space-y-1 max-h-32 overflow-y-auto">
                              {match.duplicateSentencesDetails.map((detail, detailIdx) => (
                                <div key={detailIdx} className="text-xs p-2 bg-gray-50 rounded border-l border-blue-300">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-gray-500 font-medium">Câu {detailIdx + 1}:</span>
                                    <span className={`font-medium ${(() => {
                                      const similarity = detail.similarity || detail.matchedSentenceSimilarity || 0;
                                      return similarity >= 80 ? "text-red-600" : similarity >= 60 ? "text-orange-600" : "text-green-600";
                                    })()}`}>
                                      {(detail.similarity || detail.matchedSentenceSimilarity || 0).toFixed(1)}% trùng
                                    </span>
                                  </div>
                                  
                                  {/* Thanh progress cho mỗi câu */}
                                  <div className="w-full h-1.5 mb-2 bg-gray-200 rounded-full">
                                    <div className={`${(() => {
                                      const similarity = detail.similarity || detail.matchedSentenceSimilarity || 0;
                                      return similarity >= 80 ? "bg-red-500" : similarity >= 60 ? "bg-orange-500" : "bg-green-500";
                                    })()} h-1.5 rounded-full transition-all duration-300`} style={{ 
                                      width: `${Math.min(detail.similarity || detail.matchedSentenceSimilarity || 0, 100)}%`
                                    }} />
                                  </div>
                                  
                                  <div className="text-gray-600 truncate">
                                    {detail.inputSentence || detail.docSentence || "Nội dung..."}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* So sánh chi tiết toàn bộ nội dung */}
                        <div className="mt-4">
                          <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                            <p className="text-sm font-medium text-gray-700 mb-4">So sánh toàn bộ nội dung:</p>
                            <div className="grid grid-cols-2 gap-4">
                              {/* Văn bản của người dùng với highlight */}
                              <div>
                                <div className="flex items-center mb-2">
                                  <span className="text-sm text-blue-600 font-medium mr-1">📄</span>
                                  <span className="text-sm text-blue-600 font-medium">Văn bản của bạn (tô đậm chỗ trùng):</span>
                                </div>
                                <div className="p-3 border rounded-lg border-blue-200 bg-blue-50 max-h-64 overflow-auto">
                                  <div
                                    className="text-xs leading-relaxed whitespace-pre-wrap text-gray-800"
                                    dangerouslySetInnerHTML={{
                                      __html: (() => {
                                        // Tạo highlighted text từ input text với match hiện tại
                                        const inputText = data?.inputText || data?.currentDocument?.content || "";
                                        if (!inputText) return "Không có nội dung";
                                        
                                        const details = match.duplicateSentencesDetails || [];
                                        if (Array.isArray(details) && details.length > 0) {
                                          let highlightedText = inputText;
                                          
                                          details.forEach((d) => {
                                            if (d.inputSentence) {
                                              const sim = typeof d.similarity === "number" ? d.similarity : match.similarity || 0;
                                              const color = sim >= 80 ? "#ef4444" : sim >= 60 ? "#f59e0b" : "#22c55e";
                                              const highlightStyle = `background-color:${color}20; border-left:3px solid ${color}; padding:2px 6px; border-radius:4px`;
                                              
                                              highlightedText = highlightedText.replace(
                                                d.inputSentence,
                                                `<span style="${highlightStyle}">${d.inputSentence}</span>`
                                              );
                                            }
                                          });
                                          
                                          return highlightedText.replace(/\n/g, "<br/>");
                                        }
                                        
                                        return inputText.replace(/\n/g, "<br/>");
                                      })()
                                    }}
                                  />
                                </div>
                              </div>

                              {/* Document trong database với highlight */}
                              <div>
                                <div className="flex items-center mb-2">
                                  <span className="text-sm text-orange-600 font-medium mr-1">📚</span>
                                  <span className="text-sm text-orange-600 font-medium">Document trong DB (tô đậm chỗ trùng):</span>
                                </div>
                                <div className="p-3 border rounded-lg border-orange-200 bg-orange-50 max-h-64 overflow-auto">
                                  <div
                                    className="text-xs leading-relaxed whitespace-pre-wrap text-gray-800"
                                    dangerouslySetInnerHTML={{
                                      __html: (() => {
                                        // Lấy toàn bộ nội dung document
                                        const fullDocumentContent = 
                                          match.fullContent ||
                                          match.content ||
                                          match.text ||
                                          data?.mostSimilarDocument?.fullContent ||
                                          data?.mostSimilarDocument?.content ||
                                          data?.mostSimilarDocument?.matchedText ||
                                          match.matchedText || "";
                                        
                                        if (!fullDocumentContent) {
                                          return "Không có nội dung để hiển thị";
                                        }
                                        
                                        const details = match.duplicateSentencesDetails || [];
                                        if (Array.isArray(details) && details.length > 0) {
                                          let highlightedText = fullDocumentContent;
                                          
                                          details.forEach((d) => {
                                            const docSentence = d.docSentence || d.matched || d.text || d.sourceSentence || d.matchedSentence || "";
                                            if (docSentence && highlightedText.includes(docSentence)) {
                                              const sim = typeof d.similarity === "number" ? d.similarity : match.similarity || 0;
                                              const color = sim >= 80 ? "#ef4444" : sim >= 60 ? "#f59e0b" : "#22c55e";
                                              const highlightStyle = `background-color:${color}20; border-left:3px solid ${color}; padding:2px 6px; border-radius:4px`;
                                              
                                              const regex = new RegExp(docSentence.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
                                              highlightedText = highlightedText.replace(regex, `<span style="${highlightStyle}" title="${sim}%">${docSentence}</span>`);
                                            }
                                          });
                                          
                                          return highlightedText.replace(/\n/g, "<br/>");
                                        }
                                        
                                        return fullDocumentContent.replace(/\n/g, "<br/>");
                                      })()
                                    }}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
