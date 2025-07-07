const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { 
  sendEmail, 
  getPasswordResetEmailTemplate, 
  // getEmailVerificationTemplate, // Không cần thiết nữa
  getWelcomeEmailTemplate 
} = require('../utils/sendEmail');
const { validationResult } = require('express-validator');

// Helper function to send token response
const sendTokenResponse = async (user, statusCode, res, message = '') => {
  // Create token
  const token = user.getSignedJwtToken();

  // Update last login
  user.lastLogin = new Date();
  await user.save();

  const options = {
    expires: new Date(
      Date.now() + parseInt(process.env.JWT_EXPIRE) * 24 * 60 * 60 * 1000,
    ),
    httpOnly: true,
  };

  if (process.env.NODE_ENV === 'production') {
    options.secure = true;
  }

  res
    .status(statusCode)
    .cookie('token', token, options)
    .json({
      success: true,
      message,
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          emailVerified: user.emailVerified,
          lastLogin: user.lastLogin
        }
      }
    });
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Dữ liệu không hợp lệ',
        details: errors.array()
      });
    }

    const { name, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'Email này đã được sử dụng'
      });
    }

    // Create user with email already verified
    const user = await User.create({
      name,
      email,
      password,
      emailVerified: true // Đặt email đã được xác thực ngay từ đầu
    });

    // Send welcome email
    try {
      await sendEmail({
        email: user.email,
        subject: 'Chào mừng bạn đến với Filter Word App!',
        html: getWelcomeEmailTemplate(user.name)
      });
    } catch (err) {
      console.error('Welcome email send error:', err);
      // Don't fail registration if welcome email fails
    }

    // Return success response with token
    sendTokenResponse(user, 201, res, 'Đăng ký thành công! Chào mừng bạn đến với Filter Word App.');
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({
      success: false,
      error: 'Lỗi server khi đăng ký tài khoản'
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Dữ liệu không hợp lệ',
        details: errors.array()
      });
    }

    const { email, password } = req.body;

    // Check for user
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Email hoặc mật khẩu không đúng'
      });
    }

    // Check if account is locked
    if (user.isLocked) {
      return res.status(423).json({
        success: false,
        error: 'Tài khoản đã bị khóa do đăng nhập sai quá nhiều lần. Vui lòng thử lại sau.'
      });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        error: 'Tài khoản đã bị vô hiệu hóa'
      });
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      // Increment login attempts
      await user.incLoginAttempts();
      
      return res.status(401).json({
        success: false,
        error: 'Email hoặc mật khẩu không đúng'
      });
    }

    // Reset login attempts on successful login
    if (user.loginAttempts > 0) {
      await user.resetLoginAttempts();
    }

    sendTokenResponse(user, 200, res, 'Đăng nhập thành công');
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({
      success: false,
      error: 'Lỗi server khi đăng nhập'
    });
  }
};

// @desc    Log user out / clear cookie
// @route   GET /api/auth/logout
// @access  Private
exports.logout = async (req, res, next) => {
  try {
    res.cookie('token', 'none', {
      expires: new Date(Date.now() + 10 * 1000),
      httpOnly: true,
    });

    res.status(200).json({
      success: true,
      message: 'Đăng xuất thành công'
    });
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({
      success: false,
      error: 'Lỗi server khi đăng xuất'
    });
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          emailVerified: user.emailVerified,
          lastLogin: user.lastLogin,
          createdAt: user.createdAt
        }
      }
    });
  } catch (err) {
    console.error('Get me error:', err);
    res.status(500).json({
      success: false,
      error: 'Lỗi server khi lấy thông tin người dùng'
    });
  }
};

// @desc    Update user details
// @route   PUT /api/auth/updatedetails
// @access  Private
exports.updateDetails = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Dữ liệu không hợp lệ',
        details: errors.array()
      });
    }

    const fieldsToUpdate = {
      name: req.body.name,
    };

    // Check if email is being updated
    if (req.body.email && req.body.email !== req.user.email) {
      // Check if new email already exists
      const existingUser = await User.findOne({ email: req.body.email });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          error: 'Email này đã được sử dụng'
        });
      }
      
      fieldsToUpdate.email = req.body.email;
      // Không cần reset emailVerified nữa vì không có xác thực email
    }

    const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      message: 'Cập nhật thông tin thành công',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          emailVerified: user.emailVerified
        }
      }
    });
  } catch (err) {
    console.error('Update details error:', err);
    res.status(500).json({
      success: false,
      error: 'Lỗi server khi cập nhật thông tin'
    });
  }
};

// @desc    Update password
// @route   PUT /api/auth/updatepassword
// @access  Private
exports.updatePassword = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Dữ liệu không hợp lệ',
        details: errors.array()
      });
    }

    const user = await User.findById(req.user.id).select('+password');

    // Check current password
    if (!(await user.matchPassword(req.body.currentPassword))) {
      return res.status(401).json({
        success: false,
        error: 'Mật khẩu hiện tại không đúng'
      });
    }

    user.password = req.body.newPassword;
    await user.save();

    sendTokenResponse(user, 200, res, 'Đổi mật khẩu thành công');
  } catch (err) {
    console.error('Update password error:', err);
    res.status(500).json({
      success: false,
      error: 'Lỗi server khi đổi mật khẩu'
    });
  }
};

// @desc    Forgot password
// @route   POST /api/auth/forgotpassword
// @access  Public
exports.forgotPassword = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Dữ liệu không hợp lệ',
        details: errors.array()
      });
    }

    const user = await User.findOne({ email: req.body.email });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy người dùng với email này'
      });
    }

    // Get reset token
    const resetToken = user.getResetPasswordToken();

    await user.save({ validateBeforeSave: false });

    // Create reset url
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

    try {
      await sendEmail({
        email: user.email,
        subject: 'Đặt lại mật khẩu - Filter Word App',
        html: getPasswordResetEmailTemplate(resetUrl, user.name)
      });

      res.status(200).json({
        success: true,
        message: 'Email đặt lại mật khẩu đã được gửi'
      });
    } catch (err) {
      console.error('Email send error:', err);
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;

      await user.save({ validateBeforeSave: false });

      return res.status(500).json({
        success: false,
        error: 'Không thể gửi email đặt lại mật khẩu'
      });
    }
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({
      success: false,
      error: 'Lỗi server khi xử lý yêu cầu đặt lại mật khẩu'
    });
  }
};

// @desc    Reset password
// @route   PUT /api/auth/resetpassword/:resettoken
// @access  Public
exports.resetPassword = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Dữ liệu không hợp lệ',
        details: errors.array()
      });
    }

    // Get hashed token
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(req.params.resettoken)
      .digest('hex');

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        error: 'Token không hợp lệ hoặc đã hết hạn'
      });
    }

    // Set new password
    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    
    // Reset login attempts
    user.loginAttempts = 0;
    user.lockUntil = undefined;
    
    await user.save();

    sendTokenResponse(user, 200, res, 'Đặt lại mật khẩu thành công');
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({
      success: false,
      error: 'Lỗi server khi đặt lại mật khẩu'
    });
  }
};

// @desc    Verify email - KHÔNG CẦN THIẾT NỮA
// @route   GET /api/auth/verify-email/:token
// @access  Public
/*
exports.verifyEmail = async (req, res, next) => {
  try {
    // Get hashed token
    const emailVerificationToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');

    const user = await User.findOne({
      emailVerificationToken,
      emailVerificationExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        error: 'Token xác thực không hợp lệ hoặc đã hết hạn'
      });
    }

    // Verify email
    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpire = undefined;
    await user.save();

    // Send welcome email
    try {
      await sendEmail({
        email: user.email,
        subject: 'Chào mừng bạn đến với Filter Word App!',
        html: getWelcomeEmailTemplate(user.name)
      });
    } catch (err) {
      console.error('Welcome email send error:', err);
      // Don't fail the verification if welcome email fails
    }

    res.status(200).json({
      success: true,
      message: 'Email đã được xác thực thành công',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          emailVerified: user.emailVerified
        }
      }
    });
  } catch (err) {
    console.error('Verify email error:', err);
    res.status(500).json({
      success: false,
      error: 'Lỗi server khi xác thực email'
    });
  }
};
*/

// @desc    Resend email verification - KHÔNG CẦN THIẾT NỮA
// @route   POST /api/auth/resend-verification
// @access  Public
/*
exports.resendEmailVerification = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Dữ liệu không hợp lệ',
        details: errors.array()
      });
    }

    const user = await User.findOne({ email: req.body.email });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy người dùng với email này'
      });
    }

    if (user.emailVerified) {
      return res.status(400).json({
        success: false,
        error: 'Email đã được xác thực'
      });
    }

    // Generate new verification token
    const verificationToken = user.getEmailVerificationToken();
    await user.save({ validateBeforeSave: false });

    // Create verification URL
    const verifyUrl = `${process.env.FRONTEND_URL}/verify-email/${verificationToken}`;

    try {
      await sendEmail({
        email: user.email,
        subject: 'Xác thực email - Filter Word App',
        html: getEmailVerificationTemplate(verifyUrl, user.name)
      });

      res.status(200).json({
        success: true,
        message: 'Email xác thực đã được gửi lại'
      });
    } catch (err) {
      console.error('Email send error:', err);
      user.emailVerificationToken = undefined;
      user.emailVerificationExpire = undefined;
      await user.save({ validateBeforeSave: false });

      return res.status(500).json({
        success: false,
        error: 'Không thể gửi email xác thực'
      });
    }
  } catch (err) {
    console.error('Resend verification error:', err);
    res.status(500).json({
      success: false,
      error: 'Lỗi server khi gửi lại email xác thực'
    });
  }
};
*/

