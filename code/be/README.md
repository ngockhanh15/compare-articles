# Filter Word Backend API

Hệ thống backend cho ứng dụng kiểm tra trùng lặp nội dung sử dụng thuật toán AVL Tree và xử lý ngôn ngữ tiếng Việt.

## 📋 Mục lục

- [Tổng quan](#tổng-quan)
- [Công nghệ sử dụng](#công-nghệ-sử-dụng)
- [Cài đặt](#cài-đặt)
- [Cấu hình](#cấu-hình)
- [Chạy ứng dụng](#chạy-ứng-dụng)
- [API Documentation](#api-documentation)
- [Cấu trúc dự án](#cấu-trúc-dự-án)
- [Tính năng chính](#tính-năng-chính)
- [Scripts](#scripts)
- [Troubleshooting](#troubleshooting)

## 🎯 Tổng quan

Filter Word Backend là một RESTful API được xây dựng để:
- Kiểm tra trùng lặp nội dung văn bản tiếng Việt
- Quản lý tài liệu và người dùng
- Xử lý upload file đa định dạng (PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT)
- Sử dụng thuật toán AVL Tree để tối ưu hóa tìm kiếm
- Hỗ trợ xác thực JWT và phân quyền người dùng

## 🛠 Công nghệ sử dụng

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB với Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **File Processing**: 
  - PDF: pdf-parse
  - Word: mammoth
  - Excel: xlsx
- **Email**: Nodemailer
- **Security**: bcryptjs, express-rate-limit
- **Development**: nodemon

## 🚀 Cài đặt

### Yêu cầu hệ thống
- Node.js >= 16.0.0
- MongoDB >= 4.4
- npm hoặc yarn

### Bước 1: Clone repository
```bash
git clone <repository-url>
cd be
```

### Bước 2: Cài đặt dependencies
```bash
npm install
```

### Bước 3: Cấu hình môi trường
```bash
cp .env.example .env
```

## ⚙️ Cấu hình

Chỉnh sửa file `.env` với thông tin của bạn:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/filter_word_db
# Hoặc MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database_name

# JWT Configuration
JWT_SECRET=your_jwt_secret_here_replace_with_strong_random_string
JWT_EXPIRE=7

# Email Configuration (Gmail App Password)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_gmail_app_password
EMAIL_FROM=your_email@gmail.com
EMAIL_FROM_NAME=Filter Word App

# Frontend URL
FRONTEND_URL=http://localhost:5173

# Default Admin Account
ADMIN_NAME=Admin User
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=your_secure_admin_password
```

### Tạo JWT Secret mạnh
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

## 🏃‍♂️ Chạy ứng dụng

### Development mode
```bash
npm run dev
```

### Production mode
```bash
npm start
```

Server sẽ chạy tại: `http://127.0.0.1:3000`

### Health Check
```bash
curl http://127.0.0.1:3000/health
```

## 📚 API Documentation

### Base URL
```
http://127.0.0.1:3000/api
```

### Authentication Endpoints

#### Đăng ký
```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "Tên người dùng",
  "email": "user@example.com",
  "password": "password123"
}
```

#### Đăng nhập
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

#### Quên mật khẩu
```http
POST /api/auth/forgot-password
Content-Type: application/json

{
  "email": "user@example.com"
}
```

### Document Endpoints

#### Upload tài liệu
```http
POST /api/documents/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: <file>
title: "Tiêu đề tài liệu"
description: "Mô tả tài liệu"
```

#### Lấy danh sách tài liệu
```http
GET /api/documents?page=1&limit=10&status=processed
Authorization: Bearer <token>
```

#### Kiểm tra trùng lặp văn bản
```http
POST /api/check-text
Authorization: Bearer <token>
Content-Type: application/json

{
  "text": "Nội dung cần kiểm tra",
  "options": {
    "sensitivity": "medium",
    "language": "vi"
  }
}
```

#### Kiểm tra trùng lặp file
```http
POST /api/check-file
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: <file>
options: {"sensitivity": "medium", "language": "vi"}
```

### System Endpoints

#### Thống kê hệ thống
```http
GET /api/tree-stats
Authorization: Bearer <token>
```

## 📁 Cấu trúc dự án

```
be/
├── config/
│   └── database.js              # Cấu hình MongoDB
├── controllers/
│   ├── authController.js        # Xử lý authentication
│   ├── documentController.js    # Xử lý tài liệu
│   ├── plagiarismController.js  # Xử lý kiểm tra trùng lặp
│   └── userUploadController.js  # Xử lý upload người dùng
├── middleware/
│   ├── auth.js                  # Middleware xác thực
│   └── rateLimiter.js          # Middleware giới hạn request
├── models/
│   ├── Document.js             # Model tài liệu
│   ├── PlagiarismCheck.js      # Model kiểm tra trùng lặp
│   ├── TextCheck.js            # Model kiểm tra văn bản
│   └── User.js                 # Model người dùng
├── routes/
│   ├── api.js                  # Routes API chính
│   ├── auth.js                 # Routes authentication
│   ├── documents.js            # Routes tài liệu
│   ├── stopwords.js            # Routes stopwords
│   └── userUpload.js           # Routes upload
├── scripts/
│   ├── initializeDocumentAVL.js    # Khởi tạo AVL Tree
│   ├── initializePlagiarismSystem.js # Khởi tạo hệ thống
│   ├── testStopwords.js            # Test stopwords
│   └── updateEmailVerified.js      # Cập nhật email verified
├── services/
│   ├── DocumentAVLService.js       # Service AVL Tree
│   ├── PlagiarismCacheService.js   # Service cache
│   ├── PlagiarismDetectionService.js # Service phát hiện trùng lặp
│   └── VietnameseStopwordService.js # Service stopwords tiếng Việt
├── utils/
│   ├── createDefaultAdmin.js       # Tạo admin mặc định
│   ├── sendEmail.js               # Gửi email
│   └── TreeAVL.js                 # Cài đặt AVL Tree
├── validators/
│   └── authValidator.js           # Validation cho auth
├── uploads/                       # Thư mục lưu file upload
├── .env.example                   # File cấu hình mẫu
├── .gitignore                     # Git ignore
├── index.js                       # Entry point
├── package.json                   # Dependencies
├── README.md                      # Tài liệu này
└── vietnamese-stopwords.txt       # Danh sách stopwords tiếng Việt
```

## ✨ Tính năng chính

### 1. Hệ thống Authentication
- Đăng ký/Đăng nhập với JWT
- Xác thực email
- Quên mật khẩu
- Phân quyền người dùng (User/Admin)

### 2. Quản lý tài liệu
- Upload đa định dạng file
- Trích xuất text từ PDF, Word, Excel, PowerPoint
- Lưu trữ và quản lý metadata
- Phân loại theo người dùng

### 3. Kiểm tra trùng lặp
- Thuật toán AVL Tree để tối ưu tìm kiếm
- Xử lý stopwords tiếng Việt
- Tính toán độ tương đồng
- Cache kết quả để tăng hiệu suất

### 4. Bảo mật
- Rate limiting
- Input validation
- JWT authentication
- Password hashing với bcrypt

## 🔧 Scripts

### Khởi tạo hệ thống
```bash
# Khởi tạo AVL Tree với tài liệu có sẵn
node scripts/initializeDocumentAVL.js

# Khởi tạo hệ thống phát hiện trùng lặp
node scripts/initializePlagiarismSystem.js

# Test stopwords
node scripts/testStopwords.js

# Cập nhật email verified cho user
node scripts/updateEmailVerified.js
```

### Tạo admin mặc định
Admin sẽ được tạo tự động khi khởi động server với thông tin từ file `.env`:
- Email: `ADMIN_EMAIL`
- Password: `ADMIN_PASSWORD`
- Name: `ADMIN_NAME`

## 🐛 Troubleshooting

### Lỗi kết nối MongoDB
```bash
# Kiểm tra MongoDB đang chạy
mongosh

# Hoặc với MongoDB Atlas, kiểm tra:
# 1. Connection string đúng format
# 2. IP whitelist
# 3. Username/password chính xác
```

### Lỗi JWT Secret
```bash
# Tạo JWT secret mới
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Lỗi Email
```bash
# Với Gmail, cần tạo App Password:
# 1. Bật 2-factor authentication
# 2. Tạo App Password tại: https://myaccount.google.com/apppasswords
# 3. Sử dụng App Password thay vì password thường
```

### Lỗi File Upload
```bash
# Kiểm tra thư mục uploads có quyền ghi
chmod 755 uploads/

# Kiểm tra dung lượng file (max 50MB)
# Kiểm tra định dạng file được hỗ trợ
```

### Lỗi AVL Tree
```bash
# Khởi tạo lại AVL Tree
node scripts/initializeDocumentAVL.js

# Kiểm tra log để xem lỗi cụ thể
tail -f logs/app.log
```

### Performance Issues
```bash
# Kiểm tra memory usage
node --inspect index.js

# Tối ưu MongoDB indexes
# Sử dụng MongoDB Compass để analyze queries
```

## 📞 Hỗ trợ

Nếu gặp vấn đề, vui lòng:
1. Kiểm tra logs trong console
2. Xem file `.env` đã cấu hình đúng chưa
3. Đảm bảo MongoDB đang chạy
4. Kiểm tra network connectivity

## 📝 Ghi chú

- Server mặc định chạy trên `127.0.0.1:3000`
- Tất cả API endpoints yêu cầu `Content-Type: application/json` trừ upload file
- Rate limiting: 5 requests/15 phút cho mỗi IP
- File upload tối đa: 50MB
- JWT token hết hạn sau 7 ngày (có thể cấu hình trong `.env`)

## 🔄 Workflow Development

### 1. Khởi động lần đầu
```bash
# 1. Cài đặt dependencies
npm install

# 2. Cấu hình environment
cp .env.example .env
# Chỉnh sửa .env với thông tin thực tế

# 3. Khởi động MongoDB (local)
mongod

# 4. Chạy server
npm run dev
```

### 2. Kiểm tra hệ thống hoạt động
```bash
# Health check
curl http://127.0.0.1:3000/health

# Kiểm tra database connection
curl http://127.0.0.1:3000/api/tree-stats
```

### 3. Test API
```bash
# Đăng ký user mới
curl -X POST http://127.0.0.1:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"password123"}'

# Đăng nhập
curl -X POST http://127.0.0.1:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

## 🔐 Google OAuth

### Cấu hình Google OAuth
1. Tạo Google OAuth credentials tại [Google Cloud Console](https://console.cloud.google.com/)
2. Cập nhật file `.env` với `CLIENT_ID` và `CLIENT_SECRET`
3. Chạy test để kiểm tra cấu hình:
   ```bash
   npm run test:google
   ```
4. Xem chi tiết hướng dẫn tại `GOOGLE_OAUTH_SETUP.md`

### Test Google OAuth
```bash
# Kiểm tra cấu hình
npm run test:google

# Kiểm tra endpoint
curl http://127.0.0.1:3000/auth/google/config

# Sửa lỗi duplicate users (nếu có)
npm run fix:duplicates
```

## 🚀 Deployment

### Production Checklist
- [ ] Cấu hình MongoDB production
- [ ] Thiết lập JWT secret mạnh
- [ ] Cấu hình email service
- [ ] Thiết lập HTTPS
- [ ] Cấu hình CORS cho domain production
- [ ] Thiết lập monitoring và logging
- [ ] Backup strategy cho database
- [ ] Load balancing (nếu cần)
- [ ] Cấu hình Google OAuth cho production

### Environment Variables Production
```env
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb+srv://...
JWT_SECRET=<strong-secret>
CORS_ORIGIN=https://yourdomain.com
```

---

**Phiên bản**: 1.0.0  
**Cập nhật lần cuối**: 2024  
**Tác giả**: Development Team