const User = require('../models/User');

/**
 * Tạo tài khoản admin mặc định khi khởi động server
 */
const createDefaultAdmin = async () => {
  try {
    // Lấy thông tin admin từ .env
    const adminData = {
      name: process.env.ADMIN_NAME || 'Admin User',
      email: process.env.ADMIN_EMAIL || 'admin@filterword.com',
      password: process.env.ADMIN_PASSWORD || 'admin123456',
      role: 'admin',
      emailVerified: true,
      isActive: true
    };

    // Kiểm tra xem admin đã tồn tại chưa
    const existingAdmin = await User.findOne({ email: adminData.email });
    
    if (!existingAdmin) {
      // Tạo tài khoản admin mới
      const admin = await User.create(adminData);
      console.log('✅ Đã tạo tài khoản admin mặc định:');
      console.log('   📧 Email:', admin.email);
      console.log('   👤 Tên:', admin.name);
      console.log('   🔐 Mật khẩu:', adminData.password);
      console.log('   🎭 Vai trò:', admin.role);
    } else {
      // Đảm bảo admin có đúng quyền
      if (existingAdmin.role !== 'admin') {
        existingAdmin.role = 'admin';
        existingAdmin.emailVerified = true;
        existingAdmin.isActive = true;
        await existingAdmin.save();
        console.log('✅ Đã cập nhật quyền admin cho:', existingAdmin.email);
      }
    }

  } catch (error) {
    console.error('❌ Lỗi khi tạo admin mặc định:', error.message);
    
    if (error.code === 11000) {
      console.error('   Email admin đã được sử dụng bởi tài khoản khác');
    }
  }
};

module.exports = createDefaultAdmin;