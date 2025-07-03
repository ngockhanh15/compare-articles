# Text Compare Tool

Ứng dụng so sánh và lọc văn bản được xây dựng với React + Vite + Tailwind CSS.

## Tính năng

- ✅ So sánh hai văn bản
- ✅ Lọc từ khóa trong văn bản
- ✅ Giao diện đẹp với Tailwind CSS
- ✅ Responsive design

## Cấu trúc thư mục

```
src/
├── components/          # Các component UI
│   ├── Header.jsx      # Header của ứng dụng
│   ├── TextCompare.jsx # Component so sánh văn bản
│   └── WordFilter.jsx  # Component lọc từ khóa
├── services/           # Các service gọi API
│   └── api.js         # Các hàm gọi API
├── App.jsx            # Component chính
├── main.jsx           # Entry point
└── index.css          # Tailwind CSS

```

## Cài đặt và chạy

1. Cài đặt dependencies:
```bash
npm install
```

2. Chạy development server:
```bash
npm run dev
```

3. Build cho production:
```bash
npm run build
```

## Công nghệ sử dụng

- **React 19** - UI Framework
- **Vite** - Build tool
- **Tailwind CSS** - CSS Framework
- **Axios** - HTTP Client (cho API calls)

## API Endpoints

Dự án được thiết kế để kết nối với backend API:

- `POST /api/compare` - So sánh hai văn bản
- `GET /api/history` - Lấy lịch sử so sánh
- `POST /api/filter` - Lọc từ khóa trong văn bản

## Mở rộng

Để thêm tính năng mới:

1. Tạo component mới trong `src/components/`
2. Thêm API function trong `src/services/api.js`
3. Import và sử dụng trong `App.jsx`
