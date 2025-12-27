# UC-04: Quên mật khẩu

| Trường | Nội dung |
| --- | --- |
| **Mã Use Case** | UC-04 |
| **Tên Use Case** | Quên mật khẩu |
| **Tác nhân** | Người dùng |
| **Mô tả** | Cho phép người dùng khôi phục quyền truy cập tài khoản bằng cách đặt lại mật khẩu thông qua email. |
| **Tiền điều kiện** | - Người dùng đã có tài khoản trong hệ thống.<br><br>- Người dùng không nhớ mật khẩu hiện tại.<br><br>- Hệ thống đang hoạt động bình thường. |
| **Hậu điều kiện** | - Mật khẩu mới được cập nhật cho tài khoản.<br><br>- Người dùng có thể đăng nhập bằng mật khẩu mới.<br><br>- Người dùng được chuyển đến trang danh sách ghi chú. |
| **Luồng sự kiện chính** | 1. Người dùng chọn liên kết "Quên mật khẩu" từ trang Đăng nhập.<br><br>2. Hệ thống hiển thị trang yêu cầu đặt lại mật khẩu.<br><br>3. Người dùng nhập địa chỉ email đã đăng ký.<br><br>4. Người dùng xác nhận gửi yêu cầu.<br><br>5. Hệ thống gửi email chứa liên kết đặt lại mật khẩu.<br><br>6. Hệ thống hiển thị thông báo yêu cầu kiểm tra email.<br><br>7. Người dùng truy cập liên kết trong email.<br><br>8. Hệ thống xác thực liên kết và hiển thị trang đặt mật khẩu mới.<br><br>9. Người dùng nhập mật khẩu mới.<br><br>10. Người dùng xác nhận lưu mật khẩu.<br><br>11. Hệ thống cập nhật mật khẩu cho tài khoản.<br><br>12. Hệ thống chuyển hướng người dùng đến trang danh sách ghi chú. |
| **Luồng thay thế** | **5a. Email không tồn tại trong hệ thống:**<br>   1. Hệ thống hiển thị thông báo lỗi.<br>   2. Quay lại bước 3 của Luồng chính.<br><br>**7a. Liên kết đã hết hạn:**<br>   1. Hệ thống hiển thị thông báo liên kết không còn hiệu lực.<br>   2. Người dùng quay lại bước 1 để yêu cầu liên kết mới.<br><br>**11a. Mật khẩu không đáp ứng yêu cầu bảo mật:**<br>   1. Hệ thống hiển thị thông báo yêu cầu về mật khẩu.<br>   2. Quay lại bước 9 của Luồng chính.<br><br>**3a. Người dùng chọn quay lại trang Đăng nhập:**<br>   1. Hệ thống chuyển hướng người dùng đến trang Đăng nhập.<br>   2. Use Case kết thúc. |
