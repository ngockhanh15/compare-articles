const rateLimit = require('express-rate-limit');

// General rate limiter
exports.generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: 'Quá nhiều yêu cầu từ IP này, vui lòng thử lại sau 15 phút'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict rate limiter for auth endpoints
exports.authLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 5, // limit each IP to 5 requests per windowMs
  message: {
    success: false,
    error: 'Quá nhiều lần thử đăng nhập, vui lòng thử lại sau 15 phút'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip successful requests
  skipSuccessfulRequests: true,
});

// Password reset rate limiter
exports.passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // limit each IP to 3 password reset requests per hour
  message: {
    success: false,
    error: 'Quá nhiều yêu cầu đặt lại mật khẩu, vui lòng thử lại sau 1 giờ'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Email verification rate limiter
exports.emailVerificationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // limit each IP to 3 email verification requests per hour
  message: {
    success: false,
    error: 'Quá nhiều yêu cầu xác thực email, vui lòng thử lại sau 1 giờ'
  },
  standardHeaders: true,
  legacyHeaders: false,
});