# Test Concurrent Upload - Hướng Dẫn

## 📋 Mục Đích

Test script này kiểm tra:
1. ✅ Upload tuần tự hoạt động đúng (baseline)
2. ✅ Upload đồng thời KHÔNG bị race condition
3. ✅ Validation số lượng câu hỏi (max 6 câu/thí sinh)
4. ✅ Validation order không trùng lặp

## 🚀 Cách Chạy Test

### Bước 1: Cài đặt dependencies

```bash
cd KD
npm install node-fetch form-data
```

### Bước 2: Tạo trận đấu test

```bash
# Chạy script tạo trận đấu
node test-create-match.js
```

Lưu lại `matchId` được tạo (ví dụ: `match_ABC123_test`)

### Bước 3: Chạy test

```bash
node test-concurrent-upload.js <matchId>
```

Ví dụ:
```bash
node test-concurrent-upload.js match_ABC123_test
```

## 📊 Kết Quả Mong Đợi

```
🧪 CONCURRENT UPLOAD TEST SUITE
============================================================
Match ID: match_ABC123_test
KD Server: http://localhost:3000

📝 Test 1: Upload Tuần Tự (Baseline)
============================================================
   Uploading question 0...
   ✅ Question 0 uploaded
   Uploading question 1...
   ✅ Question 1 uploaded
   Uploading question 2...
   ✅ Question 2 uploaded

⏱️  Duration: 450ms

📊 Verification:
   Expected: 3 questions
   Actual: 3 questions
   Result: ✅ PASS

📝 Test 2: Upload Đồng Thời (Concurrent)
============================================================
   Uploading 3 questions concurrently...

⏱️  Duration: 180ms

   ✅ Question 3 uploaded
   ✅ Question 4 uploaded
   ✅ Question 5 uploaded

📊 Verification:
   Expected: 6 questions (3 from test 1 + 3 from test 2)
   Actual: 6 questions
   Result: ✅ PASS

📊 Order Verification:
   Expected orders: 0, 1, 2, 3, 4, 5
   Actual orders: 0, 1, 2, 3, 4, 5
   Result: ✅ PASS

📝 Test 3: Validation - Upload Quá 6 Câu
============================================================
   Trying to upload 7th question...

📊 Verification:
   ✅ PASS - Validation works correctly
   Error message: "Thí sinh 1 đã đủ 6 câu hỏi rồi! Không thể thêm nữa."

📝 Test 4: Validation - Upload Order Trùng
============================================================
   Trying to upload question with duplicate order 0...

📊 Verification:
   ✅ PASS - Duplicate order validation works
   Error message: "Câu hỏi order 0 đã tồn tại cho thí sinh 1. Vui lòng chọn order khác."

============================================================
📊 TEST SUMMARY
============================================================
Test 1 - Sequential Upload:     ✅ PASS
Test 2 - Concurrent Upload:     ✅ PASS
Test 3 - Validation (Max 6):    ✅ PASS
Test 4 - Duplicate Order:       ✅ PASS

============================================================
✅ ALL TESTS PASSED!
============================================================
```

## 🔍 Giải Thích Kết Quả

### Test 1: Upload Tuần Tự
- Upload 3 câu hỏi lần lượt (order 0, 1, 2)
- Thời gian: ~450ms (150ms/câu)
- Verify: Tất cả 3 câu đều được lưu

### Test 2: Upload Đồng Thời
- Upload 3 câu hỏi cùng lúc (order 3, 4, 5)
- Thời gian: ~180ms (nhanh hơn sequential nhờ parallel)
- **QUAN TRỌNG:** Queue mechanism đảm bảo tất cả 3 câu đều được lưu, không bị mất dữ liệu
- Verify: Tổng 6 câu, orders đúng thứ tự

### Test 3: Validation Số Lượng
- Thử upload câu thứ 7 (vượt quá 6 câu)
- Backend reject với error message rõ ràng
- Verify: Validation hoạt động đúng

### Test 4: Validation Order Trùng
- Thử upload câu với order 0 (đã tồn tại)
- Backend reject với error message rõ ràng
- Verify: Validation hoạt động đúng

## 🎯 Kết Luận

Nếu tất cả 4 tests đều PASS:
- ✅ Queue mechanism hoạt động tốt, KHÔNG bị race condition
- ✅ Validation backend hoạt động đúng
- ✅ Hệ thống an toàn cho production

## 🐛 Troubleshooting

### Lỗi: "Cannot find module 'node-fetch'"
```bash
npm install node-fetch@2 form-data
```

### Lỗi: "Trận đấu không tồn tại"
- Kiểm tra matchId có đúng không
- Kiểm tra KD Server đang chạy (`http://localhost:3000`)
- Kiểm tra Data Node đang online

### Lỗi: "Data Node offline"
- Khởi động Data Node trước khi chạy test
- Kiểm tra kết nối giữa KD Server và Data Node

### Test fail ở Test 2 (Concurrent)
- Có thể do race condition → Kiểm tra queue mechanism trong `dan_data-node/match-manager.js`
- Kiểm tra log console để xem chi tiết lỗi

## 📝 Ghi Chú

- Test này yêu cầu KD Server và Data Node đang chạy
- Mỗi lần chạy test sẽ tạo 6 câu hỏi mới cho Player 1
- Nếu muốn test lại, tạo trận đấu mới hoặc xóa câu hỏi cũ
- Test không xóa dữ liệu sau khi chạy (để verify thủ công nếu cần)

