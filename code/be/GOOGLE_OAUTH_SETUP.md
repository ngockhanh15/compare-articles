# Hướng dẫn cấu hình Google OAuth

## Bước 1: Tạo Google OAuth Credentials

1. Truy cập [Google Cloud Console](https://console.cloud.google.com/)
2. Tạo project mới hoặc chọn project có sẵn
3. Vào **APIs & Services** > **Credentials**
4. Click **Create Credentials** > **OAuth 2.0 Client IDs**
5. Chọn **Web application**
6. Điền thông tin:
   - **Name**: Filter Word App
   - **Authorized JavaScript origins**: 
     - `http://localhost:5173` (Frontend development)
     - `http://localhost:3000` (Backend development)
   - **Authorized redirect URIs**:
     - `http://localhost:3000/auth/google/callback` (Backend callback)
7. Click **Create**

## Bước 2: Cấu hình Environment Variables

Tạo file `.env` trong thư mục `be/` với nội dung:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/filter_word_db

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

# Google OAuth Configuration
CLIENT_ID=your_google_client_id_here
CLIENT_SECRET=your_google_client_secret_here
SESSION_SECRET=your_session_secret_here
```

## Bước 3: Cập nhật Google OAuth Credentials

1. Copy **Client ID** và **Client Secret** từ Google Cloud Console
2. Paste vào file `.env`:
   - `CLIENT_ID`: Client ID từ Google
   - `CLIENT_SECRET`: Client Secret từ Google

## Bước 4: Kiểm tra cấu hình

1. Khởi động backend:
   ```bash
   cd be
   npm install
   npm start
   ```

2. Kiểm tra log để đảm bảo không có lỗi:
   ```
   ✅ Database connected
   ✅ Default admin created/verified
   ✅ Plagiarism detection system initialized
   ✅ Document AVL Tree initialized
   🎉 Application initialization completed!
   ```

3. Nếu có warning về Google OAuth credentials, hãy kiểm tra lại file `.env`

## Bước 5: Test Google OAuth

1. Test cấu hình:
   ```bash
   npm run test:google
   ```

2. Test flow đăng nhập:
   ```bash
   npm run test:google-flow
   ```

3. Khởi động frontend:
   ```bash
   cd fe
   npm install
   npm run dev
   ```

4. Truy cập `http://localhost:5173`
5. Click "Đăng nhập với Google"
6. Nếu thành công, bạn sẽ được redirect về trang chủ và thấy thông tin user trên header

## Troubleshooting

### Lỗi "Google OAuth không được cấu hình"
- Kiểm tra file `.env` có `CLIENT_ID` và `CLIENT_SECRET` không
- Đảm bảo không có khoảng trắng thừa trong giá trị

### Lỗi "Lỗi khi xử lý đăng nhập Google"
- Kiểm tra callback URL trong Google Cloud Console
- Đảm bảo callback URL là `http://localhost:3000/auth/google/callback`
- Kiểm tra log backend để xem lỗi chi tiết

### Lỗi "E11000 duplicate key error"
- Chạy script sửa lỗi duplicate users:
  ```bash
  npm run fix:duplicates
  ```
- Script này sẽ tự động merge các user có cùng email và giữ lại user cũ nhất
- Sau khi chạy script, thử đăng nhập Google lại

### Lỗi CORS
- Đảm bảo `FRONTEND_URL` trong `.env` đúng với URL frontend
- Kiểm tra CORS configuration trong backend

### Lỗi Database
- Đảm bảo MongoDB đang chạy
- Kiểm tra `MONGODB_URI` trong `.env`

## Lưu ý quan trọng

1. **Không commit file `.env`** vào git
2. **Bảo mật Client Secret** - không chia sẻ với người khác
3. **Cập nhật redirect URIs** khi deploy production
4. **Sử dụng HTTPS** trong production
5. **Tạo JWT Secret mạnh** cho production

## Production Deployment

Khi deploy production, cần cập nhật:

1. **Authorized JavaScript origins**:
   - `https://yourdomain.com`

2. **Authorized redirect URIs**:
   - `https://yourdomain.com/auth/google/callback`

3. **Environment variables**:
   - `NODE_ENV=production`
   - `FRONTEND_URL=https://yourdomain.com`
   - `BASE_URL=https://yourdomain.com` 