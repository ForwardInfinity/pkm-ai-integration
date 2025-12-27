# UC-02: Đăng nhập

| Trường | Nội dung |
| --- | --- |
| **Mã Use Case** | UC-02 |
| **Tên Use Case** | Đăng nhập |
| **Tác nhân** | Người dùng |
| **Mô tả** | Cho phép người dùng đăng nhập vào hệ thống để truy cập các chức năng quản lý ghi chú cá nhân. |
| **Tiền điều kiện** | - Người dùng đã có tài khoản trong hệ thống.<br><br>- Tài khoản đã được xác thực qua email.<br><br>- Người dùng đang ở trang Đăng nhập.<br><br>- Hệ thống đang hoạt động bình thường. |
| **Hậu điều kiện** | - Người dùng đã đăng nhập thành công.<br><br>- Phiên làm việc được khởi tạo.<br><br>- Người dùng được chuyển đến trang danh sách ghi chú. |
| **Luồng sự kiện chính** | 1. Người dùng nhập địa chỉ email.<br><br>2. Người dùng nhập mật khẩu.<br><br>3. Người dùng nhấn nút "Đăng nhập".<br><br>4. Hệ thống xác thực thông tin đăng nhập.<br><br>5. Hệ thống khởi tạo phiên làm việc.<br><br>6. Hệ thống chuyển hướng người dùng đến trang danh sách ghi chú. |
| **Luồng thay thế** | **4a. Email hoặc mật khẩu không chính xác:**<br>   1. Hệ thống hiển thị thông báo lỗi xác thực.<br>   2. Quay lại bước 1 của Luồng chính.<br><br>**4b. Tài khoản chưa được xác thực email:**<br>   1. Hệ thống hiển thị thông báo yêu cầu xác thực email.<br>   2. Quay lại bước 1 của Luồng chính.<br><br>**2a. Người dùng chọn liên kết "Quên mật khẩu":**<br>   1. Hệ thống chuyển hướng người dùng đến trang Quên mật khẩu.<br>   2. Use Case kết thúc.<br><br>**3a. Người dùng chuyển sang trang Đăng ký:**<br>   1. Hệ thống chuyển hướng người dùng đến trang Đăng ký.<br>   2. Use Case kết thúc. |
