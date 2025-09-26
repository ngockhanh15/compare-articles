import { useState, useEffect } from 'react';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title, 
  Tooltip, 
  Legend 
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { getPlagiarismCheckStats } from '../services/api';

// Đăng ký các thành phần Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const PlagiarismStatistics = () => {
  const [plagiarismStats, setPlagiarismStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // State cho date range của kiểm tra plagiarism
  const [plagStartDate, setPlagStartDate] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 6); // 6 tháng trước
    return date.toISOString().slice(0, 7); // YYYY-MM format
  });
  const [plagEndDate, setPlagEndDate] = useState(() => {
    const date = new Date();
    return date.toISOString().slice(0, 7); // YYYY-MM format
  });

  // Hàm tính số tháng giữa hai ngày
  const getMonthsBetweenDates = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    const yearDiff = end.getFullYear() - start.getFullYear();
    const monthDiff = end.getMonth() - start.getMonth();
    
    return yearDiff * 12 + monthDiff + 1; // +1 để bao gồm cả tháng cuối
  };

  // Hàm tạo dữ liệu cho biểu đồ
  const createChartData = (stats, label, color) => {
    if (!stats || !stats.data) return null;

    const labels = stats.data.map(item => {
      const date = new Date(item.month);
      return `${date.getMonth() + 1}/${date.getFullYear()}`;
    });

    const data = stats.data.map(item => item.count);

    return {
      labels,
      datasets: [
        {
          label,
          data,
          backgroundColor: color.bg,
          borderColor: color.border,
          borderWidth: 1,
          borderRadius: 4,
          borderSkipped: false,
        }
      ]
    };
  };

  // Cấu hình biểu đồ
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1,
        },
      },
    },
  };

  // Lấy dữ liệu thống kê kiểm tra plagiarism
  const fetchPlagiarismStats = async () => {
    try {
      setLoading(true);
      setError('');
      const startDateFormatted = `${plagStartDate}-01`;
      const endDateFormatted = `${plagEndDate}-31`;
      const response = await getPlagiarismCheckStats(startDateFormatted, endDateFormatted);
      setPlagiarismStats(response);
    } catch (error) {
      console.error('Error fetching plagiarism stats:', error);
      setError('Lỗi khi lấy thống kê kiểm tra: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Load dữ liệu ban đầu
  useEffect(() => {
    fetchPlagiarismStats();
  }, []);

  // Dữ liệu biểu đồ
  const plagiarismChartData = createChartData(
    plagiarismStats, 
    'Số lần kiểm tra',
    { bg: 'rgba(16, 185, 129, 0.5)', border: 'rgb(16, 185, 129)' }
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="flex items-center justify-center mb-4">
          <div className="p-3 mr-3 shadow-lg bg-gradient-primary rounded-2xl">
            <span className="text-3xl">🔍</span>
          </div>
          <h1 className="text-3xl font-bold text-neutral-800">
            Thống kê Kiểm tra
          </h1>
        </div>
        <p className="text-neutral-600">
          Thống kê lượt kiểm tra sao chép theo tháng
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 border border-red-200 bg-red-50 rounded-xl">
          <div className="flex items-center">
            <span className="mr-2 text-red-500">❌</span>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Thống kê Kiểm tra Plagiarism */}
      <div className="p-6 bg-white shadow-xl rounded-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="flex items-center text-xl font-semibold text-neutral-800">
            <span className="mr-2">🔍</span>
            Thống kê Kiểm tra (Lượt kiểm tra tài liệu)
          </h2>
          <button
            onClick={fetchPlagiarismStats}
            disabled={loading}
            className="flex items-center px-4 py-2 text-sm font-medium transition-all duration-200 border rounded-lg border-neutral-300 text-neutral-700 hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-neutral-500 disabled:opacity-50"
          >
            <span className="mr-2">🔄</span>
            {loading ? 'Đang tải...' : 'Làm mới'}
          </button>
        </div>

        {/* Date Range Controls */}
        <div className="flex flex-wrap items-center gap-4 p-4 mb-6 border border-gray-200 rounded-lg bg-gray-50">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Từ tháng:</label>
            <input
              type="month"
              value={plagStartDate}
              onChange={(e) => setPlagStartDate(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Đến tháng:</label>
            <input
              type="month"
              value={plagEndDate}
              onChange={(e) => setPlagEndDate(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <button
            onClick={fetchPlagiarismStats}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white transition-all duration-200 bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            Áp dụng
          </button>
        </div>

        {/* Chart */}
        <div className="h-80">
          {plagiarismChartData ? (
            <Bar data={plagiarismChartData} options={chartOptions} />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="w-8 h-8 mx-auto mb-4 border-b-2 border-green-600 rounded-full animate-spin"></div>
                <p className="text-neutral-600">Đang tải dữ liệu...</p>
              </div>
            </div>
          )}
        </div>

        {/* Summary */}
        {plagiarismStats && plagiarismStats.summary && (
          <div className="grid grid-cols-1 gap-4 mt-6 md:grid-cols-3">
            <div className="p-4 border border-green-200 rounded-xl bg-green-50">
              <div className="text-2xl font-bold text-green-600">
                {plagiarismStats.summary.total?.toLocaleString() || 0}
              </div>
              <div className="text-sm text-green-700">Tổng lượt kiểm tra</div>
            </div>
            <div className="p-4 border border-blue-200 rounded-xl bg-blue-50">
              <div className="text-2xl font-bold text-blue-600">
                {(() => {
                  const total = plagiarismStats.summary.total || 0;
                  const totalMonths = getMonthsBetweenDates(plagStartDate, plagEndDate);
                  const average = totalMonths > 0 ? total / totalMonths : 0;
                  return average.toFixed(1);
                })()}
              </div>
              <div className="text-sm text-blue-700">Trung bình/tháng</div>
            </div>
            <div className="p-4 border border-purple-200 rounded-xl bg-purple-50">
              <div className="text-2xl font-bold text-purple-600">
                {plagiarismStats.summary.peak?.toLocaleString() || 0}
              </div>
              <div className="text-sm text-purple-700">Cao nhất/tháng</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlagiarismStatistics;