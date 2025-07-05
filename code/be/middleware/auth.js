const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect routes
exports.protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    // Set token from Bearer token in header
    token = req.headers.authorization.split(' ')[1];
  }

  // Make sure token exists
  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Không có quyền truy cập, vui lòng đăng nhập'
    });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from token
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Không tìm thấy người dùng với token này'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        error: 'Tài khoản đã bị vô hiệu hóa'
      });
    }

    // Check if account is locked
    if (user.isLocked) {
      return res.status(401).json({
        success: false,
        error: 'Tài khoản đã bị khóa do đăng nhập sai quá nhiều lần'
      });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error('Token verification error:', err);
    
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token đã hết hạn, vui lòng đăng nhập lại'
      });
    }
    
    return res.status(401).json({
      success: false,
      error: 'Token không hợp lệ'
    });
  }
};

// Grant access to specific roles
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Vai trò ${req.user.role} không có quyền truy cập tài nguyên này`
      });
    }
    next();
  };
};

// Optional auth - doesn't require authentication but adds user if token is valid
exports.optionalAuth = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      
      if (user && user.isActive && !user.isLocked) {
        req.user = user;
      }
    } catch (err) {
      // Token invalid or expired, but we continue without user
      console.log('Optional auth token invalid:', err.message);
    }
  }

  next();
};