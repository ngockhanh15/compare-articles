# Filter Word Frontend

Ứng dụng web frontend cho hệ thống kiểm tra trùng lặp nội dung, được xây dựng với React, Vite và Tailwind CSS.

## 📋 Mục lục

- [Tổng quan](#tổng-quan)
- [Công nghệ sử dụng](#công-nghệ-sử-dụng)
- [Cài đặt](#cài-đặt)
- [Cấu hình](#cấu-hình)
- [Chạy ứng dụng](#chạy-ứng-dụng)
- [Cấu trúc dự án](#cấu-trúc-dự-án)
- [Tính năng chính](#tính-năng-chính)
- [Components](#components)
- [Routing](#routing)
- [Styling](#styling)
- [API Integration](#api-integration)
- [Build & Deploy](#build--deploy)
- [Troubleshooting](#troubleshooting)

## 🎯 Tổng quan

Filter Word Frontend là giao diện người dùng cho hệ thống kiểm tra trùng lặp nội dung, cung cấp:
- Giao diện thân thiện để kiểm tra trùng lặp văn bản
- Quản lý tài liệu và upload file
- Dashboard admin để quản lý hệ thống
- Xác thực người dùng và phân quyền
- Hiển thị kết quả phân tích chi tiết

## 🛠 Công nghệ sử dụng

- **Framework**: React 19.1.0
- **Build Tool**: Vite 7.0.0
- **Styling**: Tailwind CSS 3.4.0
- **Routing**: React Router DOM 7.6.3
- **HTTP Client**: Axios 1.10.0
- **UI Components**: SweetAlert2 11.22.2
- **State Management**: React Context API
- **Development**: ESLint, PostCSS, Autoprefixer

## 🚀 Cài đặt

### Yêu cầu hệ thống
- Node.js >= 18.0.0
- npm hoặc yarn
- Backend API đang chạy (xem hướng dẫn backend)

### Bước 1: Clone repository
```bash
git clone <repository-url>
cd fe
```

### Bước 2: Cài đặt dependencies
```bash
npm install
```

### Bước 3: Cấu hình môi trường
```bash
# Tạo file .env.local (nếu cần)
cp .env.example .env.local
```

## ⚙️ Cấu hình

### Environment Variables (tùy chọn)
Tạo file `.env.local` nếu cần cấu hình:

```env
# API Base URL (mặc định: http://127.0.0.1:3000)
VITE_API_BASE_URL=http://127.0.0.1:3000

# App Title
VITE_APP_TITLE=Filter Word

# Debug mode
VITE_DEBUG=false
```

### Vite Configuration
File `vite.config.js` đã được cấu hình sẵn với:
- React plugin
- Hot Module Replacement (HMR)
- Build optimization

## 🏃‍♂️ Chạy ứng dụng

### Development mode
```bash
npm run dev
```
Ứng dụng sẽ chạy tại: `http://localhost:5173`

### Build cho production
```bash
npm run build
```

### Preview production build
```bash
npm run preview
```

### Lint code
```bash
npm run lint
```

## 📁 Cấu trúc dự án

```
fe/
├── public/
│   └── vite.svg                    # Favicon
├── src/
│   ├── assets/                     # Static assets
│   │   └── react.svg
│   ├── components/                 # React components
│   │   ├── AdminDashboard.jsx      # Dashboard admin
│   │   ├── AdminRoute.jsx          # Route bảo vệ admin
│   │   ├── AllDocumentsComparison.jsx # So sánh tất cả tài liệu
│   │   ├── DetailedComparison.jsx  # So sánh chi tiết
│   │   ├── DocumentManagement.jsx  # Quản lý tài liệu
│   │   ├── ForgotPassword.jsx      # Quên mật khẩu
│   │   ├── Header.jsx              # Header navigation
│   │   ├── Home.jsx                # Trang chủ
│   │   ├── Login.jsx               # Đăng nhập
│   │   ├── ProtectedRoute.jsx      # Route bảo vệ user
│   │   ├── Register.jsx            # Đăng ký
│   │   ├── SystemStats.jsx         # Thống kê hệ thống
│   │   ├── TextChecker.jsx         # Kiểm tra văn bản chính
│   │   └── UserManagement.jsx      # Quản lý người dùng
│   ├── contexts/
│   │   └── AuthContext.jsx         # Context xác thực
│   ├── services/
│   │   └── api.js                  # API service layer
│   ├── styles/
│   │   └── colors.js               # Color constants
│   ├── App.jsx                     # Root component
│   ├── App.css                     # Global styles
│   ├── index.css                   # Tailwind imports
│   └── main.jsx                    # Entry point
├── .gitignore                      # Git ignore rules
├── eslint.config.js                # ESLint configuration
├── index.html                      # HTML template
├── package.json                    # Dependencies & scripts
├── postcss.config.js               # PostCSS configuration
├── README.md                       # Tài liệu này
├── tailwind.config.js              # Tailwind configuration
└── vite.config.js                  # Vite configuration
```

## ✨ Tính năng chính

### 1. Xác thực & Phân quyền
- **Đăng ký/Đăng nhập**: Form validation, JWT token management
- **Quên mật khẩu**: Reset password via email
- **Protected Routes**: Bảo vệ routes theo role (User/Admin)
- **Auto logout**: Khi token hết hạn

### 2. Kiểm tra trùng lặp
- **Text Input**: Nhập trực tiếp văn bản cần kiểm tra
- **File Upload**: Hỗ trợ PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT
- **Real-time Results**: Hiển thị kết quả ngay lập tức
- **Detailed Analysis**: Phân tích chi tiết từng đoạn trùng lặp

### 3. Quản lý tài liệu
- **Upload Management**: Quản lý file đã upload
- **Document Library**: Thư viện tài liệu cá nhân
- **Quick Select**: Chọn nhanh từ tài liệu đã upload

### 4. Admin Dashboard
- **User Management**: Quản lý người dùng
- **System Statistics**: Thống kê hệ thống
- **Document Overview**: Tổng quan tài liệu
- **Performance Monitoring**: Giám sát hiệu suất

### 5. Responsive Design
- **Mobile First**: Thiết kế ưu tiên mobile
- **Tablet Support**: Tối ưu cho tablet
- **Desktop Enhanced**: Trải nghiệm tốt trên desktop

## 🧩 Components

### Core Components

#### `TextChecker.jsx`
Component chính để kiểm tra trùng lặp:
```jsx
// Features:
- Text input với word/character count
- File upload với drag & drop
- Options panel (sensitivity, language)
- Results display với charts
- Document selector từ library
```

#### `AuthContext.jsx`
Context quản lý authentication:
```jsx
// Provides:
- user: Current user info
- login(email, password): Login function
- logout(): Logout function
- isAuthenticated: Auth status
- loading: Loading state
```

#### `Header.jsx`
Navigation header:
```jsx
// Features:
- Logo và branding
- Navigation menu
- User dropdown
- Responsive mobile menu
- Logout functionality
```

### Route Components

#### `ProtectedRoute.jsx`
Bảo vệ routes cho user đã đăng nhập:
```jsx
// Usage:
<ProtectedRoute>
  <TextChecker />
</ProtectedRoute>
```

#### `AdminRoute.jsx`
Bảo vệ routes chỉ cho admin:
```jsx
// Usage:
<AdminRoute>
  <AdminDashboard />
</AdminRoute>
```

### Form Components

#### `Login.jsx` & `Register.jsx`
- Form validation
- Error handling
- Loading states
- Redirect after success

## 🛣 Routing

### Public Routes
- `/` - Trang chủ
- `/login` - Đăng nhập
- `/register` - Đăng ký
- `/forgot-password` - Quên mật khẩu

### Protected Routes (User)
- `/text-checker` - Kiểm tra văn bản
- `/documents` - Quản lý tài liệu
- `/detailed-comparison/:checkId` - Kết quả chi tiết
- `/all-documents-comparison/:checkId` - So sánh tất cả

### Admin Routes
- `/admin` - Dashboard admin
- `/system-stats` - Thống kê hệ thống

### Route Configuration
```jsx
// App.jsx
<Routes>
  <Route path="/" element={<Home />} />
  <Route path="/login" element={<Login />} />
  <Route 
    path="/text-checker" 
    element={
      <ProtectedRoute>
        <TextChecker />
      </ProtectedRoute>
    } 
  />
  <Route 
    path="/admin" 
    element={
      <AdminRoute>
        <AdminDashboard />
      </AdminRoute>
    } 
  />
</Routes>
```

## 🎨 Styling

### Tailwind CSS Configuration
Custom color palette trong `tailwind.config.js`:

```js
colors: {
  primary: { /* Blue shades */ },
  secondary: { /* Purple shades */ },
  accent: { /* Green shades */ },
  warning: { /* Orange shades */ },
  error: { /* Red shades */ },
  success: { /* Green shades */ },
  neutral: { /* Gray shades */ }
}
```

### Custom Gradients
```css
bg-gradient-primary    /* Blue gradient */
bg-gradient-secondary  /* Purple gradient */
bg-gradient-accent     /* Green gradient */
```

### Responsive Design
```jsx
// Mobile first approach
<div className="
  p-4 
  md:p-6 
  lg:p-8 
  grid 
  grid-cols-1 
  md:grid-cols-2 
  lg:grid-cols-3
">
```

### Component Styling Patterns
```jsx
// Card pattern
<div className="bg-white rounded-2xl shadow-xl p-6">

// Button patterns
<button className="
  px-4 py-2 
  bg-gradient-primary 
  text-white 
  rounded-lg 
  hover:shadow-lg 
  transition-all 
  duration-200
">

// Input patterns
<input className="
  w-full 
  p-4 
  border 
  border-neutral-300 
  rounded-xl 
  focus:outline-none 
  focus:ring-2 
  focus:ring-primary-500
">
```

## 🔌 API Integration

### API Service (`services/api.js`)
Centralized API calls:

```js
// Authentication
export const login = (email, password)
export const register = (name, email, password)
export const forgotPassword = (email)

// Text Checking
export const checkTextContent = (text, options)
export const uploadFileForCheck = (file, options)

// Document Management
export const getUserDocuments = (params)
export const uploadDocument = (formData)
export const getDocumentText = (documentId)

// System
export const getTreeStats = ()
```

### Error Handling
```js
// Global error interceptor
axios.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      // Auto logout on 401
      logout();
    }
    return Promise.reject(error);
  }
);
```

### Loading States
```jsx
const [isLoading, setIsLoading] = useState(false);

const handleSubmit = async () => {
  setIsLoading(true);
  try {
    const result = await api.checkText(text);
    // Handle success
  } catch (error) {
    // Handle error
  } finally {
    setIsLoading(false);
  }
};
```

## 🚀 Build & Deploy

### Development Build
```bash
npm run dev
# Starts dev server with HMR
# Access: http://localhost:5173
```

### Production Build
```bash
npm run build
# Creates optimized build in dist/
# Includes:
# - Code splitting
# - Asset optimization
# - Tree shaking
# - Minification
```

### Build Analysis
```bash
npm run build -- --analyze
# Analyze bundle size
```

### Deploy Options

#### Static Hosting (Netlify, Vercel)
```bash
# Build
npm run build

# Deploy dist/ folder
# Configure redirects for SPA:
# _redirects: /* /index.html 200
```

#### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 5173
CMD ["npm", "run", "preview"]
```

#### Nginx
```nginx
server {
    listen 80;
    root /var/www/html;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    location /api {
        proxy_pass http://backend:3000;
    }
}
```

## 🐛 Troubleshooting

### Common Issues

#### 1. API Connection Failed
```bash
# Check backend is running
curl http://127.0.0.1:3000/health

# Check CORS configuration
# Verify API base URL in code
```

#### 2. Build Errors
```bash
# Clear node_modules
rm -rf node_modules package-lock.json
npm install

# Clear Vite cache
rm -rf node_modules/.vite
npm run dev
```

#### 3. Styling Issues
```bash
# Rebuild Tailwind
npm run build

# Check Tailwind config
# Verify class names are correct
```

#### 4. Route Not Found (404)
```bash
# For SPA routing, configure server:
# Apache: .htaccess with RewriteRule
# Nginx: try_files directive
# Netlify: _redirects file
```

#### 5. Authentication Issues
```bash
# Check localStorage for token
localStorage.getItem('token')

# Verify token format and expiry
# Check API response headers
```

### Performance Optimization

#### Code Splitting
```jsx
// Lazy load components
const AdminDashboard = lazy(() => import('./components/AdminDashboard'));

<Suspense fallback={<div>Loading...</div>}>
  <AdminDashboard />
</Suspense>
```

#### Image Optimization
```jsx
// Use appropriate formats
<img 
  src="image.webp" 
  alt="Description"
  loading="lazy"
  className="w-full h-auto"
/>
```

#### Bundle Analysis
```bash
# Install analyzer
npm install --save-dev rollup-plugin-analyzer

# Add to vite.config.js
import { analyzer } from 'rollup-plugin-analyzer'

export default defineConfig({
  plugins: [react(), analyzer()]
})
```

## 📱 Mobile Considerations

### Touch Interactions
```jsx
// Touch-friendly buttons
<button className="
  min-h-[44px] 
  min-w-[44px] 
  touch-manipulation
">

// Swipe gestures for mobile
const handleTouchStart = (e) => {
  // Handle touch start
};
```

### Responsive Images
```jsx
<img 
  srcSet="
    image-320w.jpg 320w,
    image-640w.jpg 640w,
    image-1280w.jpg 1280w
  "
  sizes="
    (max-width: 320px) 280px,
    (max-width: 640px) 600px,
    1200px
  "
  src="image-640w.jpg"
  alt="Description"
/>
```

### PWA Ready
```js
// Add to vite.config.js for PWA
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}']
      }
    })
  ]
})
```

## 📞 Hỗ trợ

### Development Tips
1. Sử dụng React DevTools để debug
2. Kiểm tra Network tab cho API calls
3. Sử dụng console.log() để debug state
4. Kiểm tra localStorage cho token

### Common Commands
```bash
# Start development
npm run dev

# Build production
npm run build

# Lint code
npm run lint

# Clear cache
rm -rf node_modules/.vite

# Update dependencies
npm update
```

## 📝 Ghi chú

- **Port mặc định**: 5173 (development)
- **API Base URL**: http://127.0.0.1:3000
- **Supported Browsers**: Chrome 90+, Firefox 88+, Safari 14+
- **Mobile Support**: iOS 12+, Android 8+
- **File Upload Limit**: 50MB (theo backend)

---

**Phiên bản**: 1.0.0  
**Cập nhật lần cuối**: 2024  
**Tác giả**: Development Team
