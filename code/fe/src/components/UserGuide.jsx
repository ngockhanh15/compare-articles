import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const UserGuide = () => {
  const [activeSection, setActiveSection] = useState('getting-started');

  const sections = [
    {
      id: 'getting-started',
      title: 'Bắt đầu sử dụng',
      icon: '🚀',
      content: (
        <div className="space-y-6">
          <div className="p-6 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="text-lg font-semibold text-blue-800 mb-3">Chào mừng đến với hệ thống So sánh văn bản!</h3>
            <p className="text-blue-700">
              Hệ thống giúp bạn kiểm tra và so sánh các văn bản để phát hiện sự trùng lặp nội dung một cách nhanh chóng và chính xác.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-6 bg-white rounded-lg border border-gray-200 shadow-sm">
              <div className="flex items-center mb-4">
                <span className="text-2xl mr-3">👤</span>
                <h4 className="text-lg font-semibold">Đăng ký tài khoản</h4>
              </div>
              <ol className="space-y-2 text-sm text-gray-600">
                <li>1. Nhấp vào nút "Đăng ký" trên trang chủ</li>
                <li>2. Điền thông tin: Họ tên, Email, Mật khẩu</li>
                <li>3. Xác nhận mật khẩu và nhấp "Đăng ký"</li>
                <li>4. Kiểm tra email để xác thực tài khoản</li>
              </ol>
            </div>

            <div className="p-6 bg-white rounded-lg border border-gray-200 shadow-sm">
              <div className="flex items-center mb-4">
                <span className="text-2xl mr-3">🔑</span>
                <h4 className="text-lg font-semibold">Đăng nhập</h4>
              </div>
              <ol className="space-y-2 text-sm text-gray-600">
                <li>1. Nhấp vào nút "Đăng nhập"</li>
                <li>2. Nhập email và mật khẩu</li>
                <li>3. Hoặc đăng nhập bằng Google</li>
                <li>4. Nhấp "Đăng nhập" để vào hệ thống</li>
              </ol>
            </div>
          </div>

          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start">
              <span className="text-yellow-600 mr-2">💡</span>
              <div>
                <h5 className="font-medium text-yellow-800">Lưu ý quan trọng:</h5>
                <p className="text-sm text-yellow-700 mt-1">
                  Bạn cần đăng nhập để sử dụng các tính năng kiểm tra văn bản và quản lý tài liệu.
                </p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'text-checker',
      title: 'Kiểm tra văn bản',
      icon: '📝',
      content: (
        <div className="space-y-6">
          <div className="p-6 bg-green-50 rounded-lg border border-green-200">
            <h3 className="text-lg font-semibold text-green-800 mb-3">Kiểm tra văn bản trực tiếp</h3>
            <p className="text-green-700">
              Tính năng cho phép bạn nhập văn bản trực tiếp và kiểm tra sự trùng lặp với cơ sở dữ liệu.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-start space-x-4 p-4 bg-white rounded-lg border border-gray-200">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-semibold">
                1
              </div>
              <div>
                <h4 className="font-semibold text-gray-800">Truy cập tính năng</h4>
                <p className="text-sm text-gray-600 mt-1">
                  Sau khi đăng nhập, nhấp vào "Kiểm tra văn bản" trong menu điều hướng.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4 p-4 bg-white rounded-lg border border-gray-200">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-semibold">
                2
              </div>
              <div>
                <h4 className="font-semibold text-gray-800">Nhập văn bản</h4>
                <p className="text-sm text-gray-600 mt-1">
                  Dán hoặc gõ văn bản cần kiểm tra vào ô văn bản lớn.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4 p-4 bg-white rounded-lg border border-gray-200">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-semibold">
                3
              </div>
              <div>
                <h4 className="font-semibold text-gray-800">Thực hiện kiểm tra</h4>
                <p className="text-sm text-gray-600 mt-1">
                  Nhấp nút "Kiểm tra" để hệ thống phân tích và so sánh văn bản.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4 p-4 bg-white rounded-lg border border-gray-200">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-semibold">
                4
              </div>
              <div>
                <h4 className="font-semibold text-gray-800">Xem kết quả</h4>
                <p className="text-sm text-gray-600 mt-1">
                  Hệ thống sẽ hiển thị tỷ lệ trùng lặp và các đoạn văn bản tương tự.
                </p>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h5 className="font-medium text-blue-800 mb-2">✅ Ưu điểm</h5>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Kiểm tra nhanh chóng</li>
                <li>• Không cần upload file</li>
                <li>• Kết quả chi tiết</li>
                <li>• Hỗ trợ văn bản dài</li>
              </ul>
            </div>
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <h5 className="font-medium text-orange-800 mb-2">⚠️ Lưu ý</h5>
              <ul className="text-sm text-orange-700 space-y-1">
                <li>• Giới hạn độ dài văn bản</li>
                <li>• Cần kết nối internet ổn định</li>
                <li>• Thời gian xử lý phụ thuộc độ dài</li>
              </ul>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'upload-checker',
      title: 'Kiểm tra file tài liệu',
      icon: '📄',
      content: (
        <div className="space-y-6">
          <div className="p-6 bg-purple-50 rounded-lg border border-purple-200">
            <h3 className="text-lg font-semibold text-purple-800 mb-3">Upload và kiểm tra file tài liệu</h3>
            <p className="text-purple-700">
              Tải lên các file tài liệu (Word, PDF, TXT) để kiểm tra sự trùng lặp nội dung.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-start space-x-4 p-4 bg-white rounded-lg border border-gray-200">
              <div className="flex-shrink-0 w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center font-semibold">
                1
              </div>
              <div>
                <h4 className="font-semibold text-gray-800">Truy cập tính năng</h4>
                <p className="text-sm text-gray-600 mt-1">
                  Nhấp vào "Kiểm tra file" trong menu chính sau khi đăng nhập.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4 p-4 bg-white rounded-lg border border-gray-200">
              <div className="flex-shrink-0 w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center font-semibold">
                2
              </div>
              <div>
                <h4 className="font-semibold text-gray-800">Chọn file</h4>
                <p className="text-sm text-gray-600 mt-1">
                  Nhấp "Chọn file" hoặc kéo thả file vào vùng upload. Hỗ trợ: .docx, .pdf, .txt
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4 p-4 bg-white rounded-lg border border-gray-200">
              <div className="flex-shrink-0 w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center font-semibold">
                3
              </div>
              <div>
                <h4 className="font-semibold text-gray-800">Tải lên và xử lý</h4>
                <p className="text-sm text-gray-600 mt-1">
                  File sẽ được tải lên và hệ thống tự động trích xuất nội dung để phân tích.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4 p-4 bg-white rounded-lg border border-gray-200">
              <div className="flex-shrink-0 w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center font-semibold">
                4
              </div>
              <div>
                <h4 className="font-semibold text-gray-800">Xem báo cáo chi tiết</h4>
                <p className="text-sm text-gray-600 mt-1">
                  Nhấp "Xem chi tiết" để xem báo cáo so sánh đầy đủ với các đoạn trùng lặp được highlight.
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h5 className="font-medium text-gray-800 mb-3">📋 Định dạng file được hỗ trợ:</h5>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="flex items-center space-x-2">
                <span className="text-blue-600">📄</span>
                <span>Microsoft Word (.docx)</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-red-600">📕</span>
                <span>PDF (.pdf)</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-gray-600">📝</span>
                <span>Text (.txt)</span>
              </div>
            </div>
          </div>

          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start">
              <span className="text-yellow-600 mr-2">⚠️</span>
              <div>
                <h5 className="font-medium text-yellow-800">Giới hạn file:</h5>
                <ul className="text-sm text-yellow-700 mt-1 space-y-1">
                  <li>• Kích thước tối đa: 10MB</li>
                  <li>• Chỉ upload một file tại một thời điểm</li>
                  <li>• File phải có nội dung văn bản</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'document-management',
      title: 'Quản lý tài liệu',
      icon: '📚',
      content: (
        <div className="space-y-6">
          <div className="p-6 bg-indigo-50 rounded-lg border border-indigo-200">
            <h3 className="text-lg font-semibold text-indigo-800 mb-3">Quản lý tài liệu và lịch sử kiểm tra</h3>
            <p className="text-indigo-700">
              Xem lại các tài liệu đã kiểm tra, quản lý kết quả và theo dõi lịch sử hoạt động.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-gray-800 flex items-center">
                <span className="mr-2">📋</span>
                Danh sách tài liệu
              </h4>
              
              <div className="space-y-3">
                <div className="p-3 bg-white rounded border border-gray-200">
                  <h5 className="font-medium text-gray-800">Xem danh sách</h5>
                  <p className="text-sm text-gray-600 mt-1">
                    Tất cả tài liệu đã kiểm tra được hiển thị với thông tin: tên file, ngày kiểm tra, tỷ lệ trùng lặp.
                  </p>
                </div>
                
                <div className="p-3 bg-white rounded border border-gray-200">
                  <h5 className="font-medium text-gray-800">Tìm kiếm & Lọc</h5>
                  <p className="text-sm text-gray-600 mt-1">
                    Sử dụng thanh tìm kiếm để tìm tài liệu theo tên hoặc lọc theo ngày tháng.
                  </p>
                </div>
                
                <div className="p-3 bg-white rounded border border-gray-200">
                  <h5 className="font-medium text-gray-800">Sắp xếp</h5>
                  <p className="text-sm text-gray-600 mt-1">
                    Sắp xếp danh sách theo ngày, tên file hoặc tỷ lệ trùng lặp.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-gray-800 flex items-center">
                <span className="mr-2">⚙️</span>
                Thao tác với tài liệu
              </h4>
              
              <div className="space-y-3">
                <div className="p-3 bg-white rounded border border-gray-200">
                  <h5 className="font-medium text-gray-800">Xem chi tiết</h5>
                  <p className="text-sm text-gray-600 mt-1">
                    Nhấp vào tài liệu để xem báo cáo chi tiết với các đoạn trùng lặp được đánh dấu.
                  </p>
                </div>
                
                <div className="p-3 bg-white rounded border border-gray-200">
                  <h5 className="font-medium text-gray-800">Tải xuống báo cáo</h5>
                  <p className="text-sm text-gray-600 mt-1">
                    Xuất báo cáo so sánh dưới dạng PDF hoặc Word để lưu trữ.
                  </p>
                </div>
                
                <div className="p-3 bg-white rounded border border-gray-200">
                  <h5 className="font-medium text-gray-800">Xóa tài liệu</h5>
                  <p className="text-sm text-gray-600 mt-1">
                    Xóa các tài liệu không cần thiết để giải phóng dung lượng lưu trữ.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <h5 className="font-medium text-green-800 mb-2">💡 Mẹo sử dụng hiệu quả:</h5>
            <ul className="text-sm text-green-700 space-y-1">
              <li>• Đặt tên file có ý nghĩa để dễ tìm kiếm sau này</li>
              <li>• Thường xuyên xóa các tài liệu cũ không cần thiết</li>
              <li>• Sử dụng tính năng lọc để nhanh chóng tìm tài liệu cần thiết</li>
              <li>• Tải xuống báo cáo quan trọng để lưu trữ offline</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'results-interpretation',
      title: 'Hiểu kết quả kiểm tra',
      icon: '📊',
      content: (
        <div className="space-y-6">
          <div className="p-6 bg-teal-50 rounded-lg border border-teal-200">
            <h3 className="text-lg font-semibold text-teal-800 mb-3">Cách đọc và hiểu kết quả kiểm tra</h3>
            <p className="text-teal-700">
              Hướng dẫn chi tiết về cách hiểu các chỉ số và báo cáo từ hệ thống.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
              <div className="text-center mb-3">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-2xl">✅</span>
                </div>
                <h4 className="font-semibold text-green-800">0-15% Trùng lặp</h4>
              </div>
              <p className="text-sm text-gray-600 text-center">
                <strong>Tốt:</strong> Văn bản có tính độc đáo cao, ít trùng lặp với nguồn khác.
              </p>
            </div>

            <div className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
              <div className="text-center mb-3">
                <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-2xl">⚠️</span>
                </div>
                <h4 className="font-semibold text-yellow-800">15-40% Trùng lặp</h4>
              </div>
              <p className="text-sm text-gray-600 text-center">
                <strong>Cần chú ý:</strong> Có một số đoạn trùng lặp, cần xem xét và chỉnh sửa.
              </p>
            </div>

            <div className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
              <div className="text-center mb-3">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-2xl">❌</span>
                </div>
                <h4 className="font-semibold text-red-800">40%+ Trùng lặp</h4>
              </div>
              <p className="text-sm text-gray-600 text-center">
                <strong>Cảnh báo:</strong> Tỷ lệ trùng lặp cao, cần viết lại hoặc trích dẫn nguồn.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-gray-800">📋 Các thành phần trong báo cáo:</h4>
            
            <div className="space-y-3">
              <div className="p-4 bg-white rounded-lg border border-gray-200">
                <h5 className="font-medium text-gray-800 mb-2">1. Tỷ lệ trùng lặp tổng thể</h5>
                <p className="text-sm text-gray-600">
                  Phần trăm nội dung trùng lặp so với tổng độ dài văn bản. Được tính dựa trên số từ/câu trùng khớp.
                </p>
              </div>

              <div className="p-4 bg-white rounded-lg border border-gray-200">
                <h5 className="font-medium text-gray-800 mb-2">2. Danh sách nguồn trùng lặp</h5>
                <p className="text-sm text-gray-600">
                  Các tài liệu trong cơ sở dữ liệu có nội dung tương tự, kèm theo tỷ lệ trùng lặp với từng nguồn.
                </p>
              </div>

              <div className="p-4 bg-white rounded-lg border border-gray-200">
                <h5 className="font-medium text-gray-800 mb-2">3. Đoạn văn được highlight</h5>
                <p className="text-sm text-gray-600">
                  Các đoạn văn bản trùng lặp được đánh dấu màu để dễ nhận biết và chỉnh sửa.
                </p>
              </div>

              <div className="p-4 bg-white rounded-lg border border-gray-200">
                <h5 className="font-medium text-gray-800 mb-2">4. Gợi ý cải thiện</h5>
                <p className="text-sm text-gray-600">
                  Hệ thống đưa ra các gợi ý để giảm tỷ lệ trùng lặp và cải thiện tính độc đáo của văn bản.
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h5 className="font-medium text-blue-800 mb-2">🎯 Lưu ý quan trọng:</h5>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Trích dẫn đúng cách có thể làm tăng tỷ lệ trùng lặp nhưng vẫn hợp lệ</li>
              <li>• Một số thuật ngữ chuyên môn có thể trùng lặp là bình thường</li>
              <li>• Nên xem xét ngữ cảnh chứ không chỉ dựa vào tỷ lệ số</li>
              <li>• Sử dụng kết quả như một công cụ hỗ trợ, không thay thế đánh giá thủ công</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'troubleshooting',
      title: 'Khắc phục sự cố',
      icon: '🔧',
      content: (
        <div className="space-y-6">
          <div className="p-6 bg-red-50 rounded-lg border border-red-200">
            <h3 className="text-lg font-semibold text-red-800 mb-3">Khắc phục các vấn đề thường gặp</h3>
            <p className="text-red-700">
              Hướng dẫn giải quyết các lỗi và vấn đề phổ biến khi sử dụng hệ thống.
            </p>
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-white rounded-lg border border-gray-200">
              <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
                <span className="text-red-500 mr-2">❌</span>
                Không thể đăng nhập
              </h4>
              <div className="space-y-2 text-sm text-gray-600">
                <p><strong>Nguyên nhân:</strong> Sai email/mật khẩu, tài khoản chưa được kích hoạt</p>
                <p><strong>Giải pháp:</strong></p>
                <ul className="ml-4 space-y-1">
                  <li>• Kiểm tra lại email và mật khẩu</li>
                  <li>• Sử dụng tính năng "Quên mật khẩu" nếu cần</li>
                  <li>• Kiểm tra email để kích hoạt tài khoản</li>
                  <li>• Thử đăng nhập bằng Google</li>
                </ul>
              </div>
            </div>

            <div className="p-4 bg-white rounded-lg border border-gray-200">
              <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
                <span className="text-yellow-500 mr-2">⚠️</span>
                Upload file thất bại
              </h4>
              <div className="space-y-2 text-sm text-gray-600">
                <p><strong>Nguyên nhân:</strong> File quá lớn, định dạng không hỗ trợ, kết nối mạng kém</p>
                <p><strong>Giải pháp:</strong></p>
                <ul className="ml-4 space-y-1">
                  <li>• Kiểm tra kích thước file (tối đa 10MB)</li>
                  <li>• Đảm bảo file có định dạng .docx, .pdf, hoặc .txt</li>
                  <li>• Kiểm tra kết nối internet</li>
                  <li>• Thử lại sau vài phút</li>
                </ul>
              </div>
            </div>

            <div className="p-4 bg-white rounded-lg border border-gray-200">
              <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
                <span className="text-blue-500 mr-2">🔄</span>
                Kiểm tra mất quá nhiều thời gian
              </h4>
              <div className="space-y-2 text-sm text-gray-600">
                <p><strong>Nguyên nhân:</strong> Văn bản quá dài, hệ thống đang tải cao</p>
                <p><strong>Giải pháp:</strong></p>
                <ul className="ml-4 space-y-1">
                  <li>• Chia nhỏ văn bản thành các phần ngắn hơn</li>
                  <li>• Thử lại vào thời gian ít tải hơn</li>
                  <li>• Kiểm tra kết nối internet</li>
                  <li>• Không đóng trình duyệt trong quá trình xử lý</li>
                </ul>
              </div>
            </div>

            <div className="p-4 bg-white rounded-lg border border-gray-200">
              <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
                <span className="text-purple-500 mr-2">📊</span>
                Kết quả không chính xác
              </h4>
              <div className="space-y-2 text-sm text-gray-600">
                <p><strong>Nguyên nhân:</strong> Văn bản có định dạng đặc biệt, ngôn ngữ không được hỗ trợ tốt</p>
                <p><strong>Giải pháp:</strong></p>
                <ul className="ml-4 space-y-1">
                  <li>• Loại bỏ các ký tự đặc biệt không cần thiết</li>
                  <li>• Đảm bảo văn bản chủ yếu bằng tiếng Việt</li>
                  <li>• Kiểm tra lại định dạng file</li>
                  <li>• Liên hệ hỗ trợ nếu vấn đề vẫn tiếp tục</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <h5 className="font-medium text-gray-800 mb-3">📞 Liên hệ hỗ trợ:</h5>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium text-gray-700">Email hỗ trợ:</p>
                <p className="text-blue-600">support@filterword.com</p>
              </div>
              <div>
                <p className="font-medium text-gray-700">Thời gian hỗ trợ:</p>
                <p className="text-gray-600">8:00 - 17:00 (Thứ 2 - Thứ 6)</p>
              </div>
            </div>
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            📚 Hướng dẫn sử dụng hệ thống
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Hướng dẫn chi tiết cách sử dụng các tính năng của hệ thống So sánh văn bản
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:w-1/4">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sticky top-8">
              <h3 className="font-semibold text-gray-800 mb-4">Mục lục</h3>
              <nav className="space-y-2">
                {sections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center space-x-3 ${
                      activeSection === section.id
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-lg">{section.icon}</span>
                    <span className="text-sm font-medium">{section.title}</span>
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:w-3/4">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              {sections.map((section) => (
                <div
                  key={section.id}
                  className={activeSection === section.id ? 'block' : 'hidden'}
                >
                  <div className="flex items-center mb-6">
                    <span className="text-3xl mr-4">{section.icon}</span>
                    <h2 className="text-2xl font-bold text-gray-800">{section.title}</h2>
                  </div>
                  {section.content}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Access Cards */}
        <div className="mt-12">
          <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center">Truy cập nhanh</h3>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 text-center">
              <div className="text-4xl mb-4">📝</div>
              <h4 className="font-semibold text-gray-800 mb-2">Kiểm tra văn bản</h4>
              <p className="text-sm text-gray-600 mb-4">Nhập trực tiếp văn bản để kiểm tra</p>
              <Link 
                to="/text-checker"
                className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors inline-block"
              >
                Bắt đầu kiểm tra
              </Link>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 text-center">
              <div className="text-4xl mb-4">📄</div>
              <h4 className="font-semibold text-gray-800 mb-2">Upload file</h4>
              <p className="text-sm text-gray-600 mb-4">Tải lên file tài liệu để phân tích</p>
              <Link 
                to="/upload-checker"
                className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors inline-block"
              >
                Chọn file
              </Link>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 text-center">
              <div className="text-4xl mb-4">📚</div>
              <h4 className="font-semibold text-gray-800 mb-2">Quản lý tài liệu</h4>
              <p className="text-sm text-gray-600 mb-4">Xem lịch sử và quản lý kết quả</p>
              <Link 
                to="/documents"
                className="bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 transition-colors inline-block"
              >
                Xem tài liệu
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserGuide;