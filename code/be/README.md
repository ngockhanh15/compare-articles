# Filter Word API

Một API đơn giản để quản lý và lọc từ ngữ sử dụng Express.js.

## Cài đặt

1. Cài đặt dependencies:
```bash
npm install
```

2. Cài đặt dev dependencies (tùy chọn):
```bash
npm install --save-dev
```

## Chạy ứng dụng

### Development mode (với nodemon):
```bash
npm run dev
```

### Production mode:
```bash
npm start
```

Server sẽ chạy tại: `http://localhost:3000`

## API Endpoints

### Base URL: `http://localhost:3000`

### Health Check
- **GET** `/health` - Kiểm tra trạng thái server

### Words Management
- **GET** `/api/words` - Lấy danh sách tất cả từ
- **GET** `/api/words/:id` - Lấy từ theo ID
- **POST** `/api/words` - Thêm từ mới
- **PUT** `/api/words/:id` - Cập nhật từ
- **DELETE** `/api/words/:id` - Xóa từ

### Text Filtering
- **POST** `/api/filter` - Lọc văn bản

## Ví dụ sử dụng

### Thêm từ mới:
```bash
curl -X POST http://localhost:3000/api/words \
  -H "Content-Type: application/json" \
  -d '{"word": "badword", "filtered": true}'
```

### Lọc văn bản:
```bash
curl -X POST http://localhost:3000/api/filter \
  -H "Content-Type: application/json" \
  -d '{"text": "This is a test message"}'
```

### Lấy danh sách từ:
```bash
curl http://localhost:3000/api/words
```

## Cấu trúc dự án

```
be_filter_word/
├── index.js          # File chính của ứng dụng
├── routes/
│   └── api.js        # API routes
├── package.json      # Dependencies và scripts
├── .env             # Environment variables
├── .gitignore       # Git ignore rules
└── README.md        # Tài liệu này
```

## Environment Variables

Tạo file `.env` với các biến sau:

```
PORT=3000
NODE_ENV=development
API_VERSION=v1
API_PREFIX=/api
CORS_ORIGIN=*
```

## Features

- ✅ RESTful API
- ✅ CORS support
- ✅ Error handling
- ✅ JSON parsing
- ✅ Health check endpoint
- ✅ Word management (CRUD)
- ✅ Text filtering functionality
- ✅ Environment configuration