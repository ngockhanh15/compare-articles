const express = require('express');
const {
  register,
  login,
  logout,
  getMe,
  forgotPassword,
  resetPassword,
  updateDetails,
  updatePassword,
  verifyEmail,
  resendEmailVerification
} = require('../controllers/authController');

const { protect } = require('../middleware/auth');
const { 
  authLimiter, 
  passwordResetLimiter, 
  emailVerificationLimiter 
} = require('../middleware/rateLimiter');

const {
  validateRegister,
  validateLogin,
  validateForgotPassword,
  validateResetPassword,
  validateUpdateDetails,
  validateUpdatePassword,
  validateResendVerification
} = require('../validators/authValidator');

const router = express.Router();

// Public routes
router.post('/register', authLimiter, validateRegister, register);
router.post('/login', authLimiter, validateLogin, login);
router.post('/forgotpassword', passwordResetLimiter, validateForgotPassword, forgotPassword);
router.put('/resetpassword/:resettoken', authLimiter, validateResetPassword, resetPassword);
router.get('/verify-email/:token', verifyEmail);
router.post('/resend-verification', emailVerificationLimiter, validateResendVerification, resendEmailVerification);


// Protected routes
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);
router.put('/updatedetails', protect, validateUpdateDetails, updateDetails);
router.put('/updatepassword', protect, validateUpdatePassword, updatePassword);

module.exports = router;