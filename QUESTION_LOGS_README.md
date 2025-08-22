# 📋 Tính năng Logs xóa câu hỏi

## 🎯 Mục đích
Tính năng này cho phép admin theo dõi và khôi phục các câu hỏi đã bị xóa, đặc biệt hữu ích khi cần kiểm tra lại các quyết định xóa câu hỏi.

## 🚀 Cài đặt

### 1. Khởi động server
```bash
npm start
# hoặc
node server.js
```

Các bảng cần thiết sẽ được tạo tự động khi khởi động:
- `question_deletion_logs`: Lưu thông tin xóa câu hỏi
- `deleted_question_answers`: Lưu các đáp án bổ sung đã bị xóa

## 📱 Cách sử dụng

### Xem logs xóa câu hỏi
1. Truy cập `/admin/question-logs`
2. Xem danh sách các câu hỏi đã bị xóa
3. Sử dụng bộ lọc để tìm kiếm theo:
   - Trạng thái (có thể khôi phục/đã khôi phục)
   - Nội dung câu hỏi
   - Lý do xóa

### Khôi phục câu hỏi
1. Bấm nút "Xem" để xem chi tiết log
2. Bấm nút "Khôi phục câu hỏi" (màu xanh)
3. Xác nhận hành động
4. Câu hỏi sẽ được khôi phục với:
   - ID gốc
   - Nội dung gốc
   - Các đáp án bổ sung
   - Thông tin metadata

### Xóa vĩnh viễn log
1. Bấm nút "Xem" để xem chi tiết log
2. Bấm nút "Xóa vĩnh viễn" (màu đỏ)
3. Xác nhận hành động
4. Log sẽ không thể khôi phục nữa

## 🔧 Tích hợp với Reports

Khi xóa câu hỏi từ trang báo lỗi (`/admin/reports`):
1. Nút "Xóa câu hỏi" sẽ xuất hiện nếu báo lỗi có `question_id`
2. Khi bấm xóa, sẽ có dialog xác nhận
3. Câu hỏi được xóa và ghi log với:
   - Lý do: "Xóa từ báo lỗi #[ID]"
   - Report ID liên quan
   - Thông tin admin thực hiện

## 📊 Cấu trúc dữ liệu

### Bảng `question_deletion_logs`
- `id`: ID của log
- `question_id`: ID câu hỏi đã bị xóa
- `question_text`: Nội dung câu hỏi
- `question_answer`: Đáp án chính
- `question_category`: Danh mục câu hỏi
- `question_difficulty`: Độ khó
- `deleted_by`: ID admin xóa
- `deleted_at`: Thời gian xóa
- `deletion_reason`: Lý do xóa
- `report_id`: ID báo lỗi liên quan (nếu có)
- `can_restore`: Có thể khôi phục không
- `restored_at`: Thời gian khôi phục (nếu có)
- `restored_by`: ID admin khôi phục (nếu có)

### Bảng `deleted_question_answers`
- `id`: ID đáp án
- `log_id`: ID log liên quan
- `answer_text`: Nội dung đáp án
- `created_at`: Thời gian tạo đáp án

## 🛡️ Bảo mật

- Chỉ admin mới có thể truy cập trang logs
- Mỗi hành động đều được ghi log với thông tin admin
- Không thể khôi phục câu hỏi đã tồn tại (tránh trùng lặp)

## 🔄 Workflow

```
Câu hỏi bị xóa → Ghi log → Admin xem logs → Khôi phục (nếu cần)
     ↓
Xóa vĩnh viễn (không thể khôi phục)
```

## 📝 Ghi chú

- Câu hỏi được khôi phục sẽ giữ nguyên ID gốc
- Các đáp án bổ sung cũng được khôi phục
- Log sau khi khôi phục sẽ không thể khôi phục lại
- Tính năng này giúp admin có thể "undo" các quyết định xóa sai

## 🐛 Xử lý lỗi

- Nếu ghi log thất bại, câu hỏi vẫn được xóa (không chặn quá trình chính)
- Các lỗi database được ghi log và hiển thị thông báo rõ ràng
- Validation đầy đủ để tránh dữ liệu không hợp lệ
