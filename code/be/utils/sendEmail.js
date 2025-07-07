const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  // Create transporter
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT),
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: {
      rejectUnauthorized: false
    }
  });

  // Define email options
  const mailOptions = {
    from: `${process.env.EMAIL_FROM}`,
    to: options.email,
    subject: options.subject,
    html: options.html,
  };

  // Send email
  console.log('Attempting to send email to:', options.email);
  console.log('Email config:', {
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    user: process.env.EMAIL_USER,
    from: process.env.EMAIL_FROM
  });
  
  const info = await transporter.sendMail(mailOptions);
  console.log('Email sent successfully:', info.messageId);
  return info;
};

// Email templates
const getPasswordResetEmailTemplate = (resetUrl, name) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Đặt lại mật khẩu</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
            .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🔐 Đặt lại mật khẩu</h1>
            </div>
            <div class="content">
                <p>Xin chào <strong>${name}</strong>,</p>
                <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.</p>
                <p>Nhấn vào nút bên dưới để đặt lại mật khẩu:</p>
                <div style="text-align: center;">
                    <a href="${resetUrl}" class="button">Đặt lại mật khẩu</a>
                </div>
                <div class="warning">
                    <strong>⚠️ Lưu ý quan trọng:</strong>
                    <ul>
                        <li>Link này chỉ có hiệu lực trong <strong>10 phút</strong></li>
                        <li>Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này</li>
                        <li>Không chia sẻ link này với bất kỳ ai</li>
                    </ul>
                </div>
                <p>Nếu nút không hoạt động, bạn có thể copy và paste link sau vào trình duyệt:</p>
                <p style="word-break: break-all; background: #f1f1f1; padding: 10px; border-radius: 5px;">
                    ${resetUrl}
                </p>
            </div>
            <div class="footer">
                <p>Email này được gửi tự động, vui lòng không trả lời.</p>
                <p>&copy; 2024 Filter Word App. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
  `;
};

// Email verification template - KHÔNG CẦN THIẾT NỮA
/*
const getEmailVerificationTemplate = (verifyUrl, name) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Xác thực email</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
            .info { background: #d1ecf1; border: 1px solid #bee5eb; padding: 15px; border-radius: 5px; margin: 20px 0; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>✉️ Xác thực email</h1>
            </div>
            <div class="content">
                <p>Xin chào <strong>${name}</strong>,</p>
                <p>Cảm ơn bạn đã đăng ký tài khoản Filter Word App!</p>
                <p>Để hoàn tất quá trình đăng ký, vui lòng xác thực địa chỉ email của bạn:</p>
                <div style="text-align: center;">
                    <a href="${verifyUrl}" class="button">Xác thực email</a>
                </div>
                <div class="info">
                    <strong>ℹ️ Thông tin:</strong>
                    <ul>
                        <li>Link xác thực có hiệu lực trong <strong>24 giờ</strong></li>
                        <li>Sau khi xác thực, bạn có thể sử dụng đầy đủ tính năng của ứng dụng</li>
                    </ul>
                </div>
                <p>Nếu nút không hoạt động, bạn có thể copy và paste link sau vào trình duyệt:</p>
                <p style="word-break: break-all; background: #f1f1f1; padding: 10px; border-radius: 5px;">
                    ${verifyUrl}
                </p>
            </div>
            <div class="footer">
                <p>Email này được gửi tự động, vui lòng không trả lời.</p>
                <p>&copy; 2024 Filter Word App. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
  `;
};
*/

const getWelcomeEmailTemplate = (name) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Chào mừng bạn!</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
            .feature { background: white; padding: 20px; margin: 15px 0; border-radius: 5px; border-left: 4px solid #667eea; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🎉 Chào mừng bạn!</h1>
            </div>
            <div class="content">
                <p>Xin chào <strong>${name}</strong>,</p>
                <p>Chào mừng bạn đến với <strong>Filter Word App</strong>! Tài khoản của bạn đã được kích hoạt thành công.</p>
                
                <h3>🚀 Những gì bạn có thể làm:</h3>
                <div class="feature">
                    <h4>🔍 Kiểm tra văn bản</h4>
                    <p>Phát hiện và lọc các từ khóa không phù hợp trong văn bản của bạn</p>
                </div>
                <div class="feature">
                    <h4>📄 Xử lý file</h4>
                    <p>Hỗ trợ kiểm tra nội dung từ file TXT, PDF, DOC, DOCX</p>
                </div>
                <div class="feature">
                    <h4>📊 Báo cáo chi tiết</h4>
                    <p>Xem thống kê và phân tích chi tiết về nội dung đã kiểm tra</p>
                </div>
                
                <p>Bắt đầu sử dụng ngay hôm nay và trải nghiệm những tính năng tuyệt vời!</p>
            </div>
            <div class="footer">
                <p>Cảm ơn bạn đã tin tưởng sử dụng dịch vụ của chúng tôi!</p>
                <p>&copy; 2024 Filter Word App. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
  `;
};

module.exports = {
  sendEmail,
  getPasswordResetEmailTemplate,
  // getEmailVerificationTemplate, // Không cần thiết nữa
  getWelcomeEmailTemplate
};