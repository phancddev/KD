# 🏃 Hướng dẫn sử dụng Vượt Chướng Ngại Vật (VCNV)

## 📋 Tổng quan

Vượt Chướng Ngại Vật là một mini-game tương tác trong trận đấu, với cơ chế:
- **5 câu hỏi** liên tiếp
- **1 ảnh lớn** được chia thành 5 mảnh ghép (4 góc + 1 giữa)
- **Trả lời đúng** → Lật mở 1 mảnh ảnh
- **Đáp án theo số chữ** (giống Wheel of Fortune)

## 🎮 Demo

Truy cập: **http://localhost:3000/game/vcnv-demo**

Hoặc chơi trực tiếp: **http://localhost:3000/game/vcnv-play?demo=true**

## 📝 Hướng dẫn Upload câu hỏi VCNV

### Bước 1: Truy cập trang upload
1. Đăng nhập với tài khoản Admin
2. Vào **Admin Panel** → **Quản lý trận đấu**
3. Chọn trận đấu → Click **Upload câu hỏi**

### Bước 2: Upload ảnh tổng
1. Scroll đến phần **🏃 VƯỢT CHƯỚNG NGẠI VẬT**
2. Click vào ô **"Ảnh tổng Vượt Chướng Ngại Vật"**
3. Chọn 1 ảnh (khuyến nghị tỷ lệ 16:9, kích thước tối thiểu 1200x675px)
4. Ảnh sẽ được tự động chia thành 5 mảnh

### Bước 3: Nhập 5 câu hỏi
Mỗi câu hỏi cần:
- **Câu hỏi**: Nội dung câu hỏi (text)
- **Đáp án**: Đáp án chính xác
- **Số chữ**: Số ký tự trong đáp án (bao gồm cả dấu cách)

**Ví dụ:**
```
Câu hỏi: Đây là quốc gia nào?
Đáp án: VIỆT NAM
Số chữ: 8 (V-I-Ế-T-[space]-N-A-M)
```

### Bước 4: Xem trước
1. Click nút **"👁️ Xem trước"** ở góc phải phần VCNV
2. Trang game sẽ mở trong tab mới
3. Kiểm tra:
   - Ảnh hiển thị đúng
   - Câu hỏi hiển thị đầy đủ
   - Số ô chữ khớp với đáp án
   - Cơ chế lật ảnh hoạt động

### Bước 5: Lưu
Click **"💾 Lưu Tất Cả Câu Hỏi"** ở cuối trang

## 🎯 Cơ chế chơi

### Luật chơi
1. Người chơi xem câu hỏi đầu tiên
2. Nhập đáp án vào ô input
3. Click **"Trả lời"** hoặc nhấn **Enter**
4. Nếu đúng:
   - Hiển thị đáp án với animation
   - Lật mở mảnh ảnh tương ứng
   - Chuyển sang câu tiếp theo sau 2 giây
5. Nếu sai:
   - Hiển thị thông báo lỗi
   - Cho phép thử lại
6. Hoàn thành 5 câu → Xem ảnh đầy đủ

### Thứ tự lật ảnh
- Câu 1 → Lật mảnh 1 (góc trên trái)
- Câu 2 → Lật mảnh 2 (góc trên phải)
- Câu 3 → Lật mảnh 3 (góc dưới phải)
- Câu 4 → Lật mảnh 4 (góc dưới trái)
- Câu 5 → Lật mảnh 5 (giữa)

## 🎨 Giao diện

### Layout
```
┌─────────────────────────────────────────┐
│         🏃 VƯỢT CHƯỚNG NGẠI VẬT         │
│   Trả lời đúng để lật mở từng mảnh ảnh! │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  Progress Bar: ▓▓▓▓░░░░░░░░░░░░░░░░░   │
└─────────────────────────────────────────┘

┌──────────────────┬──────────────────────┐
│   Ảnh ghép 5     │  Chướng ngại vật 1   │
│   mảnh (4 góc    │                      │
│   + 1 giữa)      │  Câu hỏi: ...        │
│                  │                      │
│   [1] [2]        │  Đáp án:             │
│   [4] [3]        │  [_][_][_][_][_]     │
│     [5]          │                      │
│                  │  [Nhập đáp án...]    │
│                  │  [✓ Trả lời]         │
└──────────────────┴──────────────────────┘
```

### Màu sắc
- **Background**: Gradient tím (#667eea → #764ba2)
- **Mảnh ảnh chưa lật**: Đen mờ với blur
- **Mảnh ảnh đã lật**: Hiển thị rõ ràng
- **Ô chữ chưa điền**: Trắng mờ
- **Ô chữ đã điền**: Xanh lá (#10b981)
- **Thông báo đúng**: Xanh lá
- **Thông báo sai**: Đỏ (#ef4444)

## 🔧 Cấu trúc dữ liệu

### API Response
```json
{
  "success": true,
  "data": {
    "main_image_url": "https://example.com/image.jpg",
    "questions": [
      {
        "order": 0,
        "question_text": "Câu hỏi 1",
        "answer_text": "ĐÁP ÁN",
        "word_count": 6
      }
    ]
  }
}
```

### Match.json Structure
```json
{
  "sections": {
    "vcnv": {
      "main_image_url": "/uploads/matches/123/vcnv-main.jpg",
      "questions": [
        {
          "order": 0,
          "question_text": "Câu hỏi",
          "answer": "Đáp án",
          "word_count": 5
        }
      ]
    }
  }
}
```

## 📊 API Endpoints

### GET /api/matches/:matchId/vcnv
Lấy dữ liệu VCNV để chơi game

**Response:**
```json
{
  "success": true,
  "data": {
    "main_image_url": "...",
    "questions": [...]
  }
}
```

### GET /game/vcnv-play?matchId=123
Trang chơi VCNV với dữ liệu thật

### GET /game/vcnv-play?demo=true
Trang chơi VCNV với dữ liệu demo

### GET /game/vcnv-demo
Trang giới thiệu demo

## 💡 Tips

### Chọn ảnh tốt
- Tỷ lệ 16:9 (1920x1080, 1280x720, etc.)
- Nội dung rõ ràng, dễ nhận diện
- Không quá nhiều chi tiết nhỏ
- Màu sắc tương phản tốt

### Thiết kế câu hỏi
- Câu hỏi ngắn gọn, dễ hiểu
- Đáp án không quá dài (3-10 chữ)
- Độ khó tăng dần từ câu 1 → câu 5
- Liên quan đến ảnh (nếu có thể)

### Số chữ
- Đếm cả dấu cách
- Ví dụ: "HÀ NỘI" = 6 chữ (H-À-[space]-N-Ộ-I)
- Không tính dấu câu

## 🐛 Troubleshooting

### Ảnh không hiển thị
- Kiểm tra URL ảnh có đúng không
- Kiểm tra Data Node có online không
- Kiểm tra quyền truy cập file

### Số ô chữ không khớp
- Kiểm tra lại `word_count`
- Đếm cả dấu cách trong đáp án

### Không lật được ảnh
- Kiểm tra đáp án có chính xác không (không phân biệt hoa/thường)
- Kiểm tra console log để debug

## 📞 Hỗ trợ

Nếu gặp vấn đề, vui lòng:
1. Kiểm tra console log (F12)
2. Kiểm tra Network tab
3. Liên hệ admin

---

**Phiên bản:** 1.0  
**Cập nhật:** 2025-01-09

