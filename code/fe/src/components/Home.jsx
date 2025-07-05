import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const Home = () => {
  const { isAuthenticated } = useAuth();
  
  // Mock data cho thống kê
  const [stats, setStats] = useState({
    totalDocuments: 0,
    totalUsers: 0,
    totalChecks: 0,
    successRate: 0
  })

  const [isLoading, setIsLoading] = useState(true)

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
    <div className="card hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-neutral-600 mb-2">{title}</p>
          {isLoading ? (
            <div className="h-8 bg-neutral-200 rounded animate-pulse"></div>
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
    <div className="bg-gradient-to-br from-neutral-50 to-primary-50 mb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-12 text-center">
          <div className="bg-gradient-primary p-8 rounded-2xl text-white mb-6 shadow-xl">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              🎯 So sánh 2 văn bản
            </h1>
            <p className="text-lg text-primary-100 mb-6">
              Kiểm tra văn bản của bạn để phát hiện nội dung không phù hợp và tỷ lệ trùng lặp
            </p>
            
            {/* CTA Button */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              {isAuthenticated ? (
                <Link
                  to="/text-checker"
                  className="bg-white text-primary-600 px-8 py-3 rounded-xl font-semibold hover:bg-primary-50 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-1 inline-flex items-center gap-2"
                >
                  <span>🔍</span>
                  Bắt đầu kiểm tra ngay
                </Link>
              ) : (
                <div className="flex gap-4">
                  <Link
                    to="/login"
                    className="bg-white text-primary-600 px-8 py-3 rounded-xl font-semibold hover:bg-primary-50 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-1 inline-flex items-center gap-2"
                  >
                    <span>🔐</span>
                    Đăng nhập để kiểm tra
                  </Link>
                  <Link
                    to="/register"
                    className="border-2 border-white text-white px-8 py-3 rounded-xl font-semibold hover:bg-white/10 transition-all duration-200 inline-flex items-center gap-2"
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
              <div className="w-2 h-2 bg-success-500 rounded-full"></div>
              <span>Hệ thống hoạt động ổn định</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-primary-500 rounded-full"></div>
              <span>Cập nhật lần cuối: Hôm nay</span>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
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
        <div className="mt-12 bg-gradient-to-r from-accent-50 to-primary-50 rounded-2xl p-8 border border-accent-200">
          <div className="flex items-start gap-4">
            <div className="text-4xl">💡</div>
            <div>
              <h3 className="text-xl font-bold text-neutral-800 mb-2">Mẹo sử dụng hiệu quả</h3>
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