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
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        "Tài liệu Word (.docx)",
      "application/msword": "Tài liệu Word (.doc)",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
        "Bảng tính Excel (.xlsx)",
      "application/vnd.ms-excel": "Bảng tính Excel (.xls)",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation":
        "Bài thuyết trình PowerPoint (.pptx)",
      "application/vnd.ms-powerpoint": "Bài thuyết trình PowerPoint (.ppt)",

      // PDF
      "application/pdf": "Tài liệu PDF",

      // Text files
      "text/plain": "Tệp văn bản",
      "text/html": "Trang web HTML",
      "text/css": "Tệp CSS",
      "text/javascript": "Tệp JavaScript",
      "application/json": "Tệp JSON",
      "application/xml": "Tệp XML",
      "text/xml": "Tệp XML",
      "text/csv": "Tệp CSV",
      "application/rtf": "Tài liệu RTF",

      // Images
      "image/jpeg": "Hình ảnh JPEG",
      "image/jpg": "Hình ảnh JPEG",
      "image/png": "Hình ảnh PNG",
      "image/gif": "Hình ảnh GIF",
      "image/bmp": "Hình ảnh BMP",
      "image/svg+xml": "Hình ảnh SVG",
      "image/webp": "Hình ảnh WebP",

      // Archives
      "application/zip": "Tệp nén ZIP",
      "application/x-rar-compressed": "Tệp nén RAR",
      "application/x-7z-compressed": "Tệp nén 7-Zip",
      "application/gzip": "Tệp nén GZIP",

      // OpenDocument
      "application/vnd.oasis.opendocument.text": "Tài liệu OpenDocument (.odt)",
      "application/vnd.oasis.opendocument.spreadsheet":
        "Bảng tính OpenDocument (.ods)",
      "application/vnd.oasis.opendocument.presentation":
        "Bài thuyết trình OpenDocument (.odp)",

      // Extensions fallback
      docx: "Tài liệu Word (.docx)",
      doc: "Tài liệu Word (.doc)",
      pdf: "Tài liệu PDF",
      txt: "Tệp văn bản",
      xlsx: "Bảng tính Excel (.xlsx)",
      xls: "Bảng tính Excel (.xls)",
      pptx: "Bài thuyết trình PowerPoint (.pptx)",
      ppt: "Bài thuyết trình PowerPoint (.ppt)",
      jpg: "Hình ảnh JPEG",
      jpeg: "Hình ảnh JPEG",
      png: "Hình ảnh PNG",
      gif: "Hình ảnh GIF",
      html: "Trang web HTML",
      css: "Tệp CSS",
      js: "Tệp JavaScript",
      json: "Tệp JSON",
      xml: "Tệp XML",
      csv: "Tệp CSV",
      zip: "Tệp nén ZIP",
      rar: "Tệp nén RAR",
    };

    // Chuyển về chữ thường để so sánh
    const lowerFileType = fileType.toLowerCase().trim();

    // Kiểm tra MIME type trước
    if (fileTypeMap[lowerFileType]) {
      return fileTypeMap[lowerFileType];
    }

    // Nếu không phải MIME type, thử loại bỏ dấu chấm và kiểm tra extension
    const cleanFileType = lowerFileType.startsWith(".")
      ? lowerFileType.substring(1)
      : lowerFileType;
    if (fileTypeMap[cleanFileType]) {
      return fileTypeMap[cleanFileType];
    }

    // Nếu là MIME type dài, thử rút gọn
    if (lowerFileType.includes("/")) {
      const parts = lowerFileType.split("/");
      const mainType = parts[0];
      const subType = parts[1];

      // Xử lý một số trường hợp đặc biệt
      if (mainType === "application") {
        if (subType.includes("word")) return "Tài liệu Word";
        if (subType.includes("excel") || subType.includes("spreadsheet"))
          return "Bảng tính Excel";
        if (subType.includes("powerpoint") || subType.includes("presentation"))
          return "Bài thuyết trình PowerPoint";
        if (subType.includes("pdf")) return "Tài liệu PDF";
      }

      if (mainType === "text") return "Tệp văn bản";
      if (mainType === "image") return "Hình ảnh";
      if (mainType === "audio") return "Tệp âm thanh";
      if (mainType === "video") return "Tệp video";

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
  const filteredMatches = data?.detailedMatches[0]?.duplicateSentencesDetails;

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
        <div className="p-6 mb-8 bg-white shadow-xl rounded-2xl">
          <h2 className="flex items-center mb-4 text-lg font-semibold text-neutral-800">
            <span className="mr-2">📊</span>
            Thống kê so sánh
          </h2>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="p-4 text-center border border-green-200 rounded-lg bg-green-50">
              <div className="text-2xl font-bold text-green-600">
                {data.totalDuplicateSentences || 0}
              </div>
              <div className="text-sm text-green-700">Câu trùng lặp</div>
            </div>
          </div>
        </div>

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
                <span className="font-medium text-neutral-700">
                  Tên document:
                </span>
                <span className="text-neutral-600">
                  {data.mostSimilarDocument?.name ||
                    data.mostSimilarDocumentName ||
                    "N/A"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-neutral-700">ID:</span>
                <span className="font-mono text-xs text-neutral-600">
                  {data.mostSimilarDocument?.id || "N/A"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-neutral-700">
                  Câu trùng lặp:
                </span>
                <span className="text-neutral-600">
                  {data.totalDuplicateSentences || 0} câu
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Matches Section */}
        {filteredMatches && filteredMatches.length > 0 && (
          <div
            id="detailed-matches-section"
            className="p-6 mt-8 bg-white shadow-xl rounded-2xl"
          >
            <h2 className="flex items-center mb-6 text-xl font-semibold text-neutral-800">
              <span className="mr-2">🔗</span>
              Chi tiết các câu trùng lặp
            </h2>
            <div className="space-y-6">
              {filteredMatches.map((match, index) => (
                <div
                  key={index}
                  id={`detailed-match-${index}`}
                  className="p-5 border-2 rounded-xl border-neutral-200 bg-gradient-to-r from-neutral-50 to-neutral-100"
                >
                  {/* Header với thông tin trùng lặp */}
                  <div className="flex items-center justify-between pb-3 mb-4 border-b border-neutral-300">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="px-3 py-1 text-sm font-bold text-white rounded-full shadow-sm bg-gradient-to-r from-blue-600 to-blue-700">
                        Cặp #{index + 1}
                      </span>
                      <div className="px-4 py-2 border-2 border-red-300 rounded-full bg-gradient-to-r from-red-100 to-red-200">
                        <span className="text-sm font-bold text-red-700">
                          🎯 Tỷ lệ trùng lặp: {match.similarity}%
                        </span>
                      </div>
                      <div className="px-3 py-1 border-2 border-green-300 rounded-full bg-gradient-to-r from-green-100 to-green-200">
                        <span className="text-sm font-bold text-green-700">
                          📝 Từ chung: {match.commonWords} từ
                        </span>
                      </div>
                    </div>
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
                          {match.inputSentence}
                        </p>
                      </div>
                    </div>

                    {/* Câu trùng lặp */}
                    <div className="relative">
                      <div className="flex items-center mb-3">
                        <span className="mr-2 text-lg">📋</span>
                        <h4 className="text-sm font-bold tracking-wide text-orange-700 uppercase">
                          Câu trùng lặp từ document giống nhất
                        </h4>
                      </div>
                      <div className="p-4 border-2 border-orange-300 rounded-lg shadow-sm bg-gradient-to-br from-orange-50 to-orange-100">
                        <p className="text-sm leading-relaxed text-neutral-800">
                          {match.docSentence}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Thanh chỉ báo mức độ trùng lặp */}
                  <div className="pt-3 mt-4 border-t border-neutral-300">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-neutral-600">
                        Mức độ trùng lặp
                      </span>
                      <span className="text-xs font-bold text-neutral-800">
                        {match.similarity}%
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-neutral-200">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${
                          match.similarity >= 80
                            ? "bg-gradient-to-r from-red-500 to-red-600"
                            : match.similarity >= 60
                            ? "bg-gradient-to-r from-yellow-500 to-yellow-600"
                            : "bg-gradient-to-r from-green-500 to-green-600"
                        }`}
                        style={{ width: `${match.similarity}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
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
