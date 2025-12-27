# UC-03: Đăng xuất

| Trường | Nội dung |
| --- | --- |
| **Mã Use Case** | UC-03 |
| **Tên Use Case** | Đăng xuất |
| **Tác nhân** | Người dùng |
| **Mô tả** | Cho phép người dùng đăng xuất khỏi hệ thống để kết thúc phiên làm việc và bảo vệ thông tin cá nhân. |
| **Tiền điều kiện** | - Người dùng đã đăng nhập vào hệ thống.<br><br>- Hệ thống đang hoạt động bình thường. |
| **Hậu điều kiện** | - Phiên làm việc của người dùng đã được kết thúc.<br><br>- Người dùng được chuyển đến trang Đăng nhập.<br><br>- Người dùng không thể truy cập các trang yêu cầu xác thực cho đến khi đăng nhập lại. |
| **Luồng sự kiện chính** | 1. Người dùng mở menu tài khoản.<br><br>2. Hệ thống hiển thị các tùy chọn tài khoản.<br><br>3. Người dùng chọn "Đăng xuất".<br><br>4. Hệ thống kết thúc phiên làm việc của người dùng.<br><br>5. Hệ thống chuyển hướng người dùng đến trang Đăng nhập. |
| **Luồng thay thế** | **4a. Lỗi kết nối mạng:**<br>   1. Hệ thống hiển thị thông báo lỗi kết nối.<br>   2. Người dùng có thể thử lại sau khi kết nối được khôi phục.<br>   3. Quay lại bước 3 của Luồng chính. |
