# UC-13: Bỏ qua mâu thuẫn

| Trường | Nội dung |
| --- | --- |
| **Mã Use Case** | UC-13 |
| **Tên Use Case** | Bỏ qua mâu thuẫn |
| **Tác nhân** | Người dùng |
| **Mô tả** | Cho phép người dùng bỏ qua một mâu thuẫn đã được phát hiện khi xác định rằng mâu thuẫn đó không cần giải quyết hoặc đã được xử lý. |
| **Tiền điều kiện** | - Người dùng đã đăng nhập vào hệ thống.<br><br>- Mâu thuẫn cần bỏ qua đang ở trạng thái hoạt động trong hệ thống.<br><br>- Người dùng đang xem danh sách mâu thuẫn hoặc bảng thông tin chi tiết của ghi chú liên quan. |
| **Hậu điều kiện** | - Mâu thuẫn được đánh dấu là đã bỏ qua trong hệ thống.<br><br>- Mâu thuẫn không còn hiển thị trong danh sách mâu thuẫn hoạt động.<br><br>- Số lượng mâu thuẫn hoạt động được cập nhật. |
| **Luồng sự kiện chính** | 1. Người dùng xem thông tin mâu thuẫn cần bỏ qua.<br><br>2. Người dùng chọn bỏ qua mâu thuẫn.<br><br>3. Hệ thống cập nhật trạng thái mâu thuẫn thành "đã bỏ qua".<br><br>4. Hệ thống loại bỏ mâu thuẫn khỏi danh sách hiển thị.<br><br>5. Hệ thống thông báo thao tác thành công. |
| **Luồng thay thế** | **3a. Mâu thuẫn không tồn tại hoặc không thuộc quyền sở hữu của người dùng:**<br>   1. Hệ thống thông báo lỗi không thể bỏ qua mâu thuẫn.<br>   2. Use Case kết thúc.<br><br>**3b. Lỗi kết nối mạng:**<br>   1. Hệ thống hoàn tác thay đổi hiển thị.<br>   2. Hệ thống thông báo lỗi không thể bỏ qua mâu thuẫn.<br>   3. Use Case kết thúc.<br><br>**1a. Người dùng bỏ qua mâu thuẫn từ trang danh sách mâu thuẫn:**<br>   1. Người dùng truy cập trang Mâu thuẫn.<br>   2. Người dùng xem mâu thuẫn cần bỏ qua trong danh sách.<br>   3. Tiếp tục từ bước 2 của Luồng chính.<br><br>**1b. Người dùng bỏ qua mâu thuẫn từ bảng thông tin ghi chú:**<br>   1. Người dùng mở bảng thông tin chi tiết của ghi chú.<br>   2. Người dùng xem mâu thuẫn liên quan đến ghi chú trong mục Mâu thuẫn.<br>   3. Tiếp tục từ bước 2 của Luồng chính. |
