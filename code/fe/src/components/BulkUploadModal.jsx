import { useState, useRef } from "react";
import * as api from "../services/api";
import { downloadExcelTemplate } from "../utils/excelTemplate";
import { useNotification } from "../contexts/NotificationContext";

const BulkUploadModal = ({ onClose, onSuccess }) => {
  const [zipFile, setZipFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [uploadResults, setUploadResults] = useState(null);
  const [showResults, setShowResults] = useState(false);
  const fileInputRef = useRef(null);
  const { showSuccess, showError, showWarning } = useNotification();

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type === "application/zip" || droppedFile.name.endsWith('.zip')) {
        setZipFile(droppedFile);
      } else {
        alert("Vui lòng chọn file ZIP");
      }
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type === "application/zip" || selectedFile.name.endsWith('.zip')) {
        setZipFile(selectedFile);
      } else {
        alert("Vui lòng chọn file ZIP");
        e.target.value = '';
      }
    }
  };

  const handleUpload = async () => {
    if (!zipFile) return;

    try {
      setIsUploading(true);
      setUploadProgress(0);
      setShowResults(false);

      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + Math.random() * 10;
        });
      }, 500);

      const response = await api.bulkUploadDocuments(zipFile);

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (response.success) {
        setUploadResults(response.results);
        setShowResults(true);
        
        // Show success notification
        const results = response.results;
        if (results.failedCount > 0) {
          showWarning(
            `Upload hoàn thành với một số lỗi`,
            {
              totalFiles: results.totalFiles,
              successCount: results.successCount,
              failedCount: results.failedCount
            },
            8000
          );
        } else {
          showSuccess(
            `Upload thành công tất cả tài liệu!`,
            {
              totalFiles: results.totalFiles,
              successCount: results.successCount
            },
            6000
          );
        }
        
        // Call onSuccess callback to refresh the document list
        if (onSuccess) {
          onSuccess();
        }
      }
    } catch (error) {
      console.error("Bulk upload error:", error);
      
      // Show error notification
      showError(
        `Upload thất bại: ${error.message}`,
        null,
        8000
      );
      
      setUploadResults({
        success: false,
        error: error.message,
        totalFiles: 0,
        successCount: 0,
        failedCount: 0,
        failedFiles: []
      });
      setShowResults(true);
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadProgress(0), 2000);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleClose = () => {
    if (!isUploading) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="w-full max-w-3xl bg-white rounded-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-neutral-900">
              Upload hàng loạt tài liệu
            </h2>
            <button
              onClick={handleClose}
              className="text-neutral-400 hover:text-neutral-600"
              disabled={isUploading}
            >
              ✕
            </button>
          </div>

          {!showResults ? (
            <>
              {/* Instructions */}
              <div className="p-4 mb-6 border border-blue-200 bg-blue-50 rounded-xl">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-medium text-blue-900">📋 Hướng dẫn sử dụng:</h3>
                  <button
                    onClick={downloadExcelTemplate}
                    className="px-3 py-1 text-xs text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200 transition-colors"
                  >
                    📥 Tải file mẫu
                  </button>
                </div>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Tạo file ZIP chứa các tài liệu cần upload</li>
                  <li>• Bao gồm file <strong>metadata.csv</strong> với thông tin các tài liệu</li>
                  <li>• File CSV phải có các cột: <strong>Tên file, Tiêu đề, Tác giả, Mô tả</strong></li>
                  <li>• Tên file trong CSV phải khớp với tên file trong ZIP</li>
                  <li>• Sử dụng file mẫu để đảm bảo định dạng chính xác</li>
                </ul>
              </div>

              {/* File Upload Area */}
              <div
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                  dragActive
                    ? 'border-blue-400 bg-blue-50'
                    : 'border-neutral-300 hover:border-neutral-400'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                {zipFile ? (
                  <div className="space-y-2">
                    <div className="text-4xl">📦</div>
                    <p className="font-medium text-neutral-900">{zipFile.name}</p>
                    <p className="text-sm text-neutral-600">
                      {formatFileSize(zipFile.size)}
                    </p>
                    <button
                      type="button"
                      onClick={() => setZipFile(null)}
                      className="text-sm text-red-600 hover:text-red-700"
                      disabled={isUploading}
                    >
                      Xóa file
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="text-4xl">📦</div>
                    <div>
                      <p className="text-lg font-medium text-neutral-900 mb-2">
                        Kéo thả file ZIP vào đây
                      </p>
                      <p className="text-sm text-neutral-600 mb-4">
                        hoặc click để chọn file
                      </p>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50"
                        disabled={isUploading}
                      >
                        Chọn file ZIP
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".zip"
                onChange={handleFileChange}
                className="hidden"
              />

              {/* Progress Bar */}
              {isUploading && (
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-neutral-700">
                      Đang upload...
                    </span>
                    <span className="text-sm text-neutral-600">
                      {Math.round(uploadProgress)}%
                    </span>
                  </div>
                  <div className="w-full bg-neutral-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 text-neutral-600 border border-neutral-300 rounded-lg hover:bg-neutral-50"
                  disabled={isUploading}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleUpload}
                  disabled={!zipFile || isUploading}
                  className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUploading ? 'Đang upload...' : 'Upload'}
                </button>
              </div>
            </>
          ) : (
            /* Results Display */
            <div className="space-y-6">
              {uploadResults?.success ? (
                <div className="p-4 border border-green-200 bg-green-50 rounded-xl">
                  <div className="flex items-center mb-2">
                    <span className="mr-2 text-green-500">✅</span>
                    <h3 className="font-medium text-green-900">Upload thành công!</h3>
                  </div>
                  <div className="text-sm text-green-800">
                    <p>Tổng số file: {uploadResults.totalFiles}</p>
                    <p>Thành công: {uploadResults.successCount}</p>
                    {uploadResults.failedCount > 0 && (
                      <p>Thất bại: {uploadResults.failedCount}</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-4 border border-red-200 bg-red-50 rounded-xl">
                  <div className="flex items-center mb-2">
                    <span className="mr-2 text-red-500">❌</span>
                    <h3 className="font-medium text-red-900">Upload thất bại</h3>
                  </div>
                  <p className="text-sm text-red-800">{uploadResults?.error}</p>
                </div>
              )}

              {/* Failed Files List */}
              {uploadResults?.failedFiles && uploadResults.failedFiles.length > 0 && (
                <div className="p-4 border border-yellow-200 bg-yellow-50 rounded-xl">
                  <h4 className="font-medium text-yellow-900 mb-2">
                    Các file upload thất bại:
                  </h4>
                  <ul className="text-sm text-yellow-800 space-y-1">
                    {uploadResults.failedFiles.map((failedFile, index) => (
                      <li key={index}>
                        • {failedFile.filename}: {failedFile.error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Success Files List */}
              {uploadResults?.successFiles && uploadResults.successFiles.length > 0 && (
                <div className="p-4 border border-green-200 bg-green-50 rounded-xl">
                  <h4 className="font-medium text-green-900 mb-2">
                    Các file upload thành công:
                  </h4>
                  <ul className="text-sm text-green-800 space-y-1 max-h-40 overflow-y-auto">
                    {uploadResults.successFiles.map((successFile, index) => (
                      <li key={index}>
                        • {successFile.filename} - {successFile.title}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                >
                  Đóng
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BulkUploadModal;