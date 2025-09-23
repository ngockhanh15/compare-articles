# Hướng dẫn Deploy lên Vercel

## Các thay đổi đã thực hiện

### 1. Cấu hình Server
- Sửa `index.js` để không listen khi ở production mode
- Thêm export app để Vercel có thể sử dụng

### 2. Package.json
- Thay đổi script `start` từ `nodemon` thành `node`
- Thêm script `build`
- Thêm engines specification

### 3. Vercel Configuration
- Tạo `vercel.json` với cấu hình routing
- Tạo thư mục `api/` với entry point
- Tạo `.vercelignore` để loại trừ files không cần thiết

### 4. CORS & Session
- Cập nhật CORS để hỗ trợ multiple origins
- Sửa session sameSite cho production

## Environment Variables cần thiết trên Vercel

Bạn cần set các environment variables sau trên Vercel dashboard:

### Database
- `MONGODB_URI` - MongoDB connection string
- `DB_NAME` - Database name

### Authentication
- `JWT_SECRET` - JWT secret key
- `SESSION_SECRET` - Session secret key

### Google OAuth (nếu sử dụng)
- `CLIENT_ID` - Google OAuth Client ID
- `CLIENT_SECRET` - Google OAuth Client Secret
- `BASE_URL` - URL của backend trên Vercel (ví dụ: https://your-app.vercel.app)

### Frontend
- `FRONTEND_URL` - URL của frontend (ví dụ: https://your-frontend.vercel.app)

### Email (nếu sử dụng)
- `EMAIL_HOST` - SMTP host
- `EMAIL_PORT` - SMTP port
- `EMAIL_USER` - Email username
- `EMAIL_PASS` - Email password
- `FROM_EMAIL` - From email address

### Other
- `NODE_ENV` - set to "production"

## Các bước deploy

1. **Chuẩn bị repository**
   ```bash
   git add .
   git commit -m "Prepare for Vercel deployment"
   git push origin main
   ```

2. **Deploy trên Vercel**
   - Truy cập https://vercel.com
   - Import repository
   - Chọn thư mục `be` làm root directory
   - Set environment variables
   - Deploy

3. **Cập nhật Google OAuth callback URL**
   - Truy cập Google Cloud Console
   - Cập nhật Authorized redirect URIs với URL mới:
     `https://your-vercel-app.vercel.app/auth/google/callback`

4. **Test deployment**
   - Kiểm tra health endpoint: `https://your-vercel-app.vercel.app/health`
   - Test API endpoints
   - Test Google OAuth flow

## Lưu ý quan trọng

1. **File uploads**: Vercel có giới hạn về file uploads. Nếu cần upload files lớn, cân nhắc sử dụng cloud storage (AWS S3, Cloudinary, etc.)

2. **Database connections**: MongoDB Atlas được khuyến nghị cho production

3. **Session storage**: Vercel là serverless nên session có thể không persist giữa các requests. Cân nhắc sử dụng JWT tokens thay vì sessions cho authentication

4. **Cold starts**: Serverless functions có thể có cold start delay

5. **Timeouts**: Vercel có giới hạn timeout 30 giây cho functions

## Troubleshooting

### Lỗi CORS
- Kiểm tra FRONTEND_URL environment variable
- Đảm bảo frontend URL được thêm vào allowedOrigins

### Lỗi Database connection
- Kiểm tra MONGODB_URI
- Đảm bảo MongoDB Atlas cho phép connections từ Vercel (0.0.0.0/0)

### Google OAuth không hoạt động
- Kiểm tra CLIENT_ID và CLIENT_SECRET
- Cập nhật callback URL trong Google Console
- Kiểm tra BASE_URL environment variable