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

  // Lấy Dtotal từ document giống nhất
  const dtotalPercent = useMemo(() => {
    // Nếu có matches và có document đầu tiên (giống nhất)
    if (matches.length > 0 && matches[0]) {
      return Math.round(matches[0].similarity || 0);
    }
    // Fallback: sử dụng giá trị cũ
    return Math.round(
      typeof data?.dtotal === "number" ? data.dtotal : data?.overallSimilarity || 0
    );
  }, [matches, data]);

  // Lấy danh sách câu trùng lặp chi tiết cho document được chọn
  const duplicateSentences = useMemo(() => {
    const selected = matches[selectedIndex];
    if (!selected) return [];
    
    const details = selected.duplicateSentencesDetails || [];
    if (Array.isArray(details) && details.length > 0) {
      return details.map((detail, index) => ({
        id: index,
        inputSentence: detail.inputSentence || "",
        docSentence: detail.docSentence || detail.matched || detail.text || detail.sourceSentence || detail.matchedSentence || "",
        similarity: typeof detail.similarity === "number" ? detail.similarity : selected.similarity || 0
      }));
    }
    
    return [];
  }, [matches, selectedIndex]);

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
    
    const details = selected.duplicateSentencesDetails || [];
    if (Array.isArray(details) && details.length > 0) {
      // Only render the details path if at least one entry has usable text
      const itemsWithText = details.filter(
        (d) => (d && (d.docSentence || d.matched || d.text || d.sourceSentence || d.matchedSentence || d.inputSentence))
      );
      if (itemsWithText.length > 0) {
        return itemsWithText
          .map((d, i) => {
            // Backend provides inputSentence in details; use that when doc sentence isn't available
            const text = d.docSentence || d.matched || d.text || d.sourceSentence || d.matchedSentence || d.inputSentence || "";
            const sim = typeof d.similarity === "number" ? d.similarity : selected.similarity || 0;
            const color = sim >= 80 ? "#ef4444" : sim >= 60 ? "#f59e0b" : "#22c55e";
            return `<p style="margin:6px 0; line-height:1.6"><span style="background-color:${color}20; border-left:3px solid ${color}; padding:2px 6px; border-radius:4px" data-idx="${i}" title="${sim}%">${text}</span></p>`;
          })
          .join("");
      }
    }
    
    // Fallback: hiển thị toàn bộ nội dung từ mostSimilarDocument
    // Ưu tiên fullContent, sau đó content, cuối cùng matchedText
    const fullDocumentContent = data?.mostSimilarDocument?.fullContent || 
                               data?.mostSimilarDocument?.content || 
                               data?.mostSimilarDocument?.matchedText;
    
    if (fullDocumentContent) {
      console.log("Using fallback content:", {
        hasFullContent: !!data?.mostSimilarDocument?.fullContent,
        hasContent: !!data?.mostSimilarDocument?.content,
        hasMatchedText: !!data?.mostSimilarDocument?.matchedText,
        contentLength: fullDocumentContent.length
      });
      return `<div style="white-space:pre-wrap; line-height:1.6">${fullDocumentContent.replace(/\n/g, "<br/>")}</div>`;
    }
    
    // Fallback cuối: sử dụng matchedText
    const block = selected.matchedText || selected.text || "";
    if (!block) return "";
    return `<div style="white-space:pre-wrap; line-height:1.6">${block.replace(/\n/g, "<br/>")}</div>`;
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
                Nguồn: <span className="font-medium text-neutral-800">{matches[selectedIndex].source || matches[selectedIndex].title || "Document"}</span> · Dtotal: <span className="font-bold">{(matches[selectedIndex].similarity || 0).toFixed(1)}%</span>
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
                {dtotalPercent}%
              </div>
              <div className="mt-1 text-xs text-purple-600">Dtotal</div>
            </div>
          </div>
        </div>

        {/* Chi tiết các câu trùng lặp */}
        {duplicateSentences.length > 0 && (
          <div className="p-6 mb-8 bg-white shadow-xl rounded-2xl">
            {/* Header */}
            <div className="flex items-center mb-6">
              <span className="text-gray-500 mr-3 text-xl">📎</span>
              <h2 className="text-xl font-semibold text-gray-800">Chi tiết các câu trùng lặp</h2>
            </div>

            {/* Comparison Overview */}
            <div className="p-6 mb-6 border border-gray-200 rounded-xl bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-full">
                    Document #{selectedIndex + 1} / {matches.length}
                  </span>
                  <span className="px-4 py-2 text-sm font-medium text-white bg-pink-500 rounded-full">
                    Tỷ lệ trùng lặp: {matches[selectedIndex]?.similarity?.toFixed(1) || 0}%
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Tổng cộng {matches.length} documents có trùng lặp</p>
                  <p className="text-sm text-blue-600">Document: {matches[selectedIndex]?.source || matches[selectedIndex]?.title || "Unknown"}</p>
                </div>
              </div>
            </div>

            {/* Duplication Level Indicator */}
            <div className="p-4 mb-6 border border-gray-200 rounded-xl bg-gray-50">
              <p className="mb-2 text-sm font-medium text-gray-700">Mức độ trùng lặp với document này</p>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-red-500 h-2 rounded-full" 
                  style={{ width: `${Math.min(matches[selectedIndex]?.similarity || 0, 100)}%` }}
                ></div>
              </div>
              <div className="flex justify-end mt-1">
                <span className="text-sm font-medium text-gray-700">{matches[selectedIndex]?.similarity?.toFixed(1) || 0}%</span>
              </div>
            </div>

            {/* Sentence Comparison */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Left Panel - Your Document */}
              <div>
                <h3 className="flex items-center mb-4 text-lg font-semibold text-blue-600">
                  <span className="mr-2">📄</span>
                  CÂU TRONG DOCUMENT CỦA BẠN
                </h3>
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-gray-800 leading-relaxed">
                    {duplicateSentences[0]?.inputSentence || "Không có câu trùng lặp"}
                  </p>
                </div>
              </div>

              {/* Right Panel - Selected Document */}
              <div>
                <h3 className="flex items-center mb-4 text-lg font-semibold text-red-600">
                  <span className="mr-2">📄</span>
                  CÂU TRÙNG LẬP TỪ DOCUMENT ĐƯỢC CHỌN
                </h3>
                <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                  <p className="text-sm text-gray-800 leading-relaxed">
                    {duplicateSentences[0]?.docSentence || "Không có câu trùng lặp"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Danh sách tất cả documents trùng lặp */}
        {matches.length > 0 && (
          <div className="p-6 mb-8 bg-white shadow-xl rounded-2xl">
            <h2 className="flex items-center mb-6 text-xl font-semibold text-neutral-800">
              <span className="mr-2">📋</span>
              Tất cả Documents có trùng lặp ({matches.length} documents)
            </h2>
            
            <div className="space-y-4">
              {matches.map((match, idx) => {
                const similarity = match.similarity || 0;
                const duplicateCount = match.duplicateSentencesDetails?.length || 0;
                const isSelected = idx === selectedIndex;
                
                return (
                  <div
                    key={`${match.documentId}_${idx}`}
                    className={`p-4 border rounded-lg transition-all cursor-pointer ${
                      isSelected 
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
                        
                        <div className="grid grid-cols-2 gap-4 mb-3">
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm text-gray-600">Tỷ lệ trùng lặp:</span>
                              <span className={`text-sm font-bold ${
                                similarity >= 80 ? "text-red-600" : 
                                similarity >= 60 ? "text-orange-600" : 
                                similarity >= 40 ? "text-yellow-600" : "text-green-600"
                              }`}>
                                {similarity.toFixed(1)}%
                              </span>
                            </div>
                            <div className="w-full h-2 bg-gray-200 rounded-full">
                              <div 
                                className={`h-2 rounded-full ${
                                  similarity >= 80 ? "bg-red-500" : 
                                  similarity >= 60 ? "bg-orange-500" : 
                                  similarity >= 40 ? "bg-yellow-500" : "bg-green-500"
                                }`} 
                                style={{ width: `${Math.min(similarity, 100)}%` }}
                              />
                            </div>
                          </div>
                          
                          <div>
                            <div className="text-sm text-gray-600">
                              Số câu trùng: <span className="font-medium text-blue-600">{duplicateCount}</span>
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              ID: {(match.documentId || '').toString().slice(-6)}
                            </div>
                          </div>
                        </div>
                        
                        {/* Hiển thị preview các câu trùng lặp */}
                        {match.duplicateSentencesDetails && match.duplicateSentencesDetails.length > 0 && (
                          <div className="mt-3">
                            <p className="text-xs text-gray-600 mb-2">Preview các câu trùng lặp:</p>
                            <div className="space-y-1">
                              {match.duplicateSentencesDetails.slice(0, 3).map((detail, detailIdx) => (
                                <div key={detailIdx} className="text-xs p-2 bg-gray-100 rounded border-l-2 border-blue-400">
                                  <div className="font-medium text-gray-700 mb-1">
                                    Câu {detailIdx + 1} ({(detail.similarity || similarity).toFixed(1)}%)
                                  </div>
                                  <div className="text-gray-600 truncate">
                                    {detail.inputSentence || detail.docSentence || "Nội dung câu..."}
                                  </div>
                                </div>
                              ))}
                              {match.duplicateSentencesDetails.length > 3 && (
                                <div className="text-xs text-gray-500 italic">
                                  ... và {match.duplicateSentencesDetails.length - 3} câu khác
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <div className="ml-4 shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedIndex(idx);
                            setShowComparisonOnly(true);
                            window.scrollTo({ top: 0, behavior: "auto" });
                          }}
                          className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                        >
                          Xem chi tiết
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}


        {/* Phần so sánh ở dưới đã được bỏ */}
        <div id="side-by-side-section" className="hidden">
          {/* Giữ lại id này để tránh lỗi khi tham chiếu đến nó */}
        </div>
      </div>
    </div>
  );
}
