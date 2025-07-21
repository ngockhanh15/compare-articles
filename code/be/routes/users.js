const express = require('express');
const {
  getAllUsers,
  getUserById,
  toggleUserStatus,
  updateUserRole,
  deleteUser,
  getUserStats,
  resetUserPassword
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Tất cả routes đều yêu cầu authentication và admin role
router.use(protect);
router.use(authorize('admin'));

// @route   GET /api/users/stats
// @desc    Lấy thống kê người dùng
// @access  Private/Admin
router.get('/stats', getUserStats);

// @route   GET /api/users
// @desc    Lấy danh sách tất cả người dùng với pagination và filters
// @access  Private/Admin
router.get('/', getAllUsers);

// @route   GET /api/users/:id
// @desc    Lấy thông tin người dùng theo ID
// @access  Private/Admin
router.get('/:id', getUserById);

// @route   PUT /api/users/:id/toggle-status
// @desc    Kích hoạt/vô hiệu hóa người dùng
// @access  Private/Admin
router.put('/:id/toggle-status', toggleUserStatus);

// @route   PUT /api/users/:id/role
// @desc    Cập nhật vai trò người dùng
// @access  Private/Admin
router.put('/:id/role', updateUserRole);

// @route   PUT /api/users/:id/reset-password
// @desc    Reset mật khẩu người dùng
// @access  Private/Admin
router.put('/:id/reset-password', resetUserPassword);

// @route   DELETE /api/users/:id
// @desc    Xóa người dùng
// @access  Private/Admin
router.delete('/:id', deleteUser);

module.exports = router;