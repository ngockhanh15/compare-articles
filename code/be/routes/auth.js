const express = require('express');
const {
  register,
  login,
  logout,
  getMe,
  forgotPassword,
  resetPassword,
  updateDetails,
  updatePassword
  // verifyEmail, // Không cần thiết nữa
  // resendEmailVerification // Không cần thiết nữa
} = require('../controllers/authController');

const { protect, optionalAuth } = require('../middleware/auth');
// Rate limiters disabled
// const { 
//   authLimiter, 
//   passwordResetLimiter
//   // emailVerificationLimiter // Không cần thiết nữa
// } = require('../middleware/rateLimiter');

const {
  validateRegister,
  validateLogin,
  validateForgotPassword,
  validateResetPassword,
  validateUpdateDetails,
  validateUpdatePassword
  // validateResendVerification // Không cần thiết nữa
} = require('../validators/authValidator');

const router = express.Router();

// Public routes (allow optional auth to attribute admin-created accounts) - RATE LIMITING DISABLED
router.post('/register', optionalAuth, validateRegister, register);
router.post('/login', validateLogin, login);
router.post('/forgotpassword', validateForgotPassword, forgotPassword);
router.put('/resetpassword/:resettoken', validateResetPassword, resetPassword);
// router.get('/verify-email/:token', verifyEmail); // Không cần thiết nữa
// router.post('/resend-verification', emailVerificationLimiter, validateResendVerification, resendEmailVerification); // Không cần thiết nữa


// Protected routes
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);
router.put('/updatedetails', protect, validateUpdateDetails, updateDetails);
router.put('/updatepassword', protect, validateUpdatePassword, updatePassword);

module.exports = router;