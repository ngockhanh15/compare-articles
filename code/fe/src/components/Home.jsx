import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const Home = () => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const [welcomeMessage, setWelcomeMessage] = useState("");
  
  // Mock data cho thống kê
  const [stats, setStats] = useState({
    totalDocuments: 0,
    totalUsers: 0,
    totalChecks: 0,
    successRate: 0
  })

  const [isLoading, setIsLoading] = useState(true)

  // Check for welcome message from registration
  useEffect(() => {
    if (location.state?.message) {
      setWelcomeMessage(location.state.message);
      // Clear the message after showing it
      setTimeout(() => {
        setWelcomeMessage("");
      }, 5000);
    }
  }, [location.state]);

  // Simulate loading data
  useEffect(() => {
    const timer = setTimeout(() => {
      setStats({
        totalDocuments: 1247,
        totalUsers: 856,
        totalChecks: 3429,
        successRate: 94.5
      })
      setIsLoading(false)
    }, 800)

    return () => clearTimeout(timer)
  }, [])

  const StatCard = ({ title, value, icon, bgColor, iconBg, isPercentage = false, isLoading = false }) => (
    <div className="transition-all duration-300 transform card hover:shadow-xl hover:-translate-y-1">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="mb-2 text-sm font-medium text-neutral-600">{title}</p>
          {isLoading ? (
            <div className="h-8 rounded bg-neutral-200 animate-pulse"></div>
          ) : (
            <p className={`text-3xl font-bold ${bgColor}`}>
              {isPercentage ? `${value}%` : value.toLocaleString()}
            </p>
          )}
        </div>
        <div className={`p-4 rounded-xl ${iconBg} shadow-sm`}>
          <span className={`text-2xl ${bgColor}`}>{icon}</span>
        </div>
      </div>
    </div>
  )

  return (
    <div className="mb-20 bg-gradient-to-br from-neutral-50 to-primary-50">
      <div className="px-4 py-8 mx-auto max-w-7xl sm:px-6 lg:px-8">
        {/* Welcome Message */}
        {welcomeMessage && (
          <div className="p-4 mb-6 border border-green-200 bg-green-50 rounded-xl">
            <div className="flex items-center">
              <span className="mr-2 text-green-500">🎉</span>
              <p className="text-sm text-green-700">{welcomeMessage}</p>
            </div>
          </div>
        )}

        {/* Welcome Section */}
        <div className="mb-12 text-center">
          <div className="p-8 mb-6 text-white shadow-xl bg-gradient-primary rounded-2xl">
            <h1 className="mb-4 text-4xl font-bold md:text-5xl">
              🎯 So sánh 2 văn bản
            </h1>
            <p className="mb-6 text-lg text-primary-100">
              Kiểm tra văn bản của bạn để phát hiện nội dung không phù hợp và tỷ lệ trùng lặp
            </p>
            
            {/* CTA Button */}
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              {isAuthenticated ? (
                <Link
                  to="/text-checker"
                  className="inline-flex items-center gap-2 px-8 py-3 font-semibold transition-all duration-200 transform bg-white shadow-lg text-primary-600 rounded-xl hover:bg-primary-50 hover:shadow-xl hover:-translate-y-1"
                >
                  <span>🔍</span>
                  Bắt đầu kiểm tra ngay
                </Link>
              ) : (
                <div className="flex gap-4">
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-2 px-8 py-3 font-semibold transition-all duration-200 transform bg-white shadow-lg text-primary-600 rounded-xl hover:bg-primary-50 hover:shadow-xl hover:-translate-y-1"
                  >
                    <span>🔐</span>
                    Đăng nhập để kiểm tra
                  </Link>
                  <Link
                    to="/register"
                    className="inline-flex items-center gap-2 px-8 py-3 font-semibold text-white transition-all duration-200 border-2 border-white rounded-xl hover:bg-white/10"
                  >
                    <span>📝</span>
                    Đăng ký miễn phí
                  </Link>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex flex-wrap justify-center gap-4 text-sm text-neutral-600">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-success-500"></div>
              <span>Hệ thống hoạt động ổn định</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary-500"></div>
              <span>Cập nhật lần cuối: Hôm nay</span>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 gap-6 mb-12 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Tổng số tài liệu"
            value={stats.totalDocuments}
            icon="📄"
            bgColor="text-primary-600"
            iconBg="bg-primary-100"
            isLoading={isLoading}
          />
          <StatCard
            title="Số người dùng"
            value={stats.totalUsers}
            icon="👥"
            bgColor="text-accent-600"
            iconBg="bg-accent-100"
            isLoading={isLoading}
          />
          <StatCard
            title="Lượt kiểm tra"
            value={stats.totalChecks}
            icon="🔍"
            bgColor="text-secondary-600"
            iconBg="bg-secondary-100"
            isLoading={isLoading}
          />
          <StatCard
            title="Tỷ lệ thành công"
            value={stats.successRate}
            icon="✅"
            bgColor="text-success-600"
            iconBg="bg-success-100"
            isPercentage={true}
            isLoading={isLoading}
          />
        </div>

        {/* Tips Section */}
        <div className="p-8 mt-12 border bg-gradient-to-r from-accent-50 to-primary-50 rounded-2xl border-accent-200">
          <div className="flex items-start gap-4">
            <div className="text-4xl">💡</div>
            <div>
              <h3 className="mb-2 text-xl font-bold text-neutral-800">Mẹo sử dụng hiệu quả</h3>
              <ul className="space-y-2 text-neutral-600">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-primary-500 rounded-full"></span>
                  Sử dụng chức năng "So sánh văn bản" để kiểm tra độ tương đồng giữa các tài liệu
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-primary-500 rounded-full"></span>
                  Cập nhật danh sách từ khóa thường xuyên để tăng độ chính xác
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-primary-500 rounded-full"></span>
                  Xem báo cáo chi tiết để theo dõi xu hướng và hiệu suất hệ thống
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Home