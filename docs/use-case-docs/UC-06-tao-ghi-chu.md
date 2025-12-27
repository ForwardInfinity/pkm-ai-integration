# UC-06: Tạo ghi chú

| Trường | Nội dung |
| --- | --- |
| **Mã Use Case** | UC-06 |
| **Tên Use Case** | Tạo ghi chú |
| **Tác nhân** | Người dùng |
| **Mô tả** | Cho phép người dùng tạo ghi chú mới để lưu trữ ý tưởng và kiến thức cá nhân trong hệ thống quản lý kiến thức. |
| **Tiền điều kiện** | - Người dùng đã đăng nhập vào hệ thống.<br><br>- Người dùng đang ở trang quản lý ghi chú. |
| **Hậu điều kiện** | - Ghi chú mới được tạo và lưu vào hệ thống.<br><br>- Ghi chú xuất hiện trong danh sách ghi chú của người dùng.<br><br>- Hệ thống bắt đầu xử lý tạo vector nhúng cho ghi chú để hỗ trợ tìm kiếm ngữ nghĩa. |
| **Luồng sự kiện chính** | 1. Người dùng chọn tạo ghi chú mới.<br><br>2. Hệ thống hiển thị trình soạn thảo ghi chú trống với tiêu đề mặc định "New Note".<br><br>3. Người dùng nhập tiêu đề cho ghi chú.<br><br>4. Người dùng nhập nội dung ghi chú.<br><br>5. Hệ thống tự động lưu nội dung khi người dùng ngừng nhập.<br><br>6. Hệ thống cập nhật ghi chú vào danh sách ghi chú.<br><br>7. Hệ thống gửi yêu cầu tạo vector nhúng cho ghi chú. |
| **Luồng thay thế** | **4a. Người dùng thêm thẻ phân loại cho ghi chú:**<br>   1. Người dùng nhập thẻ phân loại trong nội dung ghi chú (ví dụ: #ý-tưởng, #dự-án).<br>   2. Hệ thống tự động nhận diện và gắn thẻ vào ghi chú.<br>   3. Tiếp tục từ bước 5 của Luồng chính.<br><br>**4b. Người dùng tạo liên kết đến ghi chú khác:**<br>   1. Người dùng nhập liên kết nội bộ trong nội dung (ví dụ: [[Tên ghi chú]]).<br>   2. Hệ thống hiển thị gợi ý các ghi chú có liên quan.<br>   3. Người dùng chọn ghi chú cần liên kết.<br>   4. Hệ thống tạo liên kết đến ghi chú được chọn.<br>   5. Tiếp tục từ bước 5 của Luồng chính.<br><br>**5a. Mất kết nối mạng:**<br>   1. Hệ thống lưu ghi chú vào bộ nhớ cục bộ.<br>   2. Hệ thống đánh dấu ghi chú cần đồng bộ.<br>   3. Khi có kết nối, hệ thống tự động đồng bộ ghi chú lên máy chủ.<br>   4. Tiếp tục từ bước 6 của Luồng chính.<br><br>**1a. Người dùng hủy tạo ghi chú trước khi nhập nội dung:**<br>   1. Người dùng đóng tab soạn thảo.<br>   2. Hệ thống xóa bản nháp ghi chú trống.<br>   3. Use Case kết thúc. |
