# 🏃 VCNV - Vượt Chướng Ngại Vật

## 📋 Tổng quan

**Vượt Chướng Ngại Vật (VCNV)** là một mini-game tương tác trong trận đấu KD App, lấy cảm hứng từ chương trình truyền hình Đường Lên Đỉnh Olympia.

### Đặc điểm
- 🎯 **5 câu hỏi** liên tiếp
- 🖼️ **1 ảnh lớn** chia thành 5 mảnh ghép (4 góc + 1 giữa)
- ✅ **Trả lời đúng** → Lật mở 1 mảnh ảnh
- 🔤 **Đáp án theo số chữ** (giống Wheel of Fortune)
- 🎨 **Giao diện đẹp** với animation mượt mà

## 🚀 Quick Start

### 1. Xem Demo
```
http://localhost:3000/game/vcnv-demo
```

### 2. Upload câu hỏi
1. Đăng nhập Admin
2. Vào **Quản lý trận đấu** → Chọn trận → **Upload câu hỏi**
3. Scroll đến phần **VCNV**
4. Upload ảnh tổng + Nhập 5 câu hỏi
5. Click **"👁️ Xem trước"** để test
6. Click **"💾 Lưu"** khi OK

### 3. Chơi game
```
http://localhost:3000/game/vcnv-play?matchId=123
```

## 📚 Tài liệu

### Hướng dẫn chi tiết
- **[VCNV-GUIDE.md](./VCNV-GUIDE.md)** - Hướng dẫn đầy đủ về VCNV
- **[VCNV-PREVIEW-GUIDE.md](./VCNV-PREVIEW-GUIDE.md)** - Hướng dẫn sử dụng tính năng Preview

### Nội dung chính

#### Upload câu hỏi
- Cách upload ảnh tổng
- Cách nhập câu hỏi, đáp án, số chữ
- Tips chọn ảnh và thiết kế câu hỏi

#### Preview
- Xem trước với dữ liệu từ form (chưa lưu)
- Test từng câu trước khi lưu
- Phân biệt PREVIEW / DEMO / LIVE

#### Chơi game
- Luật chơi
- Thứ tự lật ảnh
- Cách nhập đáp án

## 🎮 Các chế độ

### 🟠 PREVIEW Mode
**URL:** `/game/vcnv-play?preview=true`

**Đặc điểm:**
- Dữ liệu từ form upload (sessionStorage)
- Chưa lưu vào database
- Dùng để test trước khi lưu
- Badge màu cam

**Cách dùng:**
1. Nhập dữ liệu trong form upload
2. Click nút "👁️ Xem trước"
3. Test game
4. Đóng tab → Sửa → Preview lại

### 🟢 DEMO Mode
**URL:** `/game/vcnv-play?demo=true` hoặc `/game/vcnv-demo`

**Đặc điểm:**
- Dữ liệu mẫu cố định
- 5 câu hỏi về Việt Nam
- Dùng để xem ví dụ
- Badge màu xanh

**Cách dùng:**
1. Truy cập `/game/vcnv-demo`
2. Click "🎮 Chơi Demo"
3. Trải nghiệm game

### ⚪ LIVE Mode
**URL:** `/game/vcnv-play?matchId=123`

**Đặc điểm:**
- Dữ liệu từ database
- Đã lưu và sẵn sàng chơi
- Dùng trong trận đấu thật
- Không có badge

**Cách dùng:**
1. Admin upload và lưu câu hỏi
2. Người chơi truy cập với matchId
3. Chơi game chính thức

## 🎨 Giao diện

### Layout
```
┌─────────────────────────────────────────┐
│    🏃 VƯỢT CHƯỚNG NGẠI VẬT [PREVIEW]    │
│   Trả lời đúng để lật mở từng mảnh ảnh! │
└─────────────────────────────────────────┘

Progress: ▓▓▓▓░░░░░░░░░░░░░░░░░ (2/5)

┌──────────────────┬──────────────────────┐
│   Ảnh ghép       │  Chướng ngại vật 1   │
│                  │                      │
│   [1] [2]        │  Câu hỏi: Đây là     │
│   [4] [3]        │  quốc gia nào?       │
│     [5]          │                      │
│                  │  [V][I][Ế][T][ ][N]  │
│   Mảnh 1,2 đã    │  [A][M]              │
│   lật, còn lại   │                      │
│   đang che       │  [Nhập đáp án...]    │
│                  │  [✓ Trả lời]         │
└──────────────────┴──────────────────────┘
```

### Màu sắc
- **Background**: Gradient tím (#667eea → #764ba2)
- **Mảnh chưa lật**: Đen mờ + blur
- **Mảnh đã lật**: Hiển thị rõ
- **Ô chữ trống**: Trắng mờ
- **Ô chữ đã điền**: Xanh lá (#10b981)
- **Badge PREVIEW**: Cam (#f59e0b)
- **Badge DEMO**: Xanh (#10b981)

## 🔧 Cấu trúc kỹ thuật

### Files
```
KD/
├── views/
│   ├── admin/
│   │   └── match-upload.html          # Form upload (có nút Preview)
│   └── game/
│       ├── vcnv-play.html             # Trang chơi VCNV
│       └── vcnv-demo.html             # Trang demo
├── public/
│   ├── js/
│   │   ├── match-upload.js            # Logic upload + preview
│   │   └── vcnv-play.js               # Logic game
│   └── demo-vcnv-data.json            # Dữ liệu demo
├── host_dan_data-node/
│   └── routes/
│       └── match-api.js               # API endpoint
└── docs/
    ├── VCNV-README.md                 # File này
    ├── VCNV-GUIDE.md                  # Hướng dẫn đầy đủ
    └── VCNV-PREVIEW-GUIDE.md          # Hướng dẫn preview
```

### API Endpoints
```
GET  /game/vcnv-play?preview=true      # Preview mode
GET  /game/vcnv-play?demo=true         # Demo mode
GET  /game/vcnv-play?matchId=123       # Live mode
GET  /game/vcnv-demo                   # Demo landing page
GET  /api/matches/:matchId/vcnv        # Get VCNV data
```

### Data Structure
```json
{
  "main_image_url": "https://...",
  "questions": [
    {
      "order": 0,
      "question_text": "Câu hỏi",
      "answer_text": "ĐÁP ÁN",
      "word_count": 6
    }
  ]
}
```

## 📊 Workflow

### Admin Upload
```
1. Tạo trận đấu
   ↓
2. Vào trang upload
   ↓
3. Upload ảnh tổng VCNV
   ↓
4. Nhập câu hỏi 1
   ↓
5. Preview để test
   ↓
6. Sửa nếu cần
   ↓
7. Nhập câu 2-5
   ↓
8. Preview lần cuối
   ↓
9. Lưu vào database
```

### Player Game
```
1. Truy cập game
   ↓
2. Xem câu hỏi 1
   ↓
3. Nhập đáp án
   ↓
4. Nếu đúng → Lật mảnh 1
   Nếu sai → Thử lại
   ↓
5. Chuyển câu 2
   ↓
6. Lặp lại cho đến câu 5
   ↓
7. Hoàn thành → Xem ảnh đầy đủ
```

## 💡 Tips & Best Practices

### Chọn ảnh tốt
- ✅ Tỷ lệ 16:9 (1920x1080, 1280x720)
- ✅ Nội dung rõ ràng, dễ nhận diện
- ✅ Màu sắc tương phản tốt
- ❌ Tránh ảnh quá nhiều chi tiết nhỏ

### Thiết kế câu hỏi
- ✅ Câu hỏi ngắn gọn (< 100 ký tự)
- ✅ Đáp án 3-10 chữ
- ✅ Độ khó tăng dần
- ✅ Liên quan đến ảnh (nếu có thể)

### Đếm số chữ
- ✅ Đếm cả dấu cách
- ✅ Ví dụ: "HÀ NỘI" = 6 chữ
- ❌ Không tính dấu câu

### Test kỹ
- ✅ Preview từng câu
- ✅ Test đáp án chính xác
- ✅ Kiểm tra số ô chữ
- ✅ Xem ảnh lật đúng thứ tự

## 🐛 Troubleshooting

### Ảnh không hiển thị
- Kiểm tra URL ảnh
- Kiểm tra Data Node online
- Upload lại ảnh

### Số ô chữ không khớp
- Đếm lại số chữ (bao gồm dấu cách)
- Sửa lại trong form
- Preview lại

### Preview không hoạt động
- Kiểm tra đã nhập đủ thông tin
- Xem console log (F12)
- Thử refresh trang upload

### Không lật được ảnh
- Kiểm tra đáp án chính xác
- Không phân biệt hoa/thường
- Xem console log để debug

## 📞 Support

Nếu gặp vấn đề:
1. Đọc [VCNV-GUIDE.md](./VCNV-GUIDE.md)
2. Đọc [VCNV-PREVIEW-GUIDE.md](./VCNV-PREVIEW-GUIDE.md)
3. Kiểm tra console log (F12)
4. Liên hệ admin

## 🎯 Roadmap

### Version 1.0 (Current)
- ✅ Upload câu hỏi VCNV
- ✅ Preview với dữ liệu từ form
- ✅ Chơi game với ảnh ghép 5 mảnh
- ✅ Demo mode

### Version 1.1 (Planned)
- ⏳ Multiplayer mode
- ⏳ Leaderboard
- ⏳ Timer cho mỗi câu
- ⏳ Sound effects

### Version 2.0 (Future)
- ⏳ Custom số mảnh ảnh (3, 5, 7, 9)
- ⏳ Hints system
- ⏳ Achievements
- ⏳ Mobile app

---

**Version:** 1.0  
**Last Updated:** 2025-01-09  
**Author:** KD App Team

