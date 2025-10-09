# 👁️ Hướng dẫn Preview VCNV

## 🎯 Tính năng Preview

Bạn có thể **xem trước** giao diện chơi VCNV với dữ liệu đã nhập **mà không cần lưu** vào database.

## 🚀 Cách sử dụng

### Bước 1: Nhập dữ liệu VCNV
1. Vào trang **Upload câu hỏi trận đấu**
2. Scroll đến phần **🏃 VƯỢT CHƯỚNG NGẠI VẬT**
3. Nhập thông tin:
   - **Ảnh tổng** (tùy chọn - nếu không có sẽ dùng ảnh mặc định)
   - **Câu hỏi** (ít nhất 1 câu)
   - **Đáp án**
   - **Số chữ**

### Bước 2: Click "Xem trước"
1. Click nút **"👁️ Xem trước"** ở góc phải phần VCNV
2. Trang game sẽ mở trong tab mới với badge **PREVIEW**
3. Dữ liệu được lấy từ form, **chưa lưu vào database**

### Bước 3: Test game
1. Chơi thử với dữ liệu đã nhập
2. Kiểm tra:
   - ✅ Câu hỏi hiển thị đúng
   - ✅ Số ô chữ khớp với đáp án
   - ✅ Đáp án chính xác
   - ✅ Ảnh lật đúng thứ tự
3. Nếu thấy sai → Đóng tab preview → Sửa lại → Preview lại

### Bước 4: Lưu (khi đã OK)
Khi đã hài lòng với preview:
1. Đóng tab preview
2. Quay lại trang upload
3. Click **"💾 Lưu Tất Cả Câu Hỏi"**

## 💡 Lưu ý

### Dữ liệu tối thiểu để preview
- **Ít nhất 1 câu hỏi** với đầy đủ: Câu hỏi, Đáp án, Số chữ
- **Ảnh tổng**: Không bắt buộc (sẽ dùng ảnh mặc định nếu chưa upload)

### Preview với câu hỏi chưa đầy đủ
- Nếu chỉ nhập 3/5 câu → Preview sẽ chỉ hiển thị 3 câu
- Các câu chưa nhập sẽ bị bỏ qua
- Game vẫn chơi được bình thường với số câu đã nhập

### Dữ liệu preview
- Lưu trong **sessionStorage** của trình duyệt
- Tự động xóa khi đóng tab preview
- Không ảnh hưởng đến database
- Mỗi lần preview sẽ lấy dữ liệu mới nhất từ form

## 🎨 Phân biệt các chế độ

### PREVIEW (Badge cam)
- Dữ liệu từ form upload
- Chưa lưu vào database
- Dùng để test trước khi lưu

### DEMO (Badge xanh)
- Dữ liệu mẫu cố định
- Dùng để xem ví dụ
- Truy cập: `/game/vcnv-demo`

### LIVE (Không badge)
- Dữ liệu từ database
- Đã lưu và sẵn sàng chơi
- Truy cập: `/game/vcnv-play?matchId=123`

## 🔧 Troubleshooting

### "Vui lòng nhập đầy đủ thông tin VCNV"
**Nguyên nhân:** Chưa nhập đủ thông tin cho ít nhất 1 câu hỏi

**Giải pháp:**
1. Kiểm tra lại form VCNV
2. Đảm bảo ít nhất 1 câu có đầy đủ:
   - Câu hỏi (không để trống)
   - Đáp án (không để trống)
   - Số chữ (phải > 0)

### "Không tìm thấy dữ liệu preview"
**Nguyên nhân:** SessionStorage bị xóa hoặc mở link trực tiếp

**Giải pháp:**
1. Quay lại trang upload
2. Click nút "Xem trước" lại
3. Không mở link preview trực tiếp

### Ảnh không hiển thị trong preview
**Nguyên nhân:** Chưa upload ảnh tổng

**Giải pháp:**
- Upload ảnh tổng trước khi preview
- Hoặc để trống → Sẽ dùng ảnh mặc định

### Số ô chữ không khớp
**Nguyên nhân:** Nhập sai số chữ

**Giải pháp:**
1. Đếm lại số ký tự trong đáp án (bao gồm dấu cách)
2. Ví dụ: "HÀ NỘI" = 6 chữ (H-À-[space]-N-Ộ-I)
3. Sửa lại số chữ
4. Preview lại

## 📊 Workflow khuyến nghị

```
1. Nhập câu hỏi đầu tiên
   ↓
2. Preview để test
   ↓
3. Nếu OK → Nhập tiếp câu 2
   Nếu sai → Sửa lại câu 1
   ↓
4. Preview lại
   ↓
5. Lặp lại cho đến khi đủ 5 câu
   ↓
6. Preview lần cuối
   ↓
7. Lưu vào database
```

## 🎯 Best Practices

### 1. Test từng câu
- Nhập 1 câu → Preview → Sửa nếu cần
- Tránh nhập hết 5 câu rồi mới test

### 2. Kiểm tra số chữ
- Đếm kỹ trước khi nhập
- Test bằng cách nhập đáp án trong preview

### 3. Upload ảnh sớm
- Upload ảnh tổng trước khi nhập câu hỏi
- Dễ hình dung câu hỏi liên quan đến ảnh

### 4. Lưu thường xuyên
- Sau khi preview OK → Lưu ngay
- Tránh mất dữ liệu khi đóng tab

## 🔗 Links hữu ích

- **Trang demo**: `/game/vcnv-demo`
- **Hướng dẫn đầy đủ**: `/docs/VCNV-GUIDE.md`
- **Upload câu hỏi**: `/admin/match-upload?matchId=...`

---

**Phiên bản:** 1.0  
**Cập nhật:** 2025-01-09

