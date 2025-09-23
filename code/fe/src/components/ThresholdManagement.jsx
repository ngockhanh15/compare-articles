import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import * as api from "../services/api";

const ThresholdManagement = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  // State cho các ngưỡng
  const [thresholds, setThresholds] = useState({
    sentenceThreshold: 50, // Ngưỡng câu (%)
    highDuplicationThreshold: 30, // Ngưỡng trùng lặp cao (%)
    documentComparisonThreshold: 20 // Ngưỡng trùng lặp với từng tài liệu (%)
  });



  // Tạo options cho select từ 0% đến 100% (chỉ các số chia hết cho 10)
  const percentageOptions = Array.from({ length: 11 }, (_, i) => ({
    value: i * 10,
    label: `${i * 10}%`
  }));

  // Load thresholds khi component mount
  useEffect(() => {
    loadThresholds();
  }, []);

  const loadThresholds = async () => {
    try {
      setLoading(true);
      setError("");
      
      console.log("Loading thresholds...");
      const data = await api.getThresholds();
      console.log("Load response:", data);
      
      if (data.thresholds) {
        setThresholds(data.thresholds);
      }
    } catch (err) {
      console.error("Error loading thresholds:", err);
      console.error("Error details:", {
        message: err.message,
        stack: err.stack,
        details: err.details
      });
      
      let errorMessage = "Không thể tải cấu hình ngưỡng";
      if (err.message) {
        errorMessage += ": " + err.message;
      }
      if (err.details) {
        errorMessage += " (" + err.details + ")";
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleThresholdChange = (field, value) => {
    // Đảm bảo giá trị trong khoảng 0-100 và chia hết cho 10
    const numValue = Math.max(0, Math.min(100, parseInt(value) || 0));
    const roundedValue = Math.round(numValue / 10) * 10;
    setThresholds(prev => ({
      ...prev,
      [field]: roundedValue
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError("");
      setSuccess("");
      
      // Store old values for audit log
      const oldThresholds = { ...thresholds };
      
      console.log("Sending thresholds:", thresholds);
      const response = await api.updateThresholds(thresholds);
      console.log("Update response:", response);
      
      // Cập nhật state với dữ liệu từ server (nếu có)
      if (response.thresholds) {
        setThresholds(response.thresholds);
      }
      
      setSuccess(response.message || "Cập nhật ngưỡng kiểm tra thành công!");
      
      // Tự động ẩn thông báo thành công sau 3 giây
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      console.error("Error saving thresholds:", err);
      console.error("Error details:", {
        message: err.message,
        stack: err.stack,
        details: err.details
      });
      
      let errorMessage = "Không thể lưu cấu hình ngưỡng";
      if (err.message) {
        errorMessage += ": " + err.message;
      }
      if (err.details) {
        errorMessage += " (" + err.details + ")";
      }
      
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    try {
      setSaving(true);
      setError("");
      setSuccess("");
      
      // Store old values for audit log
      const oldThresholds = { ...thresholds };
      
      console.log("Resetting thresholds...");
      const response = await api.resetThresholds();
      console.log("Reset response:", response);
      
      const defaultThresholds = {
        sentenceThreshold: 50,
        highDuplicationThreshold: 30,
        documentComparisonThreshold: 20
      };
      
      // Cập nhật state với dữ liệu từ server (nếu có)
      if (response.thresholds) {
        setThresholds(response.thresholds);
      } else {
        // Fallback to default values
        setThresholds(defaultThresholds);
      }
      
      setSuccess(response.message || "Đặt lại ngưỡng mặc định thành công!");
      
      // Tự động ẩn thông báo thành công sau 3 giây
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      console.error("Error resetting thresholds:", err);
      console.error("Error details:", {
        message: err.message,
        stack: err.stack,
        details: err.details
      });
      
      let errorMessage = "Không thể đặt lại ngưỡng mặc định";
      if (err.message) {
        errorMessage += ": " + err.message;
      }
      if (err.details) {
        errorMessage += " (" + err.details + ")";
      }
      
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 border-2 border-primary-600 border-solid rounded-full animate-spin border-t-transparent"></div>
          <span className="text-neutral-600">Đang tải cấu hình ngưỡng...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-neutral-800">
            Quản lý ngưỡng kiểm tra
          </h2>
          <p className="mt-1 text-sm text-neutral-600">
            Cấu hình các ngưỡng để xác định mức độ trùng lặp trong hệ thống
          </p>
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="p-4 border border-red-200 rounded-lg bg-red-50">
          <div className="flex items-center">
            <span className="mr-2 text-red-500">⚠️</span>
            <span className="text-sm text-red-700">{error}</span>
          </div>
        </div>
      )}

      {success && (
        <div className="p-4 border border-green-200 rounded-lg bg-green-50">
          <div className="flex items-center">
            <span className="mr-2 text-green-500">✅</span>
            <span className="text-sm text-green-700">{success}</span>
          </div>
        </div>
      )}

      {/* Threshold Configuration Cards */}
      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
        {/* Ngưỡng câu */}
        <div className="p-6 bg-white border border-neutral-200 rounded-xl shadow-sm">
          <div className="flex items-center mb-4">
            <div className="p-2 mr-3 rounded-lg bg-blue-100">
              <span className="text-xl">📝</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-neutral-800">
                Ngưỡng câu
              </h3>
              <p className="text-sm text-neutral-600">
                Xác định khi nào một câu được coi là trùng lặp
              </p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Ngưỡng phần trăm (%)
              </label>
              <select
                value={thresholds.sentenceThreshold}
                onChange={(e) => handleThresholdChange('sentenceThreshold', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
              >
                {percentageOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="p-3 rounded-lg bg-neutral-50">
              <p className="text-xs text-neutral-600">
                <strong>Ví dụ:</strong> Với ngưỡng {thresholds.sentenceThreshold}%, 
                các câu có độ tương đồng ≥ {thresholds.sentenceThreshold}% sẽ được coi là trùng lặp.
              </p>
            </div>
          </div>
        </div>

        {/* Ngưỡng trùng lặp cao */}
        <div className="p-6 bg-white border border-neutral-200 rounded-xl shadow-sm">
          <div className="flex items-center mb-4">
            <div className="p-2 mr-3 rounded-lg bg-red-100">
              <span className="text-xl">🚨</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-neutral-800">
                Trùng lặp cao
              </h3>
              <p className="text-sm text-neutral-600">
                Cảnh báo khi tài liệu có mức trùng lặp cao
              </p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Ngưỡng phần trăm (%)
              </label>
              <select
                value={thresholds.highDuplicationThreshold}
                onChange={(e) => handleThresholdChange('highDuplicationThreshold', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
              >
                {percentageOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="p-3 rounded-lg bg-neutral-50">
              <p className="text-xs text-neutral-600">
                <strong>Ví dụ:</strong> Khi Dtotal ≥ {thresholds.highDuplicationThreshold}%, 
                hệ thống sẽ hiển thị cảnh báo "Tài liệu nghi ngờ trùng lặp ở mức cao".
              </p>
            </div>
          </div>
        </div>

        {/* Ngưỡng trùng lặp với từng tài liệu */}
        <div className="p-6 bg-white border border-neutral-200 rounded-xl shadow-sm">
          <div className="flex items-center mb-4">
            <div className="p-2 mr-3 rounded-lg bg-yellow-100">
              <span className="text-xl">📊</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-neutral-800">
                So sánh tài liệu
              </h3>
              <p className="text-sm text-neutral-600">
                Ngưỡng hiển thị kết quả so sánh từng cặp tài liệu
              </p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Ngưỡng phần trăm (%)
              </label>
              <select
                value={thresholds.documentComparisonThreshold}
                onChange={(e) => handleThresholdChange('documentComparisonThreshold', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
              >
                {percentageOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="p-3 rounded-lg bg-neutral-50">
              <p className="text-xs text-neutral-600">
                <strong>Ví dụ:</strong> Chỉ hiển thị các tài liệu có Da/b ≥ {thresholds.documentComparisonThreshold}% 
                trong kết quả so sánh.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-6 border-t border-neutral-200">
        <button
          onClick={handleReset}
          disabled={saving}
          className="px-4 py-2 text-sm font-medium transition-colors border border-neutral-300 rounded-lg text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
        >
          Đặt lại mặc định
        </button>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={loadThresholds}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium transition-colors border border-neutral-300 rounded-lg text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
          >
            Tải lại
          </button>
          
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 text-sm font-medium text-white transition-colors rounded-lg bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-white border-solid rounded-full animate-spin border-t-transparent"></div>
                <span>Đang lưu...</span>
              </div>
            ) : (
              "Lưu cấu hình"
            )}
          </button>
        </div>
      </div>

      {/* Information Panel */}
      <div className="p-6 border border-blue-200 rounded-xl bg-blue-50">
        <div className="flex items-start">
          <div className="p-2 mr-4 rounded-lg bg-blue-100">
            <span className="text-xl">💡</span>
          </div>
          <div>
            <h4 className="mb-2 text-lg font-semibold text-blue-800">
              Hướng dẫn sử dụng
            </h4>
            <div className="space-y-2 text-sm text-blue-700">
              <p>
                <strong>Ngưỡng câu:</strong> Xác định độ tương đồng tối thiểu để một câu được coi là trùng lặp.
              </p>
              <p>
                <strong>Trùng lặp cao:</strong> Khi tổng độ trùng lặp (Dtotal) vượt ngưỡng này, hệ thống sẽ cảnh báo.
              </p>
              <p>
                <strong>So sánh tài liệu:</strong> Chỉ hiển thị các cặp tài liệu có độ tương đồng vượt ngưỡng này.
              </p>
              <p className="mt-3 font-medium">
                ⚠️ Lưu ý: Các thay đổi sẽ áp dụng cho tất cả người dùng trong hệ thống.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThresholdManagement;