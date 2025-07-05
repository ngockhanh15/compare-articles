# Filter Word Application

Ứng dụng so sánh nội dung văn bản

## 📋 Mục lục

- [Yêu cầu hệ thống](#yêu-cầu-hệ-thống)
- [Cài đặt](#cài-đặt)
- [Cấu hình](#cấu-hình)
- [Chạy ứng dụng](#chạy-ứng-dụng)
- [API Documentation](#api-documentation)
- [Cấu trúc dự án](#cấu-trúc-dự-án)
- [Troubleshooting](#troubleshooting)

## 🔧 Yêu cầu hệ thống

- **Node.js**: >= 22.x
- **npm**: >= 10.x
- **MongoDB**: >= 8.x
- **Git**: Để clone repository

## 📦 Cài đặt

### 1. Clone repository

```bash
git clone https://github.com/khainam23/compare-articles.git
cd compare-articles
```

### 2. Cài đặt dependencies

### !!! Tạo 2 terminal khác nhau cho be và fe

#### Backend
```bash
-- Terminal 1
cd be
npm install
```

#### Frontend
```bash
-- Terminal 2
cd fe
npm install
```

## ⚙️ Cấu hình

### 1. Cấu hình Backend

Tạo file `.env` trong thư mục `be/`:

```bash
-- Ở terminal be 
cp .env.example .env
```

Chỉnh sửa file `.env` với thông tin của bạn (trong .env.example tui có hướng dẫn rồi é):

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# API Configuration
API_VERSION=v1
API_PREFIX=/api

# CORS Configuration
CORS_ORIGIN=http://localhost:5173

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/compare-articles

# JWT Configuration
JWT_SECRET=your_strong_jwt_secret_here
JWT_EXPIRE=7

# Email Configuration (Gmail App Password)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_gmail_app_password

# Password Reset
RESET_PASSWORD_EXPIRE=10m
FRONTEND_URL=http://localhost:5173

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=5
```

### 2. Cấu hình MongoDB (Này tùy chọn mongo chạy đâu nha, tui thì sd local)

#### Option 1: MongoDB Local
1. Cài đặt MongoDB Community Server
2. Khởi động MongoDB service
3. Sử dụng URI: `mongodb://localhost:27017/compare-articles`

#### Option 2: MongoDB Atlas (Cloud)
1. Tạo tài khoản tại [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Tạo cluster mới
3. Lấy connection string và thay thế trong `.env`

### 3. Cấu hình Email (Tùy chọn)

Để sử dụng tính năng reset password:

1. Bật 2-Factor Authentication cho Gmail
2. Tạo App Password: [Hướng dẫn](https://support.google.com/accounts/answer/185833)
3. Sử dụng App Password trong file `.env`

## 🚀 Chạy ứng dụng

### Development Mode

#### 1. Khởi động Backend
```bash
npm start
```
Backend sẽ chạy tại: http://localhost:3000

#### 2. Khởi động Frontend (Terminal fe) - nhớ kiểm tra src/servicces/api.js có đúng port hong nhe
```bash
npm run dev
```
Frontend sẽ chạy tại: http://localhost:5173

## 📚 API Documentation - Tổng quan thôi è chưa đủ đâu

### Base URL
```
http://localhost:3000/api/v1
```

### Authentication Endpoints
- `POST /auth/register` - Đăng ký tài khoản
- `POST /auth/login` - Đăng nhập
- `POST /auth/forgot-password` - Quên mật khẩu
- `POST /auth/reset-password` - Reset mật khẩu
- `GET /auth/profile` - Lấy thông tin profile (cần token)

### Main Features
- `POST /check-text` - Kiểm tra văn bản
- `POST /upload-file` - Upload và kiểm tra file
- `GET /forbidden-words` - Lấy danh sách từ cấm
- `POST /forbidden-words` - Thêm từ cấm (Admin)

## 📁 Cấu trúc dự án

```
filter_word/
├── be/                     # Backend (Node.js + Express)
│   ├── config/            # Cấu hình database
│   ├── controllers/       # Controllers xử lý logic
│   ├── middleware/        # Middleware (auth, rate limit)
│   ├── models/           # MongoDB models
│   ├── routes/           # API routes
│   ├── utils/            # Utilities (email, etc.)
│   ├── validators/       # Input validation
│   ├── .env.example      # Environment template
│   ├── index.js          # Entry point
│   └── package.json      # Dependencies
│
├── fe/                    # Frontend (React + Vite)
│   ├── public/           # Static assets
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── contexts/     # React contexts
│   │   ├── services/     # API services
│   │   ├── styles/       # CSS styles
│   │   ├── App.jsx       # Main App component
│   │   └── main.jsx      # Entry point
│   ├── index.html        # HTML template
│   ├── package.json      # Dependencies
│   └── vite.config.js    # Vite configuration
│
└── README.md             # Hướng dẫn này
```

## 🔍 Troubleshooting

### Lỗi thường gặp

#### 1. MongoDB Connection Error
```
Error: connect ECONNREFUSED 127.0.0.1:27017
```
**Giải pháp:**
- Kiểm tra MongoDB service đã chạy chưa
- Kiểm tra MONGODB_URI trong file `.env`

#### 2. Port đã được sử dụng
```
Error: listen EADDRINUSE: address already in use :::3000
```
Này hay bị do quên tắt ở dự án trước [Chân ái 💁‍♂️](https://stackoverflow.com/a/65434145/22900738)

# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:3000 | xargs kill -9
```

#### 3. CORS Error
```
Access to fetch at 'http://localhost:3000' from origin 'http://localhost:5173' has been blocked by CORS policy
```
**Giải pháp:**
- Kiểm tra CORS_ORIGIN trong file `.env`
- Đảm bảo frontend URL đúng

#### 4. JWT Token Error
```
JsonWebTokenError: invalid token
```
**Giải pháp:**
- Kiểm tra JWT_SECRET trong file `.env`
- Clear localStorage và đăng nhập lại

### Kiểm tra logs

#### Backend logs
```bash
cd be
npm run dev
```

#### Frontend logs
Mở Developer Tools (F12) trong browser

## 🛠️ Scripts hữu ích

### Backend
```bash
npm run dev      # Chạy development mode với nodemon
npm start        # Chạy production mode
```

### Frontend
```bash
npm run dev      # Chạy development server
npm run build    # Build cho production
npm run preview  # Preview build
npm run lint     # Kiểm tra code style
```

**Chúc bạn code vui vẻ! 😉**