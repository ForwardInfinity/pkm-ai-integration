# UC-01: Đăng ký

| Trường | Nội dung |
| --- | --- |
| **Mã Use Case** | UC-01 |
| **Tên Use Case** | Đăng ký |
| **Tác nhân** | Người dùng |
| **Mô tả** | Cho phép người dùng tạo tài khoản mới để sử dụng hệ thống quản lý ghi chú cá nhân. |
| **Tiền điều kiện** | - Người dùng chưa có tài khoản trong hệ thống.<br><br>- Người dùng đang ở trang Đăng ký.<br><br>- Hệ thống đang hoạt động bình thường. |
| **Hậu điều kiện** | - Tài khoản mới được tạo trong hệ thống.<br><br>- Email xác thực được gửi đến địa chỉ email của người dùng.<br><br>- Hồ sơ người dùng được khởi tạo. |
| **Luồng sự kiện chính** | 1. Người dùng nhập địa chỉ email.<br><br>2. Người dùng nhập mật khẩu.<br><br>3. Người dùng nhập lại mật khẩu để xác nhận.<br><br>4. Người dùng nhấn nút "Đăng ký".<br><br>5. Hệ thống kiểm tra mật khẩu và mật khẩu xác nhận có khớp nhau.<br><br>6. Hệ thống xác thực thông tin đăng ký.<br><br>7. Hệ thống tạo tài khoản mới và hồ sơ người dùng.<br><br>8. Hệ thống gửi email xác thực đến địa chỉ email của người dùng.<br><br>9. Hệ thống chuyển hướng người dùng đến trang thông báo đăng ký thành công.<br><br>10. Hệ thống hiển thị thông báo yêu cầu người dùng kiểm tra email để xác thực tài khoản. |
| **Luồng thay thế** | **5a. Mật khẩu và mật khẩu xác nhận không khớp:**<br>   1. Hệ thống hiển thị thông báo "Mật khẩu không khớp".<br>   2. Quay lại bước 2 của Luồng chính.<br><br>**6a. Địa chỉ email đã được sử dụng:**<br>   1. Hệ thống hiển thị thông báo email đã tồn tại trong hệ thống.<br>   2. Quay lại bước 1 của Luồng chính.<br><br>**6b. Định dạng email không hợp lệ:**<br>   1. Hệ thống hiển thị thông báo định dạng email không hợp lệ.<br>   2. Quay lại bước 1 của Luồng chính.<br><br>**6c. Mật khẩu không đáp ứng yêu cầu bảo mật:**<br>   1. Hệ thống hiển thị thông báo lỗi về yêu cầu mật khẩu.<br>   2. Quay lại bước 2 của Luồng chính.<br><br>**4a. Người dùng chuyển sang trang Đăng nhập:**<br>   1. Hệ thống chuyển hướng người dùng đến trang Đăng nhập.<br>   2. Use Case kết thúc. |
