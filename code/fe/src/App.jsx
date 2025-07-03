import Header from './components/Header'
import Home from './components/Home'

function App() {
  return (
    <div className="min-h-screen bg-neutral-50">
      <Header />
      <main>
        <Home />
      </main>
      <footer className="bg-gradient-to-r from-neutral-800 to-neutral-900 text-white">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="grid md:grid-cols-3 gap-8 mb-6">
            {/* Company Info */}
            <div>
              <div className="flex items-center mb-4">
                <span className="text-2xl mr-2">🎯</span>
                <h3 className="text-lg font-bold">So sánh văn bản</h3>
              </div>
              <p className="text-neutral-300 text-sm leading-relaxed">
               Giúp kiểm tra các văn bản có trùng lặp với thông tin dữ liệu không.
              </p>
            </div>
            
            {/* Quick Links */}
            <div>
              <h4 className="font-semibold mb-4 text-neutral-200">Liên kết nhanh</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="text-neutral-300 hover:text-white transition-colors">Trang chủ</a></li>
                <li><a href="#" className="text-neutral-300 hover:text-white transition-colors">Kiểm tra văn bản</a></li>
                <li><a href="#" className="text-neutral-300 hover:text-white transition-colors">Hướng dẫn sử dụng</a></li>
              </ul>
            </div>
            
            {/* Contact */}
            <div>
              <h4 className="font-semibold mb-4 text-neutral-200">Liên hệ</h4>
              <ul className="space-y-2 text-sm text-neutral-300">
                <li className="flex items-center gap-2">
                  <span>📧</span>
                  <span>support@filterword.com</span>
                </li>
                <li className="flex items-center gap-2">
                  <span>📞</span>
                  <span>+84 123 456 789</span>
                </li>
                <li className="flex items-center gap-2">
                  <span>🌐</span>
                  <span>www.filterword.com</span>
                </li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-neutral-700 pt-6 flex flex-col md:flex-row justify-between items-center">
            <p className="text-neutral-400 text-sm">
              &copy; 2024 Hệ thống Lọc Từ. All rights reserved.
            </p>
            <div className="flex space-x-4 mt-4 md:mt-0">
              <a href="#" className="text-neutral-400 hover:text-white transition-colors text-sm">
                Chính sách bảo mật
              </a>
              <a href="#" className="text-neutral-400 hover:text-white transition-colors text-sm">
                Điều khoản sử dụng
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App
